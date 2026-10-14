import React, { useState, useEffect, useMemo } from "react";
import {
  format,
  isValid,
  isToday,
  isTomorrow,
  isPast,
  setHours,
  setMinutes,
  addDays,
  nextMonday,
  nextSaturday,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  XClose as X,
  Check,
  ChevronDown,
  ChevronUp,
} from "@untitledui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseSafeDate, toSafeIsoDateInputString } from "@/utils/dateUtils";

export interface DateTimePickerProps {
  id?: string;
  name?: string;
  value?: string; // Formatted as "YYYY-MM-DDTHH:mm" or ISO string
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  size?: "default" | "sm";
  align?: "start" | "center" | "end";
  ariaLabel?: string;
}

const COMMON_TIME_PRESETS = [
  { label: "09:00 AM", hour24: 9, minute: 0 },
  { label: "12:00 PM", hour24: 12, minute: 0 },
  { label: "02:00 PM", hour24: 14, minute: 0 },
  { label: "05:00 PM", hour24: 17, minute: 0 },
  { label: "08:00 PM", hour24: 20, minute: 0 },
  { label: "11:59 PM", hour24: 23, minute: 59 },
];

export function DateTimePicker({
  id = "due-date",
  name,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className,
  placeholder = "Set due date & time...",
  size = "default",
  align = "start",
  ariaLabel = "Due Date & Time",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse incoming value safely
  const parsedDate = useMemo(() => parseSafeDate(value), [value]);

  // Working state when interacting inside popover
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(
    parsedDate || undefined
  );
  const [hour12, setHour12] = useState<number>(() => {
    if (parsedDate) {
      const h = parsedDate.getHours();
      return h % 12 === 0 ? 12 : h % 12;
    }
    return 5;
  });
  const [minute, setMinute] = useState<number>(() => {
    return parsedDate ? parsedDate.getMinutes() : 0;
  });
  const [period, setPeriod] = useState<"AM" | "PM">(() => {
    if (parsedDate) {
      return parsedDate.getHours() >= 12 ? "PM" : "AM";
    }
    return "PM";
  });

  // String state for inputs to prevent browser number stripping and allow 2-digit padding
  const [hourInput, setHourInput] = useState<string>(() => String(hour12).padStart(2, "0"));
  const [minuteInput, setMinuteInput] = useState<string>(() => String(minute).padStart(2, "0"));

  // Sync internal state whenever value changes from outside
  useEffect(() => {
    if (parsedDate) {
      setSelectedDay(parsedDate);
      const h = parsedDate.getHours();
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const m = parsedDate.getMinutes();
      setHour12(h12);
      setMinute(m);
      setPeriod(h >= 12 ? "PM" : "AM");
      setHourInput(String(h12).padStart(2, "0"));
      setMinuteInput(String(m).padStart(2, "0"));
    } else {
      setSelectedDay(undefined);
      setHour12(5);
      setMinute(0);
      setPeriod("PM");
      setHourInput("05");
      setMinuteInput("00");
    }
  }, [parsedDate]);

  // Convert 12h + period to 24h
  const get24Hour = (h12: number, p: "AM" | "PM") => {
    if (p === "AM") {
      return h12 === 12 ? 0 : h12;
    }
    return h12 === 12 ? 12 : h12 + 12;
  };

  // Helper to commit combined date and time
  const commitDateTime = (day?: Date, h12 = hour12, m = minute, p = period) => {
    if (!day) {
      onChange("");
      return;
    }
    const h24 = get24Hour(h12, p);
    let combined = setHours(day, h24);
    combined = setMinutes(combined, m);
    // Format as YYYY-MM-DDTHH:mm
    const formatted = format(combined, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
  };

  // Day selection from Calendar
  const handleSelectDay = (day: Date | undefined) => {
    setSelectedDay(day);
    if (day) {
      commitDateTime(day, hour12, minute, period);
    } else {
      commitDateTime(undefined);
    }
  };

  // Preset Date handler
  const handlePresetDate = (type: "today" | "tomorrow" | "weekend" | "next_week") => {
    const now = new Date();
    let targetDay: Date;
    let targetHour = 17;
    const targetMinute = 0;

    switch (type) {
      case "today":
        targetDay = now;
        targetHour = 17;
        break;
      case "tomorrow":
        targetDay = addDays(now, 1);
        targetHour = 9;
        break;
      case "weekend":
        targetDay = nextSaturday(now);
        targetHour = 12;
        break;
      case "next_week":
        targetDay = nextMonday(now);
        targetHour = 9;
        break;
    }

    const p: "AM" | "PM" = targetHour >= 12 ? "PM" : "AM";
    const h12 = targetHour % 12 === 0 ? 12 : targetHour % 12;

    setSelectedDay(targetDay);
    setHour12(h12);
    setMinute(targetMinute);
    setPeriod(p);
    setHourInput(String(h12).padStart(2, "0"));
    setMinuteInput(String(targetMinute).padStart(2, "0"));

    let combined = setHours(targetDay, targetHour);
    combined = setMinutes(combined, targetMinute);
    onChange(format(combined, "yyyy-MM-dd'T'HH:mm"));
  };

  // Time preset handler
  const handleTimePreset = (h24: number, min: number) => {
    const p: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    setHour12(h12);
    setMinute(min);
    setPeriod(p);
    setHourInput(String(h12).padStart(2, "0"));
    setMinuteInput(String(min).padStart(2, "0"));

    const baseDay = selectedDay || new Date();
    setSelectedDay(baseDay);
    commitDateTime(baseDay, h12, min, p);
  };

  // Custom two-digit string input handlers (prevents native browser arrows & preserves padding)
  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setHourInput(val);
    if (val !== "") {
      const num = parseInt(val, 10);
      if (num >= 1 && num <= 12) {
        setHour12(num);
        const baseDay = selectedDay || new Date();
        setSelectedDay(baseDay);
        commitDateTime(baseDay, num, minute, period);
      }
    }
  };

  const handleHourInputBlur = () => {
    let num = parseInt(hourInput, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 12) num = 12;
    setHour12(num);
    setHourInput(String(num).padStart(2, "0"));
    const baseDay = selectedDay || new Date();
    setSelectedDay(baseDay);
    commitDateTime(baseDay, num, minute, period);
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMinuteInput(val);
    if (val !== "") {
      const num = parseInt(val, 10);
      if (num >= 0 && num <= 59) {
        setMinute(num);
        const baseDay = selectedDay || new Date();
        setSelectedDay(baseDay);
        commitDateTime(baseDay, hour12, num, period);
      }
    }
  };

  const handleMinuteInputBlur = () => {
    let num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    setMinute(num);
    setMinuteInput(String(num).padStart(2, "0"));
    const baseDay = selectedDay || new Date();
    setSelectedDay(baseDay);
    commitDateTime(baseDay, hour12, num, period);
  };

  const handleStepHour = (delta: number) => {
    let next = hour12 + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setHour12(next);
    setHourInput(String(next).padStart(2, "0"));
    const baseDay = selectedDay || new Date();
    setSelectedDay(baseDay);
    commitDateTime(baseDay, next, minute, period);
  };

  const handleStepMinute = (delta: number) => {
    let next = (minute + delta) % 60;
    if (next < 0) next += 60;
    setMinute(next);
    setMinuteInput(String(next).padStart(2, "0"));
    const baseDay = selectedDay || new Date();
    setSelectedDay(baseDay);
    commitDateTime(baseDay, hour12, next, period);
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleStepHour(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleStepHour(-1);
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleStepMinute(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleStepMinute(-1);
    }
  };

  const handleSelectMinuteShortcut = (m: number) => {
    setMinute(m);
    setMinuteInput(String(m).padStart(2, "0"));
    const baseDay = selectedDay || new Date();
    setSelectedDay(baseDay);
    commitDateTime(baseDay, hour12, m, period);
  };

  const handlePeriodToggle = (newPeriod: "AM" | "PM") => {
    setPeriod(newPeriod);
    const baseDay = selectedDay || new Date();
    setSelectedDay(baseDay);
    commitDateTime(baseDay, hour12, minute, newPeriod);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedDay(undefined);
    onChange("");
    setOpen(false);
  };

  // Due status for badge styling
  const dueStatus = useMemo(() => {
    if (!parsedDate) return "none";
    const now = new Date();
    if (isPast(parsedDate) && !isToday(parsedDate)) {
      return "overdue";
    }
    if (isToday(parsedDate)) {
      return parsedDate.getTime() < now.getTime() ? "overdue" : "today";
    }
    if (isTomorrow(parsedDate)) {
      return "tomorrow";
    }
    return "upcoming";
  }, [parsedDate]);

  // Read-only state display
  if (readOnly) {
    if (!parsedDate) {
      return (
        <span className="text-xs text-muted-foreground font-medium select-none">
          No due date
        </span>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "text-xs font-semibold truncate",
            dueStatus === "overdue" && "text-rose-600 dark:text-rose-400 font-bold",
            dueStatus === "today" && "text-amber-600 dark:text-amber-400 font-bold",
            dueStatus === "tomorrow" && "text-emerald-600 dark:text-emerald-400 font-semibold",
            dueStatus === "upcoming" && "text-foreground"
          )}
        >
          {format(parsedDate, "MMM d, yyyy h:mm a")}
        </span>
        {dueStatus === "overdue" && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold border-rose-500/30 bg-rose-500/10 text-rose-600">
            Overdue
          </Badge>
        )}
        {dueStatus === "today" && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold border-amber-500/30 bg-amber-500/10 text-amber-600">
            Today
          </Badge>
        )}
        {dueStatus === "tomorrow" && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
            Tomorrow
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center w-full min-w-0", className)}>
      {/* Hidden input for HTML form compatibility, accessibility, and label matching */}
      <input
        type="datetime-local"
        id={id}
        name={name}
        value={toSafeIsoDateInputString(value)}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={cn("sr-only", size === "default" ? "h-10" : "h-8")}
        tabIndex={-1}
        readOnly
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            data-testid="due-date-picker-trigger"
            className={cn(
              "w-full justify-between items-center text-left font-normal border transition-all cursor-pointer group shadow-2xs",
              size === "sm" ? "h-8 px-2.5 text-xs rounded-lg" : "h-10 px-3 text-xs rounded-xl",
              !parsedDate && "text-muted-foreground bg-background/50 border-border/70 hover:border-border hover:bg-muted/30",
              parsedDate && dueStatus === "overdue" && "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-500/15",
              parsedDate && dueStatus === "today" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-500/15",
              parsedDate && (dueStatus === "tomorrow" || dueStatus === "upcoming") && "border-primary/30 bg-primary/5 text-foreground font-semibold hover:bg-primary/10"
            )}
          >
            <div className="flex items-center gap-2 min-w-0 truncate">
              <CalendarIcon
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors",
                  !parsedDate && "text-muted-foreground group-hover:text-primary",
                  parsedDate && dueStatus === "overdue" && "text-rose-600 dark:text-rose-400",
                  parsedDate && dueStatus === "today" && "text-amber-600 dark:text-amber-400",
                  parsedDate && (dueStatus === "tomorrow" || dueStatus === "upcoming") && "text-primary"
                )}
              />
              <span className="truncate">
                {parsedDate
                  ? format(parsedDate, size === "sm" ? "MMM d, h:mm a" : "MMM d, yyyy • h:mm a")
                  : placeholder}
              </span>
              {parsedDate && dueStatus === "overdue" && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold bg-rose-500/20 text-rose-600 border-rose-500/40 shrink-0">
                  Overdue
                </Badge>
              )}
              {parsedDate && dueStatus === "today" && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold bg-amber-500/20 text-amber-600 border-amber-500/40 shrink-0">
                  Today
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {parsedDate && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClear();
                    }
                  }}
                  title="Clear due date"
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align={align}
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          avoidCollisions={true}
          className="w-auto p-3 rounded-2xl shadow-2xl border border-border/80 bg-popover/95 backdrop-blur-md z-50 animate-in fade-in-50 zoom-in-95 max-h-[85vh] overflow-y-auto custom-scrollbar"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Left Column: Compact Calendar */}
            <div className="flex flex-col space-y-1.5 shrink-0">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3 text-primary" /> Select Date
                </span>
                {selectedDay && (
                  <span className="text-[11px] font-semibold text-primary">
                    {format(selectedDay, "MMM d, yyyy")}
                  </span>
                )}
              </div>

              <div className="flex justify-center border border-border/50 rounded-xl p-1 bg-background/50">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={handleSelectDay}
                  initialFocus
                  className="p-1"
                  classNames={{
                    month: "space-y-1.5",
                    caption: "flex justify-center pt-0 relative items-center mb-1",
                    caption_label: "text-xs font-bold",
                    nav_button: "h-6 w-6 p-0 opacity-70 hover:opacity-100",
                    nav_button_previous: "absolute left-0.5",
                    nav_button_next: "absolute right-0.5",
                    table: "w-full border-collapse space-y-0.5",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-7 font-semibold text-[10px]",
                    row: "flex w-full mt-1",
                    cell: "h-7 w-7 text-center text-xs p-0 relative",
                    day: "h-7 w-7 p-0 text-xs font-medium aria-selected:opacity-100 rounded-md",
                  }}
                />
              </div>
            </div>

            {/* Vertical Divider on sm screens */}
            <div className="hidden sm:block w-px bg-border/60 self-stretch my-1" />
            <div className="block sm:hidden h-px bg-border/60 my-1" />

            {/* Right Column: Shortcuts & Time */}
            <div className="flex flex-col justify-between w-full sm:w-[190px] space-y-2">
              {/* Quick Shortcuts */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Quick Shortcuts
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate("today")}
                    className="h-6 text-[11px] font-medium justify-start px-2 bg-muted/30 hover:bg-muted/70 text-foreground"
                  >
                    Today (5 PM)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate("tomorrow")}
                    className="h-6 text-[11px] font-medium justify-start px-2 bg-muted/30 hover:bg-muted/70 text-foreground"
                  >
                    Tomorrow (9 AM)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate("weekend")}
                    className="h-6 text-[11px] font-medium justify-start px-2 bg-muted/30 hover:bg-muted/70 text-foreground"
                  >
                    Weekend (Sat 12 PM)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate("next_week")}
                    className="h-6 text-[11px] font-medium justify-start px-2 bg-muted/30 hover:bg-muted/70 text-foreground"
                  >
                    Next Week (Mon 9 AM)
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/60" />

              {/* Time Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" /> Select Time
                  </span>
                  <span className="text-[11px] font-bold text-primary">
                    {String(hour12).padStart(2, "0")}:{String(minute).padStart(2, "0")} {period}
                  </span>
                </div>

                {/* Common Time Presets (2 cols x 3 rows) */}
                <div className="grid grid-cols-3 sm:grid-cols-2 gap-1">
                  {COMMON_TIME_PRESETS.map((preset) => {
                    const isActive =
                      selectedDay &&
                      hour12 === (preset.hour24 % 12 === 0 ? 12 : preset.hour24 % 12) &&
                      minute === preset.minute &&
                      period === (preset.hour24 >= 12 ? "PM" : "AM");

                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleTimePreset(preset.hour24, preset.minute)}
                        className={cn(
                          "px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer border text-center truncate",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Time Control */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex items-center gap-1 bg-background border border-border/80 rounded-lg px-2 py-1 shadow-2xs focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/60 transition-all">
                    {/* Hour Input with micro chevrons */}
                    <div className="flex items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={hourInput}
                        onChange={handleHourInputChange}
                        onBlur={handleHourInputBlur}
                        onKeyDown={handleHourKeyDown}
                        aria-label="Hour (1-12)"
                        title="Hour (1-12)"
                        className="w-5 text-center font-bold text-xs bg-transparent focus:outline-none text-foreground p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="flex flex-col -space-y-0.5 ml-0.5">
                        <button
                          type="button"
                          onClick={() => handleStepHour(1)}
                          aria-label="Increment hour"
                          title="Increment hour (+1)"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <ChevronUp className="h-2.5 w-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepHour(-1)}
                          aria-label="Decrement hour"
                          title="Decrement hour (-1)"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-muted-foreground select-none px-0.5">:</span>

                    {/* Minute Input with micro chevrons */}
                    <div className="flex items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={minuteInput}
                        onChange={handleMinuteInputChange}
                        onBlur={handleMinuteInputBlur}
                        onKeyDown={handleMinuteKeyDown}
                        aria-label="Minute (0-59)"
                        title="Minute (0-59)"
                        className="w-5 text-center font-bold text-xs bg-transparent focus:outline-none text-foreground p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="flex flex-col -space-y-0.5 ml-0.5">
                        <button
                          type="button"
                          onClick={() => handleStepMinute(1)}
                          aria-label="Increment minute"
                          title="Increment minute (+1)"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <ChevronUp className="h-2.5 w-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepMinute(-1)}
                          aria-label="Decrement minute"
                          title="Decrement minute (-1)"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AM / PM Toggle */}
                  <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/60">
                    <button
                      type="button"
                      onClick={() => handlePeriodToggle("AM")}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                        period === "AM"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePeriodToggle("PM")}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                        period === "PM"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Minute Quick Selection Chips */}
                <div className="flex items-center gap-1 pt-0.5">
                  <span className="text-[10px] font-medium text-muted-foreground shrink-0 mr-0.5">Min:</span>
                  {[0, 15, 30, 45].map((m) => {
                    const isSelected = minute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMinuteShortcut(m)}
                        className={cn(
                          "flex-1 py-0.5 px-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer border text-center",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                        )}
                      >
                        :{String(m).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Bar Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  Clear
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-6 px-2.5 text-[11px] font-bold gap-1 cursor-pointer bg-primary text-primary-foreground shadow-xs"
                >
                  <Check className="h-3 w-3" />
                  <span>Done</span>
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
