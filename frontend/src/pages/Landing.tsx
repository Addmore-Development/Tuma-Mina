import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";

const steps = [
  { num: "01", title: "Post the task", body: "Describe it, set a budget or let runners quote. Add photos if it helps." },
  { num: "02", title: "A runner accepts", body: "Verified runners nearby see it and accept or negotiate the price." },
  { num: "03", title: "Track it live", body: "Watch their pin move in real time, from pickup to drop-off." },
  { num: "04", title: "Confirm & pay", body: "Photo proof or a PIN confirms it. Funds release the moment you approve — or after 72 hours automatically." },
];

// Icons for the hero filter row — kept as simple line icons so they inherit currentColor
const IconPackage = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7.5l9-4 9 4-9 4-9-4z" />
    <path d="M3 7.5v9l9 4 9-4v-9" />
    <path d="M12 11.5v9" />
  </svg>
);
const IconDocument = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="6" y="3" width="12" height="18" rx="1.5" />
    <path d="M9 8h6M9 12h6M9 16h3.5" />
  </svg>
);
const IconClock = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3.2 2" />
  </svg>
);
const IconCart = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="17.5" cy="20" r="1.4" />
    <path d="M2.5 3h2l2.3 11.4a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L20.5 7H6" />
  </svg>
);
const IconPin = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 21s7-6.7 7-12a7 7 0 1 0-14 0c0 5.3 7 12 7 12z" />
    <circle cx="12" cy="9" r="2.4" />
  </svg>
);
const IconEdit = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.7 3.7l3.6 3.6L7.5 20.1l-4.4.8.8-4.4z" />
  </svg>
);

// Hero filter row — tailored to the Tuma Mina task categories
const taskFilters = [
  { title: "Deliveries", icon: IconPackage },
  { title: "Documents", icon: IconDocument },
  { title: "Queuing", icon: IconClock },
  { title: "Shopping", icon: IconCart },
  { title: "Errands", icon: IconPin },
  { title: "Custom tasks", icon: IconEdit },
];

// Popular tasks — solid-colour tiles stand in for photography, title + price only
const popularTasks = [
  { title: "Parcel Delivery", price: "From R60", icon: IconPackage, bg: "bg-indigo-950" },
  { title: "Document Courier", price: "From R80", icon: IconDocument, bg: "bg-coral" },
  { title: "Home Affairs Queue", price: "From R120", icon: IconClock, bg: "bg-indigo-600" },
  { title: "Grocery Run", price: "From R90", icon: IconCart, bg: "bg-brand-green" },
  { title: "Bank Queue", price: "From R100", icon: IconClock, bg: "bg-indigo-900" },
  { title: "Furniture Pickup", price: "From R150", icon: IconPin, bg: "bg-coral-dark" },
  { title: "Gift Delivery", price: "From R70", icon: IconPackage, bg: "bg-indigo-600" },
  { title: "Custom Errand", price: "Get a quote", icon: IconEdit, bg: "bg-indigo-950" },
];

// Simplified "How it works" steps for the runner overlay card
const runnerHowItWorks = [
  { dot: "bg-[#c9a4ff]", body: "Choose jobs by price, distance and rating." },
  { dot: "bg-[#ffd166]", body: "Accept a job and get moving in minutes." },
  { dot: "bg-brand-green", body: "Get proof, get paid — straight to your wallet." },
];

const guarantees = [
  {
    title: "Escrow protected",
    body: "Payment sits safely in the app until you confirm the job's done — or it auto-releases after 72 hours.",
    icon: (
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    ),
  },
  {
    title: "Verified runners",
    body: "Every runner clears an ID, bank details and proof-of-address check before their first job goes live.",
    icon: (
      <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>
    ),
  },
  {
    title: "Real support",
    body: "A person on WhatsApp or phone if a job needs a hand — every day of the week, not a bot queue.",
    icon: (
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    ),
  },
];

const quickTasks = [
  ["Book a delivery", "#tasks"],
  ["Queue for you", "#tasks"],
  ["Send a document", "#tasks"],
  ["Grocery shopping", "#tasks"],
  ["Run an errand", "#tasks"],
  ["Get a custom quote", "#tasks"],
  ["Become a runner", "#runners"],
  ["Supervisor dashboard", "/dashboard"],
];

export default function Landing() {
  return (
    <div>
      {/* Hero — full-bleed photo restored, own headline, search + icon filters layered on top */}
      <section className="relative min-h-[720px] flex flex-col overflow-hidden">
        {/* Topbar — transparent over the photo */}
        <div className="relative z-20 flex items-center justify-between px-[6vw] py-[18px]">
          <Logo light />
          <div className="hidden md:flex items-center gap-9">
            <a href="#how" className="text-sm font-medium text-white/85 hover:text-white">How it works</a>
            <a href="#tasks" className="text-sm font-medium text-white/85 hover:text-white">What we run</a>
            <a href="#runners" className="text-sm font-medium text-white/85 hover:text-white">Become a runner</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghostLight">Log in</Button></Link>
            <Link to="/register"><Button variant="primary">Join now</Button></Link>
          </div>
        </div>
        {/* Background photo */}
        <img
          src="/hero.jpg"
          alt="Tuma Mina client booking a task from her phone"
          className="absolute inset-0 z-0 w-full h-full object-cover"
        />
        {/* Scrim for text legibility — flat solid tint, no gradient */}
        <div className="absolute inset-0 z-0 bg-indigo-950/60" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-[6vw] py-20">
          <div className="inline-flex items-center gap-2 w-fit font-mono text-xs uppercase tracking-wider text-indigo-100 border border-white/30 rounded-full px-3.5 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_0_4px_rgba(47,191,113,0.35)]" />
            Live in Gauteng
          </div>
          <h1 className="text-[clamp(32px,4.4vw,54px)] font-bold leading-[1.1] text-white max-w-[620px] mb-9">
            Too much on your list?<br />Tuma someone to run it.
          </h1>

          {/* Search bar */}
          <div className="w-full max-w-[620px] flex items-center bg-white rounded-full shadow-lg2 p-2 mb-7 mx-auto">
            <input
              type="text"
              placeholder="What do you need help with?"
              className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-soft"
            />
            <button
              type="button"
              aria-label="Search tasks"
              className="w-11 h-11 rounded-full bg-coral text-white flex items-center justify-center flex-shrink-0 hover:bg-coral-dark transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-[18px] h-[18px]">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Icon filter row — one per Tuma Mina task category */}
          <div className="flex items-start justify-center gap-7 md:gap-9 overflow-x-auto max-w-full pb-1 mb-9">
            {taskFilters.map((f, i) => {
              const Icon = f.icon;
              const active = i === 0;
              return (
                <a
                  key={f.title}
                  href="#tasks"
                  className="flex flex-col items-center gap-2 flex-shrink-0 group"
                >
                  <Icon
                    className={`w-5 h-5 ${active ? "text-white" : "text-indigo-100/70 group-hover:text-white"}`}
                  />
                  <span className={`text-[12.5px] font-medium whitespace-nowrap ${active ? "text-white" : "text-indigo-100/70 group-hover:text-white"}`}>
                    {f.title}
                  </span>
                  <span className={`w-full h-[2.5px] rounded-full ${active ? "bg-coral" : "bg-transparent"}`} />
                </a>
              );
            })}
          </div>

          <div className="flex gap-3.5 flex-wrap justify-center">
            <Link to="/register"><Button variant="primary" size="lg">Post your first task</Button></Link>
            <Link to="/register"><Button variant="ghostLight" size="lg">Become a runner</Button></Link>
          </div>
        </div>
      </section>

      {/* Route divider */}
      <div className="flex items-center justify-center px-[6vw] h-14">
        <svg viewBox="0 0 1200 56" preserveAspectRatio="none" className="w-full h-full">
          <line x1="0" y1="28" x2="1200" y2="28" stroke="#d7d6f2" strokeWidth="2" strokeDasharray="1 12" strokeLinecap="round" />
          <circle cx="16" cy="28" r="5" fill="#4b4fe0" />
          <circle cx="1184" cy="28" r="5" fill="#ff7a59" />
        </svg>
      </div>

      {/* Popular tasks */}
      <section id="tasks" className="px-[6vw] py-20 bg-lavender-100">
        <div className="max-w-[600px] mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 mx-auto mb-4 font-mono text-xs uppercase tracking-wider text-indigo-600 border border-indigo-400 rounded-full px-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            What we run
          </div>
          <h2 className="text-[clamp(26px,3vw,36px)]">Popular tasks, priced upfront.</h2>
          <p className="text-ink-soft text-base mt-3">If it needs doing in person, send it to a runner.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[1100px] mx-auto">
          {popularTasks.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="bg-white rounded-2xl overflow-hidden border border-line hover:-translate-y-1 hover:shadow-sm2 transition"
              >
                <div className={`aspect-[4/3] flex items-center justify-center ${t.bg}`}>
                  <Icon className="w-9 h-9 text-white" />
                </div>
                <div className="p-4">
                  <h5 className="text-[14.5px] leading-snug mb-1">{t.title}</h5>
                  <span className="text-[13px] text-ink-soft">{t.price}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guarantee / trust */}
      <section className="px-[6vw] py-20 bg-indigo-950 text-white">
        <div className="max-w-[600px] mx-auto text-center mb-14">
          <h2 className="text-[clamp(26px,3vw,36px)] mb-3">Every task, protected.</h2>
          <p className="text-indigo-100 text-base">Same guarantees whether it's a R60 delivery or a full day in a queue.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px] mx-auto">
          {guarantees.map((g) => (
            <div key={g.title} className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5 text-coral">
                  {g.icon}
                </svg>
              </div>
              <h4 className="text-[16.5px] mb-2">{g.title}</h4>
              <p className="text-[14px] text-indigo-100 max-w-[280px] mx-auto">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-[6vw] py-20">
        <div className="max-w-[600px] mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 mx-auto mb-4 font-mono text-xs uppercase tracking-wider text-indigo-600 border border-indigo-400 rounded-full px-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_0_4px_rgba(75,79,224,0.18)]" />
            How it works
          </div>
          <h2 className="text-[clamp(26px,3vw,36px)] mb-3">From "I need this done" to done — four stops.</h2>
          <p className="text-ink-soft text-base">Every task follows the same tracked route, whether it's a delivery, a document, or a day in a queue.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-y-9 max-w-[1180px] mx-auto relative">
          <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] border-t-2 border-dashed border-line" />
          {steps.map((s) => (
            <div key={s.num} className="relative z-10 px-4">
              <div className="w-14 h-14 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center mb-5 font-mono font-semibold text-indigo-600 text-[15px]">
                {s.num}
              </div>
              <h4 className="text-[16.5px] mb-2">{s.title}</h4>
              <p className="text-sm text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Runner recruitment — overlay card on the photo, simplified steps */}
      <section id="runners" className="px-[6vw] py-20 bg-lavender-100">
        <div className="max-w-[640px] mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 mx-auto mb-4 font-mono text-xs uppercase tracking-wider text-indigo-600 border border-indigo-400 rounded-full px-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Become a runner
          </div>
          <h2 className="text-[clamp(26px,3vw,36px)] mb-3">Earn on your own schedule, every job verified.</h2>
          <p className="text-ink-soft text-base mb-7">
            Set your own price per job, or accept the client's budget — payment lands in your wallet the moment a job's confirmed done.
          </p>
          <Link to="/register">
            <Button variant="dark" size="lg">Apply as a runner</Button>
          </Link>
        </div>

        <div className="relative max-w-[1000px] mx-auto">
          <img
            src="/runner.jpg"
            alt="Tuma Mina runner on the job"
            className="w-full h-[300px] md:h-[440px] object-cover rounded-3xl"
          />
          <div className="relative md:absolute md:left-8 md:bottom-8 mt-[-40px] md:mt-0 mx-6 md:mx-0 bg-white rounded-2xl shadow-lg2 p-7 md:p-8 max-w-[300px]">
            <h4 className="text-[17px] mb-5">How it works</h4>
            <ul className="flex flex-col gap-4">
              {runnerHowItWorks.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-full ${step.dot} text-ink text-[13px] font-semibold flex items-center justify-center flex-shrink-0`}>
                    {i + 1}
                  </span>
                  <span className="text-[14px] text-ink pt-0.5">{step.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-[6vw] py-20">
        <div className="bg-indigo-950 text-white text-center py-20 rounded-[28px] max-w-[1180px] mx-auto">
          <h2 className="text-[clamp(26px,3.4vw,38px)] mb-3.5">Something needs sending?</h2>
          <p className="text-indigo-100 max-w-[480px] mx-auto mb-7 text-base">
            Post it in under a minute and let a verified runner near you take it from here.
          </p>
          <Link to="/register"><Button variant="primary" size="lg">Get started free</Button></Link>
        </div>
      </section>

      {/* Quick task links */}
      <div className="px-[6vw] pb-14">
        <div className="max-w-[1180px] mx-auto">
          <h3 className="text-[13px] font-mono uppercase tracking-wider text-ink-soft mb-4">Get help today</h3>
          <div className="flex flex-wrap gap-2.5">
            {quickTasks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[13.5px] font-medium text-ink border border-line rounded-full px-4 py-2 hover:border-indigo-500 hover:text-indigo-600 transition"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="px-[6vw] py-10 flex justify-between items-center flex-wrap gap-4 text-ink-soft text-[13.5px] border-t border-line">
        <Logo className="text-base" />
        <span>© 2026 Tuma Mina. All rights reserved.</span>
        <Link to="/dashboard" className="font-mono text-indigo-600">View supervisor dashboard →</Link>
      </footer>
    </div>
  );
}