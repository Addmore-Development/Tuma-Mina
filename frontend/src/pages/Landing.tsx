import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-[18px] h-[18px] flex-shrink-0 text-coral">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const steps = [
  { num: "01", title: "Post the task", body: "Describe it, set a budget or let runners quote. Add photos if it helps." },
  { num: "02", title: "A runner accepts", body: "Verified runners nearby see it and accept or negotiate the price." },
  { num: "03", title: "Track it live", body: "Watch their pin move in real time, from pickup to drop-off." },
  { num: "04", title: "Confirm & pay", body: "Photo proof or a PIN confirms it. Funds release the moment you approve — or after 72 hours automatically." },
];

const categories = [
  { title: "Deliveries", body: "Parcels, groceries, gifts — door to door", price: "From R60" },
  { title: "Documents", body: "Signed papers, applications, certified copies", price: "From R80" },
  { title: "Queuing", body: "Home Affairs, banks, licensing — they wait, you don't", price: "From R120" },
  { title: "Shopping", body: "Send a list, get the receipt and the goods", price: "From R90" },
  { title: "Errands", body: "Drop-offs, pick-ups, anything local", price: "From R70" },
  { title: "Custom tasks", body: "Tell us what you need — a runner will quote it", price: "Get a quote" },
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
      {/* Hero — full-bleed photo, nav overlaid, ProBio-style */}
      <section className="relative min-h-[640px] flex flex-col overflow-hidden">
        {/* Topbar — transparent over the photo, no border/shadow */}
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
        {/* Background photo — drop your own asset at public/hero.jpg */}
        <img
          src="/hero.jpg"
          alt="Tuma Mina client booking a task from her phone"
          className="absolute inset-0 z-0 w-full h-full object-cover"
        />
        {/* Scrim for text legibility — flat solid tint, no gradient */}
        <div className="absolute inset-0 z-0 bg-indigo-850/55" />

        <div className="relative z-10 flex-1 flex flex-col justify-center px-[6vw] py-24 max-w-[640px] ml-auto">
          <div className="inline-flex items-center gap-2 w-fit font-mono text-xs uppercase tracking-wider text-indigo-100 border border-white/30 rounded-full px-3.5 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_0_4px_rgba(47,191,113,0.35)]" />
            Live in Gauteng
          </div>
          <h1 className="text-[clamp(34px,4.4vw,56px)] font-bold leading-[1.08] text-white mb-5">
            Send it. Skip the trip.<br />
            Tuma Mina gets it done.
          </h1>
          <p className="text-[17px] text-indigo-50/90 max-w-[440px] mb-8">
            Post any errand — a delivery, a document, a queue you can't stand in — and a
            verified runner nearby picks it up, tracked pin to pin, until it's done.
          </p>
          <ul className="flex flex-col gap-3 mb-9">
            {[
              "Live GPS tracking, from pickup to proof of delivery",
              "Payment held safely in-app until the job's confirmed",
              "Every runner verified — ID, bank details, proof of address",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[15px] font-medium text-white">
                {CHECK}
                {item}
              </li>
            ))}
          </ul>
          <div className="flex gap-3.5 flex-wrap">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1100px] mx-auto">
          {categories.map((c) => (
            <div key={c.title} className="bg-white rounded-2xl p-6 border border-line flex items-center gap-3.5 hover:-translate-y-1 hover:shadow-sm2 transition">
              <div className="w-11 h-11 rounded-xl bg-indigo-950 flex items-center justify-center text-coral flex-shrink-0 font-display font-bold">
                {c.title.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-[15px]">{c.title}</h5>
                  <span className="text-[12.5px] font-semibold text-indigo-600 whitespace-nowrap">{c.price}</span>
                </div>
                <span className="text-[13px] text-ink-soft">{c.body}</span>
              </div>
            </div>
          ))}
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

      {/* Runner recruitment */}
      <section id="runners" className="px-[6vw] py-20 bg-lavender-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-center max-w-[1140px] mx-auto">
          <div>
            <div className="inline-flex items-center gap-2 mb-4 font-mono text-xs uppercase tracking-wider text-indigo-600 border border-indigo-400 rounded-full px-3.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              Become a runner
            </div>
            <h2 className="text-[30px] mb-2.5">Earn on your own schedule, every job verified.</h2>
            <p className="text-ink-soft text-[15px]">
              Set your own price per job, or accept the client's budget. Payment sits safely in
              escrow the moment a job starts, and lands in your wallet the moment it's confirmed done.
            </p>
            <ul className="flex flex-col gap-4 mt-6">
              {[
                ["Apply in minutes", "Full name, contact number, bank details and proof of address — that's it."],
                ["Get matched to jobs nearby", "See tasks around you and accept or negotiate the price."],
                ["Prove it, get paid", "A photo for drop-offs, a PIN for person-to-person — then funds release, or auto-release in 72 hours."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3.5 text-sm text-ink-soft">
                  <span className="font-mono font-semibold text-indigo-600 text-[13px] w-[26px] h-[26px] rounded-full border-[1.5px] border-indigo-400 flex items-center justify-center flex-shrink-0">
                    0{i + 1}
                  </span>
                  <div><b className="block text-ink text-[15px] mb-0.5">{title}</b>{body}</div>
                </li>
              ))}
            </ul>
            <Link to="/register">
              <Button variant="dark" size="lg" className="mt-7">Apply as a runner</Button>
            </Link>
          </div>
          <img
            src="/runner.jpg"
            alt="Tuma Mina runner on the job"
            className="w-full h-full min-h-[420px] object-cover rounded-3xl"
          />
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