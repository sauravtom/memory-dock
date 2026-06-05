import pdfParse from "pdf-parse";

export async function extractTextFromUpload(buffer: Buffer, mimeType: string, originalName: string): Promise<string> {
  const lowerName = originalName.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return normalizeText(parsed.text);
  }

  return normalizeText(buffer.toString("utf8"));
}

export function normalizeText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

