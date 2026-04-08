using System.Text;
using System.Text.Json.Serialization;
using Intex.Backend.Data;
using Intex.Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Repo-root .env (DB_*) overrides appsettings for DefaultConnection — same as load_csv_to_sql.py.
EnvConnectionLoader.ApplyDatabaseConnectionFromEnvFile();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddOpenApi();

var defaultConnection = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(defaultConnection))
{
    throw new InvalidOperationException(
        "Missing required connection string 'DefaultConnection'. Configure SQL Server before starting the application."
    );
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(defaultConnection);
});

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 12;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireDigit = true;
        options.Password.RequireNonAlphanumeric = true;

        options.Lockout.MaxFailedAccessAttempts = 5;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddScoped<JwtTokenService>();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
var hasIssuer = !string.IsNullOrWhiteSpace(jwt.Issuer);
var hasAudience = !string.IsNullOrWhiteSpace(jwt.Audience);
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = hasIssuer,
            ValidateAudience = hasAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = hasIssuer ? jwt.Issuer : null,
            ValidAudience = hasAudience ? jwt.Audience : null,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod();

        // Development: Vite may use 5174+ if 5173 is taken; fixed origin lists cause Axios "Network Error" (CORS).
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(static origin =>
                origin is not null &&
                Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                uri.Scheme == Uri.UriSchemeHttp &&
                (string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(uri.Host, "127.0.0.1", StringComparison.Ordinal)));
            return;
        }

        var allowed = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (allowed is null || allowed.Length == 0)
        {
            throw new InvalidOperationException(
                "Production requires Cors:AllowedOrigins in configuration (e.g. https://your-frontend.azurestaticapps.net).");
        }

        policy.WithOrigins(allowed);
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseForwardedHeaders();
app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'";
    await next();
});

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

try
{
    await IdentitySeeder.SeedAsync(app.Services, builder.Configuration);
}
catch (Exception ex) when (app.Environment.IsDevelopment())
{
    app.Logger.LogWarning(ex, "Identity seed failed during startup in Development; continuing without seed.");
}

app.Run();
