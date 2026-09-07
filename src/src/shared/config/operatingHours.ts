export const OPERATING_HOURS = {
  startHour: 5,
  startMinute: 40,
  endHour: 20, // 8:00 PM
  endMinute: 0,
};

export function getOperatingWindowForDate(date: Date) {
  const start = new Date(date);
  start.setHours(OPERATING_HOURS.startHour, OPERATING_HOURS.startMinute, 0, 0);

  const end = new Date(date);
  end.setHours(OPERATING_HOURS.endHour, OPERATING_HOURS.endMinute, 0, 0);

  return { start, end };
}

export function isWithinOperatingHours(date: Date = new Date()): boolean {
  const { start, end } = getOperatingWindowForDate(date);
  return date >= start && date <= end;
}

export function getNextOpeningTime(date: Date = new Date()): Date {
  const { start } = getOperatingWindowForDate(date);

  if (date < start) return start;

  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getOperatingWindowForDate(tomorrow).start;
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
