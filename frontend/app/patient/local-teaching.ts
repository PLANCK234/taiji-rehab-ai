export type LocalTeachingVideo = { id: string; title: string; duration_seconds: number };

export function parseTeachingManifest(value: unknown): LocalTeachingVideo[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((row): row is LocalTeachingVideo => {
    if (!row || typeof row !== "object") return false;
    const item = row as Partial<LocalTeachingVideo>;
    if (typeof item.id !== "string" || !/^teaching-\d{2}$/.test(item.id) || seen.has(item.id)
      || typeof item.title !== "string" || !item.title.trim() || item.title.length > 80
      || typeof item.duration_seconds !== "number" || !Number.isFinite(item.duration_seconds)
      || item.duration_seconds <= 0) return false;
    seen.add(item.id);
    return true;
  }).map(({ id, title, duration_seconds }) => ({ id, title, duration_seconds }));
}

export function videoRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return size > 0 ? { start: 0, end: size - 1 } : null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return null;
  return { start, end };
}
