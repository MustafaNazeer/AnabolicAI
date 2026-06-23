export function ErrorRetry({
  message,
  onRetry,
  pending,
}: {
  message: string;
  onRetry: () => void;
  pending?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-3 py-2 mt-2 text-sm"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-square)",
        color: "var(--text)",
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending}
        className="font-semibold disabled:opacity-60"
        style={{ color: "var(--accent)", minHeight: 44, paddingInline: 8 }}
      >
        {pending ? "Retrying" : "Retry"}
      </button>
    </div>
  );
}
