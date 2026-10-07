export type PeriodKey = "today" | "7d" | "30d" | "month" | "previous" | "custom";

export function periodRange(
  key: PeriodKey,
  customFrom?: string,
  customTo?: string,
): {
  date_from?: string;
  date_to?: string;
} {
  const now = new Date();
  if (key === "custom") {
    return {
      date_from: customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : undefined,
      date_to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined,
    };
  }
  if (key === "previous") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return { date_from: from.toISOString(), date_to: to.toISOString() };
  }
  const from = new Date(now);
  if (key === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (key === "7d") {
    from.setDate(from.getDate() - 7);
  } else if (key === "30d") {
    from.setDate(from.getDate() - 30);
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { date_from: from.toISOString(), date_to: now.toISOString() };
}

export function withPeriod(
  path: string,
  range: { date_from?: string; date_to?: string },
  extra: Record<string, string> = {},
) {
  const params = new URLSearchParams(extra);
  if (range.date_from) params.set("date_from", range.date_from);
  if (range.date_to) params.set("date_to", range.date_to);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}
