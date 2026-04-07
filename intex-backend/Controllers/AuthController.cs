using System.Security.Claims;
using System.Text;
using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string MfaLoginPurpose = "mfa-login";
    private const string MfaIssuer = "NovaPath";
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _jwtTokenService;

    public AuthController(UserManager<ApplicationUser> userManager, JwtTokenService jwtTokenService)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var valid = await _userManager.CheckPasswordAsync(user, req.Password);
        if (!valid)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (user.TwoFactorEnabled)
        {
            var key = await _userManager.GetAuthenticatorKeyAsync(user);
            var requiresMfaSetup = string.IsNullOrWhiteSpace(key);
            if (requiresMfaSetup)
            {
                await _userManager.ResetAuthenticatorKeyAsync(user);
                key = await _userManager.GetAuthenticatorKeyAsync(user);
                requiresMfaSetup = string.IsNullOrWhiteSpace(key);
            }

            var oneTimeMfaNonce = await _userManager.GenerateUserTokenAsync(user, TokenOptions.DefaultProvider, MfaLoginPurpose);
            var mfaToken = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user.Id}|{oneTimeMfaNonce}"));
            var sharedKey = !string.IsNullOrWhiteSpace(key) ? FormatKey(key) : null;
            var uri = !string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(user.Email)
                ? BuildAuthenticatorUri(user.Email, key)
                : null;

            return Ok(new MfaChallengeResponse(
                MfaRequired: true,
                MfaToken: mfaToken,
                Email: user.Email,
                RequiresMfaSetup: requiresMfaSetup || string.IsNullOrWhiteSpace(uri),
                SharedKey: sharedKey,
                AuthenticatorUri: uri
            ));
        }

        var token = await _jwtTokenService.CreateTokenAsync(user);
        return Ok(new LoginResponse(token));
    }

    [HttpPost("mfa/verify-login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> VerifyMfaLogin([FromBody] MfaVerifyLoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.MfaToken) || string.IsNullOrWhiteSpace(req.Code))
        {
            return BadRequest(new { message = "MFA token and code are required." });
        }

        var decoded = DecodeMfaToken(req.MfaToken);
        if (decoded is null)
        {
            return Unauthorized(new { message = "Invalid MFA token." });
        }

        var (userId, nonce) = decoded.Value;
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null || !user.TwoFactorEnabled)
        {
            return Unauthorized(new { message = "MFA verification failed." });
        }

        var nonceValid = await _userManager.VerifyUserTokenAsync(user, TokenOptions.DefaultProvider, MfaLoginPurpose, nonce);
        if (!nonceValid)
        {
            return Unauthorized(new { message = "MFA verification expired. Please sign in again." });
        }

        var normalizedCode = req.Code.Replace(" ", string.Empty).Replace("-", string.Empty);
        var codeValid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, normalizedCode);
        if (!codeValid)
        {
            return Unauthorized(new { message = "Invalid authenticator code." });
        }

        var token = await _jwtTokenService.CreateTokenAsync(user);
        return Ok(new LoginResponse(token));
    }

    [HttpGet("mfa/setup")]
    [Authorize]
    public async Task<ActionResult<MfaSetupResponse>> GetMfaSetup()
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized(new { message = "Unauthorized." });
        }

        var key = await _userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrWhiteSpace(key))
        {
            await _userManager.ResetAuthenticatorKeyAsync(user);
            key = await _userManager.GetAuthenticatorKeyAsync(user);
        }

        if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(user.Email))
        {
            return BadRequest(new { message = "Unable to generate authenticator setup key." });
        }

        var uri = BuildAuthenticatorUri(user.Email, key);
        return Ok(new MfaSetupResponse(FormatKey(key), uri));
    }

    [HttpPost("mfa/enable")]
    [Authorize]
    public async Task<ActionResult> EnableMfa([FromBody] EnableMfaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Code))
        {
            return BadRequest(new { message = "Code is required." });
        }

        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized(new { message = "Unauthorized." });
        }

        var normalizedCode = req.Code.Replace(" ", string.Empty).Replace("-", string.Empty);
        var valid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, normalizedCode);
        if (!valid)
        {
            return BadRequest(new { message = "Invalid authenticator code." });
        }

        user.TwoFactorEnabled = true;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Could not enable MFA.",
                errors = result.Errors.Select(e => e.Description).ToArray(),
            });
        }

        return Ok(new { success = true });
    }

    /// <summary>Public self-registration. New accounts receive the Donor role only.</summary>
    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Signup([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        var normalizedEmail = req.Email.Trim();
        var existing = await _userManager.FindByEmailAsync(normalizedEmail);
        if (existing is not null)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        var user = new ApplicationUser
        {
            UserName = normalizedEmail,
            Email = normalizedEmail,
            EmailConfirmed = true
        };

        var create = await _userManager.CreateAsync(user, req.Password);
        if (!create.Succeeded)
        {
            return BadRequest(new
            {
                message = "Password does not meet requirements.",
                errors = create.Errors.Select(e => e.Description).ToArray()
            });
        }

        var addRole = await _userManager.AddToRoleAsync(user, "Donor");
        if (!addRole.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return BadRequest(new { message = "Could not complete registration. Try again later." });
        }

        var token = await _jwtTokenService.CreateTokenAsync(user);
        return Ok(new LoginResponse(token));
    }

    [HttpGet("me")]
    [AllowAnonymous]
    public async Task<ActionResult<MeResponse>> Me()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Ok(new MeResponse(false, null, Array.Empty<string>()));
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Ok(new MeResponse(false, null, Array.Empty<string>()));
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return Ok(new MeResponse(false, null, Array.Empty<string>()));
        }

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new MeResponse(true, user.Email, roles.ToArray()));
    }

    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        if (req.Role is not ("Admin" or "Donor"))
        {
            return BadRequest(new { message = "Role must be Admin or Donor." });
        }

        var existing = await _userManager.FindByEmailAsync(req.Email);
        if (existing is not null)
        {
            return Conflict(new { message = "User already exists." });
        }

        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            EmailConfirmed = true
        };

        var create = await _userManager.CreateAsync(user, req.Password);
        if (!create.Succeeded)
        {
            return BadRequest(new { errors = create.Errors.Select(e => new { e.Code, e.Description }) });
        }

        var addRole = await _userManager.AddToRoleAsync(user, req.Role);
        if (!addRole.Succeeded)
        {
            return BadRequest(new { errors = addRole.Errors.Select(e => new { e.Code, e.Description }) });
        }

        return CreatedAtAction(nameof(Me), new { }, new { email = user.Email, role = req.Role });
    }

    private async Task<ApplicationUser?> GetCurrentUserAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(userId) ? null : await _userManager.FindByIdAsync(userId);
    }

    private static (string UserId, string Nonce)? DecodeMfaToken(string mfaToken)
    {
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(mfaToken));
            var splitIndex = decoded.IndexOf('|');
            if (splitIndex <= 0 || splitIndex == decoded.Length - 1)
            {
                return null;
            }
            return (decoded[..splitIndex], decoded[(splitIndex + 1)..]);
        }
        catch
        {
            return null;
        }
    }

    private static string FormatKey(string unformattedKey)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < unformattedKey.Length; i++)
        {
            if (i > 0 && i % 4 == 0) sb.Append(' ');
            sb.Append(char.ToUpperInvariant(unformattedKey[i]));
        }
        return sb.ToString();
    }

    private static string BuildAuthenticatorUri(string email, string unformattedKey)
    {
        return $"otpauth://totp/{Uri.EscapeDataString(MfaIssuer)}:{Uri.EscapeDataString(email)}?secret={Uri.EscapeDataString(unformattedKey)}&issuer={Uri.EscapeDataString(MfaIssuer)}&digits=6";
    }
}

