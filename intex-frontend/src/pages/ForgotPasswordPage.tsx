import { Link } from 'react-router-dom'

export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#060e09] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-bold mb-3">Forgot your password?</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          Password reset is not connected yet in this demo environment. For now, use the demo
          credentials on the login page:
        </p>
        <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
          <p>
            Email: <span className="font-semibold">admin@novapath.org</span>
          </p>
          <p>
            Password: <span className="font-semibold">demo123</span>
          </p>
        </div>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#060e09] hover:bg-emerald-400"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
