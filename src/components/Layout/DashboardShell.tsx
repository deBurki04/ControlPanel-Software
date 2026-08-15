import type { ReactNode } from "react";
import "./DashboardShell.css";

interface DashboardShellProps {
  spotify: ReactNode;
  clock: ReactNode;
  temperature: ReactNode;
  calendar: ReactNode;
}

export function DashboardShell({
  spotify,
  clock,
  temperature,
  calendar,
}: DashboardShellProps) {
  return (
    <section className="dashboard-shell">
      <div className="dashboard-main panel">{spotify}</div>

      <aside className="dashboard-side">
        <div className="dashboard-clock panel">{clock}</div>
        <div className="dashboard-temperature panel">{temperature}</div>
      </aside>

      <div className="dashboard-calendar panel">{calendar}</div>
    </section>
  );
}
