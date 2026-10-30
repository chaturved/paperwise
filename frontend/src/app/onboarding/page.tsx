"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, CheckCircle, TriangleAlert, ArrowRight, ArrowLeft, FileText, MessageSquareText, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { completeOnboarding } from "@/lib/api/users";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useLibrary } from "@/hooks/useLibrary";
import { apiErrorMessage } from "@/lib/api-error";
import { AuthBackground } from "@/components/auth/auth-background";

const SUGGESTIONS = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main conclusions?",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const { documents, loaded, refresh, retry } = useLibrary();
  const { upload, uploading } = useDocumentUpload(refresh);
  const uploadedDoc = documents[0] ?? null;
  const [question, setQuestion] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const skippedAhead = useRef(false);
  useEffect(() => {
    if (!loaded || skippedAhead.current) return;
    skippedAhead.current = true;
    if (uploadedDoc?.status === "ready") setStep(3);
  }, [loaded, uploadedDoc]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { errors } = await upload([file]);
      if (errors[0]) toast.error(errors[0].error);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Upload failed. Try a PDF, TXT, or MD file under 10 MB."));
    } finally {
      e.target.value = "";
    }
  }, [upload]);

  const goAsk = useCallback(async (q: string) => {
    if (!q.trim()) return;
    try {
      await completeOnboarding();
    } catch { /* not fatal, still take them to the dashboard */ }
    router.push(`/dashboard?q=${encodeURIComponent(q.trim())}`);
  }, [router]);

  const handleComplete = async () => {
    try {
      await completeOnboarding();
    } catch { /* not fatal, still take them to the dashboard */ }
    router.push("/dashboard");
  };

  const steps = [
    { n: 1, label: "Welcome" },
    { n: 2, label: "Upload" },
    { n: 3, label: "Ask" },
  ];

  return (
    <div className="auth-page relative">
      <AuthBackground />
      <div className="auth-panel !max-w-[520px]">
        <span className="mb-10 block font-display text-[28px] leading-none tracking-[-0.02em]">Paperwise</span>

        <div className="flex items-center gap-2 mb-3">
          {steps.map((s) => (
            <div key={s.n} className="flex-1 h-[3px] rounded-full overflow-hidden bg-ink/[0.06]">
              <div className="h-full rounded-full bg-accent transition-all duration-500"
                   style={{ width: step > s.n ? "100%" : step === s.n ? "60%" : "0%" }} />
            </div>
          ))}
        </div>
        <p className="text-xs text-faint mb-8">Step {step} of 3</p>

        {step === 1 && (
          <div className="animate-fu">
            <h2 className="mb-2 font-display text-[36px] font-normal leading-tight tracking-[-0.0125em]">
              Welcome to Paperwise{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
            </h2>
            <p className="text-sm text-muted mb-8">
              You&apos;re 3 steps away from chatting with your first document.
            </p>
            <div className="mb-8 grid gap-3 rounded-lg border border-ink/10 bg-card p-5 sm:grid-cols-3">
              {[{ icon: FileText, label: "Upload" }, { icon: MessageSquareText, label: "Ask" }, { icon: ShieldCheck, label: "Check sources" }].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-[13px] text-ink/70">
                  <Icon size={17} className="text-accent" /> {label}
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary btn-lg w-full">
              Let&apos;s go <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fu">
            <h2 className="mb-2 font-display text-[36px] font-normal leading-tight tracking-[-0.0125em]">Upload your first document</h2>
            <p className="text-sm text-muted mb-6">Drop a PDF, TXT, or MD file to get started.</p>

            {uploadedDoc ? (
              <div className={`flex items-center gap-3 rounded-md p-4 mb-6 border ${uploadedDoc.status === "failed" ? "bg-red-500/[0.06] border-red-500/20" : "bg-emerald-400/[0.08] border-emerald-400/[0.18]"}`}>
                {uploadedDoc.status === "failed" ? <TriangleAlert className="h-5 w-5 flex-shrink-0 text-red-500" />
                  : uploadedDoc.status === "ready" ? <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                  : <span className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-ink/10 border-t-ink/50 animate-spin" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{uploadedDoc.name}</p>
                  <p className="text-xs text-faint">
                    {uploadedDoc.status === "failed" ? uploadedDoc.error_message
                      : uploadedDoc.status === "ready" ? `${(uploadedDoc.size / 1024).toFixed(0)} KB · Ready`
                      : "Reading your document…"}
                  </p>
                </div>
                {uploadedDoc.status === "failed" && (
                  <button onClick={() => retry(uploadedDoc.id).catch((err) => toast.error(apiErrorMessage(err, "Retry failed")))}
                    className="text-xs font-medium text-ink underline underline-offset-2">Try again</button>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-md p-10 flex flex-col items-center gap-3 transition-all mb-6 disabled:opacity-50 border-2 border-dashed border-ink/[0.08] bg-ink/[0.02]"
              >
                {uploading ? (
                  <span className="h-6 w-6 rounded-full border-2 border-ink/10 border-t-white/50 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-faint" />
                )}
                <span className="text-sm text-muted">{uploading ? "Uploading…" : "Choose a file to upload"}</span>
                <span className="text-xs text-faint">PDF · TXT · MD · Max 10 MB</span>
              </button>
            )}

            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileChange} />

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="h-11 px-5 rounded-md border-system bg-ink/[0.04] text-sm text-muted hover:text-ink transition flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={() => setStep(3)} disabled={uploadedDoc?.status !== "ready"}
                className="btn-primary btn-lg flex-1 disabled:opacity-40">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fu">
            <h2 className="mb-2 font-display text-[36px] font-normal leading-tight tracking-[-0.0125em]">Now ask something about it!</h2>
            <p className="text-sm text-muted mb-6">Try one of these or write your own.</p>

            <div className="flex flex-col gap-2 mb-5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuestion(s)}
                  className={`text-left px-4 py-2.5 rounded-md border text-sm transition ${
                    question === s
                      ? "border-accent/50 bg-ink/[0.08] text-ink"
                      : "border-system bg-ink/[0.04] text-muted hover:border-accent/30 hover:text-ink hover:bg-ink/[0.07]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && question.trim()) goAsk(question); }}
                placeholder="Or type your own question…"
                className="w-full h-11 rounded-md bg-ink/[0.05] border border-ink/[0.08] px-4 text-sm text-ink placeholder:text-ink/20 outline-none focus:border-accent/50 transition"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="h-11 px-5 rounded-md border-system bg-ink/[0.04] text-sm text-muted hover:text-ink transition flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={() => (question.trim() ? goAsk(question) : handleComplete())}
                className="btn-primary btn-lg flex-1">
                Start Conversation <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
