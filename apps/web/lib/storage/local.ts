import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ROOT = process.env.STORAGE_LOCAL_PATH || path.join(process.cwd(), "storage", "media");

export function localStorageRoot(): string {
  return ROOT;
}

export function localPublicUrl(storageKey: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const key = storageKey.replace(/^\/+/, "");
  return `${base}/api/v1/media/${key}`;
}

export async function ensureLocalStorage(): Promise<void> {
  await mkdir(path.join(ROOT, "products"), { recursive: true });
  await mkdir(path.join(ROOT, "cms"), { recursive: true });
}

export async function writeLocalObject(storageKey: string, data: Buffer): Promise<void> {
  const filePath = path.join(ROOT, storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

export function resolveLocalPath(storageKey: string): string {
  const normalized = storageKey.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, normalized);
  if (!filePath.startsWith(path.resolve(ROOT))) {
    throw new Error("Chemin média invalide.");
  }
  return filePath;
}
