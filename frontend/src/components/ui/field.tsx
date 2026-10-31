interface Props {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export function Field({ id, label, error, hint, aside, children }: Props) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="field-error">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
