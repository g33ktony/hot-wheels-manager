/**
 * Frontend date utilities to match backend date handling
 * Ensures dates are sent and interpreted correctly across timezone boundaries
 */

/**
 * Convert a date object to YYYY-MM-DD string in local timezone
 * This is the format expected by HTML date inputs and the API
 * @param date - Date to convert (default: today)
 * @returns Date string in YYYY-MM-DD format
 */
export function dateToString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string as a local date
 * This ensures the date is interpreted in the user's local timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing that date at 00:00:00 local time
 */
export function stringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns Today's date string
 */
export function getTodayString(): string {
  return dateToString(new Date());
}

/**
 * Add days to a date
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for display with locale
 * @param date - Date to format
 * @param locale - Locale code (default: 'es-MX')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDateLocale(
  date: Date | string,
  locale: string = 'es-MX',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? stringToDate(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  return dateObj.toLocaleDateString(locale, defaultOptions);
}

/**
 * Get the start of a date range (30 days ago)
 * Used for default date filtering
 * @param daysBack - Number of days to go back
 * @returns Date string in YYYY-MM-DD format
 */
export function getDefaultStartDate(daysBack: number = 30): string {
  const today = new Date();
  const startDate = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return dateToString(startDate);
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dateToString(date1) === dateToString(date2);
}

/**
 * Get the difference between two dates in days
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates
 */
export function daysDifference(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / msPerDay);
}
