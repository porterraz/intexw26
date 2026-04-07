using System.Security.Claims;
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

        var token = await _jwtTokenService.CreateTokenAsync(user);
        return Ok(new LoginResponse(token));
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
}

