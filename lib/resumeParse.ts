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
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (ext === "docx" || mimeType?.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  return buffer.toString("utf8");
}
