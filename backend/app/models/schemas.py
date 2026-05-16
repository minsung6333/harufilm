from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
import uuid


class DiaryCreate(BaseModel):
    diary_date: date
    style: str = "casual"


class DiaryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    mood: Optional[str] = None


class DiaryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str]
    draft_content: Optional[str]
    content: Optional[str]
    mood: Optional[str]
    diary_date: date
    style: str
    status: str
    created_at: datetime
    updated_at: datetime


class GenerateDraftRequest(BaseModel):
    memo: str


class GenerateQuestionsRequest(BaseModel):
    pass


class FinalizeRequest(BaseModel):
    answers: list[dict]  # [{"question": "...", "answer": "..."}]


class ChatMessage(BaseModel):
    role: str
    content: str


class RefineRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class RestoreRequest(BaseModel):
    content: str


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    message_type: Optional[str]
    created_at: datetime
