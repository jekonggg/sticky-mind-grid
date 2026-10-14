import { describe, it, expect } from "vitest";
import {
  parseSafeDate,
  formatSafe,
  toSafeIsoDateInputString,
  formatDateWithPreference,
} from "@/utils/dateUtils";

describe("dateUtils", () => {
  describe("parseSafeDate", () => {
    it("returns null for falsy, empty, or corrupted values", () => {
      expect(parseSafeDate(null)).toBeNull();
      expect(parseSafeDate(undefined)).toBeNull();
      expect(parseSafeDate("")).toBeNull();
      expect(parseSafeDate("   ")).toBeNull();
      expect(parseSafeDate("null")).toBeNull();
      expect(parseSafeDate("undefined")).toBeNull();
      expect(parseSafeDate("Invalid Date")).toBeNull();
      expect(parseSafeDate("not-a-date")).toBeNull();
      expect(parseSafeDate(new Date(NaN))).toBeNull();
    });

    it("parses valid Date instances", () => {
      const now = new Date();
      const parsed = parseSafeDate(now);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getTime()).toBe(now.getTime());
    });

    it("parses timestamps and numbers", () => {
      const ts = 1791982878175;
      const parsed = parseSafeDate(ts);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getTime()).toBe(ts);
    });

    it("parses ISO strings and SQL datetime strings", () => {
      const iso = "2026-10-14T17:30:00.000Z";
      expect(parseSafeDate(iso)).toBeInstanceOf(Date);

      const sqlFormat = "2026-10-14 17:30:00";
      const parsedSql = parseSafeDate(sqlFormat);
      expect(parsedSql).toBeInstanceOf(Date);
      expect(parsedSql?.getFullYear()).toBe(2026);
      expect(parsedSql?.getMonth()).toBe(9); // 0-indexed October
      expect(parsedSql?.getDate()).toBe(14);
    });
  });

  describe("formatSafe", () => {
    it("formats safely and falls back on invalid values without throwing RangeError", () => {
      expect(formatSafe(null, "PPP", "No date")).toBe("No date");
      expect(formatSafe("not-a-date", "PPP", "Fallback")).toBe("Fallback");
      expect(formatSafe(new Date(NaN), "PPP", "Invalid")).toBe("Invalid");
      expect(formatSafe("2026-10-25T14:30:00", "MMM d, yyyy")).toBe("Oct 25, 2026");
    });
  });

  describe("toSafeIsoDateInputString", () => {
    it("converts valid dates to YYYY-MM-DDTHH:mm format and returns empty string for invalid", () => {
      expect(toSafeIsoDateInputString(null)).toBe("");
      expect(toSafeIsoDateInputString("invalid")).toBe("");
      expect(toSafeIsoDateInputString(new Date(NaN))).toBe("");

      const date = new Date(2026, 9, 14, 15, 30); // 2026-10-14 15:30
      expect(toSafeIsoDateInputString(date)).toBe("2026-10-14T15:30");
    });
  });

  describe("formatDateWithPreference", () => {
    it("formats based on user preference and gracefully handles invalid dates", () => {
      const date = new Date(2026, 9, 14);
      expect(formatDateWithPreference(date, "MM/DD/YYYY")).toBe("10/14/2026");
      expect(formatDateWithPreference(date, "DD/MM/YYYY")).toBe("14/10/2026");
      expect(formatDateWithPreference(date, "YYYY-MM-DD")).toBe("2026-10-14");
      expect(formatDateWithPreference("invalid", "YYYY-MM-DD", "N/A")).toBe("N/A");
    });
  });
});
