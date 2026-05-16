from fastapi import APIRouter, Depends, HTTPException
from app.db import supabase
from app.dependencies import get_current_user
from app.models.schemas import DiaryCreate, GenerateDraftRequest, FinalizeRequest, RefineRequest, RestoreRequest, ChatMessage
from app.services import llm

router = APIRouter()


@router.get("/search")
async def search_diaries(q: str, user=Depends(get_current_user)):
    if not q.strip():
        return []
    sq = q.replace("%", r"\%").replace("_", r"\_")
    result = (
        supabase.table("diary_entries")
        .select("id, title, content, mood, diary_date, status, photos(image_url)")
        .eq("user_id", str(user.id))
        .or_(f"title.ilike.%{sq}%,content.ilike.%{sq}%,mood.ilike.%{sq}%,draft_content.ilike.%{sq}%")
        .order("diary_date", desc=True)
        .execute()
    )
    return result.data


@router.post("")
async def create_diary(data: DiaryCreate, user=Depends(get_current_user)):
    result = supabase.table("diary_entries").insert({
        "user_id": str(user.id),
        "diary_date": str(data.diary_date),
        "style": data.style,
    }).execute()
    return result.data[0]


@router.get("")
async def list_diaries(user=Depends(get_current_user)):
    result = (
        supabase.table("diary_entries")
        .select("*, photos(*)")
        .eq("user_id", str(user.id))
        .order("diary_date", desc=True)
        .order("display_order", foreign_table="photos")
        .execute()
    )
    return result.data


@router.get("/{diary_id}")
async def get_diary(diary_id: str, user=Depends(get_current_user)):
    result = (
        supabase.table("diary_entries")
        .select("*, photos(*)")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .order("display_order", foreign_table="photos")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Diary not found")
    return result.data


@router.post("/{diary_id}/generate-photo-questions")
async def generate_photo_questions(diary_id: str, user=Depends(get_current_user)):
    diary = (
        supabase.table("diary_entries")
        .select("photos(*)")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")

    photos = diary.data.get("photos", [])
    captions = [p["ai_caption"] for p in photos if p.get("ai_caption")]
    if not captions:
        raise HTTPException(status_code=400, detail="사진을 먼저 업로드해주세요")

    questions = llm.generate_photo_questions(captions)
    return {"questions": questions}


@router.post("/{diary_id}/generate-draft")
async def generate_draft(
    diary_id: str,
    data: GenerateDraftRequest,
    user=Depends(get_current_user),
):
    diary = (
        supabase.table("diary_entries")
        .select("*, photos(*)")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")

    photos = diary.data.get("photos", [])
    captions = [p["ai_caption"] for p in photos if p.get("ai_caption")]

    profile = supabase.table("profiles").select("*").eq("id", str(user.id)).single().execute()
    draft = llm.generate_draft(captions, data.memo, diary.data["style"], profile.data)

    supabase.table("diary_entries").update({
        "draft_content": draft,
        "status": "draft",
    }).eq("id", diary_id).execute()

    conv = supabase.table("conversations").insert({
        "diary_id": diary_id,
        "user_id": str(user.id),
    }).execute()

    return {"draft": draft, "conversation_id": conv.data[0]["id"]}


@router.post("/{diary_id}/generate-questions")
async def generate_questions(diary_id: str, user=Depends(get_current_user)):
    diary = (
        supabase.table("diary_entries")
        .select("draft_content, photos(*), style")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")
    if not diary.data.get("draft_content"):
        raise HTTPException(status_code=400, detail="초안을 먼저 생성해주세요")

    photos = diary.data.get("photos", [])
    captions = [p["ai_caption"] for p in photos if p.get("ai_caption")]
    questions = llm.generate_questions(captions, diary.data["draft_content"])

    conv = (
        supabase.table("conversations")
        .select("id")
        .eq("diary_id", diary_id)
        .single()
        .execute()
    )
    conv_id = conv.data["id"]

    for q in questions:
        supabase.table("messages").insert({
            "conversation_id": conv_id,
            "role": "assistant",
            "content": q,
            "message_type": "question",
        }).execute()

    supabase.table("diary_entries").update({"status": "questioning"}).eq("id", diary_id).execute()

    return {"questions": questions, "conversation_id": conv_id}


@router.post("/{diary_id}/finalize")
async def finalize_diary(
    diary_id: str,
    data: FinalizeRequest,
    user=Depends(get_current_user),
):
    diary = (
        supabase.table("diary_entries")
        .select("draft_content, style")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")
    if not diary.data.get("draft_content"):
        raise HTTPException(status_code=400, detail="초안을 먼저 생성해주세요")

    result = llm.finalize_diary(
        diary.data["draft_content"],
        data.answers,
        diary.data["style"],
    )

    supabase.table("diary_entries").update({
        "title": result.get("title"),
        "content": result.get("content"),
        "mood": result.get("mood"),
        "status": "completed",
    }).eq("id", diary_id).execute()

    conv = (
        supabase.table("conversations")
        .select("id")
        .eq("diary_id", diary_id)
        .single()
        .execute()
    )
    if not conv.data:
        conv = supabase.table("conversations").insert({
            "diary_id": diary_id,
            "user_id": str(user.id),
        }).execute()
        conv = supabase.table("conversations").select("id").eq("diary_id", diary_id).single().execute()

    if conv.data:
        for item in data.answers:
            supabase.table("messages").insert({
                "conversation_id": conv.data["id"],
                "role": "user",
                "content": item["answer"],
                "message_type": "answer",
            }).execute()

        supabase.table("messages").insert({
            "conversation_id": conv.data["id"],
            "role": "assistant",
            "content": result.get("content"),
            "message_type": "final",
        }).execute()

        supabase.table("conversations").update({"status": "completed"}).eq("id", conv.data["id"]).execute()

    return result


@router.put("/{diary_id}/content")
async def update_content(diary_id: str, data: dict, user=Depends(get_current_user)):
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
    supabase.table("diary_entries").update({
        "title": data.get("title"),
        "content": data.get("content"),
    }).eq("id", diary_id).execute()
    return {"message": "저장됐어요"}


@router.delete("/{diary_id}")
async def delete_diary(diary_id: str, user=Depends(get_current_user)):
    diary = (
        supabase.table("diary_entries")
        .select("id, photos(image_url)")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")

    for photo in diary.data.get("photos", []):
        try:
            storage.delete_image(photo["image_url"])
        except Exception:
            pass

    supabase.table("diary_entries").delete().eq("id", diary_id).execute()
    return {"message": "삭제되었습니다"}


@router.post("/{diary_id}/refine")
async def refine_diary(
    diary_id: str,
    data: RefineRequest,
    user=Depends(get_current_user),
):
    diary = (
        supabase.table("diary_entries")
        .select("content, style")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")
    if not diary.data.get("content"):
        raise HTTPException(status_code=400, detail="완성된 일기가 없어요")

    result = llm.refine_diary(
        diary.data["content"],
        data.message,
        diary.data["style"],
        history=[h.model_dump() for h in data.history],
    )
    refined_content = result.get("content", "")
    refined_mood = result.get("mood", "")

    update_data: dict = {"content": refined_content}
    if refined_mood:
        update_data["mood"] = refined_mood
    supabase.table("diary_entries").update(update_data).eq("id", diary_id).execute()

    conv = (
        supabase.table("conversations")
        .select("id")
        .eq("diary_id", diary_id)
        .single()
        .execute()
    )
    if conv.data:
        supabase.table("messages").insert({
            "conversation_id": conv.data["id"],
            "role": "user",
            "content": data.message,
            "message_type": "answer",
        }).execute()
        supabase.table("messages").insert({
            "conversation_id": conv.data["id"],
            "role": "assistant",
            "content": refined_content,
            "message_type": "final",
        }).execute()

    return {"content": refined_content, "mood": refined_mood}


@router.get("/{diary_id}/messages")
async def get_diary_messages(diary_id: str, user=Depends(get_current_user)):
    conv = (
        supabase.table("conversations")
        .select("id")
        .eq("diary_id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not conv.data:
        return []
    result = (
        supabase.table("messages")
        .select("role, content, message_type, created_at")
        .eq("conversation_id", conv.data["id"])
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


@router.get("/{diary_id}/revisions")
async def get_revisions(diary_id: str, user=Depends(get_current_user)):
    diary = (
        supabase.table("diary_entries")
        .select("content")
        .eq("id", diary_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not diary.data:
        raise HTTPException(status_code=404, detail="Diary not found")

    conv = (
        supabase.table("conversations")
        .select("id")
        .eq("diary_id", diary_id)
        .single()
        .execute()
    )
    if not conv.data:
        return []

    result = (
        supabase.table("messages")
        .select("id, content, created_at")
        .eq("conversation_id", conv.data["id"])
        .eq("role", "assistant")
        .eq("message_type", "final")
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


@router.post("/{diary_id}/revisions/restore")
async def restore_revision(
    diary_id: str,
    data: RestoreRequest,
    user=Depends(get_current_user),
):
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

    supabase.table("diary_entries").update({"content": data.content}).eq("id", diary_id).execute()
    return {"content": data.content}
