from uuid import UUID

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def write_audit(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: UUID | str | None = None,
    payload: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=None if actor is None else actor.id,
            action=action,
            entity_type=entity_type,
            entity_id=None if entity_id is None else str(entity_id),
            payload=payload,
        )
    )
