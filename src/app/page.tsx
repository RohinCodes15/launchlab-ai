import Link from "next/link";
import { buttonClass } from "@/components/button-class";

const STEPS = [
  {
    step: "01",
    title: "Idea Studio",
    text: "Write the problem, the audience, your solution, and the assumptions it rests on. Everything saves as you type.",
  },
  {
    step: "02",
    title: "Startup Coach",
    text: "Get structured feedback: problem clarity, risks, competitor questions, and experiments you can run this week.",
  },
  {
    step: "03",
    title: "Business Model Canvas",
    text: "Fill in the nine blocks with drafts suggested from your idea, then print it on a single page.",
  },
  {
    step: "04",
    title: "Pitch Builder",
    text: "Turn the idea and canvas into nine editable slides, with flags on claims a judge would question.",
  },
];

const PRINCIPLES = [
  {
    title: "Works without an API key",
    text: "The built-in coach is rule-based and runs offline. A real AI model is optional, and the app always tells you which one answered.",
  },
  {
    title: "Your work stays in your browser",
    text: "There are no accounts. Projects are stored on this device only, so nobody else can read or change them.",
  },
  {
    title: "No invented statistics",
    text: "The coach asks questions and labels hypotheses. It does not make up market sizes or pretend to have researched competitors.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="animate-rise">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
            For student founders
          </p>
          <h1 className="font-display text-6xl leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            From idea
            <br />
            to <em className="text-accent">startup.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            LaunchLab AI walks you from a rough idea to a tested plan: shape the idea, get coached,
            map the business model, and leave with a pitch you can defend.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className={buttonClass("primary")}>
              Start a project
            </Link>
            <a href="#how-it-works" className={buttonClass("secondary")}>
              See how it works
            </a>
          </div>
        </div>

        <div aria-hidden className="relative hidden lg:block">
          <div className="absolute -right-4 top-6 h-full w-full rounded-3xl border border-line bg-raised" />
          <div className="relative rounded-3xl border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl">StudySwap</p>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                Validating
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Students trade tutoring hours instead of paying for them.
            </p>
            <ol className="mt-6 space-y-3">
              {["Idea Studio", "Startup Coach", "Business Model Canvas", "Pitch Builder"].map(
                (name, index) => (
                  <li key={name} className="flex items-center gap-3 text-sm">
                    <span
                      className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${
                        index < 3 ? "bg-accent text-accent-fg" : "border border-line text-muted"
                      }`}
                    >
                      {index < 3 ? "✓" : index + 1}
                    </span>
                    <span className={index < 3 ? "" : "text-muted"}>{name}</span>
                  </li>
                ),
              )}
            </ol>
            <div className="mt-6 rounded-xl bg-raised p-4 text-sm">
              <p className="font-medium">Next step from the coach</p>
              <p className="mt-1 text-muted">
                Run five problem interviews and write down exact quotes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="scroll-mt-20 border-t border-line py-16"
      >
        <h2 id="how-heading" className="font-display text-4xl sm:text-5xl">
          Four steps, one project.
        </h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => (
            <li key={item.step} className="bg-surface p-6">
              <p className="font-display text-3xl text-accent">{item.step}</p>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="honest-heading"
        className="grid gap-10 border-t border-line py-16 lg:grid-cols-[0.8fr_1.2fr]"
      >
        <h2 id="honest-heading" className="font-display text-4xl sm:text-5xl">
          Honest by design.
        </h2>
        <dl className="space-y-8">
          {PRINCIPLES.map((item) => (
            <div key={item.title}>
              <dt className="font-semibold">{item.title}</dt>
              <dd className="mt-1 text-muted">{item.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-sm text-muted">
        <p>LaunchLab AI. A learning tool, not financial or legal advice.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/privacy" className="underline underline-offset-4 hover:text-fg">
            Privacy
          </Link>
          <Link href="/dashboard" className="underline underline-offset-4 hover:text-fg">
            Open the dashboard
          </Link>
        </nav>
      </footer>
    </div>
  );
}
