"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createDiary, uploadPhoto, generateDraft, generatePhotoQuestions, generateQuestions, finalizeDiary, updateDiaryContent } from "@/lib/api";
import { useToast } from "@/components/Toast";

type Step = "upload" | "photo_questions" | "memo" | "draft" | "questions" | "done";

interface Question {
  question: string;
  answer: string;
  isCustom?: boolean;
}

const STYLES = [
  { value: "casual", label: "담백하게", desc: "있는 그대로 솔직하게" },
  { value: "emotional", label: "감성적으로", desc: "감정을 깊이 담아서" },
  { value: "poetic", label: "시처럼", desc: "짧고 여운 있게" },
  { value: "custom", label: "직접 입력", desc: "원하는 문체로" },
];

const LOADING_STEPS: Record<string, { steps: string[]; icon: string }> = {
  "사진 분석 중...": {
    icon: "📷",
    steps: ["사진 업로드 중", "AI가 사진을 분석하고 있어요", "조금만 기다려줘요"],
  },
  "사진에 대해 물어볼게요...": {
    icon: "💬",
    steps: ["분석 완료", "질문을 만들고 있어요"],
  },
  "AI가 일기를 쓰고 있어요...": {
    icon: "✍️",
    steps: ["메모를 읽고 있어요", "일기를 작성하고 있어요", "문장을 다듬고 있어요"],
  },
  "기억을 더 끌어낼 질문을 만들고 있어요...": {
    icon: "🤔",
    steps: ["초안을 분석하고 있어요", "질문을 만들고 있어요"],
  },
  "최종 일기를 완성하고 있어요...": {
    icon: "📖",
    steps: ["답변을 반영하고 있어요", "일기를 완성하고 있어요", "마무리 중이에요"],
  },
  "일기 준비 중...": {
    icon: "📝",
    steps: ["준비하고 있어요"],
  },
};

function LoadingScreen({ msg }: { msg: string }) {
  const config = LOADING_STEPS[msg] ?? { icon: "⏳", steps: ["처리 중이에요"] };
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <div className="text-5xl animate-bounce">{config.icon}</div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-base font-medium text-stone-700">{msg.replace("...", "")}</p>
        <p className="text-xs text-stone-400">잠시만 기다려줘요</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {config.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center shrink-0 animate-pulse" style={{ animationDelay: `${i * 0.4}s` }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <p className="text-sm text-stone-500">{step}</p>
          </div>
        ))}
        <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-stone-400 rounded-full" style={{ animation: "loading 1.6s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

function NewDiaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const resumeId = searchParams.get("resumeId");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>(resumeId ? "memo" : "upload");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [diaryId, setDiaryId] = useState(resumeId ?? "");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [style, setStyle] = useState("casual");
  const [customStyle, setCustomStyle] = useState("");
  const [memo, setMemo] = useState("");
  const [draft, setDraft] = useState("");
  const [photoQuestions, setPhotoQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<{ title: string; content: string; mood: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
  }

  async function handleNext(skipPhotos = false) {
    setLoading(true);
    setLoadingMsg(skipPhotos ? "일기 준비 중..." : "사진 분석 중...");
    try {
      let currentDiaryId = diaryId;
      if (!currentDiaryId) {
        const d = new Date();
        const today = dateParam ?? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const resolvedStyle = style === "custom" ? (customStyle.trim() || "casual") : style;
        const diary = await createDiary(today, resolvedStyle);
        if (diary.detail) throw new Error(diary.detail);
        currentDiaryId = diary.id;
        setDiaryId(currentDiaryId);
      }
      if (!skipPhotos && photos.length > 0) {
        setLoadingMsg("사진 분석 중...");
        for (const photo of photos) {
          const res = await uploadPhoto(currentDiaryId, photo.file);
          if (res.detail) throw new Error("사진 업로드에 실패했어요");
        }
        setLoadingMsg("사진에 대해 물어볼게요...");
        const pq = await generatePhotoQuestions(currentDiaryId);
        if (pq.questions?.length > 0) {
          setPhotoQuestions(pq.questions.map((q: string) => ({ question: q, answer: "" })));
          setStep("photo_questions");
          return;
        }
      }
      setStep("memo");
    } catch {
      showToast("업로드 중 문제가 생겼어요. 다시 시도해줘요");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  async function handleGenerateDraft() {
    if (!memo.trim()) return;
    setLoading(true);
    setLoadingMsg("AI가 일기를 쓰고 있어요...");
    try {
      const photoQA = photoQuestions
        .filter((q) => q.answer.trim())
        .map((q) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n");
      const fullMemo = photoQA ? `${memo}\n\n[사진에 대한 추가 정보]\n${photoQA}` : memo;
      const data = await generateDraft(diaryId, fullMemo);
      if (!data.draft) throw new Error();
      setDraft(data.draft);
      setStep("draft");
    } catch {
      showToast("일기 초안 생성에 실패했어요. 다시 시도해줘요");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  async function handleGenerateQuestions() {
    setLoading(true);
    setLoadingMsg("기억을 더 끌어낼 질문을 만들고 있어요...");
    try {
      const data = await generateQuestions(diaryId);
      if (!data.questions) throw new Error();
      setQuestions(data.questions.map((q: string) => ({ question: q, answer: "" })));
      setStep("questions");
    } catch {
      showToast("질문 생성에 실패했어요. 다시 시도해줘요");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  async function handleFinalize() {
    setLoading(true);
    setLoadingMsg("최종 일기를 완성하고 있어요...");
    try {
      const data = await finalizeDiary(diaryId, questions);
      if (!data.content) throw new Error();
      setResult(data);
      setEditTitle(data.title);
      setEditContent(data.content);
      setStep("done");
    } catch {
      showToast("일기 완성에 실패했어요. 다시 시도해줘요");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-stone-400 text-sm">← 뒤로</button>
        <h1 className="text-lg font-semibold">{resumeId ? "이어 작성" : `${dateParam ?? "오늘"}의 필름`}</h1>
      </div>

      {loading && (
        <LoadingScreen msg={loadingMsg}
      )}

      {!loading && step === "upload" && (
        <div className="flex flex-col gap-5">
          {/* 문체 선택 */}
          <div className="flex flex-col gap-2">
            <p className="text-sm text-stone-500">일기 문체를 골라줘요</p>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm transition-colors ${
                    style === s.value
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <span className="font-medium">{s.label}</span>
                  <span className={`text-xs ${style === s.value ? "text-stone-300" : "text-stone-400"}`}>
                    {s.desc}
                  </span>
                </button>
              ))}
            </div>
            {style === "custom" && (
              <input
                type="text"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
                placeholder="예: 친구한테 말하듯이, 편지 형식으로..."
                className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400"
                autoFocus
              />
            )}
          </div>

          {/* 사진 업로드 */}
          <div className="flex flex-col gap-2">
            <p className="text-sm text-stone-500">사진을 올려줘요 (최대 5장)</p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center text-stone-400 text-sm cursor-pointer hover:border-stone-300 transition-colors"
            >
              사진 선택하기
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p.preview} alt="" className="w-full h-24 object-cover rounded-xl" />
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleNext(false)}
            disabled={photos.length === 0}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-40"
          >
            다음
          </button>

          {/* 사진 없이 시작 */}
          <button
            onClick={() => handleNext(true)}
            className="text-stone-400 text-sm text-center underline underline-offset-2"
          >
            사진 없이 메모만으로 시작할게요
          </button>
        </div>
      )}

      {!loading && step === "photo_questions" && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-stone-500 font-medium">사진에 대해 조금 알려줘요</p>
          {photoQuestions.map((q, i) => (
            <div key={i} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-stone-700">{q.question}</p>
              <textarea
                value={q.answer}
                onChange={(e) => {
                  const updated = [...photoQuestions];
                  updated[i].answer = e.target.value;
                  setPhotoQuestions(updated);
                }}
                placeholder="답변을 입력해줘요 (선택사항)"
                className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400 resize-none h-20"
              />
            </div>
          ))}
          <button
            onClick={() => setStep("memo")}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium"
          >
            다음
          </button>
          <button
            onClick={() => { setPhotoQuestions([]); setStep("memo"); }}
            className="text-stone-400 text-sm text-center underline underline-offset-2"
          >
            건너뛸게요
          </button>
        </div>
      )}

      {!loading && step === "memo" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-500">오늘 하루를 짧게 메모해줘요</p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 친구랑 성수에서 밥 먹었어. 오랜만에 만나서 좋았음"
            className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400 resize-none h-28"
          />
          <button
            onClick={handleGenerateDraft}
            disabled={!memo.trim()}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-40"
          >
            AI 일기 작성
          </button>
        </div>
      )}

      {!loading && step === "draft" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-stone-500 font-medium">AI가 쓴 초안이에요</p>
          <div className="bg-white rounded-2xl p-4 text-sm leading-7 text-stone-700 shadow-sm whitespace-pre-line">
            {draft}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFinalize}
              className="flex-1 border border-stone-300 text-stone-600 rounded-xl py-3 text-sm font-medium"
            >
              그만하기
            </button>
            <button
              onClick={handleGenerateQuestions}
              className="flex-1 bg-stone-800 text-white rounded-xl py-3 text-sm font-medium"
            >
              기억 더 떠올리기
            </button>
          </div>
        </div>
      )}

      {!loading && step === "questions" && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-stone-500 font-medium">조금 더 이야기해줘요</p>
          {questions.map((q, i) => (
            <div key={i} className="flex flex-col gap-2">
              {q.isCustom ? (
                <input
                  value={q.question}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[i].question = e.target.value;
                    setQuestions(updated);
                  }}
                  placeholder="질문을 직접 입력해줘요"
                  className="border border-stone-300 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:border-stone-500"
                />
              ) : (
                <p className="text-sm font-medium text-stone-700">{q.question}</p>
              )}
              <textarea
                value={q.answer}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[i].answer = e.target.value;
                  setQuestions(updated);
                }}
                placeholder="답변을 입력해줘요"
                className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400 resize-none h-20"
              />
              {q.isCustom && (
                <button
                  onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-stone-400 text-right"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setQuestions((prev) => [...prev, { question: "", answer: "", isCustom: true }])}
            className="border border-dashed border-stone-300 rounded-xl py-2 text-sm text-stone-400 hover:border-stone-400 transition-colors"
          >
            + 질문 직접 추가하기
          </button>
          <button
            onClick={handleFinalize}
            disabled={questions.some((q) => !q.answer.trim()) || questions.some((q) => q.isCustom && !q.question.trim())}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-40"
          >
            일기 완성하기
          </button>
        </div>
      )}

      {!loading && step === "done" && result && (
        <div className="flex flex-col gap-4">
          {/* 보기 / 편집 토글 */}
          <div className="flex bg-stone-100 rounded-xl p-1">
            <button
              onClick={() => setEditing(false)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !editing ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"
              }`}
            >
              보기
            </button>
            <button
              onClick={() => setEditing(true)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                editing ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"
              }`}
            >
              편집
            </button>
          </div>

          {!editing ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-stone-400 mb-1">{result.mood}</p>
              <h2 className="text-lg font-semibold mb-3">{editTitle || result.title}</h2>
              <p className="text-sm leading-7 text-stone-700 whitespace-pre-line">{editContent || result.content}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="border border-stone-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-stone-400"
                placeholder="제목"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="border border-stone-200 rounded-xl px-4 py-3 text-sm leading-7 outline-none focus:border-stone-400 resize-none min-h-64"
                placeholder="일기 내용"
              />
            </div>
          )}

          <button
            onClick={async () => {
              await updateDiaryContent(diaryId, editTitle, editContent);
              router.replace("/diary");
            }}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium"
          >
            저장하고 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}

export default function NewDiaryPage() {
  return (
    <Suspense>
      <NewDiaryContent />
    </Suspense>
  );
}
