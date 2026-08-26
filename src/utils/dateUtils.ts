import { format, parseISO } from "date-fns";
import { DateFormatOption } from "@/types/settings";

const FORMAT_MAP: Record<DateFormatOption, string> = {
  "MM/DD/YYYY": "MM/dd/yyyy",
  "DD/MM/YYYY": "dd/MM/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

export function formatDateWithPreference(
  date: Date | string | number | null | undefined,
  preference: DateFormatOption = "MM/DD/YYYY",
  fallback: string = ""
): string {
  if (!date) return fallback;

  try {
    const d = typeof date === "string" ? parseISO(date) : new Date(date);
    if (isNaN(d.getTime())) return fallback;
    const formatPattern = FORMAT_MAP[preference] || "MM/dd/yyyy";
    return format(d, formatPattern);
  } catch {
    return fallback;
  }
}
