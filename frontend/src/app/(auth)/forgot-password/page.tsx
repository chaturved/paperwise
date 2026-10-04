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
        <Link href="/" className="mb-8 block font-display text-xl font-medium tracking-[-0.05em] xl:hidden">paperwise<span className="text-accent">.</span></Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 border-system bg-emerald-400/[0.08]">
              <Mail className="h-6 w-6 text-emerald-400" />
            </div>
            <h2 className="mb-2 text-[30px] font-medium leading-tight tracking-[-0.04em]">Check your inbox</h2>
            <p className="text-sm text-muted mb-6">
              If an account exists for that email, you&apos;ll receive a reset link shortly.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-1 text-[30px] font-medium leading-tight tracking-[-0.04em]">Reset your password</h2>
            <p className="text-sm text-muted mb-8">Enter your email and we&apos;ll send you a reset link.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
                  <input {...register("email")} type="email" placeholder="you@example.com"
                    className="w-full h-11 input-base pl-10 pr-4 text-sm" />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full !rounded-btn-md disabled:opacity-50">
                {isSubmitting
                  ? <span className="h-4 w-4 rounded-full border-2 border-ink/30 border-t-white animate-spin" />
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
