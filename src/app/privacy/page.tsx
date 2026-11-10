import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button-class";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How LaunchLab AI stores your work: in your own browser, with no account.",
};

const SECTIONS = [
  {
    title: "Your projects stay in your browser",
    body: [
      "Everything you write in LaunchLab (ideas, canvases, pitches, interviews, finances, and the rest) is saved in this browser's local storage on this device. There are no accounts, and your projects are not uploaded to a server or database.",
      "That means nobody else can see your projects, including the people who run this site. It also means they do not sync to other devices, and clearing this site's data in your browser deletes them. Use the Backup Center to export a file you can keep.",
    ],
  },
  {
    title: "What is sent to the server",
    body: [
      "When you ask the coach for feedback or use Pitch Practice, the idea text from that project (and your practice answer) is sent to this site's server to produce feedback. In the default offline mode the server applies fixed rules, returns the result, and stores nothing.",
      "If the site owner has turned on the optional AI coach, that text is also sent to Anthropic to generate the feedback, and every response is labelled with the AI model's name. On this site the AI coach is off unless the coach page says otherwise.",
    ],
  },
  {
    title: "What is not collected",
    body: [
      "LaunchLab has no sign-up, no analytics or tracking scripts, no advertising, and no cookies of its own. The hosting provider may keep standard server logs, such as IP addresses and request times, to run and protect the service.",
    ],
  },
  {
    title: "Please use made-up or non-sensitive details",
    body: [
      "LaunchLab is a learning tool. Do not enter passwords, real financial account details, or private information about other people. When you record interviews, describe people by role (for example “junior, chemistry student”) rather than by name.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">Privacy</h1>
      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard" className={buttonClass("primary")}>
          Go to dashboard
        </Link>
        <Link href="/backup" className={buttonClass("secondary")}>
          Back up my projects
        </Link>
      </div>
    </div>
  );
}
