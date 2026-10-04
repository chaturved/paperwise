"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, User, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { signup } from "@/lib/api/auth";
import { useAuth } from "@/context/AuthContext";
import { AuthBackground } from "@/components/auth/auth-background";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

function PasswordStrength({ pw }: { pw: string }) {
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw)].filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-500", "bg-accent", "bg-yellow-400", "bg-emerald-500"];
  if (!pw) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-[3px] flex-1 rounded-full transition-all ${i <= score ? colors[score] : "bg-ink/[0.08]"}`} />
        ))}
      </div>
      <p className="text-[10px] text-faint">{labels[score]}</p>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const pw = watch("password", "");

  const onSubmit = async (data: FormData) => {
    try {
      await signup(data.email, data.password, data.full_name);
      await refetchUser();
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to create account");
    }
  };

  return (
    <div className="auth-page relative">
      <AuthBackground />
      <div className="auth-panel">
        <Link href="/" className="mb-8 block font-display text-xl font-medium tracking-[-0.05em] xl:hidden">paperwise<span className="text-accent">.</span></Link>

        <h2 className="mb-1 text-[30px] font-medium leading-tight tracking-[-0.04em]">Create your account</h2>
        <p className="text-sm text-muted mb-8">Start chatting with your documents for free.</p>

        <a
          href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/auth/google`}
          className="flex items-center justify-center gap-3 w-full h-11 rounded-btn-md border-system bg-ink/[0.04] text-sm text-ink/80 hover:bg-ink/[0.07] transition-all mb-5"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-ink/[0.06]" />
          <span className="text-xs text-faint">or</span>
          <div className="flex-1 h-px bg-ink/[0.06]" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
              <input {...register("full_name")} placeholder="Jane Doe"
                className="w-full h-11 input-base pl-10 pr-4 text-sm" />
            </div>
            {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
              <input {...register("email")} type="email" placeholder="you@example.com"
                className="w-full h-11 input-base pl-10 pr-4 text-sm" />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
              <input {...register("password")} type={showPw ? "text" : "password"} placeholder="At least 8 characters"
                className="w-full h-11 input-base pl-10 pr-10 text-sm" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-muted">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            <PasswordStrength pw={pw} />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full !rounded-btn-md disabled:opacity-50">
            {isSubmitting
              ? <span className="h-4 w-4 rounded-full border-2 border-ink/30 border-t-white animate-spin" />
              : <>Create account <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-ink font-medium hover:opacity-80 transition">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
