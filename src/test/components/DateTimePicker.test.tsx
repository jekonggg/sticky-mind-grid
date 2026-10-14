import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, render } from "@testing-library/react";
import { DateTimePicker } from "@/components/common/DateTimePicker";

describe("DateTimePicker Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholder when value is empty", () => {
    render(<DateTimePicker value="" onChange={vi.fn()} />);

    expect(screen.getByText("Set due date & time...")).toBeInTheDocument();
    const hiddenInput = screen.getByLabelText("Due Date & Time");
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveAttribute("type", "datetime-local");
    expect(hiddenInput).toHaveValue("");
  });

  it("formats date and time accurately when value is provided", () => {
    // 2026-10-25 at 14:30 (2:30 PM)
    render(<DateTimePicker value="2026-10-25T14:30" onChange={vi.fn()} />);

    expect(screen.getByText(/Oct 25, 2026 • 2:30 PM/i)).toBeInTheDocument();
    const hiddenInput = screen.getByLabelText("Due Date & Time");
    expect(hiddenInput).toHaveValue("2026-10-25T14:30");
  });

  it("renders compact format when size is sm", () => {
    render(<DateTimePicker value="2026-10-25T14:30" size="sm" onChange={vi.fn()} />);

    expect(screen.getByText(/Oct 25, 2:30 PM/i)).toBeInTheDocument();
  });

  it("shows read-only view without button trigger when readOnly is true", () => {
    render(<DateTimePicker value="2026-10-25T14:30" readOnly={true} onChange={vi.fn()} />);

    expect(screen.getByText(/Oct 25, 2026 2:30 PM/i)).toBeInTheDocument();
    expect(screen.queryByTestId("due-date-picker-trigger")).not.toBeInTheDocument();
  });

  it("shows 'No due date' in read-only view when value is empty", () => {
    render(<DateTimePicker value="" readOnly={true} onChange={vi.fn()} />);

    expect(screen.getByText("No due date")).toBeInTheDocument();
  });

  it("clears date when clear button is clicked", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-10-25T14:30" onChange={onChange} />);

    const clearButton = screen.getByTitle("Clear due date");
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("opens popover with presets and calendar when trigger is clicked", () => {
    render(<DateTimePicker value="2026-10-25T14:30" onChange={vi.fn()} />);

    const trigger = screen.getByTestId("due-date-picker-trigger");
    fireEvent.click(trigger);

    expect(screen.getByText("Quick Shortcuts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /today \(5 pm\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tomorrow \(9 am\)/i })).toBeInTheDocument();
    expect(screen.getByText(/select time/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("updates date and time when clicking a quick shortcut", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="" onChange={onChange} />);

    const trigger = screen.getByTestId("due-date-picker-trigger");
    fireEvent.click(trigger);

    const todayShortcut = screen.getByRole("button", { name: /today \(5 pm\)/i });
    fireEvent.click(todayShortcut);

    expect(onChange).toHaveBeenCalled();
    const calledValue = onChange.mock.calls[0][0];
    // Check that it emits a string with 17:00 (5 PM)
    expect(calledValue).toContain("T17:00");
  });

  it("updates time when clicking a time preset", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-10-25T14:30" onChange={onChange} />);

    const trigger = screen.getByTestId("due-date-picker-trigger");
    fireEvent.click(trigger);

    const preset12pm = screen.getByRole("button", { name: "12:00 PM" });
    fireEvent.click(preset12pm);

    expect(onChange).toHaveBeenCalled();
    const calledValue = onChange.mock.calls[0][0];
    expect(calledValue).toContain("T12:00");
  });

  it("allows typing arbitrary minutes with two-digit format and no browser spinners", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-10-25T14:30" onChange={onChange} />);

    const trigger = screen.getByTestId("due-date-picker-trigger");
    fireEvent.click(trigger);

    const minuteInput = screen.getByLabelText("Minute (0-59)");
    expect(minuteInput).toHaveAttribute("type", "text");
    expect(minuteInput).toHaveAttribute("inputmode", "numeric");
    expect(minuteInput).toHaveValue("30");

    // Type arbitrary minute (e.g., 37)
    fireEvent.change(minuteInput, { target: { value: "37" } });
    expect(onChange).toHaveBeenCalledWith("2026-10-25T14:37");

    // Auto-pad single digit on blur
    fireEvent.change(minuteInput, { target: { value: "7" } });
    fireEvent.blur(minuteInput);
    expect(minuteInput).toHaveValue("07");
    expect(onChange).toHaveBeenCalledWith("2026-10-25T14:07");
  });

  it("updates minutes quickly with minute shortcut chips (:00, :15, :30, :45)", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-10-25T14:30" onChange={onChange} />);

    const trigger = screen.getByTestId("due-date-picker-trigger");
    fireEvent.click(trigger);

    const min45Chip = screen.getByRole("button", { name: ":45" });
    fireEvent.click(min45Chip);

    expect(onChange).toHaveBeenCalledWith("2026-10-25T14:45");
  });

  it("supports micro-step chevrons and arrow keys for 1-minute precision adjustments", () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-10-25T14:30" onChange={onChange} />);

    const trigger = screen.getByTestId("due-date-picker-trigger");
    fireEvent.click(trigger);

    // Click increment minute chevron button
    const incrementMinuteBtn = screen.getByRole("button", { name: /increment minute/i });
    fireEvent.click(incrementMinuteBtn);
    expect(onChange).toHaveBeenCalledWith("2026-10-25T14:31");

    // Decrement with keyboard ArrowDown on minute input
    const minuteInput = screen.getByLabelText("Minute (0-59)");
    fireEvent.keyDown(minuteInput, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("2026-10-25T14:30");
  });
});
