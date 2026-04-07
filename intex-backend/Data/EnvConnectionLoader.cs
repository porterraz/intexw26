using Microsoft.Data.SqlClient;

using System.Reflection;

namespace Intex.Backend.Data;

/// <summary>
/// Loads repo-root .env (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD) and sets
/// ConnectionStrings__DefaultConnection so the backend and EF tools use the same credentials as load_csv_to_sql.py.
/// </summary>
public static class EnvConnectionLoader
{
    public static void ApplyDatabaseConnectionFromEnvFile()
    {
        var path = FindEnvFilePath();
        if (path is null)
            return;

        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal))
                continue;
            var eq = line.IndexOf('=');
            if (eq <= 0)
                continue;
            var key = line[..eq].Trim();
            var value = line[(eq + 1)..].Trim();
            Environment.SetEnvironmentVariable(key, value);
        }

        var server = Environment.GetEnvironmentVariable("DB_SERVER");
        var database = Environment.GetEnvironmentVariable("DB_NAME");
        var user = Environment.GetEnvironmentVariable("DB_USER");
        var password = Environment.GetEnvironmentVariable("DB_PASSWORD");

        if (string.IsNullOrWhiteSpace(server)
            || string.IsNullOrWhiteSpace(database)
            || string.IsNullOrWhiteSpace(user)
            || string.IsNullOrWhiteSpace(password))
            return;

        if (user.Equals("YOUR_LOGIN", StringComparison.OrdinalIgnoreCase)
            || password.Equals("YOUR_PASSWORD", StringComparison.OrdinalIgnoreCase))
            return;

        var csb = new SqlConnectionStringBuilder
        {
            DataSource = $"tcp:{server},1433",
            InitialCatalog = database,
            UserID = user,
            Password = password,
            Encrypt = true,
            TrustServerCertificate = false,
            MultipleActiveResultSets = true,
            ConnectTimeout = 30
        };
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", csb.ConnectionString);
    }

    static string? FindEnvFilePath()
    {
        foreach (var start in StartingDirectories())
        {
            var dir = new DirectoryInfo(start);
            for (var i = 0; i < 10 && dir != null; i++)
            {
                var candidate = Path.Combine(dir.FullName, ".env");
                if (File.Exists(candidate))
                    return candidate;
                dir = dir.Parent;
            }
        }

        // Design-time (dotnet ef): cwd/BaseDirectory can be unexpected — jump from build output to repo root.
        var asm = Assembly.GetExecutingAssembly().Location;
        if (!string.IsNullOrEmpty(asm))
        {
            var netDir = Path.GetDirectoryName(asm);
            if (netDir != null)
            {
                var fromBin = Path.GetFullPath(Path.Combine(netDir, "..", "..", "..", "..", ".env"));
                if (File.Exists(fromBin))
                    return fromBin;
            }
        }

        return null;
    }

    static IEnumerable<string> StartingDirectories()
    {
        yield return Directory.GetCurrentDirectory();
        yield return AppContext.BaseDirectory;

        var asm = Assembly.GetExecutingAssembly().Location;
        if (!string.IsNullOrEmpty(asm))
            yield return Path.GetDirectoryName(asm)!;
    }
}
