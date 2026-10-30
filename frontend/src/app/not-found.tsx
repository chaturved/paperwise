import Link from "next/link";
import { StatusPage } from "@/components/ui/status-page";

export default function NotFound() {
  return (
    <StatusPage
      label="404 · Page not found"
      title="This page could not be found."
      actions={
        <>
          <Link href="/dashboard" className="btn-primary btn-lg px-6">Go to your workspace</Link>
          <Link href="/" className="btn-secondary btn-lg px-6">Back to home</Link>
        </>
      }
    >
      The link may have moved or been removed. You can go back to the start and find what you need from there.
    </StatusPage>
  );
}
