import { describe, expect, it } from "vitest";
import {
  htmlToPlainText,
  plainTextToHtml,
  sanitizeNoteHtml,
  toEditorHtml,
} from "@/utils/scratchpadHtml";

describe("scratchpadHtml", () => {
  it("converts legacy plain text into line-preserving editor HTML", () => {
    expect(plainTextToHtml("First line\n\nThird <line>")).toBe(
      "<div>First line</div><div><br></div><div>Third &lt;line&gt;</div>"
    );
    expect(toEditorHtml("Plain note")).toBe("<div>Plain note</div>");
  });

  it("keeps safe formatting and strips scripts, events, and unsafe styles", () => {
    const html = sanitizeNoteHtml(
      '<div onclick="alert(1)"><b>Bold</b><i>Italic</i><u>Under</u><s>Strike</s>' +
        '<script>alert(2)</script>' +
        '<span style="font-size: large; color: red; background-image: url(x)">' +
        "Large</span><a href=\"javascript:alert(3)\">Link</a></div>"
    );

    expect(html).toContain("<b>Bold</b>");
    expect(html).toContain("<i>Italic</i>");
    expect(html).toContain("<u>Under</u>");
    expect(html).toContain("<s>Strike</s>");
    expect(toEditorHtml("<s>Strike</s>")).toBe("<s>Strike</s>");
    expect(html).toContain(
      '<span style="font-size: large; color: red">Large</span>'
    );
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("background-image");
    expect(html).not.toContain("<a");
    expect(html).toContain("Link");
  });

  it("preserves safe checklist markup and removes unsafe controls", () => {
    const html = sanitizeNoteHtml(
      '<ul data-checklist="true"><li data-checked="true">' +
        '<input type="checkbox" checked contenteditable="false" aria-label="Toggle checklist item">' +
        "Done</li></ul>" +
        '<input type="text" value="secret">' +
        '<p style="text-align: center; color: #ff0000">Centered</p>'
    );

    expect(html).toContain('<ul data-checklist="true">');
    expect(html).toContain('<li data-checked="true">');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toContain('contenteditable="false"');
    expect(html).not.toContain('type="text"');
    expect(html).not.toContain("secret");
    expect(html).toContain('style="text-align: center; color: rgb(255, 0, 0)"');
  });

  it("extracts readable plain text for search, previews, and copying", () => {
    const html =
      "<div>Standup</div><ul><li>One</li><li><b>Two</b></li></ul><div><br></div>";

    expect(htmlToPlainText(html)).toBe("Standup\n• One\n• Two");
    expect(htmlToPlainText("Legacy plain text")).toBe("Legacy plain text");
  });

  it("includes checklist state when extracting plain text", () => {
    const html =
      '<ul data-checklist="true"><li data-checked="true">' +
      '<input type="checkbox" checked>Done</li>' +
      '<li data-checked="false"><input type="checkbox">Todo</li></ul>';

    expect(htmlToPlainText(html)).toBe("☑ Done\n☐ Todo");
  });
});
