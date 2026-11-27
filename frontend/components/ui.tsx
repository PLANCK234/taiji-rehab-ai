import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "jade" | "amber" | "red" | "blue" | "ink" | "gray";

export function Badge({ tone = "gray", plain = false, children }: { tone?: Tone; plain?: boolean; children: ReactNode }) {
  return <span className={`badge badge-${tone}${plain ? " plain" : ""}`}>{children}</span>;
}

export function Notice({ tone = "info", children, role }: {
  tone?: "info" | "warn" | "error" | "success" | "demo"; children: ReactNode; role?: "alert" | "note";
}) {
  return <div className={`notice ${tone === "info" ? "" : tone}`} role={role}><div>{children}</div></div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><strong>{title}</strong>{children}</div>;
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return <nav className="crumbs" aria-label="页面路径">
    {items.map((item, index) => <span key={index} className="row" style={{ gap: 6 }}>
      {index > 0 && <span aria-hidden="true">/</span>}
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
    </span>)}
  </nav>;
}

export function PageHeader({ eyebrow, title, sub, actions }: {
  eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode;
}) {
  return <header className="page-head">
    <div className="titles">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
    {actions && <div className="actions">{actions}</div>}
  </header>;
}

export function Card({ title, id, actions, sub, className = "", children }: {
  title?: ReactNode; id?: string; actions?: ReactNode; sub?: ReactNode; className?: string; children: ReactNode;
}) {
  return <section className={`card ${className}`} aria-labelledby={title && id ? id : undefined}>
    {(title || actions) && <div className="card-head">
      {title && <h2 id={id}>{title}</h2>}
      {actions}
    </div>}
    {sub && <p className="card-sub">{sub}</p>}
    {children}
  </section>;
}

export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return <div className="stat"><div className="label">{label}</div><div className="value">{value}{unit && <small>{unit}</small>}</div></div>;
}

export type StepState = "done" | "current" | "todo";
export function FlowSteps({ steps, label = "流程进度" }: { steps: { label: string; state: StepState }[]; label?: string }) {
  return <ol className="steps" aria-label={label} style={{ ["--n" as string]: steps.length }}>
    {steps.map(step => <li key={step.label} className={step.state === "todo" ? undefined : step.state}
      aria-current={step.state === "current" ? "step" : undefined}>{step.label}</li>)}
  </ol>;
}
