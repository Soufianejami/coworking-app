import { format, formatDistance, isSameDay, isSameMonth, isSameYear } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Format a date with the specified format string
 * @param date Date to format
 * @param formatStr Format string (date-fns format)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return "";
  
  const dateObj = date instanceof Date ? date : new Date(date);
  try {
    return format(dateObj, formatStr, { locale: fr });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

/**
 * Format a date with a human-readable relative time (e.g., "today", "yesterday", etc.)
 * @param date Date to format
 * @returns Human-readable date string
 */
export function formatRelativeDate(date: Date | string | number): string {
  if (!date) return "";
  
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  
  try {
    if (isSameDay(dateObj, now)) {
      return "Aujourd'hui";
    } else if (isSameDay(dateObj, new Date(now.setDate(now.getDate() - 1)))) {
      return "Hier";
    } else if (isSameMonth(dateObj, now) && isSameYear(dateObj, now)) {
      return format(dateObj, "d MMMM", { locale: fr });
    } else if (isSameYear(dateObj, now)) {
      return format(dateObj, "d MMMM", { locale: fr });
    } else {
      return format(dateObj, "d MMMM yyyy", { locale: fr });
    }
  } catch (error) {
    console.error("Error formatting relative date:", error);
    return "";
  }
}

/**
 * Format a date with time
 * @param date Date to format
 * @returns Date and time string
 */
export function formatDateTime(date: Date | string | number): string {
  if (!date) return "";
  
  const dateObj = date instanceof Date ? date : new Date(date);
  try {
    return format(dateObj, "dd/MM/yyyy HH:mm", { locale: fr });
  } catch (error) {
    console.error("Error formatting date time:", error);
    return "";
  }
}

/**
 * Get first day of the current month
 * @returns First day of the current month
 */
export function firstDayOfMonth(): Date {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get last day of the current month
 * @returns Last day of the current month
 */
export function lastDayOfMonth(): Date {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Capitalize the first letter of each word in a date string
 * @param dateStr Date string to capitalize
 * @returns Capitalized date string
 */
export function capitalizeDate(dateStr: string): string {
  return dateStr
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
