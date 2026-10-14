export const OPERATING_START_HOUR = 5;
export const OPERATING_END_HOUR = 21;

// Simulate a service suspension (keep false normally)
export const DEBUG_SUSPEND_SERVICE = false;

// TESTING ONLY: ignore operating hours (geofence testing).
// Set back to false before shipping.
export const DEBUG_DISABLE_OPERATING_HOURS = true;

export function isWithinOperatingHours(date: Date = new Date()): boolean {
  if (DEBUG_DISABLE_OPERATING_HOURS) {
    return true;
  }

  if (DEBUG_SUSPEND_SERVICE) {
    return false;
  }

  const hour = date.getHours();

  return hour >= OPERATING_START_HOUR && hour < OPERATING_END_HOUR;
}

export function isServiceSuspended(date: Date = new Date()): boolean {
  return !isWithinOperatingHours(date);
}

export function getServiceStatus(
  date: Date = new Date(),
): "open" | "suspended" {
  return isWithinOperatingHours(date) ? "open" : "suspended";
}

function formatHour(hour: number): string {
  const normalizedHour = hour % 24;

  const suffix = normalizedHour >= 12 ? "PM" : "AM";

  let displayHour = normalizedHour % 12;

  if (displayHour === 0) {
    displayHour = 12;
  }

  return `${displayHour}:00 ${suffix}`;
}

/**
 * Returns the normal operating-hours text.
 */
export function getOperatingHoursText(): string {
  return `${formatHour(OPERATING_START_HOUR)} - ${formatHour(
    OPERATING_END_HOUR,
  )}`;
}

/**
 * Returns a user-facing service message.
 */
export function getServiceMessage(date: Date = new Date()): string {
  if (DEBUG_DISABLE_OPERATING_HOURS) {
    return "Service is currently active.";
  }

  if (DEBUG_SUSPEND_SERVICE) {
    return "Service is temporarily suspended.";
  }

  if (isWithinOperatingHours(date)) {
    return "Service is currently active.";
  }

  return "Service has ended. Please come back during the next service period.";
}

/**
 * Used by useFleetGPS (this export was missing and caused
 * "undefined is not a function").
 */
export function getOutsideHoursMessage(date: Date = new Date()): string {
  return getServiceMessage(date);
}
