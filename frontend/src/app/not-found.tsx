import Link from "next/link";
import { ArrowUpRight, FileQuestion } from "lucide-react";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";


export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main className="flex min-h-[75vh] items-center justify-center px-5 pb-12 pt-16 text-center md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-lg bg-card text-ink"><FileQuestion size={25} /></div>
          <p className="mb-5 text-base text-ink/55">404 · Page not found</p>
          <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.0125em] md:text-[56px]">Looks like this page went missing.</h1>
          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-7 text-ink/60">The link may have moved. Head home and keep exploring Paperwise.</p>
          <Link href="/" className="mt-8 btn-primary btn-lg">Go home <ArrowUpRight size={16} /></Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
