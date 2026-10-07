/** Same-origin Route Handlers. FastAPI :8002 is only a fallback if that process is healthy. */
const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
export const API_URL = raw.includes("localhost:8002") ? "" : raw;
