import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";
import { logIn, getCurrentUserRole } from "../lib/supabase/auth";
import { fetchMyApplication } from "../lib/supabase/runner";

const ROLE_ROUTES: Record<string, string> = {
  customer: "/customer",
  runner: "/runner",
  supervisor: "/dashboard",
  admin: "/admin",
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await logIn(email.trim(), password);
      const roleInfo = await getCurrentUserRole();
      if (!roleInfo) {
        setError("Could not determine your account type. Please contact support.");
        setLoading(false);
        return;
      }

      // Runners with a pending or rejected application still log in, but
      // RunnerDashboard itself gates the actual dashboard content behind
      // application status — see RunnerDashboard.tsx's ApplicationPendingScreen.
      if (roleInfo.role === "runner") {
        try {
          await fetchMyApplication();
        } catch {
          // No application on file at all — shouldn't happen post-signup,
          // but fail safe by sending them back to complete registration.
          setError("No runner application found for this account. Please register again.");
          setLoading(false);
          return;
        }
      }

      navigate(ROLE_ROUTES[roleInfo.role] ?? "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your details and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-2 min-h-screen">
      <Link to="/" className="absolute top-6 right-6 z-20">
        <Button variant="ghost" size="md">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" />
          </svg>
          Back
        </Button>
      </Link>
      <div className="hidden md:flex flex-col justify-between px-[5vw] py-16 relative overflow-hidden bg-indigo-950 text-white">
        <img src="/Login.jpg" alt="" className="absolute inset-0 z-0 w-full h-full object-cover" />
        <div className="absolute inset-0 z-0 bg-indigo-950/55" />
        <div className="relative z-10"><Logo light /></div>
        <div className="relative z-10 max-w-[380px]">
          <h3 className="text-[26px] mb-3.5 leading-snug">
            "Posted a queue job at Home Affairs — tracked the whole thing from my desk."
          </h3>
          <p className="text-indigo-100 text-sm">
            Every job on Tuma Mina is tracked pin to pin, with payment held safe until it's confirmed done.
          </p>
        </div>
        <div className="relative z-10 flex gap-6 flex-wrap text-[12.5px] text-indigo-50">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4 text-coral">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
            </svg>
            Escrow protected
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4 text-coral">
              <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
            </svg>
            Verified runners
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-[6vw] py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[400px]">
          <h2 className="text-[28px] mb-2">Welcome back</h2>
          <p className="text-ink-soft text-[14.5px] mb-8">Log in to track your tasks or manage jobs.</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-[#fdeaea] text-[#a83232] text-[13px]">{error}</div>
          )}

          <div className="mb-[18px]">
            <label className="block text-[13px] font-semibold mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="mb-[18px]">
            <label className="block text-[13px] font-semibold mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-between items-center my-1.5 mb-6 text-[13.5px]">
            <label className="flex items-center gap-2 text-ink-soft">
              <input type="checkbox" /> Keep me logged in
            </label>
            <a href="#" className="text-indigo-600 font-semibold">Forgot password?</a>
          </div>

          <Button type="submit" variant="primary" size="lg" block disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </Button>

          <p className="text-center mt-6 text-sm text-ink-soft">
            New to Tuma Mina?{" "}
            <Link to="/register" className="text-indigo-600 font-bold">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}