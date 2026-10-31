import { ArrowRight, Check, FileText } from "lucide-react";
import Link from "next/link";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { buttonVariants } from "@/components/ui/button";

const AUDIENCES = [
  {
    title: "Freelancers",
    text: "Read a client agreement or brief before you sign or start.",
    href: "/for/freelancers",
    warm: false,
    files: [
      ["Client agreement", "pdf"],
      ["Project brief", "docx"],
      ["Invoice terms", "pdf"],
    ],
  },
  {
    title: "Small businesses",
    text: "Find the answer in leases, policies and supplier terms.",
    href: "/for/small-business",
    warm: true,
    files: [
      ["Office lease", "pdf"],
      ["Employee handbook", "pdf"],
      ["Supplier terms", "docx"],
    ],
  },
  {
    title: "Researchers and students",
    text: "Ask a paper, textbook or manual a question and see the page it came from.",
    href: "/for/researchers-and-students",
    warm: false,
    files: [
      ["Research paper", "pdf"],
      ["Lecture notes", "pdf"],
      ["Assignment brief", "docx"],
    ],
  },
] as const;

export function AudienceTiles() {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-3">
      {AUDIENCES.map((audience) => (
        <Link
          key={audience.href}
          href={audience.href}
          className={`paint ${audience.warm ? "paint-warm" : ""} flex min-h-[460px] flex-col rounded-lg pl-6 pt-7 text-white md:pl-7 md:pt-8`}
        >
          <h3 className="pr-6 font-display text-[30px] font-normal leading-[1.05] tracking-[-0.01em] md:pr-7">
            {audience.title}
          </h3>
          <p className="mb-5 mt-3 max-w-[30ch] pr-6 text-[15.5px] leading-[1.35] text-white/85 md:pr-7">
            {audience.text}
          </p>
          <span className={buttonVariants({ variant: "outlineLight", size: "md", className: "self-start" })}>
            Explore <ArrowRight size={15} />
          </span>
          <div className="ml-4 mt-auto rounded-tl-lg bg-surface p-4 text-ink shadow-[0_-4px_30px_rgba(0,0,0,0.18)]">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink/45">Typical documents</p>
            {audience.files.map(([name, ext]) => (
              <div
                key={name}
                className="flex items-center gap-2.5 border-t border-line py-2.5 text-[13.5px] first:border-t-0"
              >
                <FileText size={14} className="flex-shrink-0 text-ink/45" />
                <span>{name}</span>
                <span className="ml-auto font-mono text-[11px] text-ink/45">.{ext}</span>
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Points({ items, light }: { items: string[]; light?: boolean }) {
  return (
    <ul className="mt-6 space-y-2.5">
      {items.map((item) => (
        <li
          key={item}
          className={`flex items-start gap-2.5 text-[15.5px] leading-snug ${light ? "text-white/90" : "text-ink/75"}`}
        >
          <Check size={16} className={`mt-0.5 flex-shrink-0 ${light ? "text-white/70" : "text-accent"}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PlansTeaser() {
  return (
    <div className="mt-12">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex min-h-[340px] flex-col rounded-lg border border-line bg-surface p-7 md:p-9">
          <span className="w-fit rounded-[3px] border border-line px-2 py-0.5 text-xs font-medium text-ink/70">
            Available now
          </span>
          <h3 className="mt-5 font-display text-[40px] font-normal leading-none tracking-[-0.01em]">Free</h3>
          <p className="mt-3 max-w-[36ch] text-base leading-[1.35] text-ink/65">
            Everything you need to try Paperwise on your own documents. No payment details.
          </p>
          <Points
            items={["Ask questions of your documents", "Answers with numbered sources", "A library to keep your files"]}
          />
          <div className="mt-auto pt-8">
            <AuthActionLink
              signedOutLabel="Get started free"
              signedInLabel="Open your workspace"
              arrow="right"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            />
          </div>
        </div>
        <div className="paint paint-warm flex min-h-[340px] flex-col rounded-lg p-7 text-white md:p-9">
          <span className="w-fit rounded-[3px] bg-[#f4ec1e] px-2 py-0.5 text-xs font-medium text-[#0f0e0d]">
            Coming soon
          </span>
          <h3 className="mt-5 font-display text-[40px] font-normal leading-none tracking-[-0.01em]">Pro</h3>
          <p className="mt-3 max-w-[36ch] text-base leading-[1.35] text-white/85">
            For people who read more than a few documents. More room, larger files and your full history.
          </p>
          <Points light items={["More documents and questions", "Larger files", "Full conversation history"]} />
          <div className="mt-auto pt-8">
            <Link href="/pricing" className={buttonVariants({ variant: "light", size: "lg" })}>
              Join the waitlist
            </Link>
          </div>
        </div>
      </div>
      <p className="mt-6 text-[15.5px]">
        <Link href="/pricing" className="underline underline-offset-4">
          Compare plans and pricing
        </Link>
      </p>
    </div>
  );
}
