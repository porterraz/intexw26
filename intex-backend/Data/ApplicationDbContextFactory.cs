using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Intex.Backend.Data;

public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        EnvConnectionLoader.ApplyDatabaseConnectionFromEnvFile();

        var projectDir = FindProjectDirectoryContainingCsproj();
        var config = new ConfigurationBuilder()
            .SetBasePath(projectDir)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddUserSecrets<ApplicationDbContextFactory>()
            .AddEnvironmentVariables()
            .Build();

        var conn = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Set ConnectionStrings:DefaultConnection in appsettings.Development.json or DB_* in the repo-root .env file.");

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlServer(conn);
        return new ApplicationDbContext(optionsBuilder.Options);
    }

    static string FindProjectDirectoryContainingCsproj()
    {
        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var dir = new DirectoryInfo(Path.GetFullPath(start));
            for (var i = 0; i < 12 && dir != null; i++)
            {
                if (File.Exists(Path.Combine(dir.FullName, "Intex.Backend.csproj")))
                    return dir.FullName;
                dir = dir.Parent;
            }
        }

        return Directory.GetCurrentDirectory();
    }
}
