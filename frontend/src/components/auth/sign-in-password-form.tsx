"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { login } from "@/lib/api/auth";
import { apiErrorMessage, rateLimitMessage } from "@/lib/api-error";
import { useAuth } from "@/context/AuthContext";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "./password-input";
import { GoogleButton, OrDivider } from "./google-button";
import { MagicLinkButton } from "./magic-link-button";
import { Button } from "@/components/ui/button";

const schema = z.object({ password: z.string().min(1, "Enter your password") });
type FormData = z.infer<typeof schema>;

export function SignInPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(email, data.password);
      await refetchUser();
      router.push("/dashboard");
    } catch (err) {
      const limited = rateLimitMessage(err);
      if (limited) {
        toast.error(limited);
        return;
      }
      const serverError = axios.isAxiosError(err) && (err.response?.status ?? 0) >= 500;
      toast.error(
        serverError
          ? "Something went wrong on our end. Please try again."
          : apiErrorMessage(err, "Incorrect email or password"),
      );
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field
          id="password"
          label="Password"
          error={errors.password?.message}
          aside={
            <Link href="/forgot-password" className="link-underline text-[13px] text-muted hover:text-ink">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            autoFocus
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>
        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full disabled:opacity-60">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <OrDivider />
      <div className="space-y-3">
        <GoogleButton />
        <MagicLinkButton email={email} />
      </div>
    </>
  );
}
