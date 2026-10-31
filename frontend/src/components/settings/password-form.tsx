"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { changePassword } from "@/lib/api/users";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";

const schema = z.object({
  current_password: z.string().min(1, "Enter your current password"),
  new_password: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine((data) => data.new_password === data.confirm, { message: "Passwords don't match", path: ["confirm"] });
type FormData = z.infer<typeof schema>;

export function PasswordForm() {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });
  const password = watch("new_password");

  const onSubmit = async (data: FormData) => {
    try {
      await changePassword(data.current_password, data.new_password);
      toast.success("Password updated");
      reset();
    } catch {
      toast.error("Current password is incorrect");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-[460px] space-y-5">
      <Field id="current_password" label="Current password" error={errors.current_password?.message}>
        <PasswordInput id="current_password" autoComplete="current-password" aria-invalid={Boolean(errors.current_password)} {...register("current_password")} />
      </Field>
      <Field id="new_password" label="New password" error={errors.new_password?.message}>
        <PasswordInput id="new_password" autoComplete="new-password" aria-invalid={Boolean(errors.new_password)} {...register("new_password")} />
        <PasswordStrength password={password} />
      </Field>
      <Field id="confirm" label="Confirm new password" error={errors.confirm?.message}>
        <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} {...register("confirm")} />
      </Field>
      <Button type="submit" disabled={isSubmitting} size="lg" className="disabled:opacity-60">
        {isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
