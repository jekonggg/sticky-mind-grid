const RICH_TEXT_TAG_PATTERN =
  /<(?:b|strong|i|em|u|s|strike|ul|ol|li|p|div|br|span|font|input)\b[^>]*>/i;

const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "UL",
  "OL",
  "LI",
  "P",
  "DIV",
  "BR",
  "SPAN",
  "FONT",
  "INPUT",
]);

const DROP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "LINK",
  "META",
]);

const SAFE_STYLE_VALUES: Record<string, RegExp> = {
  "font-size":
    /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/i,
  "font-weight": /^(?:normal|bold|bolder|lighter|[1-9]00)$/i,
  "font-style": /^(?:normal|italic|oblique)$/i,
  "text-decoration":
    /^(?:none|underline|line-through|underline line-through|line-through underline)$/i,
  "text-decoration-line":
    /^(?:none|underline|line-through|underline line-through|line-through underline)$/i,
  "text-align": /^(?:left|center|right|justify)$/i,
  color:
    /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}(?:\s*,\s*\d{1,3}){2}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|hsla?\(\s*\d{1,3}(?:\.\d+)?(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|[a-z]+)$/i,
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isRichTextContent(content: string): boolean {
  return RICH_TEXT_TAG_PATTERN.test(content);
}

export function plainTextToHtml(content: string): string {
  if (!content) return "";

  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line ? `<div>${escapeHtml(line)}</div>` : "<div><br></div>"))
    .join("");
}

function sanitizeStyle(style: string): string {
  if (!style || typeof document === "undefined") return "";

  const probe = document.createElement("span");
  probe.setAttribute("style", style);

  return Object.entries(SAFE_STYLE_VALUES)
    .map(([property, validator]) => {
      const value = probe.style.getPropertyValue(property).trim();
      return value && validator.test(value) ? `${property}: ${value}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function sanitizeAttributes(element: HTMLElement) {
  const tag = element.tagName;

  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase();

    if (tag === "FONT" && name === "size") {
      if (!/^[1-7]$/.test(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
      return;
    }

    if (tag === "INPUT") {
      if (name === "type" && attribute.value.toLowerCase() === "checkbox") {
        return;
      }
      if (name === "checked") {
        return;
      }
      if (
        name === "contenteditable" &&
        attribute.value.toLowerCase() === "false"
      ) {
        return;
      }
      if (name === "aria-label") {
        return;
      }
      element.removeAttribute(attribute.name);
      return;
    }

    if ((tag === "UL" || tag === "OL") && name === "data-checklist") {
      element.setAttribute("data-checklist", "true");
      return;
    }

    if (
      tag === "LI" &&
      name === "data-checked" &&
      /^(true|false)$/i.test(attribute.value)
    ) {
      return;
    }

    if (name === "style") {
      const safeStyle = sanitizeStyle(attribute.value);
      if (safeStyle) {
        element.setAttribute("style", safeStyle);
      } else {
        element.removeAttribute(attribute.name);
      }
      return;
    }

    element.removeAttribute(attribute.name);
  });
}

function sanitizeChildren(parent: Node) {
  Array.from(parent.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) return;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      return;
    }

    const element = child as HTMLElement;
    const tag = element.tagName;

    if (DROP_TAGS.has(tag)) {
      element.remove();
      return;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      parent.replaceChild(
        document.createTextNode(element.textContent || ""),
        element
      );
      return;
    }

    if (tag === "INPUT") {
      const input = element as HTMLInputElement;
      if (input.type !== "checkbox") {
        element.remove();
        return;
      }
      input.setAttribute("contenteditable", "false");
      if (!input.getAttribute("aria-label")) {
        input.setAttribute("aria-label", "Toggle checklist item");
      }
      sanitizeAttributes(input);
      return;
    }

    sanitizeAttributes(element);
    sanitizeChildren(element);
  });
}

export function sanitizeNoteHtml(content: string): string {
  if (!content) return "";
  if (typeof document === "undefined") return escapeHtml(content);

  const template = document.createElement("template");
  template.innerHTML = content;
  sanitizeChildren(template.content);
  return template.innerHTML;
}

export function toEditorHtml(content: string): string {
  if (!content) return "";
  return isRichTextContent(content)
    ? sanitizeNoteHtml(content)
    : plainTextToHtml(content);
}

function appendPlainText(node: Node, chunks: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    chunks.push((node.textContent || "").replace(/\u00a0/g, " "));
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  const tag = element.tagName;
  const isBlock = tag === "DIV" || tag === "P" || tag === "LI";

  if (tag === "BR") {
    chunks.push("\n");
    return;
  }

  if (isBlock && chunks.length > 0 && !chunks[chunks.length - 1].endsWith("\n")) {
    chunks.push("\n");
  }

  if (tag === "LI") {
    const list = element.parentElement;
    if (list?.getAttribute("data-checklist") === "true") {
      const checkbox = element.querySelector(
        ":scope > input[type='checkbox']"
      ) as HTMLInputElement | null;
      chunks.push(
        checkbox?.checked || checkbox?.hasAttribute("checked") ? "☑ " : "☐ "
      );
    } else {
      chunks.push("• ");
    }
  }

  Array.from(element.childNodes).forEach((child) => appendPlainText(child, chunks));

  if (isBlock) {
    chunks.push("\n");
  }
}

export function htmlToPlainText(content: string): string {
  if (!content) return "";
  if (!isRichTextContent(content)) return content;
  if (typeof document === "undefined") {
    return content.replace(/<[^>]*>/g, " ");
  }

  const template = document.createElement("template");
  template.innerHTML = sanitizeNoteHtml(content);

  const chunks: string[] = [];
  Array.from(template.content.childNodes).forEach((child) =>
    appendPlainText(child, chunks)
  );

  return chunks
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/([☑☐])\s+/g, "$1 ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
