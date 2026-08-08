import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";

type Role = "client" | "runner";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("client");
  const [agreed, setAgreed] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: call POST /api/auth/register with { role, ...formFields }
    // Runner signups should route into the credential-upload flow (ID, bank details, POA)
    // before being marked active, per the verification requirements.
    navigate("/dashboard");
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
      {/* Side panel */}
      <div className="hidden md:flex flex-col justify-between px-[5vw] py-16 relative overflow-hidden bg-indigo-950 text-white">
        {/* Background photo — drop your own asset at public/Register.jpg */}
        <img
          src="/Register.jpg"
          alt=""
          className="absolute inset-0 z-0 w-full h-full object-cover"
        />
        {/* Darkening tint for text legibility — adjust the /NN opacity below, or delete this line to remove the effect entirely */}
        <div className="absolute inset-0 z-0 bg-indigo-950/55" />
        <div className="relative z-10"><Logo light /></div>
        <div className="relative z-10 max-w-[380px]">
          <h3 className="text-[26px] mb-3.5 leading-snug">
            Set your own rate, or accept the client's budget — your call, every job.
          </h3>
          <p className="text-indigo-100 text-sm">Get verified once, then get matched to tasks near you.</p>
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

      {/* Form */}
      <div className="flex items-center justify-center px-[6vw] py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[400px]">
          <h2 className="text-[28px] mb-2">Create your account</h2>
          <p className="text-ink-soft text-[14.5px] mb-7">Choose how you'll use Tuma Mina.</p>

          <div className="flex bg-lavender-100 p-1 rounded-full mb-7">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 py-2.5 rounded-full text-[13.5px] font-semibold transition ${
                role === "client" ? "bg-white text-indigo-600 shadow-sm2" : "text-ink-soft"
              }`}
            >
              I need tasks done
            </button>
            <button
              type="button"
              onClick={() => setRole("runner")}
              className={`flex-1 py-2.5 rounded-full text-[13.5px] font-semibold transition ${
                role === "runner" ? "bg-white text-indigo-600 shadow-sm2" : "text-ink-soft"
              }`}
            >
              I want to be a runner
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="mb-[18px]">
              <label className="block text-[13px] font-semibold mb-1.5">Full name</label>
              <input type="text" placeholder="Lindiwe Dlamini" className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="mb-[18px]">
              <label className="block text-[13px] font-semibold mb-1.5">Contact number</label>
              <input type="text" placeholder="082 000 0000" className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="mb-[18px]">
            <label className="block text-[13px] font-semibold mb-1.5">Email address</label>
            <input type="text" placeholder="you@example.com" className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="mb-[18px]">
            <label className="block text-[13px] font-semibold mb-1.5">Password</label>
            <input type="password" placeholder="Create a password" className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500" />
          </div>

          {role === "runner" && (
            <div className="mb-[18px] p-3.5 rounded-xl bg-lavender-100 text-[13px] text-ink-soft">
              After sign-up you'll be asked for bank details and a proof of address to complete
              runner verification before you can accept jobs.
            </div>
          )}

          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft mb-[22px]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-[3px]"
            />
            I agree to the Terms of Service and confirm the details I submit for verification are accurate.
          </label>

          <Button type="submit" variant="primary" size="lg" block disabled={!agreed}>
            Create account
          </Button>

          <p className="text-center mt-6 text-sm text-ink-soft">
            Already have an account? <Link to="/login" className="text-indigo-600 font-bold">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}