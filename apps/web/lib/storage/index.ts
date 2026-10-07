import { ensureBucket, minioClient, publicObjectUrl as minioPublicUrl } from "@/lib/storage/minio";
import {
  ensureLocalStorage,
  localPublicUrl,
  resolveLocalPath,
  writeLocalObject,
} from "@/lib/storage/local";

export function useLocalStorage(): boolean {
  if (process.env.NETLIFY === "true") return false;
  const driver = (process.env.STORAGE_DRIVER || "").toLowerCase();
  if (driver === "local") return true;
  if (driver === "minio") return false;
  return !process.env.MINIO_ENDPOINT;
}

export function publicObjectUrl(storageKey: string): string {
  return useLocalStorage() ? localPublicUrl(storageKey) : minioPublicUrl(storageKey);
}

export async function ensureStorage(): Promise<void> {
  if (useLocalStorage()) {
    await ensureLocalStorage();
    return;
  }
  await ensureBucket();
}

export async function uploadObject(storageKey: string, data: Buffer, mime: string): Promise<void> {
  if (useLocalStorage()) {
    await writeLocalObject(storageKey, data);
    return;
  }
  const bucket = process.env.MINIO_BUCKET || "onaturelle-media";
  await minioClient().putObject(bucket, storageKey, data, data.length, { "Content-Type": mime });
}

export { resolveLocalPath };
