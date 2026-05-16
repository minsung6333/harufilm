from fastapi import APIRouter, Depends, HTTPException
from app.db import supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/{conversation_id}/messages")
async def get_messages(conversation_id: str, user=Depends(get_current_user)):
    conv = (
        supabase.table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data
