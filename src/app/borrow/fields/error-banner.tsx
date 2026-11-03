export function ErrorBanner({ message }: { readonly message: string }): React.ReactElement {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      {message}
    </div>
  );
}
