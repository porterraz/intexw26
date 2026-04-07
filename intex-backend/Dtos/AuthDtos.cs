namespace Intex.Backend.Dtos;

public record LoginRequest(string Email, string Password);

public record LoginResponse(string Token);

public record MfaChallengeResponse(
    bool MfaRequired,
    string MfaToken,
    string? Email,
    bool RequiresMfaSetup = false,
    string? SharedKey = null,
    string? AuthenticatorUri = null
);

public record MfaVerifyLoginRequest(string MfaToken, string Code);

public record MfaSetupResponse(string? SharedKey, string? AuthenticatorUri);

public record EnableMfaRequest(string Code);

public record RegisterRequest(string Email, string Password, string Role);

public record MeResponse(bool Authenticated, string? Email, IReadOnlyList<string> Roles);

