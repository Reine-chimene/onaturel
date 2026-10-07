import { Client as MinioClient } from "minio";

const PUBLIC_MEDIA_PREFIXES = ["products/", "cms/"] as const;

function settings() {
  return {
    endpoint: process.env.MINIO_ENDPOINT || "localhost:9000",
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || "localhost:9000",
    accessKey: process.env.MINIO_ACCESS_KEY || "onaturelle",
    secretKey: process.env.MINIO_SECRET_KEY || "onaturelle_minio",
    bucket: process.env.MINIO_BUCKET || "onaturelle-media",
    useSsl: (process.env.MINIO_USE_SSL || "false").toLowerCase() === "true",
  };
}

function parseEndpoint(value: string): { host: string; port: number } {
  const [host, portRaw] = value.split(":");
  return { host, port: portRaw ? Number(portRaw) : 9000 };
}

export function publicObjectUrl(storageKey: string): string {
  const cfg = settings();
  const scheme = cfg.useSsl ? "https" : "http";
  const host = cfg.publicEndpoint || cfg.endpoint;
  const key = storageKey.replace(/^\/+/, "");
  return `${scheme}://${host}/${cfg.bucket}/${key}`;
}

export function minioClient(): MinioClient {
  const cfg = settings();
  const { host, port } = parseEndpoint(cfg.endpoint);
  return new MinioClient({
    endPoint: host,
    port,
    useSSL: cfg.useSsl,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey,
  });
}

export async function ensureBucket(): Promise<void> {
  const cfg = settings();
  const client = minioClient();
  const exists = await client.bucketExists(cfg.bucket);
  if (!exists) await client.makeBucket(cfg.bucket);
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: PUBLIC_MEDIA_PREFIXES.map((prefix) => ({
      Sid: `PublicRead${prefix.replace("/", "").replace(/[^a-zA-Z]/g, "")}`,
      Effect: "Allow",
      Principal: { AWS: ["*"] },
      Action: ["s3:GetObject"],
      Resource: [`arn:aws:s3:::${cfg.bucket}/${prefix}*`],
    })),
  });
  await client.setBucketPolicy(cfg.bucket, policy);
}

export { PUBLIC_MEDIA_PREFIXES };
