/** Simple line icons per action category (no external icon font). */
const PATHS: Record<string, string> = {
  基础: "M12 3a9 9 0 1 0 0 18a4.5 4.5 0 0 1 0-9a4.5 4.5 0 0 0 0-9z M12 7.2v.1 M12 16.7v.1",
  上肢: "M5 13c2-4 5-6 7-6s5 2 7 6 M7 17c1.5-2 3-3 5-3s3.5 1 5 3 M12 4v3",
  坐位: "M7 4v9h9 M7 13v7 M16 13v7 M10 9h6",
  扶椅: "M8 4v16 M8 9h8v11 M8 14h8 M17 6l2 2",
  调息: "M4 9h10a3 3 0 1 0-3-3 M4 14h14a3 3 0 1 1-3 3 M4 19h6",
};

export default function ActionIcon({ category }: { category: string }) {
  return <span className="action-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[category] ?? PATHS["基础"]} />
    </svg>
  </span>;
}
