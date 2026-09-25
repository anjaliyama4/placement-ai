from fastapi import APIRouter, Depends
from apps.api.db.connection import get_connection
from apps.api.security import get_current_user_id

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/")
def get_notifications(user_id: int = Depends(get_current_user_id)):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, message, is_read, created_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()
    return {
        "notifications": [
            {
                "id": row[0],
                "title": row[1],
                "message": row[2],
                "is_read": row[3],
                "created_at": row[4],
            }
            for row in rows
        ]
    }

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user_id: int = Depends(get_current_user_id),
):
    with get_connection() as conn:
        row = conn.execute(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s AND user_id = %s
            RETURNING id, is_read
            """,
            (notification_id, user_id),
        ).fetchone()
    return {"id": notification_id, "is_read": bool(row[1]) if row else False}
