/**
 * Date utilities to handle timezone-aware date operations
 * Solves the issue where JavaScript's new Date(string) interprets dates in UTC
 * causing a timezone offset issue when comparing dates across different timezones
 */

/**
 * Parse a date string in YYYY-MM-DD format as local date (not UTC)
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object representing the start of that day in local timezone
 */
export function parseDateStringAsLocal(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date in local timezone
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date;
}

/**
 * Parse a date string in YYYY-MM-DD format and convert to UTC start of day
 * This ensures the date is interpreted as if the user entered a local date
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object representing the start of that day in UTC
 */
export function parseDateStringToUTC(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create a local date
  const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Convert to UTC by getting the offset and adjusting
  const offsetMs = localDate.getTimezoneOffset() * 60 * 1000;
  return new Date(localDate.getTime() + offsetMs);
}

/**
 * Convert a date to YYYY-MM-DD string in local timezone
 * @param date - Date to convert
 * @returns Date string in YYYY-MM-DD format
 */
export function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start of day in UTC for a given date
 * Handles timezone offset to ensure we get the correct UTC time
 * @param date - Date to get start of
 * @returns Date object at 00:00:00 UTC for that day
 */
export function getStartOfDayUTC(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // Create local date at midnight
  const localMidnight = new Date(year, month, day, 0, 0, 0, 0);
  // Convert to UTC
  const offsetMs = localMidnight.getTimezoneOffset() * 60 * 1000;
  return new Date(localMidnight.getTime() + offsetMs);
}

/**
 * Get end of day in UTC for a given date
 * @param date - Date to get end of
 * @returns Date object at 23:59:59.999 UTC for that day
 */
export function getEndOfDayUTC(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // Create local date at 23:59:59.999
  const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
  // Convert to UTC
  const offsetMs = localEndOfDay.getTimezoneOffset() * 60 * 1000;
  return new Date(localEndOfDay.getTime() + offsetMs);
}

/**
 * Get today's date in YYYY-MM-DD format in app timezone (Mexico City)
 * @returns Today's date string
 */
export function getTodayString(): string {
  return dateToLocalString(new Date());
}

/**
 * Check if two dates are the same day (in local timezone)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dateToString(date1) === dateToString(date2);
}

/**
 * Get the date range for a specific day in UTC
 * Useful for MongoDB queries that filter by date
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Object with startDate and endDate in UTC
 */
export function getDayRangeUTC(dateString: string) {
  const date = new Date(dateString);
  return {
    startDate: getStartOfDayUTC(date),
    endDate: getEndOfDayUTC(date)
  };
}

// Timezone for all date operations (Mexico City, UTC-6)
const APP_TIMEZONE = 'America/Mexico_City';

/**
 * Convert a UTC date to YYYY-MM-DD string in the app's timezone (Mexico City)
 * This is critical for grouping sales by day correctly regardless of server timezone
 * @param date - Date object (stored in UTC)
 * @returns Date string in YYYY-MM-DD format in Mexico City timezone
 */
export function dateToLocalString(date: Date): string {
  // en-CA locale gives YYYY-MM-DD format natively
  return date.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

/**
 * Get start and end of a day in Mexico City timezone, converted to UTC
 * Useful for MongoDB date range queries that respect local timezone
 * Mexico City is permanently UTC-6 (DST was abolished in 2022)
 * @param dateString - Date in YYYY-MM-DD format (local date)
 * @returns Object with startDate and endDate as UTC Date objects
 */
export function getDayRangeLocal(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Midnight Mexico City (UTC-6) = 06:00 UTC
  const startDate = new Date(Date.UTC(year, month - 1, day, 6, 0, 0, 0));
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  return { startDate, endDate };
}
