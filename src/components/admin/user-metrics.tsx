interface UserMetricsProps {
  totalUsers: number;
  activeUsers: number;
}

export function UserMetrics({ totalUsers, activeUsers }: UserMetricsProps) {
  const metrics = [
    { label: "Total Users", value: totalUsers },
    { label: "Active Users", value: activeUsers },
  ];

  return (
    <section aria-label="User metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {metrics.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground" aria-label={`${label} count`}>
            {value}
          </p>
        </div>
      ))}
    </section>
  );
}
