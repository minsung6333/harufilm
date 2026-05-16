from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.db import supabase
from app.dependencies import get_current_user
from app.services import llm, storage

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@router.post("/{diary_id}/photos")
async def upload_photo(
    diary_id: str,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="JPG, PNG, WEBP 이미지만 업로드 가능합니다")

    diary = (
        supabase.table("diary_entries")
        .select("id")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")

    file_bytes = await file.read()
    image_url = storage.upload_image(file_bytes, file.content_type, str(user.id))
    ai_caption = llm.analyze_photo(image_url)

    existing = (
        supabase.table("photos")
        .select("id")
        .eq("diary_id", diary_id)
        .execute()
    )
    display_order = len(existing.data)

    result = supabase.table("photos").insert({
        "diary_id": diary_id,
        "user_id": str(user.id),
        "image_url": image_url,
        "ai_caption": ai_caption,
        "display_order": display_order,
    }).execute()

    return result.data[0]


@router.delete("/{diary_id}/photos/{photo_id}")
async def delete_photo(diary_id: str, photo_id: str, user=Depends(get_current_user)):
    photo = (
        supabase.table("photos")
        .select("image_url")
        .eq("id", photo_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not photo.data:
        raise HTTPException(status_code=404, detail="Photo not found")

    storage.delete_image(photo.data["image_url"])
    supabase.table("photos").delete().eq("id", photo_id).execute()

    return {"message": "삭제되었습니다"}
