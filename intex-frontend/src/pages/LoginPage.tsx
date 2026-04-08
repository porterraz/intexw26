import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

const QUOTES = [
  {
    text: "Every family deserves a safe place to call home.",
    author: "Nova Path Mission",
  },
  {
    text: "Restoration begins with a single step forward.",
    author: "Nova Path Field Team",
  },
  {
    text: "We don't just open doors - we walk through them together.",
    author: "Nova Path Founding Principle",
  },
];

function Orb({
  className,
  style,
  duration,
  delay,
}: {
  className: string;
  style: CSSProperties;
  duration: number;
  delay: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={style}
    />
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  disabled,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-surface-text tracking-wide"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full rounded-xl px-4 py-3 text-sm bg-surface border text-surface-dark
            placeholder:text-surface-text outline-none transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? "border-red-500/60 focus:border-red-400"
                : focused
                  ? "border-brand"
                  : "border-brand-100 hover:border-brand"
            }
          `}
          style={
            focused && !error
              ? { boxShadow: "0 0 0 3px rgba(52,211,153,0.12)" }
              : error
                ? { boxShadow: "0 0 0 3px rgba(239,68,68,0.12)" }
                : {}
          }
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[12px] text-red-400 flex items-center gap-1.5"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
              <path
                d="M6 4v2.5M6 8h.01"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function meetsPasswordPolicy(p: string): boolean {
  if (p.length < 12) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[a-z]/.test(p)) return false;
  if (!/[0-9]/.test(p)) return false;
  if (!/[^A-Za-z0-9]/.test(p)) return false;
  return true;
}

export function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [quoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const quote = QUOTES[quoteIndex];

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const formErrorId = useId();

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!password) {
      errors.password = "Password is required.";
    } else if (mode === "signup") {
      if (!meetsPasswordPolicy(password)) {
        errors.password =
          "Use at least 12 characters with uppercase, lowercase, a number, and a symbol.";
      }
    }
    if (mode === "signup") {
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password.";
      } else if (confirmPassword !== password) {
        errors.confirmPassword = "Passwords do not match.";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signup") {
        const user = await signup(email, password);
        if (user.roles.includes("Admin")) navigate("/admin", { replace: true });
        else navigate("/donor/dashboard", { replace: true });
      } else {
        const user = await login(email, password);
        if (!user) return;
        if (user.roles.includes("Admin")) navigate("/admin", { replace: true });
        else navigate("/donor/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-brand-50 overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display { font-family: 'Sora', sans-serif; }
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <motion.aside
        aria-hidden="true"
        initial={{ opacity: 0, x: -32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex relative flex-col justify-between w-[52%] xl:w-[55%] p-12 overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 40%, #ffffff 100%)",
        }}
      >
        <Orb
          className="w-[500px] h-[500px] -top-32 -left-32"
          style={{
            background:
              "radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)",
          }}
          duration={9}
          delay={0}
        />
        <Orb
          className="w-[380px] h-[380px] bottom-0 right-0"
          style={{
            background:
              "radial-gradient(circle, rgba(250,204,21,0.12) 0%, transparent 70%)",
          }}
          duration={12}
          delay={3}
        />
        <Orb
          className="w-[260px] h-[260px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          }}
          duration={7}
          delay={1.5}
        />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg,#34d399 0px,#34d399 1px,transparent 1px,transparent 70px)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#34d399,#facc15)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5L14.5 8 8 14.5M1.5 8h13"
                stroke="#060e09"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
            <span className="font-display font-bold text-surface-dark text-lg tracking-tight">
            Nova Path
          </span>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center py-16">
          <svg
            viewBox="0 0 340 340"
            className="w-64 xl:w-72 opacity-90"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Nova Path abstract illustration"
          >
            <circle
              cx="170"
              cy="170"
              r="155"
              stroke="rgba(52,211,153,0.12)"
              strokeWidth="1"
            />
            <circle
              cx="170"
              cy="170"
              r="120"
              stroke="rgba(52,211,153,0.08)"
              strokeWidth="1"
            />
            <defs>
              <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.path
              d="M 170 50 A 120 120 0 1 1 169.9 50"
              stroke="url(#arc-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="754"
              initial={{ strokeDashoffset: 754 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 2.2, ease: "easeInOut", delay: 0.4 }}
              filter="url(#glow)"
            />
            <motion.g
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, duration: 0.5, ease: "backOut" }}
            >
              <circle cx="170" cy="170" r="36" fill="rgba(52,211,153,0.08)" />
              <circle
                cx="170"
                cy="170"
                r="36"
                stroke="rgba(52,211,153,0.25)"
                strokeWidth="1"
              />
              <path
                d="M158 170h24M175 162l8 8-8 8"
                stroke="url(#arc-grad)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />
            </motion.g>
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const r = 155;
              const rad = ((deg - 90) * Math.PI) / 180;
              const x1 = 170 + r * Math.cos(rad);
              const y1 = 170 + r * Math.sin(rad);
              const x2 = 170 + (r - 10) * Math.cos(rad);
              const y2 = 170 + (r - 10) * Math.sin(rad);
              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(52,211,153,0.4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                />
              );
            })}
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="relative z-10"
        >
          <div
            className="w-8 h-px mb-4"
            style={{
              background: "linear-gradient(90deg,#34d399,transparent)",
            }}
          />
          <blockquote>
            <p className="font-display text-xl xl:text-2xl font-semibold text-surface-dark leading-snug mb-3">
              "{quote.text}"
            </p>
            <cite className="not-italic text-[13px] text-accent font-medium tracking-wide uppercase">
              - {quote.author}
            </cite>
          </blockquote>
        </motion.div>
      </motion.aside>

      <main
        className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative"
        style={{
          background:
            "linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#ffffff 100%)",
        }}
      >
        <div className="absolute left-6 top-6 sm:left-10 sm:top-8">
          <Link to="/" className="text-sm font-medium text-brand hover:text-brand-dark">
            ← Back to home
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(52,211,153,0.06), transparent 70%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#34d399,#facc15)" }}
              aria-hidden="true"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.5L14.5 8 8 14.5M1.5 8h13"
                  stroke="#060e09"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-display font-bold text-surface-dark text-base">
              Nova Path
            </span>
          </div>

          <div className="mb-9">
            <h1 className="font-display font-bold text-3xl text-surface-dark mb-2 tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-surface-text text-sm">
              {mode === "signin"
                ? "Sign in to access the Nova Path portal."
                : "Register as a donor. You can view impact; admin access is invite-only."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label={
              mode === "signin" ? "Sign in to Nova Path" : "Create a Nova Path account"
            }
          >
            <div className="flex flex-col gap-5">
              <Field
                id={emailId}
                label="Email address"
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  if (fieldErrors.email)
                    setFieldErrors((p) => ({ ...p, email: undefined }));
                  setServerError("");
                }}
                autoComplete="email"
                placeholder="you@example.com"
                error={fieldErrors.email}
                disabled={loading}
              />

              <Field
                id={passwordId}
                label="Password"
                type="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (fieldErrors.password)
                    setFieldErrors((p) => ({ ...p, password: undefined }));
                  setServerError("");
                }}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="••••••••"
                error={fieldErrors.password}
                disabled={loading}
              />

              {mode === "signup" && (
                <Field
                  id={confirmPasswordId}
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(v) => {
                    setConfirmPassword(v);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                    setServerError("");
                  }}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  error={fieldErrors.confirmPassword}
                  disabled={loading}
                />
              )}

              {mode === "signin" && (
                <div className="flex justify-end -mt-2">
                  <a
                    href="/forgot-password"
                    className="text-[12px] text-surface-text hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
                  >
                    Forgot password?
                  </a>
                </div>
              )}

              <AnimatePresence>
                {serverError && (
                  <motion.div
                    id={formErrorId}
                    role="alert"
                    aria-live="assertive"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-xl px-4 py-3 text-[13px] text-red-300 flex items-start gap-3 border"
                    style={{
                      background: "rgba(239,68,68,0.07)",
                      borderColor: "rgba(239,68,68,0.2)",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      className="shrink-0 mt-px"
                      aria-hidden="true"
                    >
                      <circle
                        cx="7.5"
                        cy="7.5"
                        r="7"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M7.5 4.5V8M7.5 10h.01"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    {serverError}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.02 }}
                whileTap={loading ? {} : { scale: 0.97 }}
                aria-label={
                  loading
                    ? mode === "signup"
                      ? "Creating account, please wait"
                      : "Signing in, please wait"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"
                }
                aria-busy={loading}
                className="relative mt-1 w-full py-3.5 rounded-xl font-semibold text-white text-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-50 disabled:cursor-not-allowed disabled:opacity-80 transition-opacity bg-brand hover:bg-brand-dark"
              >
                <AnimatePresence>
                  {loading && (
                    <motion.span
                      aria-hidden="true"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        ease: "linear",
                      }}
                      className="absolute inset-0 w-full"
                      style={{
                        background:
                          "linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)",
                      }}
                    />
                  )}
                </AnimatePresence>

                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin"
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          cx="7.5"
                          cy="7.5"
                          r="6"
                          stroke="rgba(6,14,9,0.3)"
                          strokeWidth="2"
                        />
                        <path
                          d="M7.5 1.5a6 6 0 0 1 6 6"
                          stroke="#060e09"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      {mode === "signup" ? "Creating account..." : "Signing in..."}
                    </>
                  ) : (
                    <>
                      {mode === "signup" ? "Create account" : "Sign in"}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 7h10M8 3l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </>
                  )}
                </span>
              </motion.button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-surface-text">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  className="font-semibold text-brand hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setServerError("");
                    setFieldErrors({});
                    setConfirmPassword("");
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-brand hover:underline"
                  onClick={() => {
                    setMode("signin");
                    setServerError("");
                    setFieldErrors({});
                    setConfirmPassword("");
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="mt-6 text-center text-[12px] text-slate-600">
            Contact{" "}
            <a
              href="mailto:admin@novapath.org.br"
              className="text-surface-text hover:text-brand transition-colors underline underline-offset-2"
            >
              admin@novapath.org.br
            </a>{" "}
            for access issues.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

