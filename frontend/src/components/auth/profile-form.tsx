"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { deleteAccount, updateProfile } from "@/lib/api/users";
import { Field } from "@/components/ui/field";
import { AppearanceSetting } from "@/components/settings/appearance-setting";
import { SettingsHeading, SettingsSection } from "@/components/settings/settings-section";

const schema = z.object({ full_name: z.string().trim().min(2, "Name must be at least 2 characters") });
type FormData = z.infer<typeof schema>;

export function ProfileForm() {
  const { user, refetchUser } = useAuth();
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: user?.full_name || "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await updateProfile(data.full_name);
      await refetchUser();
      reset({ full_name: data.full_name });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      await refetchUser();
      router.push("/login");
    } catch {
      toast.error("Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div>
      <SettingsHeading title="Profile">How you appear in Paperwise, and the email we use to reach you.</SettingsHeading>

      <SettingsSection title="Name" description="Shown in the sidebar and in emails from us.">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg" aria-hidden="true">
            {user?.avatar_initials || "??"}
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor="full_name" className="sr-only">Full name</label>
            <input id="full_name" aria-invalid={Boolean(errors.full_name)} {...register("full_name")} className="field" />
            {errors.full_name && <p role="alert" className="field-error">{errors.full_name.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary btn-lg disabled:opacity-40">
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </form>
      </SettingsSection>

      <SettingsSection title="Email" description="Used to sign in. To change it, contact support.">
        <Field id="email" label="Email address">
          <input id="email" value={user?.email || ""} readOnly className="field" />
        </Field>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted"><Check size={14} strokeWidth={2.2} className="text-ink" /> Verified</p>
      </SettingsSection>

      <SettingsSection title="Appearance" description="Choose how Paperwise looks on this device.">
        <AppearanceSetting />
      </SettingsSection>

      <SettingsSection title="Delete account" description="Removes your documents, conversations and data. This cannot be undone.">
        {!showDelete ? (
          <button type="button" onClick={() => setShowDelete(true)} className="btn-danger">Delete my account</button>
        ) : (
          <div className="max-w-sm space-y-3">
            <Field id="delete-confirm" label="Type DELETE to confirm">
              <input id="delete-confirm" value={deleteInput} onChange={(event) => setDeleteInput(event.target.value)} placeholder="DELETE" autoComplete="off" className="field" />
            </Field>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowDelete(false); setDeleteInput(""); }} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteInput !== "DELETE" || deleting} className="btn-danger-solid disabled:opacity-40">
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
