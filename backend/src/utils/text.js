export function normalizeDescription(description) {
  return String(description ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}