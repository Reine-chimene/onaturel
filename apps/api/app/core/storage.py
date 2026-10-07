import json

from minio import Minio

from app.core.config import get_settings

# Catalog images live under this prefix. Anonymous GET is allowed here only.
PUBLIC_MEDIA_PREFIX = "products/"


def minio_client() -> Minio:
    settings = get_settings()
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )


def public_object_url(storage_key: str) -> str:
    settings = get_settings()
    scheme = "https" if settings.minio_use_ssl else "http"
    host = settings.minio_public_endpoint or settings.minio_endpoint
    key = storage_key.lstrip("/")
    return f"{scheme}://{host}/{settings.minio_bucket}/{key}"


def catalog_media_read_policy(bucket: str) -> str:
    """Allow anonymous GetObject on product media only. No list, write, or other prefixes."""
    return json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadProductMedia",
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/{PUBLIC_MEDIA_PREFIX}*"],
                }
            ],
        }
    )


def ensure_bucket() -> None:
    settings = get_settings()
    client = minio_client()
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)
    client.set_bucket_policy(settings.minio_bucket, catalog_media_read_policy(settings.minio_bucket))
