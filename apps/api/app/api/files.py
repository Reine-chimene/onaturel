from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.deps import require_permission
from app.core.storage import ensure_bucket, minio_client, public_object_url
from app.models import FileAsset, User
from app.services.audit import write_audit

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_BYTES = 8 * 1024 * 1024


class FileOut(BaseModel):
    id: str
    url: str
    original_filename: str
    mime_type: str
    size_bytes: int


@router.post("", response_model=FileOut)
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("catalog:write")),
) -> FileOut:
    mime = (file.content_type or "").lower()
    ext = ALLOWED.get(mime)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formats acceptés : JPEG, PNG, WebP.",
        )
    data = file.file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier vide.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image trop volumineuse (8 Mo maximum).")
    key = f"products/{uuid4().hex}.{ext}"
    settings = get_settings()
    ensure_bucket()
    minio_client().put_object(
        settings.minio_bucket,
        key,
        BytesIO(data),
        length=len(data),
        content_type=mime,
    )
    asset = FileAsset(
        storage_key=key,
        original_filename=file.filename or key,
        mime_type=mime,
        size_bytes=len(data),
    )
    db.add(asset)
    db.flush()
    write_audit(db, actor=user, action="file.upload", entity_type="file", entity_id=asset.id)
    db.commit()
    db.refresh(asset)
    return FileOut(
        id=str(asset.id),
        url=public_object_url(asset.storage_key),
        original_filename=asset.original_filename,
        mime_type=asset.mime_type,
        size_bytes=asset.size_bytes,
    )
