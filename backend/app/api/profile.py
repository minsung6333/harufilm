from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db import supabase
from app.dependencies import get_current_user

router = APIRouter()


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    default_style: Optional[str] = None
    topics: Optional[list[str]] = None
    diary_length: Optional[str] = None


@router.get("")
async def get_profile(user=Depends(get_current_user)):
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", str(user.id))
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        # 프로필이 없으면 기본값으로 생성
        created = supabase.table("profiles").insert({
            "id": str(user.id),
            "nickname": None,
            "default_style": "casual",
            "topics": [],
            "diary_length": "medium",
        }).execute()
        return created.data[0]
    return result.data


@router.put("")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="변경할 내용이 없어요")

    result = (
        supabase.table("profiles")
        .upsert({"id": str(user.id), **update_data})
        .execute()
    )
    return result.data[0]
