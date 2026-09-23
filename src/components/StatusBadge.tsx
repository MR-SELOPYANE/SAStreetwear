const styles: Record<string, string> = {
  pending: "border-foreground bg-background text-foreground",
  ready: "border-foreground bg-primary text-primary-foreground",
  approved: "border-foreground bg-primary text-primary-foreground",
  collected: "border-transparent bg-muted text-muted-foreground",
  cancelled: "border-destructive text-destructive",
  rejected: "border-destructive text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
