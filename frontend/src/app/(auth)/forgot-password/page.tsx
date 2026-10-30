"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api/auth";
import { toast } from "sonner";
import { AuthBackground } from "@/components/auth/auth-background";


const schema = z.object({ email: z.string().email("Enter a valid email address") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="auth-page relative">
      <AuthBackground />
      <div className="auth-panel">
        <Link href="/" aria-label="Paperwise home" className="mx-auto mb-6 grid h-10 w-10 place-items-center rounded-lg bg-ink font-display text-xl leading-none text-bg">P</Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-5 border border-line bg-card">
              <Mail className="h-6 w-6 text-ink" />
            </div>
            <h2 className="mb-2 font-display text-[40px] font-normal leading-tight tracking-[-0.0125em]">Check your inbox</h2>
            <p className="text-sm text-muted mb-6">
              If an account exists for that email, you&apos;ll receive a reset link shortly.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-1 text-center font-display text-[36px] font-normal leading-tight tracking-[-0.0125em]">Reset your password</h2>
            <p className="text-center text-sm text-muted mb-8">Enter your email and we&apos;ll send you a reset link.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm text-ink/60 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
                  <input {...register("email")} type="email" placeholder="you@example.com"
                    className="w-full h-11 input-base !rounded-lg !border-line pl-10 pr-4 text-sm" />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg w-full !min-h-11 !rounded-lg disabled:opacity-50">
                {isSubmitting
                  ? <span className="h-4 w-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
                  : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
