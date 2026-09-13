import json
from .models import AuditLog


def record(db, actor_id, action, target_type, target_id, reason, **details):
    # Chamadores fornecem apenas IDs, estados e motivos; nunca senha/token/chat.
    db.add(AuditLog(actor_id=actor_id, action=action, target_type=target_type,
                    target_id=target_id, reason=reason,
                    details=json.dumps(details, ensure_ascii=False, sort_keys=True)))
    db.flush()
