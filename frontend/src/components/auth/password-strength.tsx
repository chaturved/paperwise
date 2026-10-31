const LABELS = ["", "Weak", "Fair", "Good", "Strong"];

function scorePassword(password: string): number {
  return [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^a-zA-Z0-9]/.test(password)].filter(
    Boolean,
  ).length;
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);

  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-[3px] flex-1 rounded-full transition-colors ${segment <= score ? "bg-ink" : "bg-line"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-[13px] text-muted">Strength: {LABELS[score].toLowerCase()}</p>
    </div>
  );
}
