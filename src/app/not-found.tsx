import Link from "next/link";
import { buttonClass } from "@/components/button-class";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-6xl">Page not found.</h1>
      <p className="text-muted">That address does not lead anywhere in LaunchLab.</p>
      <Link href="/dashboard" className={buttonClass("primary")}>
        Go to dashboard
      </Link>
    </div>
  );
}
