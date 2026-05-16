from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import diaries, photos, conversations, profile

app = FastAPI(title="하루필름 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diaries.router, prefix="/diaries", tags=["diaries"])
app.include_router(photos.router, prefix="/diaries", tags=["photos"])
app.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])


@app.get("/")
def root():
    return {"status": "ok", "service": "하루필름 API"}
