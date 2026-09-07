export const OPERATING_START_HOUR = 5; // 5:00 AM
export const OPERATING_END_HOUR = 21; // 9:00 PM (21:00, exclusive)

export function isWithinOperatingHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= OPERATING_START_HOUR && hour < OPERATING_END_HOUR;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

export const OPERATING_HOURS_LABEL = `${formatHour(
  OPERATING_START_HOUR,
)} – ${formatHour(OPERATING_END_HOUR)}`;

export function getOutsideHoursMessage(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < OPERATING_START_HOUR) {
    return `Terminal opens today at ${formatHour(
      OPERATING_START_HOUR,
    )}. Check back soon.`;
  }

  return `No jeepneys are available right now. Check back tomorrow ${OPERATING_HOURS_LABEL}.`;
}
