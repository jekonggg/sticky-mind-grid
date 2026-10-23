import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Palette,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sanitizeNoteHtml, toEditorHtml } from "@/utils/scratchpadHtml";

export type FormatCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "insertChecklist"
  | "fontSize"
  | "foreColor"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight"
  | "justifyFull";

export const FORMAT_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40";

const FONT_SIZE_OPTIONS = [
  { value: "2", label: "Small" },
  { value: "3", label: "Normal" },
  { value: "5", label: "Large" },
  { value: "6", label: "X-Large" },
] as const;

export function createChecklistInput(): HTMLInputElement {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("contenteditable", "false");
  checkbox.setAttribute("aria-label", "Toggle checklist item");
  return checkbox;
}

export function ensureChecklistInputs(root: ParentNode) {
  root
    .querySelectorAll<HTMLElement>(
      "ul[data-checklist] > li, ol[data-checklist] > li"
    )
    .forEach((item) => {
      let checkbox = item.querySelector<HTMLInputElement>(
        ":scope > input[type='checkbox']"
      );

      if (!checkbox) {
        checkbox = createChecklistInput();
        item.insertBefore(checkbox, item.firstChild);
        item.insertBefore(document.createTextNode(" "), checkbox.nextSibling);
      }

      item.setAttribute("data-checked", checkbox.checked ? "true" : "false");
    });
}

function isListElement(node: Node | null): node is HTMLElement {
  return (
    node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL")
  );
}

function firstMeaningfulChild(node: Node): Node | null {
  let child = node.firstChild;
  while (
    child &&
    child.nodeType === Node.TEXT_NODE &&
    !child.textContent?.trim()
  ) {
    child = child.nextSibling;
  }
  return child;
}

function lastMeaningfulChild(node: Node): Node | null {
  let child = node.lastChild;
  while (
    child &&
    child.nodeType === Node.TEXT_NODE &&
    !child.textContent?.trim()
  ) {
    child = child.previousSibling;
  }
  return child;
}

function hasListAtStart(node: Node | null): boolean {
  if (!node) return false;
  if (isListElement(node)) return true;
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  return hasListAtStart(firstMeaningfulChild(node));
}

function hasListAtEnd(node: Node | null): boolean {
  if (!node) return false;
  if (isListElement(node)) return true;
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  return hasListAtEnd(lastMeaningfulChild(node));
}

function previousMeaningfulSibling(node: Node | null): Node | null {
  let sibling = node?.previousSibling ?? null;
  while (
    sibling &&
    sibling.nodeType === Node.TEXT_NODE &&
    !sibling.textContent?.trim()
  ) {
    sibling = sibling.previousSibling;
  }
  return sibling;
}

function nextMeaningfulSibling(node: Node | null): Node | null {
  let sibling = node?.nextSibling ?? null;
  while (
    sibling &&
    sibling.nodeType === Node.TEXT_NODE &&
    !sibling.textContent?.trim()
  ) {
    sibling = sibling.nextSibling;
  }
  return sibling;
}

export function createChecklistSeparators(
  editor: HTMLElement,
  range: Range
): HTMLElement[] {
  const separators: HTMLElement[] = [];

  const createSeparator = () => {
    const separator = document.createElement("div");
    separator.setAttribute("data-checklist-separator", "true");
    separator.appendChild(document.createElement("br"));
    return separator;
  };

  const insertBeforeAdjacentList = (node: Node | null) => {
    let current = node;
    while (current && current !== editor) {
      if (hasListAtEnd(previousMeaningfulSibling(current))) {
        const separator = createSeparator();
        current.parentNode?.insertBefore(separator, current);
        separators.push(separator);
        return;
      }
      current = current.parentNode;
    }
  };

  const insertAfterAdjacentList = (node: Node | null) => {
    let current = node;
    while (current && current !== editor) {
      if (hasListAtStart(nextMeaningfulSibling(current))) {
        const separator = createSeparator();
        current.parentNode?.insertBefore(separator, current.nextSibling);
        separators.push(separator);
        return;
      }
      current = current.parentNode;
    }
  };

  insertBeforeAdjacentList(range.startContainer);
  insertAfterAdjacentList(range.endContainer);

  return separators;
}

export interface NoteContentEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  editorRef: React.MutableRefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export function NoteContentEditor({
  initialContent,
  onChange,
  editorRef,
  readOnly = false,
  placeholder,
  className,
  testId = "scratchpad-content-editor",
}: NoteContentEditorProps) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;
    const targetHtml = toEditorHtml(initialContent);
    if (!initializedRef.current) {
      editorRef.current.innerHTML = targetHtml;
      initializedRef.current = true;
    } else if (
      editorRef.current.innerHTML !== targetHtml &&
      document.activeElement !== editorRef.current
    ) {
      editorRef.current.innerHTML = targetHtml;
    }
  }, [editorRef, initialContent]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const syncChecklistState = () => {
      ensureChecklistInputs(editor);
      if (readOnly) {
        editor
          .querySelectorAll<HTMLInputElement>("input[type='checkbox']")
          .forEach((input) => {
            input.disabled = true;
          });
      }
    };

    const handleCheckboxChange = (event: Event) => {
      if (readOnly) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
        return;
      }

      target.toggleAttribute("checked", target.checked);
      syncChecklistState();
      onChange(editor.innerHTML);
    };

    syncChecklistState();
    editor.addEventListener("change", handleCheckboxChange);
    return () => editor.removeEventListener("change", handleCheckboxChange);
  }, [editorRef, onChange, readOnly]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    const editor = editorRef.current;
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node?.parentElement;
    const listItem = element?.closest("li");

    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0 ||
      !listItem ||
      !listItem.closest("ul[data-checklist], ol[data-checklist]")
    ) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!listItem.contains(range.endContainer)) return;

    event.preventDefault();

    if (!range.collapsed) {
      range.deleteContents();
      range.collapse(true);
    }

    const trailingRange = document.createRange();
    trailingRange.selectNodeContents(listItem);
    trailingRange.setStart(range.endContainer, range.endOffset);
    const trailingContent = trailingRange.extractContents();
    trailingContent
      .querySelectorAll("input[type='checkbox']")
      .forEach((checkbox) => checkbox.remove());

    const newItem = document.createElement("li");
    newItem.setAttribute("data-checked", "false");
    const checkbox = createChecklistInput();
    const spacer = document.createTextNode(" ");
    newItem.append(checkbox, spacer);

    const hasTrailingContent =
      Boolean(trailingContent.textContent?.trim()) ||
      Boolean(trailingContent.querySelector("br, img"));

    if (hasTrailingContent) {
      newItem.appendChild(trailingContent);
    } else {
      newItem.appendChild(document.createElement("br"));
    }

    listItem.after(newItem);

    const caretRange = document.createRange();
    if (hasTrailingContent) {
      caretRange.selectNodeContents(newItem);
      caretRange.collapse(false);
    } else {
      caretRange.setStartAfter(spacer);
      caretRange.collapse(true);
    }
    selection.removeAllRanges();
    selection.addRange(caretRange);

    onChange(editor.innerHTML);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");

    if (typeof document.execCommand === "function") {
      document.execCommand("insertText", false, text);
    } else {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const fragment = document.createDocumentFragment();
      text.split("\n").forEach((line, index) => {
        if (index > 0) fragment.appendChild(document.createElement("br"));
        fragment.appendChild(document.createTextNode(line));
      });
      range.insertNode(fragment);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    onChange(event.currentTarget.innerHTML);
  };

  return (
    <div
      ref={editorRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Note content"
      data-testid={testId}
      spellCheck
      onInput={(event) => onChange(event.currentTarget.innerHTML)}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={cn(
        "scratchpad-editor note-editor custom-scrollbar h-full w-full overflow-y-auto break-words text-sm leading-relaxed text-foreground outline-none [&_div]:min-h-[1.25em] [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
        readOnly && "cursor-default select-text",
        className
      )}
    />
  );
}

export interface FormatButtonProps {
  label: string;
  compact?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onSaveSelection: () => void;
  children: React.ReactNode;
}

export function FormatButton({
  label,
  compact = false,
  disabled = false,
  onClick,
  onSaveSelection,
  children,
}: FormatButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        FORMAT_BUTTON_CLASS,
        compact ? "h-7 w-7" : "h-8 w-8"
      )}
      onMouseDown={(event) => {
        event.preventDefault();
        onSaveSelection();
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return (
    <span
      aria-hidden="true"
      className="mx-0.5 h-4 w-px shrink-0 bg-border/70"
    />
  );
}

export interface FormattingToolbarProps {
  placement?: "inline" | "bottom" | "top";
  onSaveSelection: () => void;
  onFormat: (command: FormatCommand, value?: string) => void;
  onRestoreSelection?: () => void;
  testId?: string;
  disabled?: boolean;
}

export function FormattingToolbar({
  placement = "inline",
  onSaveSelection,
  onFormat,
  onRestoreSelection,
  testId = "scratchpad-format-toolbar",
  disabled = false,
}: FormattingToolbarProps) {
  const [textColor, setTextColor] = useState("#b45309");
  const [fontSize, setFontSize] = useState<string>("3");
  const pendingFontSizeRef = useRef<string | null>(null);

  const handleFontSizeMenuClose = () => {
    const pendingFontSize = pendingFontSizeRef.current;
    pendingFontSizeRef.current = null;

    if (pendingFontSize) {
      onFormat("fontSize", pendingFontSize);
    } else {
      onRestoreSelection?.();
    }
  };

  const textStyleButtons = (
    <div className="flex items-center gap-0.5">
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Bold"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("bold")}
      >
        <Bold className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Italic"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("italic")}
      >
        <Italic className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Underline"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("underline")}
      >
        <Underline className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Strikethrough"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("strikeThrough")}
      >
        <Strikethrough className="h-4 w-4" />
      </FormatButton>
    </div>
  );

  const listButtons = (
    <div className="flex items-center gap-0.5">
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Bulleted list"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("insertUnorderedList")}
      >
        <List className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Numbered list"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("insertOrderedList")}
      >
        <ListOrdered className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Checklist"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("insertChecklist")}
      >
        <ListChecks className="h-4 w-4" />
      </FormatButton>
    </div>
  );

  const alignmentButtons = (
    <div className="flex items-center gap-0.5">
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Align left"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("justifyLeft")}
      >
        <AlignLeft className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Align center"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("justifyCenter")}
      >
        <AlignCenter className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Align right"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("justifyRight")}
      >
        <AlignRight className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        disabled={disabled}
        label="Justify"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("justifyFull")}
      >
        <AlignJustify className="h-4 w-4" />
      </FormatButton>
    </div>
  );

  const sizeAndColorControls = (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        <Type
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <Select
          value={fontSize}
          disabled={disabled}
          onValueChange={(value) => {
            setFontSize(value);
            pendingFontSizeRef.current = value;
          }}
        >
          <SelectTrigger
            aria-label="Font size"
            title="Font size"
            data-testid="font-size-select"
            onPointerDownCapture={onSaveSelection}
            onFocus={onSaveSelection}
            className={cn(
              "w-[84px] shrink-0 gap-1 rounded-md border-border/60 bg-transparent px-1.5 text-[11px] font-medium text-foreground shadow-none hover:bg-muted focus:ring-1 focus:ring-ring focus:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-60",
              placement === "inline" ? "h-7" : "h-8"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            align="start"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              handleFontSizeMenuClose();
            }}
          >
            {FONT_SIZE_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer text-xs"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label
        title="Text color"
        className={cn(
          FORMAT_BUTTON_CLASS,
          placement === "inline" ? "h-7 w-7" : "h-8 w-8",
          disabled && "pointer-events-none opacity-40",
          "relative cursor-pointer overflow-hidden"
        )}
        onMouseDown={onSaveSelection}
      >
        <Palette className="h-4 w-4" style={{ color: textColor }} />
        <input
          type="color"
          aria-label="Text color"
          disabled={disabled}
          value={textColor}
          onChange={(event) => {
            setTextColor(event.target.value);
            onFormat("foreColor", event.target.value);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );

  if (placement === "bottom") {
    return (
      <div
        data-testid={testId}
        data-placement={placement}
        role="toolbar"
        aria-label="Text formatting"
        className="flex w-full flex-col gap-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {textStyleButtons}
          {listButtons}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {alignmentButtons}
          {sizeAndColorControls}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      data-placement={placement}
      role="toolbar"
      aria-label="Text formatting"
      className="flex flex-wrap items-center gap-1"
    >
      {textStyleButtons}
      <ToolbarDivider />
      {listButtons}
      <ToolbarDivider />
      {alignmentButtons}
      <ToolbarDivider />
      {sizeAndColorControls}
    </div>
  );
}

export function useRichTextFormatter(
  editorRef: React.MutableRefObject<HTMLDivElement | null>,
  onContentChange: (html: string) => void
) {
  const savedSelectionRef = useRef<Range | null>(null);

  const saveEditorSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = range.cloneRange();
    }
  }, [editorRef]);

  const restoreEditorSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const range = savedSelectionRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return;

    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      // Range might be detached
    }
  }, [editorRef]);

  const getClosestEditorList = useCallback((): HTMLElement | null => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;

    const node = selection.anchorNode;
    const element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node?.parentElement;
    const list = element?.closest("ul, ol");

    return list && editor.contains(list) ? (list as HTMLElement) : null;
  }, [editorRef]);

  const detachChecklistFormatting = useCallback((list: HTMLElement) => {
    list.removeAttribute("data-checklist");
    Array.from(list.children).forEach((child) => {
      if (child.tagName !== "LI") return;

      const item = child as HTMLElement;
      item.removeAttribute("data-checked");
      const checkbox = item.querySelector<HTMLInputElement>(
        ":scope > input[type='checkbox']"
      );
      if (!checkbox) return;

      const spacer = checkbox.nextSibling;
      checkbox.remove();
      if (spacer?.nodeType === Node.TEXT_NODE && spacer.textContent === " ") {
        spacer.textContent = "";
      }
    });
  }, []);

  const replaceListTag = useCallback((list: HTMLElement, tagName: "UL" | "OL") => {
    const replacement = document.createElement(tagName);
    Array.from(list.attributes).forEach((attribute) => {
      if (attribute.name !== "data-checklist") {
        replacement.setAttribute(attribute.name, attribute.value);
      }
    });
    while (list.firstChild) {
      replacement.appendChild(list.firstChild);
    }
    list.replaceWith(replacement);
    return replacement;
  }, []);

  const applyChecklistFormatting = useCallback(() => {
    const list = getClosestEditorList();

    if (list?.hasAttribute("data-checklist")) {
      detachChecklistFormatting(list);
      return;
    }

    if (list) {
      list.setAttribute("data-checklist", "true");
      ensureChecklistInputs(list);
      return;
    }

    if (typeof document.execCommand !== "function") return;

    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const separators =
      editor && range && !range.collapsed
        ? createChecklistSeparators(editor, range)
        : [];

    try {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("insertUnorderedList", false, undefined);
    } finally {
      separators.forEach((separator) => separator.remove());
    }

    const createdList = getClosestEditorList();
    if (createdList) {
      createdList.setAttribute("data-checklist", "true");
      ensureChecklistInputs(createdList);
    }
  }, [
    detachChecklistFormatting,
    editorRef,
    getClosestEditorList,
  ]);

  const handleFormat = useCallback(
    (command: FormatCommand, value?: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      restoreEditorSelection();

      try {
        if (command === "insertChecklist") {
          applyChecklistFormatting();
        } else if (
          command === "insertUnorderedList" ||
          command === "insertOrderedList"
        ) {
          const list = getClosestEditorList();

          if (list?.hasAttribute("data-checklist")) {
            detachChecklistFormatting(list);
            const targetTag = command === "insertUnorderedList" ? "UL" : "OL";
            if (list.tagName !== targetTag) {
              replaceListTag(list, targetTag);
            }
          } else {
            if (typeof document.execCommand !== "function") return;
            document.execCommand("styleWithCSS", false, "true");
            document.execCommand(command, false, value);
          }
        } else {
          if (typeof document.execCommand !== "function") return;
          document.execCommand("styleWithCSS", false, "true");
          document.execCommand(command, false, value);
        }
      } catch (error) {
        console.warn("Unable to apply formatting command:", error);
        return;
      }

      onContentChange(sanitizeNoteHtml(editor.innerHTML));
    },
    [
      applyChecklistFormatting,
      detachChecklistFormatting,
      editorRef,
      getClosestEditorList,
      onContentChange,
      replaceListTag,
      restoreEditorSelection,
    ]
  );

  return {
    savedSelectionRef,
    saveEditorSelection,
    restoreEditorSelection,
    handleFormat,
  };
}
