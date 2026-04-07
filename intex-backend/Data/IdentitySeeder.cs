using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace Intex.Backend.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config)
    {
        var adminPassword = config["Seed:AdminPassword"];
        var donorPassword = config["Seed:DonorPassword"];
        var mfaAdminPassword = config["Seed:MfaAdminPassword"];

        if (
            string.IsNullOrWhiteSpace(adminPassword) ||
            string.IsNullOrWhiteSpace(donorPassword) ||
            string.IsNullOrWhiteSpace(mfaAdminPassword)
        )
        {
            throw new InvalidOperationException(
                "Seed passwords are required. Configure Seed:AdminPassword, Seed:DonorPassword, and Seed:MfaAdminPassword."
            );
        }

        using var scope = services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        await EnsureRoleAsync(roleManager, "Admin");
        await EnsureRoleAsync(roleManager, "Donor");

        // 1. Standard Admin
        await EnsureUserAsync(
            userManager,
            email: "admin@test.com",
            password: adminPassword,
            role: "Admin"
        );

        // 2. Standard Donor
        await EnsureUserAsync(
            userManager,
            email: "donor@test.com",
            password: donorPassword,
            role: "Donor"
        );

        // 3. REQUIRED: The MFA Testing Account
        await EnsureMfaAdminAsync(
            userManager,
            mfaAdminPassword
        );
    }

    private static async Task EnsureRoleAsync(RoleManager<IdentityRole> roleManager, string role)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    private static async Task EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        string email,
        string password,
        string role,
        bool requireMfa = false
    )
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                TwoFactorEnabled = requireMfa // Set MFA requirement on creation
            };

            var createResult = await userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
            {
                var msg = string.Join("; ", createResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
                throw new InvalidOperationException($"Failed to seed user {email}. {msg}");
            }
        }
        else if (user.TwoFactorEnabled != requireMfa)
        {
            // Ensure existing users get updated if the seeder changes
            user.TwoFactorEnabled = requireMfa;
            await userManager.UpdateAsync(user);
        }

        if (!await userManager.IsInRoleAsync(user, role))
        {
            var addRoleResult = await userManager.AddToRoleAsync(user, role);
            if (!addRoleResult.Succeeded)
            {
                var msg = string.Join("; ", addRoleResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
                throw new InvalidOperationException($"Failed to assign role {role} to {email}. {msg}");
            }
        }
    }

    private static async Task EnsureMfaAdminAsync(
        UserManager<ApplicationUser> userManager,
        string mfaAdminPassword
    )
    {
        const string email = "mfa_admin@test.com";
        const string role = "Admin";

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                TwoFactorEnabled = true
            };

            var createResult = await userManager.CreateAsync(user, mfaAdminPassword);
            if (!createResult.Succeeded)
            {
                var msg = string.Join("; ", createResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
                throw new InvalidOperationException($"Failed to seed user {email}. {msg}");
            }
        }
        else
        {
            // Force MFA test account to match expected startup config.
            if (!user.TwoFactorEnabled)
            {
                user.TwoFactorEnabled = true;
                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    var msg = string.Join("; ", updateResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
                    throw new InvalidOperationException($"Failed to update MFA flag for {email}. {msg}");
                }
            }

            // Keep password aligned with Seed:MfaAdminPassword so login is predictable.
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await userManager.ResetPasswordAsync(user, resetToken, mfaAdminPassword);
            if (!resetResult.Succeeded)
            {
                var msg = string.Join("; ", resetResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
                throw new InvalidOperationException($"Failed to reset password for {email}. {msg}");
            }
        }

        if (!await userManager.IsInRoleAsync(user, role))
        {
            var addRoleResult = await userManager.AddToRoleAsync(user, role);
            if (!addRoleResult.Succeeded)
            {
                var msg = string.Join("; ", addRoleResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
                throw new InvalidOperationException($"Failed to assign role {role} to {email}. {msg}");
            }
        }
    }
}