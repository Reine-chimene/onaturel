import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "@/lib/utils/errors";

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(detail: string, status: number) {
  return NextResponse.json({ detail }, { status });
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return jsonError(first?.message || "Requête invalide.", 400);
  }
  console.error(error);
  return jsonError("Erreur interne.", 500);
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const body = await req.json().catch(() => null);
  return schema.parse(body);
}

export function queryString(req: Request) {
  return new URL(req.url).searchParams;
}
