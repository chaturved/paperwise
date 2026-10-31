"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { resetPassword } from "@/lib/api/auth";
import { rateLimitMessage } from "@/lib/api-error";
import { Field } from "@/components/ui/field";
import { AuthHeading } from "./auth-shell";
import { PasswordInput } from "./password-input";
import { PasswordStrength } from "./password-strength";
import { Button, buttonVariants } from "@/components/ui/button";

const schema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((data) => data.new_password === data.confirm, { message: "Passwords don't match", path: ["confirm"] });
type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: "", confirm: "" },
  });
  const password = watch("new_password");

  if (!token) {
    return (
      <>
        <AuthHeading title="This link isn't valid">The reset link is missing or has expired. Request a new one to continue.</AuthHeading>
        <Link href="/forgot-password" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>Request a new link</Link>
      </>
    );
  }

  const onSubmit = async (data: FormData) => {
    try {
      await resetPassword(token, data.new_password);
      toast.success("Password updated. Please sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(rateLimitMessage(err) ?? "This reset link is invalid or has expired.");
    }
  };

  return (
    <>
      <AuthHeading title="Choose a new password">Use at least 8 characters.</AuthHeading>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-[18px]">
        <Field id="new_password" label="New password" error={errors.new_password?.message}>
          <PasswordInput id="new_password" autoComplete="new-password" autoFocus aria-invalid={Boolean(errors.new_password)} {...register("new_password")} />
          <PasswordStrength password={password} />
        </Field>
        <Field id="confirm" label="Confirm new password" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} {...register("confirm")} />
        </Field>
        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full disabled:opacity-60">
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}
