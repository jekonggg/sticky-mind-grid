import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  File06 as StickyNote,
  Plus,
  Trash01 as Trash2,
  Copy01 as Copy,
  Check,
  SearchLg as Search,
  ArrowLeft,
  Pin01 as Pin,
} from "@untitledui/icons";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { scratchpadApi } from "@/services/scratchpadApi";
import { ScratchpadNote } from "@/types/scratchpad";
import { DEFAULT_NOTES, getStorageKey } from "@/utils/scratchpadUtils";
import {
  htmlToPlainText,
  sanitizeNoteHtml,
  toEditorHtml,
} from "@/utils/scratchpadHtml";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type PersonalNote = ScratchpadNote;
export { getPersonalNotesCount } from "@/utils/scratchpadUtils";

const COLOR_PRESETS = [
  { name: "Amber", bg: "#fef3c7", border: "#fde68a", text: "#92400e" },
  { name: "Emerald", bg: "#d1fae5", border: "#a7f3d0", text: "#065f46" },
  { name: "Sky", bg: "#e0f2fe", border: "#bae6fd", text: "#075985" },
  { name: "Purple", bg: "#f3e8ff", border: "#e9d5ff", text: "#6b21a8" },
  { name: "Rose", bg: "#ffe4e6", border: "#fecdd3", text: "#9f1239" },
  { name: "Slate", bg: "#f1f5f9", border: "#e2e8f0", text: "#334155" },
];

type FormatCommand =
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

const FORMAT_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

function createChecklistInput(): HTMLInputElement {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("contenteditable", "false");
  checkbox.setAttribute("aria-label", "Toggle checklist item");
  return checkbox;
}

function ensureChecklistInputs(root: ParentNode) {
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

function createChecklistSeparators(
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

interface ScratchpadContentEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  editorRef: React.MutableRefObject<HTMLDivElement | null>;
}

function ScratchpadContentEditor({
  initialContent,
  onChange,
  editorRef,
}: ScratchpadContentEditorProps) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !editorRef.current) return;
    editorRef.current.innerHTML = toEditorHtml(initialContent);
    initializedRef.current = true;
  }, [editorRef, initialContent]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const syncChecklistState = () => {
      ensureChecklistInputs(editor);
    };
    const handleCheckboxChange = (event: Event) => {
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
  }, [editorRef, onChange]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Note content"
      data-testid="scratchpad-content-editor"
      spellCheck
      onInput={(event) => onChange(event.currentTarget.innerHTML)}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      className="scratchpad-editor custom-scrollbar h-full w-full overflow-y-auto break-words text-sm leading-relaxed text-foreground outline-none [&_div]:min-h-[1.25em] [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
    />
  );
}

interface FormatButtonProps {
  label: string;
  compact?: boolean;
  onClick: () => void;
  onSaveSelection: () => void;
  children: React.ReactNode;
}

function FormatButton({
  label,
  compact = false,
  onClick,
  onSaveSelection,
  children,
}: FormatButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
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

function ToolbarDivider() {
  return (
    <span
      aria-hidden="true"
      className="mx-0.5 h-4 w-px shrink-0 bg-border/70"
    />
  );
}

interface NoteActionButtonsProps {
  note: PersonalNote;
  copied: boolean;
  className?: string;
  onTogglePin: () => void;
  onCopy: () => void;
  onDelete: (event: React.MouseEvent) => void;
}

function NoteActionButtons({
  note,
  copied,
  className,
  onTogglePin,
  onCopy,
  onDelete,
}: NoteActionButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        size="sm"
        variant="ghost"
        onClick={onTogglePin}
        className={`h-8 gap-1 px-2.5 text-xs ${
          note.pinned ? "bg-amber-500/10 text-amber-500" : "text-muted-foreground"
        }`}
        aria-label={note.pinned ? "Unpin note" : "Pin note"}
        title={note.pinned ? "Unpin note" : "Pin note"}
      >
        <Pin className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {note.pinned ? "Pinned" : "Pin"}
        </span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCopy}
        className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Copy note"
        title="Copy note"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Copy</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
        aria-label="Delete note"
        title="Delete note"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface FormattingToolbarProps {
  placement: "inline" | "bottom";
  onSaveSelection: () => void;
  onFormat: (command: FormatCommand, value?: string) => void;
}

function FormattingToolbar({
  placement,
  onSaveSelection,
  onFormat,
}: FormattingToolbarProps) {
  const [textColor, setTextColor] = useState("#b45309");

  const textStyleButtons = (
    <div className="flex items-center gap-0.5">
      <FormatButton
        compact={placement === "inline"}
        label="Bold"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("bold")}
      >
        <Bold className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        label="Italic"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("italic")}
      >
        <Italic className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        label="Underline"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("underline")}
      >
        <Underline className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
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
        label="Bulleted list"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("insertUnorderedList")}
      >
        <List className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        label="Numbered list"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("insertOrderedList")}
      >
        <ListOrdered className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
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
        label="Align left"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("justifyLeft")}
      >
        <AlignLeft className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        label="Align center"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("justifyCenter")}
      >
        <AlignCenter className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
        label="Align right"
        onSaveSelection={onSaveSelection}
        onClick={() => onFormat("justifyRight")}
      >
        <AlignRight className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        compact={placement === "inline"}
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
        <select
          aria-label="Font size"
          title="Font size"
          defaultValue="3"
          onMouseDown={onSaveSelection}
          onChange={(event) => onFormat("fontSize", event.target.value)}
          className={cn(
            "rounded-md border border-border/60 bg-transparent px-1.5 text-[11px] font-medium text-foreground outline-none focus:ring-2 focus:ring-ring",
            placement === "inline" ? "h-7" : "h-8"
          )}
        >
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="6">X-Large</option>
        </select>
      </div>

      <label
        title="Text color"
        className={cn(
          FORMAT_BUTTON_CLASS,
          placement === "inline" ? "h-7 w-7" : "h-8 w-8",
          "relative cursor-pointer overflow-hidden"
        )}
        onMouseDown={onSaveSelection}
      >
        <Palette className="h-4 w-4" style={{ color: textColor }} />
        <input
          type="color"
          aria-label="Text color"
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
        data-testid="scratchpad-format-toolbar"
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
      data-testid="scratchpad-format-toolbar"
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

interface PersonalScratchpadModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalScratchpadModal({
  open,
  onClose,
}: PersonalScratchpadModalProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const storageKey = getStorageKey(user?.id);

  const [notes, setNotes] = useState<PersonalNote[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });

  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || "");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingUpdatesRef = useRef<Record<string, Partial<PersonalNote>>>({});
  const contentEditorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const notesRef = useRef(notes);

  const updateNotes = useCallback(
    (updater: React.SetStateAction<PersonalNote[]>) => {
      setNotes((previous) => {
        const next =
          typeof updater === "function"
            ? (updater as (current: PersonalNote[]) => PersonalNote[])(previous)
            : updater;
        notesRef.current = next;
        return next;
      });
    },
    []
  );

  // Start on the note list when the mobile modal is opened.
  useEffect(() => {
    if (open && isMobile) {
      setMobilePane("list");
    }
  }, [open, isMobile]);

  // Sync from backend when modal is opened or user changes
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    scratchpadApi
      .getScratchpads()
      .then((serverNotes) => {
        if (!isMounted) return;
        if (serverNotes && serverNotes.length > 0) {
          updateNotes(serverNotes);
          setSelectedNoteId((prevId) =>
            serverNotes.some((n) => n.id === prevId) ? prevId : serverNotes[0]?.id || ""
          );
        }
      })
      .catch((err) => {
        // Fallback to local cache gracefully if offline/unreachable
        console.warn("Scratchpad cloud sync unavailable, using local cache:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [open, updateNotes, user?.id]);

  // Sync to user-scoped localStorage for instantaneous offline render
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
      window.dispatchEvent(new Event("personal_notes_updated"));
    } catch (e) {
      console.error("Failed to cache personal notes locally:", e);
    }
  }, [notes, storageKey]);

  // Cleanup pending debounce timeouts
  useEffect(() => {
    const timeouts = saveTimeoutRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const queueServerUpdate = (
    noteId: string,
    updates: Partial<PersonalNote>,
    immediate: boolean = false
  ) => {
    if (saveTimeoutRef.current[noteId]) {
      clearTimeout(saveTimeoutRef.current[noteId]);
    }

    const pendingUpdates = {
      ...(pendingUpdatesRef.current[noteId] ?? {}),
      ...updates,
    };
    pendingUpdatesRef.current[noteId] = pendingUpdates;

    const runSync = async () => {
      delete saveTimeoutRef.current[noteId];
      delete pendingUpdatesRef.current[noteId];

      try {
        await scratchpadApi.updateScratchpad(noteId, pendingUpdates);
      } catch (err) {
        console.warn("Failed to sync scratchpad note to cloud:", err);
      }
    };

    if (immediate) {
      void runSync();
    } else {
      saveTimeoutRef.current[noteId] = setTimeout(runSync, 600);
    }
  };

  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0];
  const activeContentText = useMemo(
    () => htmlToPlainText(activeNote?.content || ""),
    [activeNote?.content]
  );

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (isMobile) {
      setMobilePane("editor");
    }
  };

  const handleCreateNote = async () => {
    const randomColor = COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)].bg;
    const tempId = "note-" + Math.random().toString(36).substring(2, 9);
    const newNote: PersonalNote = {
      id: tempId,
      title: "Untitled Scratchpad",
      content: "",
      color: randomColor,
      pinned: false,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic local add
    updateNotes((previous) => [newNote, ...previous]);
    setSelectedNoteId(newNote.id);
    if (isMobile) {
      setMobilePane("editor");
    }

    try {
      const created = await scratchpadApi.createScratchpad({
        title: newNote.title,
        content: newNote.content,
        color: newNote.color,
        pinned: newNote.pinned,
      });

      // Preserve anything the user typed while the create request was in flight.
      const localNote = notesRef.current.find((note) => note.id === tempId);
      const pendingSave = saveTimeoutRef.current[tempId];
      if (pendingSave) {
        clearTimeout(pendingSave);
        delete saveTimeoutRef.current[tempId];
      }
      delete pendingUpdatesRef.current[tempId];

      const mergedNote: PersonalNote = {
        ...created,
        title: localNote?.title ?? created.title,
        content: localNote?.content ?? created.content,
        color: localNote?.color ?? created.color,
        pinned: localNote?.pinned ?? created.pinned,
        updatedAt: localNote?.updatedAt || created.updatedAt,
      };
      const hasLocalChanges =
        !!localNote &&
        (localNote.title !== created.title ||
          localNote.content !== created.content ||
          localNote.color !== created.color ||
          localNote.pinned !== created.pinned);

      // Replace temporary ID with server ID
      updateNotes((previous) =>
        previous.map((note) => (note.id === tempId ? mergedNote : note))
      );
      setSelectedNoteId((previous) =>
        previous === tempId ? created.id : previous
      );

      if (hasLocalChanges) {
        void scratchpadApi
          .updateScratchpad(created.id, {
            title: mergedNote.title,
            content: mergedNote.content,
            color: mergedNote.color,
            pinned: mergedNote.pinned,
          })
          .catch((error) => {
            console.warn("Failed to sync rapid scratchpad edits:", error);
          });
      }

      toast.success("New personal note created");
    } catch {
      toast.success("New personal note created (saved locally)");
    }
  };

  const handleUpdateActiveNote = (updates: Partial<PersonalNote>, immediateSync: boolean = false) => {
    if (!activeNote) return;
    const updatedDate = new Date().toISOString();

    updateNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? { ...n, ...updates, updatedAt: updatedDate }
          : n
      )
    );

    // If updating pinned, re-order so pinned notes stay on top
    if ("pinned" in updates) {
      updateNotes((prev) => {
        const updatedList = prev.map((n) =>
          n.id === activeNote.id ? { ...n, ...updates, updatedAt: updatedDate } : n
        );
        return [...updatedList].sort((a, b) => {
          if (a.pinned === b.pinned) {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }
          return a.pinned ? -1 : 1;
        });
      });
    }

    queueServerUpdate(activeNote.id, updates, immediateSync);
  };

  const saveEditorSelection = () => {
    const editor = contentEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = range.cloneRange();
    }
  };

  const restoreEditorSelection = () => {
    const editor = contentEditorRef.current;
    if (!editor) return;

    editor.focus();
    const range = savedSelectionRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return;

    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      // The saved range can become detached after a note switch.
    }
  };

  const handleContentChange = (html: string) => {
    handleUpdateActiveNote({ content: sanitizeNoteHtml(html) });
  };

  const getClosestEditorList = (): HTMLElement | null => {
    const editor = contentEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;

    const node = selection.anchorNode;
    const element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node?.parentElement;
    const list = element?.closest("ul, ol");

    return list && editor.contains(list) ? (list as HTMLElement) : null;
  };

  const detachChecklistFormatting = (list: HTMLElement) => {
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
  };

  const replaceListTag = (list: HTMLElement, tagName: "UL" | "OL") => {
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
  };

  const applyChecklistFormatting = () => {
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

    const editor = contentEditorRef.current;
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
  };

  const handleFormat = (command: FormatCommand, value?: string) => {
    const editor = contentEditorRef.current;
    if (!editor || !activeNote) return;

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
      console.warn("Unable to apply scratchpad formatting:", error);
      return;
    }

    handleContentChange(editor.innerHTML);
  };

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const filtered = notesRef.current.filter((n) => n.id !== id);
    const pendingSave = saveTimeoutRef.current[id];
    if (pendingSave) {
      clearTimeout(pendingSave);
      delete saveTimeoutRef.current[id];
    }
    delete pendingUpdatesRef.current[id];
    updateNotes(filtered);
    if (selectedNoteId === id) {
      setSelectedNoteId(filtered[0]?.id || "");
      if (isMobile) {
        setMobilePane("list");
      }
    }

    try {
      await scratchpadApi.deleteScratchpad(id);
      toast.info("Note deleted");
    } catch {
      toast.info("Note deleted");
    }
  };

  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(`${activeNote.title}\n\n${activeContentText}`);
    setCopied(true);
    toast.success("Note copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        htmlToPlainText(note.content).toLowerCase().includes(query)
    );
  }, [notes, search]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex h-[calc(100dvh_-_1.5rem)] max-h-[calc(100dvh_-_1.5rem)] w-[calc(100%_-_1.5rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border-border/70 bg-card p-0 shadow-2xl sm:h-[620px] sm:w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 py-4 pl-4 pr-12 sm:pl-6 sm:pr-12">
          <div className="flex min-w-0 items-center gap-2.5">
            {isMobile && mobilePane === "editor" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobilePane("list")}
                className="-ml-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Back to notes"
                title="Back to notes"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-bold text-foreground">
                Scratchpad
              </DialogTitle>
              <DialogDescription className="sr-only">
                Private notes synced securely to your personal account
              </DialogDescription>
            </div>
          </div>

          {(!isMobile || mobilePane === "list") && (
            <Button
              size="sm"
              onClick={handleCreateNote}
              className="h-8 shrink-0 gap-1.5 bg-amber-500 text-xs font-semibold text-white shadow-xs hover:bg-amber-600"
            >
              <Plus className="h-3.5 w-3.5" />
              New Note
            </Button>
          )}
        </div>

        {/* Body: split view on desktop, single-page navigation on mobile */}
        <div className="flex min-h-0 flex-1">
          {/* Left Notes List */}
          {(!isMobile || mobilePane === "list") && (
            <div
              data-testid="scratchpad-note-list"
              className={cn(
                "flex min-h-0 flex-col bg-muted/10 p-3",
                isMobile ? "w-full" : "w-64 border-r border-border/50 xl:w-72"
              )}
            >
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/60 border-border/60"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  <StickyNote className="h-6 w-6 mx-auto mb-1 opacity-30" />
                  <p>No notes found</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = activeNote?.id === note.id;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => handleSelectNote(note.id)}
                      className={`w-full rounded-xl border p-2.5 text-left transition-all group ${
                        isSelected
                          ? "bg-card border-primary/40 shadow-sm ring-1 ring-primary/20"
                          : "bg-card/50 border-border/50 hover:bg-card hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: note.color }}
                          />
                          <span className="text-xs font-bold text-foreground truncate">
                            {note.title || "Untitled"}
                          </span>
                        </div>
                        {note.pinned && (
                          <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {htmlToPlainText(note.content) || "Empty note..."}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          )}

          {/* Right Note Editor */}
          {(!isMobile || mobilePane === "editor") &&
            (activeNote ? (
            <div
              data-testid="scratchpad-note-editor"
              className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card p-4 sm:p-5"
            >
              {/* Note Controls Bar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Color:</span>
                  <div className="flex items-center gap-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleUpdateActiveNote({ color: c.bg }, true)}
                        className={`h-5 w-5 rounded-full border transition-transform ${
                          activeNote.color === c.bg
                            ? "scale-110 ring-2 ring-primary ring-offset-1"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.bg, borderColor: c.border }}
                        title={c.name}
                        aria-label={`Use ${c.name} note color`}
                      />
                    ))}
                  </div>

                  {!isMobile && (
                    <>
                      <div
                        className="mx-1 h-4 w-px bg-border/70"
                        aria-hidden="true"
                      />
                      <FormattingToolbar
                        key={activeNote.id}
                        placement="inline"
                        onSaveSelection={saveEditorSelection}
                        onFormat={handleFormat}
                      />
                    </>
                  )}
                </div>

                {isMobile && (
                  <NoteActionButtons
                    note={activeNote}
                    copied={copied}
                    className="ml-auto"
                    onTogglePin={() =>
                      handleUpdateActiveNote(
                        { pinned: !activeNote.pinned },
                        true
                      )
                    }
                    onCopy={handleCopy}
                    onDelete={(event) =>
                      handleDeleteNote(activeNote.id, event)
                    }
                  />
                )}
              </div>

              {/* Title & Body Inputs */}
              <div className="mb-2 flex items-center gap-2">
                <Input
                  value={activeNote.title}
                  onChange={(e) =>
                    handleUpdateActiveNote({ title: e.target.value })
                  }
                  placeholder="Note Title..."
                  className="flex-1 border-0 bg-transparent px-0 text-lg font-bold shadow-none focus-visible:ring-0"
                />
                {!isMobile && (
                  <NoteActionButtons
                    note={activeNote}
                    copied={copied}
                    className="shrink-0"
                    onTogglePin={() =>
                      handleUpdateActiveNote(
                        { pinned: !activeNote.pinned },
                        true
                      )
                    }
                    onCopy={handleCopy}
                    onDelete={(event) =>
                      handleDeleteNote(activeNote.id, event)
                    }
                  />
                )}
              </div>

              <div className="relative min-h-0 flex-1">
                {activeContentText.trim().length === 0 && (
                  <p className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/70">
                    Type your notes, lists, or reminders...
                  </p>
                )}
                <ScratchpadContentEditor
                  key={activeNote.id}
                  initialContent={activeNote.content}
                  onChange={handleContentChange}
                  editorRef={contentEditorRef}
                />
              </div>

              {/* Footer status */}
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
                  isMobile ? "pt-1" : "border-t border-border/40 pt-2"
                )}
              >
                <span>
                  {activeContentText.length} characters •{" "}
                  {activeContentText.trim()
                    ? activeContentText.trim().split(/\s+/).filter(Boolean).length
                    : 0}{" "}
                  words
                </span>
                <span>
                  Updated{" "}
                  {new Date(activeNote.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {isMobile && (
                <div className="mt-1 border-t border-border/40 pt-2">
                  <FormattingToolbar
                    key={activeNote.id}
                    placement="bottom"
                    onSaveSelection={saveEditorSelection}
                    onFormat={handleFormat}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <StickyNote className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Select or create a note to begin</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
