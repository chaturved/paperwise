"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signup } from "@/lib/api/auth";
import { apiErrorMessage, rateLimitMessage } from "@/lib/api-error";
import { useAuth } from "@/context/AuthContext";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "./password-input";
import { PasswordStrength } from "./password-strength";
import { GoogleButton, OrDivider } from "./google-button";
import { Button } from "@/components/ui/button";

const schema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export function SignUpDetailsForm({ email }: { email: string }) {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", password: "" },
  });
  const password = watch("password");

  const onSubmit = async (data: FormData) => {
    try {
      await signup(email, data.password, data.full_name);
      await refetchUser();
      router.push("/onboarding");
    } catch (err) {
      toast.error(rateLimitMessage(err) ?? apiErrorMessage(err, "We couldn't create your account. Please try again."));
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-[18px]">
        <Field id="full_name" label="Full name" error={errors.full_name?.message}>
          <input id="full_name" autoComplete="name" autoFocus aria-invalid={Boolean(errors.full_name)} {...register("full_name")} className="field" />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message} hint="Use at least 8 characters.">
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
          <PasswordStrength password={password} />
        </Field>
        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full disabled:opacity-60">
          {isSubmitting ? "Creating your account…" : "Create account"}
        </Button>
      </form>
      <OrDivider />
      <GoogleButton />
    </>
  );
}
