# 🎞️ 하루필름

> 사진으로 만드는 나만의 하루 일기

하루필름은 오늘 찍은 사진 몇 장과 짧은 메모만으로 AI가 감성적인 일기를 써주는 웹 앱이에요.

## ✨ 주요 기능

- **사진 업로드** — 하루에 최대 5장, AI가 사진 속 장면을 자동 분석
- **AI 일기 작성** — 메모 한 줄이면 AI가 원하는 문체(담백하게/감성적으로/시처럼)로 일기를 써줘요
- **질문 & 심화** — AI가 그날의 기억을 더 끌어내는 질문을 해줘요 (건너뛰기 가능)
- **감정 기록** — 15가지 감정 중 AI 추천 or 직접 선택
- **캘린더 뷰** — 월별 달력으로 사진 썸네일과 함께 일기 돌아보기
- **마이페이지** — 연속 작성 스트릭, 자주 느낀 감정 통계
- **공유** — 일기 링크로 친구에게 공유 (읽기 전용)
- **PWA** — 홈 화면 추가로 앱처럼 사용 가능

## 🛠️ 기술 스택

### Frontend
- **Next.js 14** (App Router, Turbopack)
- **Tailwind CSS v4**
- **SWR** — 데이터 캐싱
- **Supabase JS** — 인증 & 스토리지
- Deployed on **Vercel**

### Backend
- **FastAPI** (Python)
- **OpenAI GPT-4o** — 사진 분석, 일기 작성
- **Supabase** — PostgreSQL DB, 이미지 스토리지
- Deployed on **Render**

## 🗂️ 프로젝트 구조

```
harufilm/
├── frontend/          # Next.js 앱
│   ├── app/           # 페이지 라우트
│   │   ├── diary/     # 일기 목록, 작성, 상세
│   │   ├── calendar/  # 캘린더 뷰
│   │   ├── mypage/    # 마이페이지 & 통계
│   │   ├── login/     # 로그인
│   │   ├── signup/    # 회원가입
│   │   └── setup/     # 프로필 설정 (최초 1회)
│   ├── components/    # 공통 컴포넌트
│   ├── hooks/         # 커스텀 훅
│   └── lib/           # API 클라이언트, 유틸
└── backend/           # FastAPI 서버
    └── app/
        ├── api/       # 엔드포인트 (diaries, photos, profile)
        ├── services/  # LLM, 스토리지 서비스
        └── models/    # 스키마
```

## 🚀 로컬 실행

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 환경변수

**frontend** `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**backend** `.env`
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
OPENAI_API_KEY=...
```

## 📱 서비스 링크

- **웹앱**: https://harufilm.vercel.app
- **API**: https://harufilm.onrender.com

---

© 2025 하루필름
