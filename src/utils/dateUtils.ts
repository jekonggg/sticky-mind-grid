import { format, parseISO, isValid } from "date-fns";
import { DateFormatOption } from "@/types/settings";

const FORMAT_MAP: Record<DateFormatOption, string> = {
  "MM/DD/YYYY": "MM/dd/yyyy",
  "DD/MM/YYYY": "dd/MM/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

/**
 * Safely parses any date representation (string, Date, number, null, undefined)
 * into a valid Date object, returning null if invalid or missing.
 */
export function parseSafeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return !isNaN(value.getTime()) ? value : null;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return !isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      !trimmed ||
      trimmed === "null" ||
      trimmed === "undefined" ||
      trimmed === "Invalid Date"
    ) {
      return null;
    }
    // Handle SQL format "YYYY-MM-DD HH:mm:ss" -> replace space with T
    const normalized =
      trimmed.includes(" ") && !trimmed.includes("T")
        ? trimmed.replace(" ", "T")
        : trimmed;

    try {
      const d = parseISO(normalized);
      if (isValid(d) && !isNaN(d.getTime())) return d;
    } catch {
      // Fall through to native Date
    }

    try {
      const d = new Date(normalized);
      if (isValid(d) && !isNaN(d.getTime())) return d;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Safely formats a date with fallback, never throwing RangeError: Invalid time value.
 */
export function formatSafe(
  date: any,
  formatPattern: string,
  fallback: string = ""
): string {
  const d = parseSafeDate(date);
  if (!d) return fallback;
  try {
    return format(d, formatPattern);
  } catch {
    return fallback;
  }
}

/**
 * Converts a date into a safe "yyyy-MM-ddTHH:mm" string for datetime-local inputs,
 * returning empty string if missing or invalid.
 */
export function toSafeIsoDateInputString(date: any): string {
  const d = parseSafeDate(date);
  if (!d) return "";
  try {
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

export function formatDateWithPreference(
  date: Date | string | number | null | undefined,
  preference: DateFormatOption = "MM/DD/YYYY",
  fallback: string = ""
): string {
  const d = parseSafeDate(date);
  if (!d) return fallback;

  try {
    const formatPattern = FORMAT_MAP[preference] || "MM/dd/yyyy";
    return format(d, formatPattern);
  } catch {
    return fallback;
  }
}
