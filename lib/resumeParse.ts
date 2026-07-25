// Polyfill DOMMatrix for pdf-parse (which uses an old pdf.js) on Node 22+
if (typeof global !== "undefined" && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix {};
}

/**
 * Extracts plain text from an uploaded resume file so it can be handed to the
 * parsing agent. Supports PDF, DOCX, and plain text; anything else falls back
 * to a raw UTF-8 read.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf" || mimeType === "application/pdf") {
    // @ts-ignore
    const pdfParse: any = (await import("pdf-parse"));
    const parser = typeof pdfParse === "function" ? pdfParse : (pdfParse.default || pdfParse);
    const result = await parser(buffer);
    return result.text;
  }

  if (ext === "docx" || mimeType?.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  return buffer.toString("utf8");
}

/**
 * Strips the noise raw PDF/DOCX extraction tends to leave behind (repeated
 * blank lines, trailing spaces, stray control characters, page-break
 * artifacts) before the text reaches the model — pure token savings, since
 * none of this carries information, and less clutter tends to help
 * extraction accuracy too.
 */
export function cleanResumeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
