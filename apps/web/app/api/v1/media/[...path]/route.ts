import { readFile } from "fs/promises";
import { resolveLocalPath, useLocalStorage } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!useLocalStorage()) {
    return new Response("Not found", { status: 404 });
  }
  const { path: parts } = await ctx.params;
  const storageKey = parts.join("/");
  try {
    const filePath = resolveLocalPath(storageKey);
    const data = await readFile(filePath);
    const ext = storageKey.split(".").pop()?.toLowerCase() ?? "jpg";
    return new Response(data, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
