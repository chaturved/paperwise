"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileText, TriangleAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { completeOnboarding } from "@/lib/api/users";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useLibrary } from "@/hooks/useLibrary";
import { apiErrorMessage } from "@/lib/api-error";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const STEPS = ["Welcome", "Upload", "Ask"];

const SUGGESTIONS = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main conclusions?",
];

const OUTLINE = [
  { title: "Upload a document", detail: "A PDF, Word file, text or Markdown, up to 10 MB." },
  { title: "Ask a question", detail: "In plain words, the way you would ask a colleague." },
  { title: "Check the source", detail: "Every answer points to the passage it came from." },
];

function Heading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="mb-3 font-display text-[40px] font-normal leading-[1.05] tracking-[-0.0125em] sm:text-5xl">{title}</h1>
      <p className="mb-7 text-[17px] leading-relaxed text-muted">{children}</p>
    </>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [question, setQuestion] = useState("");
  const { documents, loaded, refresh, remove, retry } = useLibrary();
  const { upload, uploading } = useDocumentUpload(refresh);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadedDoc = documents[0] ?? null;

  const skippedAhead = useRef(false);
  useEffect(() => {
    if (!loaded || skippedAhead.current) return;
    skippedAhead.current = true;
    if (uploadedDoc?.status === "ready") setStep(3);
  }, [loaded, uploadedDoc]);

  const finish = useCallback(async (destination: string) => {
    try {
      await completeOnboarding();
    } catch {
      /* Not fatal: the user still goes on to the workspace. */
    }
    router.push(destination);
  }, [router]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { errors } = await upload([file]);
      if (errors[0]) toast.error(errors[0].error);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Upload failed. Try a PDF, Word, TXT or MD file under 10 MB."));
    } finally {
      event.target.value = "";
    }
  };

  const startConversation = () => {
    const trimmed = question.trim();
    finish(trimmed ? `/dashboard?q=${encodeURIComponent(trimmed)}` : "/dashboard");
  };

  const firstName = user?.full_name?.split(" ")[0];
  const failed = uploadedDoc?.status === "failed";

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-5 py-6 text-ink sm:px-10 md:px-16 md:py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-display text-[26px] tracking-[-0.0125em]">Paperwise</Link>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => finish("/dashboard")} className="link-underline text-sm text-muted hover:text-ink">Skip for now</button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-[560px]">
          <div className="mb-3 flex gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step} aria-label="Onboarding progress">
            {STEPS.map((label, index) => (
              <div key={label} className={`h-[3px] flex-1 rounded-full transition-colors ${index < step ? "bg-ink" : "bg-line"}`} />
            ))}
          </div>
          <p className="mb-9 font-mono text-[13px] text-muted">Step {step} of {STEPS.length} · {STEPS[step - 1]}</p>

          {step === 1 && (
            <>
              <Heading title={`Welcome to Paperwise${firstName ? `, ${firstName}` : ""}`}>You are three steps from your first answer, with the source beside it.</Heading>
              <ol className="mb-8 border-b border-line">
                {OUTLINE.map((item, index) => (
                  <li key={item.title} className="flex items-center gap-5 border-t border-line py-5">
                    <span className="w-6 font-mono text-[13px] text-muted">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-[17px] font-medium">{item.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => setStep(2)} className="btn-primary btn-lg w-full">Get started</button>
            </>
          )}

          {step === 2 && (
            <>
              <Heading title="Upload your first document">PDF, Word, text or Markdown, up to 10 MB. Contracts and reports work well.</Heading>

              {uploadedDoc ? (
                <div className={`mb-3 flex items-center gap-4 rounded-lg border bg-surface px-5 py-4 ${failed ? "border-danger" : "border-ink"}`}>
                  {failed ? <TriangleAlert size={22} className="shrink-0 text-danger" />
                    : uploadedDoc.status === "ready" ? <FileText size={22} strokeWidth={1.7} className="shrink-0" />
                    : <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{uploadedDoc.name}</p>
                    <p className={`mt-0.5 text-[13px] ${failed ? "text-danger" : "font-mono text-xs text-muted"}`}>
                      {failed ? uploadedDoc.error_message
                        : uploadedDoc.status === "ready" ? `${Math.max(1, Math.round(uploadedDoc.size / 1024))} KB · Ready`
                        : "Reading your document…"}
                    </p>
                  </div>
                  {uploadedDoc.status === "ready" && <Check size={20} strokeWidth={2.2} className="shrink-0" />}
                  {failed && (
                    <button type="button" onClick={() => retry(uploadedDoc.id).catch((err) => toast.error(apiErrorMessage(err, "Retry failed")))} className="link-underline shrink-0 text-sm font-medium">Try again</button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="mb-3 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-field px-6 py-12 text-center transition hover:border-ink disabled:opacity-60"
                >
                  <span className="text-base font-medium">{uploading ? "Uploading…" : "Choose a file to upload"}</span>
                  <span className="font-mono text-xs text-muted">PDF · DOCX · TXT · MD · up to 10 MB</span>
                </button>
              )}

              {uploadedDoc && (
                <p className="mb-8 text-sm text-muted">
                  Wrong file?{" "}
                  <button type="button" onClick={() => remove(uploadedDoc.id).catch((err) => toast.error(apiErrorMessage(err, "Couldn't remove the file")))} className="link-underline font-medium text-ink">Use a different file</button>
                </p>
              )}
              {!uploadedDoc && <div className="mb-8" />}

              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" aria-label="Choose a document" onChange={handleFileChange} />

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary btn-lg px-6">Back</button>
                <button type="button" onClick={() => setStep(3)} disabled={uploadedDoc?.status !== "ready"} className="btn-primary btn-lg flex-1 disabled:opacity-40">Continue</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Heading title="Ask something about it">Choose one of these, or write your own. You will see the passage each answer comes from.</Heading>
              <div className="mb-5 space-y-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuestion(suggestion)}
                    aria-pressed={question === suggestion}
                    className={`block w-full rounded-lg border bg-surface px-[18px] py-3.5 text-left text-base transition ${question === suggestion ? "border-ink" : "border-line hover:border-field"}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <label htmlFor="own-question" className="sr-only">Your own question</label>
              <input
                id="own-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && question.trim()) startConversation(); }}
                placeholder="Or type your own question"
                className="field mb-7"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary btn-lg px-6">Back</button>
                <button type="button" onClick={startConversation} className="btn-primary btn-lg flex-1">Start conversation</button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
