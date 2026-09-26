export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftLocalDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function isLocalDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeLocalDateKey(value: unknown, fallback = localDateKey()): string {
  return isLocalDateKey(value) ? value : fallback;
}

const KO_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "2025-01-23" → "2025년 1월 23일(목)". Used on the collection cover card.
export function formatKoreanDate(dateKey: string): string {
  if (!isLocalDateKey(dateKey)) return dateKey;
  const d = new Date(`${dateKey}T00:00:00`);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${
    KO_WEEKDAYS[d.getDay()]
  })`;
}
