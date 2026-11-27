const TZ = "Asia/Shanghai";
const dateTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});
const dateOnly = new Intl.DateTimeFormat("zh-CN", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Beijing time display for persisted UTC timestamps; missing stays visibly "未记录". */
export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : "未记录";
}

export function formatDate(value: string | null | undefined): string {
  return value ? dateOnly.format(new Date(value)) : "未记录";
}

/** Browser-local `datetime-local` value → UTC ISO string, or null when invalid. */
export function localTimeToUtc(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Value for `<input type="date">` / `datetime-local` in the browser's local time. */
export function localInputValue(date = new Date(), withTime = false): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}
