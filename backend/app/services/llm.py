import json
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.openai_api_key)


def analyze_photo(image_url: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": image_url},
                },
                {
                    "type": "text",
                    "text": (
                        "이 사진을 보고 다음을 분석해줘:\n"
                        "1. 장면 설명\n"
                        "2. 장소 추정\n"
                        "3. 분위기\n"
                        "4. 주요 객체\n"
                        "5. 일기 작성에 활용할 수 있는 단서\n\n"
                        "한국어로 간결하게 답변해줘."
                    ),
                },
            ],
        }],
        max_tokens=500,
    )
    return response.choices[0].message.content


def _profile_context(profile: dict | None) -> str:
    if not profile:
        return ""
    parts = []
    if profile.get("nickname"):
        parts.append(f"사용자 이름은 {profile['nickname']}이야.")
    if profile.get("topics"):
        parts.append(f"주로 {', '.join(profile['topics'])}에 관한 것을 기록해.")
    length_map = {"short": "짧고 간결하게", "medium": "적당한 길이로", "long": "풍부하고 자세하게"}
    if profile.get("diary_length") in length_map:
        parts.append(f"일기는 {length_map[profile['diary_length']]} 써줘.")
    return " ".join(parts)


def generate_draft(photo_captions: list[str], user_memo: str, style: str, profile: dict | None = None) -> str:
    profile_ctx = _profile_context(profile)
    if photo_captions:
        captions_text = "\n".join(f"- {c}" for c in photo_captions)
        user_content = f"사진 설명:\n{captions_text}\n\n메모: {user_memo}\n\n일기를 써줘."
    else:
        user_content = f"메모: {user_memo}\n\n일기를 써줘."
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    f"너는 감성적인 일기 작가야. "
                    f"사용자 메모를 바탕으로 {style} 문체의 일기를 써줘. "
                    "일기는 1인칭 시점으로 자연스럽게 작성해줘. "
                    "마크다운 형식으로 작성해줘. 단락은 줄바꿈으로 구분하고, "
                    "강조할 부분은 **굵게**, 소제목은 ## 을 사용해줘. "
                    + profile_ctx
                ),
            },
            {
                "role": "user",
                "content": user_content,
            },
        ],
        max_tokens=800,
    )
    return response.choices[0].message.content


def generate_photo_questions(photo_captions: list[str]) -> list[str]:
    captions_text = "\n".join(f"- {c}" for c in photo_captions)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "너는 일기 작성을 돕는 조수야. "
                    "사진 분석 내용을 바탕으로, 사용자가 그날을 더 잘 기록할 수 있도록 "
                    "맥락에 맞는 질문 2개를 만들어줘. "
                    "사진에 사람이 보이면 누구인지, 장소가 특정되면 어디인지, "
                    "무엇을 하는 장면인지 등을 자연스럽게 물어봐. "
                    "질문만 줄바꿈으로 구분해서 반환해줘."
                ),
            },
            {
                "role": "user",
                "content": f"사진 분석:\n{captions_text}",
            },
        ],
        max_tokens=300,
    )
    content = response.choices[0].message.content
    questions = [q.strip() for q in content.strip().split("\n") if q.strip()]
    photo_qs = questions[:2]
    photo_qs.append("오늘 하루 전반적인 기분은 어땠나요?")
    return photo_qs


def generate_questions(photo_captions: list[str], draft: str) -> list[str]:
    captions_text = "\n".join(f"- {c}" for c in photo_captions)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "너는 일기 작가를 도와주는 조수야. "
                    "사용자가 그날의 기억을 더 구체적으로 떠올릴 수 있도록 "
                    "짧고 따뜻한 질문 3개를 만들어줘. "
                    "질문만 줄바꿈으로 구분해서 반환해줘."
                ),
            },
            {
                "role": "user",
                "content": f"사진 설명:\n{captions_text}\n\n일기 초안:\n{draft}",
            },
        ],
        max_tokens=300,
    )
    content = response.choices[0].message.content
    questions = [q.strip() for q in content.strip().split("\n") if q.strip()]
    return questions[:3]


def refine_diary(current_content: str, user_request: str, style: str, history: list[dict] | None = None) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                f"너는 감성적인 일기 작가야. "
                f"사용자의 요청에 따라 기존 일기를 수정해줘. "
                f"문체는 {style}체를 유지하고, 전체 흐름을 자연스럽게 다듬어줘. "
                "content는 마크다운 형식으로 작성해줘. 단락은 줄바꿈으로 구분하고, "
                "강조할 부분은 **굵게**, 소제목은 ## 을 사용해줘. "
                "반드시 JSON 형식으로 반환해줘: "
                '{"content": "수정된 일기 본문", "mood": "한 줄 감정 요약"}'
            ),
        },
        {
            "role": "user",
            "content": f"다음은 현재 일기야:\n\n{current_content}",
        },
    ]
    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_request})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )
    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        return {"content": response.choices[0].message.content, "mood": ""}


def finalize_diary(draft: str, answers: list[dict], style: str) -> dict:
    qa_text = "\n".join(
        f"Q: {item['question']}\nA: {item['answer']}" for item in answers
    )
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    f"너는 감성적인 일기 작가야. "
                    f"초안과 추가 답변을 바탕으로 {style} 문체의 완성된 일기를 써줘. "
                    "content는 마크다운 형식으로 작성해줘. 단락은 줄바꿈으로 구분하고, "
                    "강조할 부분은 **굵게**, 소제목은 ## 을 사용해줘. "
                    "반드시 JSON 형식으로 반환해줘: "
                    '{"title": "...", "content": "...", "mood": "..."}'
                ),
            },
            {
                "role": "user",
                "content": f"일기 초안:\n{draft}\n\n추가 답변:\n{qa_text}",
            },
        ],
        max_tokens=2000,
        response_format={"type": "json_object"},
    )
    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        content = response.choices[0].message.content
        return {"title": "오늘의 하루", "content": content, "mood": ""}
