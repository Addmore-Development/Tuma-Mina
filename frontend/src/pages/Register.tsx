import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";
import { IconCamera, IconClose, IconDocument } from "../Customer/icons";

type Role = "client" | "runner";

interface UploadSlotProps {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
}

function UploadSlot({ label, hint, file, onChange, accept = "image/*,.pdf" }: UploadSlotProps) {
  return (
    <div className="mb-[18px]">
      <label className="block text-[13px] font-semibold mb-1">{label}</label>
      <p className="text-[12px] text-ink-soft mb-2">{hint}</p>
      {file ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-[1.5px] border-line rounded-xl bg-lavender-100">
          <span className="flex items-center gap-2 text-[13px] font-medium truncate">
            <IconDocument className="w-4 h-4 flex-shrink-0 text-indigo-600" />
            <span className="truncate">{file.name}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="text-ink-soft hover:text-[#a83232] flex-shrink-0">
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2.5 px-4 py-3 border-[1.5px] border-dashed border-line rounded-xl text-[13px] text-ink-soft cursor-pointer hover:border-indigo-400">
          <IconCamera className="w-4 h-4 flex-shrink-0" />
          Upload file
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("client");
  const [agreed, setAgreed] = useState(false);

  // Shared fields
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Runner-only KYC uploads
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [bankProof, setBankProof] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Required.";
    if (!surname.trim()) next.surname = "Required.";
    if (!idNumber.trim()) next.idNumber = "Required.";
    if (!address.trim()) next.address = "Required.";
    if (!phone.trim()) next.phone = "Required.";
    if (!email.trim()) next.email = "Required.";
    if (!password) next.password = "Required.";
    if (role === "runner") {
      if (!headshot) next.headshot = "A headshot photo is required for runner verification.";
      if (!idDocument) next.idDocument = "An ID document is required for runner verification.";
      if (!bankProof) next.bankProof = "Proof of bank account is required for runner verification.";
      if (!addressProof) next.addressProof = "Proof of address is required for runner verification.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (role === "client") {
      // TODO: POST /api/auth/register/customer
      // { name, surname, idNumber, address, phone, email, password }
      navigate("/customer");
      return;
    }

    // TODO: POST /api/auth/register/runner as multipart/form-data
    // { name, surname, idNumber, address, phone, email, password,
    //   headshot, idDocument, bankProof, addressProof }
    // Backend creates the RunnerApplication with status "pending" and all
    // four KYCDocument fields — admin must approve before the runner can
    // accept jobs (see AdminDashboard's Applications tab).
    navigate("/runner");
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
        <img src="/Register.jpg" alt="" className="absolute inset-0 z-0 w-full h-full object-cover" />
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

      <div className="flex items-center justify-center px-[6vw] py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[440px]">
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
            <Field label="Full name" error={errors.name}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lindiwe" className={inputClass(!!errors.name)} />
            </Field>
            <Field label="Surname" error={errors.surname}>
              <input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Dlamini" className={inputClass(!!errors.surname)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="ID number" error={errors.idNumber}>
              <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="9501015555088" className={inputClass(!!errors.idNumber)} />
            </Field>
            <Field label="Contact number" error={errors.phone}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="082 000 0000" className={inputClass(!!errors.phone)} />
            </Field>
          </div>

          <Field label="Residential address" error={errors.address}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, suburb, town" className={inputClass(!!errors.address)} />
          </Field>

          <Field label="Email address" error={errors.email}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass(!!errors.email)} />
          </Field>

          <Field label="Password" error={errors.password}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" className={inputClass(!!errors.password)} />
          </Field>

          {role === "runner" && (
            <div className="mb-[6px] p-4 rounded-xl bg-lavender-100">
              <p className="text-[13px] font-semibold mb-1">Runner verification documents</p>
              <p className="text-[12px] text-ink-soft mb-3">
                All four are required before an admin can approve your application — you won't be able to accept jobs until then.
              </p>
              <UploadSlot label="Headshot photo" hint="A clear photo of your face, used on your runner profile." file={headshot} onChange={setHeadshot} accept="image/*" />
              {errors.headshot && <p className="text-[12px] text-[#d64545] -mt-3 mb-3">{errors.headshot}</p>}
              <UploadSlot label="ID document" hint="A photo or scan of your ID book/card." file={idDocument} onChange={setIdDocument} />
              {errors.idDocument && <p className="text-[12px] text-[#d64545] -mt-3 mb-3">{errors.idDocument}</p>}
              <UploadSlot label="Proof of bank account" hint="Bank confirmation letter or statement showing your name and account number." file={bankProof} onChange={setBankProof} />
              {errors.bankProof && <p className="text-[12px] text-[#d64545] -mt-3 mb-3">{errors.bankProof}</p>}
              <UploadSlot label="Proof of address" hint="A utility bill or bank statement, dated within the last 3 months." file={addressProof} onChange={setAddressProof} />
              {errors.addressProof && <p className="text-[12px] text-[#d64545] -mt-3 mb-1">{errors.addressProof}</p>}
            </div>
          )}

          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft mb-[22px] mt-4">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-[3px]" />
            I agree to the Terms of Service and confirm the details and documents I submit are accurate.
          </label>

          <Button type="submit" variant="primary" size="lg" block disabled={!agreed}>
            {role === "runner" ? "Submit for verification" : "Create account"}
          </Button>

          <p className="text-center mt-6 text-sm text-ink-soft">
            Already have an account? <Link to="/login" className="text-indigo-600 font-bold">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-[15px] py-3 border-[1.5px] rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500 ${
    hasError ? "border-[#d64545]" : "border-line"
  }`;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-[18px]">
      <label className="block text-[13px] font-semibold mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[12px] text-[#d64545] mt-1">{error}</p>}
    </div>
  );
}