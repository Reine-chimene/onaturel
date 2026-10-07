export function slugify(value: string, maxLength = 160): string {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const slug = normalized
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug.slice(0, maxLength);
}
