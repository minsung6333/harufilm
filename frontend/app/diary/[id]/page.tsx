"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDiary, refineDiary, getRevisions, restoreRevision, deleteDiary, getDiaryMessages } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { useToast } from "@/components/Toast";

interface Diary {
  id: string;
  title: string | null;
  content: string | null;
  draft_content: string | null;
  mood: string | null;
  diary_date: string;
  status: string;
  photos: { image_url: string }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Revision {
  id: string;
  content: string;
  created_at: string;
}

export default function DiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDiary(id).then((data) => {
      setDiary(data);
      setContent(data.content ?? data.draft_content ?? "");
      setMood(data.mood ?? "");
      setLoading(false);
    });
    getRevisions(id).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setRevisions(data);
        setActiveRevisionId(data[data.length - 1].id);
      }
    });
    getDiaryMessages(id).then((msgs) => {
      if (!Array.isArray(msgs)) return;
      const firstFinalIdx = msgs.findIndex((m: { message_type: string }) => m.message_type === "final");
      const refinements = firstFinalIdx >= 0 ? msgs.slice(firstFinalIdx + 1) : [];
      const history = refinements
        .filter((m: { message_type: string }) => m.message_type === "answer" || m.message_type === "final")
        .map((m: { role: string; content: string; message_type: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.message_type === "final" ? "일기를 수정했어요. 위에서 확인해봐요." : m.content,
        }));
      setChatMessages(history);
    });
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleDelete() {
    if (!confirm("일기를 삭제할까요? 복구할 수 없어요.")) return;
    setDeleting(true);
    await deleteDiary(id);
    router.replace("/diary");
  }

  async function handleRevisionSelect(rev: Revision) {
    setActiveRevisionId(rev.id);
    setContent(rev.content);
    await restoreRevision(id, rev.content);
  }

  async function handleRefine() {
    if (!input.trim() || refining) return;
    const userMsg = input.trim();
    setInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setRefining(true);
    try {
      const data = await refineDiary(id, userMsg, chatMessages);
      if (!data.content) throw new Error();
      setContent(data.content);
      if (data.mood) setMood(data.mood);
      const newRev: Revision = {
        id: crypto.randomUUID(),
        content: data.content,
        created_at: new Date().toISOString(),
      };
      setRevisions((prev) => [...prev, newRev]);
      setActiveRevisionId(newRev.id);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "일기를 수정했어요. 위에서 확인해봐요." },
      ]);
    } catch {
      showToast("수정 중 문제가 생겼어요. 다시 시도해줘요");
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setRefining(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-5 w-16 bg-stone-100 rounded" />
          <div className="w-full h-64 bg-stone-100 rounded-2xl" />
          <div className="h-3 w-24 bg-stone-100 rounded" />
          <div className="h-6 w-48 bg-stone-100 rounded" />
          <div className="flex flex-col gap-2">
            <div className="h-3 w-full bg-stone-100 rounded" />
            <div className="h-3 w-full bg-stone-100 rounded" />
            <div className="h-3 w-3/4 bg-stone-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="flex items-center justify-center min-h-screen text-stone-400 text-sm">
        일기를 찾을 수 없어요
      </div>
    );
  }

  const photoCount = diary.photos?.length ?? 0;

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-0 flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400 text-sm disabled:opacity-40 hover:text-red-500 transition-colors"
        >
          삭제
        </button>
      </div>

      {/* 사진 */}
      {photoCount > 0 && (
        <div className="mb-5">
          {photoCount === 1 ? (
            <img
              src={diary.photos[0].image_url}
              alt=""
              className="w-full h-64 object-cover rounded-2xl"
            />
          ) : photoCount === 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {diary.photos.map((p, i) => (
                <img key={i} src={p.image_url} alt="" className="w-full h-48 object-cover rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {diary.photos.slice(0, 4).map((p, i) => (
                <img key={i} src={p.image_url} alt="" className="w-full h-36 object-cover rounded-2xl" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 일기 본문 */}
      <p className="text-xs text-stone-400 mb-1">{formatDate(diary.diary_date)}</p>
      {mood && <p className="text-xs text-stone-400 mb-3">{mood}</p>}
      <h1 className="text-xl font-semibold mb-4">{diary.title ?? "제목 없음"}</h1>
      <p className="text-sm leading-7 text-stone-700 whitespace-pre-line mb-8">{content}</p>

      {/* 채팅 영역 */}
      {diary.status === "completed" && (
        <div className="border-t border-stone-100 pt-5 flex flex-col gap-3 pb-6">

          {/* 버전 탭 */}
          {revisions.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {revisions.map((rev, i) => (
                <button
                  key={rev.id}
                  onClick={() => handleRevisionSelect(rev)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeRevisionId === rev.id
                      ? "bg-stone-800 text-white"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {i === 0 ? "원본" : `수정 ${i}`}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-stone-400 text-center">일기를 수정하고 싶으면 말해줘요</p>

          {chatMessages.length > 0 && (
            <div className="flex flex-col gap-3 mb-2">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-6 ${
                      msg.role === "user"
                        ? "bg-stone-800 text-white rounded-br-sm"
                        : "bg-stone-100 text-stone-700 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {refining && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 text-stone-400 text-sm px-4 py-2 rounded-2xl rounded-bl-sm">
                    수정 중...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRefine()}
              placeholder="예: 더 감성적으로 써줘"
              className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-400"
            />
            <button
              onClick={handleRefine}
              disabled={!input.trim() || refining}
              className="bg-stone-800 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
