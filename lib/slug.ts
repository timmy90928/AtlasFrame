export function normalizePlaceName(name: string) {
  return name.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function toSlug(value: string) {
  return normalizePlaceName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 170);
}
