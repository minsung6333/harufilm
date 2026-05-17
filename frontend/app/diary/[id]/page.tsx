"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { getDiary, refineDiary, getRevisions, restoreRevision, deleteDiary, getDiaryMessages, updateDiaryContent } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { useSession } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import ReactMarkdown from "react-markdown";

interface Diary {
  id: string;
  user_id: string;
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

function Lightbox({ photos, index, onClose }: { photos: { image_url: string }[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(c + 1, photos.length - 1));
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(c - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, photos.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none" onClick={onClose}>×</button>
      <img src={photos[current].image_url} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      {photos.length > 1 && (
        <>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl leading-none disabled:opacity-20" disabled={current === 0} onClick={(e) => { e.stopPropagation(); setCurrent((c) => c - 1); }}>‹</button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl leading-none disabled:opacity-20" disabled={current === photos.length - 1} onClick={(e) => { e.stopPropagation(); setCurrent((c) => c + 1); }}>›</button>
          <div className="absolute bottom-4 flex gap-1.5">
            {photos.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === current ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function DiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const { showToast } = useToast();

  // SWR로 일기 데이터 캐싱 — 비로그인도 조회 가능
  const { data: diary, isLoading } = useSWR<Diary>(
    id ? `diary-${id}` : null,
    () => getDiary(id),
    { revalidateOnFocus: false }
  );

  const isOwner = !!session && !!diary && session.user.id === diary.user_id;

  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  // 비로그인도 읽기 가능 — 로그인 리다이렉트 없음

  // diary SWR 데이터로 로컬 상태 초기화
  useEffect(() => {
    if (!diary) return;
    const c = diary.content ?? diary.draft_content ?? "";
    setContent(c);
    setMood(diary.mood ?? "");
    setEditTitle(diary.title ?? "");
    setEditContent(c);
  }, [diary]);

  useEffect(() => {
    if (!isOwner || !id) return;
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
      setChatMessages(
        refinements
          .filter((m: { message_type: string }) => m.message_type === "answer" || m.message_type === "final")
          .map((m: { role: string; content: string; message_type: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.message_type === "final" ? "일기를 수정했어요. 위에서 확인해봐요." : m.content,
          }))
      );
    });
  }, [isOwner, id]);

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

  async function handleSaveEdit() {
    setSaving(true);
    await updateDiaryContent(id, editTitle, editContent);
    setContent(editContent);
    setSaving(false);
    setEditing(false);
    showToast("저장됐어요");
  }

  async function handleShare() {
    const title = diary?.title ?? "하루필름 일기";
    const text = content.slice(0, 100) + (content.length > 100 ? "..." : "");
    if (navigator.share) {
      try { await navigator.share({ title, text, url: window.location.href }); } catch { /* 취소 */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      showToast("링크를 복사했어요");
    }
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
      setEditContent(data.content);
      if (data.mood) setMood(data.mood);
      const newRev: Revision = { id: crypto.randomUUID(), content: data.content, created_at: new Date().toISOString() };
      setRevisions((prev) => [...prev, newRev]);
      setActiveRevisionId(newRev.id);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "일기를 수정했어요. 위에서 확인해봐요." }]);
    } catch {
      showToast("수정 중 문제가 생겼어요. 다시 시도해줘요");
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setRefining(false);
    }
  }

  if (authLoading || isLoading) {
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

  if (!diary) return <div className="flex items-center justify-center min-h-screen text-stone-400 text-sm">일기를 찾을 수 없어요</div>;

  const photoCount = diary.photos?.length ?? 0;

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-0 flex flex-col min-h-screen">
      {lightboxIndex !== null && (
        <Lightbox photos={diary.photos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors" aria-label="뒤로가기">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handleShare} className="text-stone-400 hover:text-stone-600 transition-colors" aria-label="공유">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
          </button>
          {isOwner && diary.status === "completed" && !editing && (
            <button onClick={() => { setEditTitle(diary.title ?? ""); setEditContent(content); setEditing(true); }} className="text-stone-400 hover:text-stone-600 transition-colors text-sm">편집</button>
          )}
          {isOwner && editing && (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-stone-400 text-sm">취소</button>
              <button onClick={handleSaveEdit} disabled={saving} className="text-stone-800 font-medium text-sm disabled:opacity-40">{saving ? "저장 중..." : "저장"}</button>
            </div>
          )}
          {isOwner && !editing && (
            <button onClick={handleDelete} disabled={deleting} className="text-red-400 text-sm disabled:opacity-40 hover:text-red-500 transition-colors">삭제</button>
          )}
        </div>
      </div>

      {/* 사진 */}
      {photoCount > 0 && (
        <div className="mb-5">
          {photoCount === 1 ? (
            <img src={diary.photos[0].image_url} alt="" className="w-full h-64 object-cover rounded-2xl cursor-pointer" onClick={() => setLightboxIndex(0)} />
          ) : photoCount === 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {diary.photos.map((p, i) => <img key={i} src={p.image_url} alt="" className="w-full h-48 object-cover rounded-2xl cursor-pointer" onClick={() => setLightboxIndex(i)} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {diary.photos.slice(0, 4).map((p, i) => <img key={i} src={p.image_url} alt="" className="w-full h-36 object-cover rounded-2xl cursor-pointer" onClick={() => setLightboxIndex(i)} />)}
            </div>
          )}
        </div>
      )}

      {/* 본문 */}
      <p className="text-xs text-stone-400 mb-1">{formatDate(diary.diary_date)}</p>
      {mood && <p className="text-xs text-stone-400 mb-3">{mood}</p>}

      {editing ? (
        <div className="flex flex-col gap-3 mb-8">
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목" className="text-xl font-semibold border-b border-stone-200 pb-2 outline-none focus:border-stone-400" />
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="text-sm leading-7 text-stone-700 border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400 resize-none min-h-[200px]" />
        </div>
      ) : (
        <>
          <h1 className="text-xl font-semibold mb-4">{diary.title ?? "제목 없음"}</h1>
          <div className="text-sm leading-7 text-stone-700 mb-8 prose prose-sm prose-stone max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </>
      )}

      {/* 채팅 영역 — 소유자만 */}
      {isOwner && diary.status === "completed" && !editing && (
        <div className="border-t border-stone-100 pt-5 flex flex-col gap-3 pb-6">
          {revisions.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {revisions.map((rev, i) => (
                <button key={rev.id} onClick={() => handleRevisionSelect(rev)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeRevisionId === rev.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
                  {i === 0 ? "원본" : `수정 ${i}`}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-stone-400 text-center">일기를 수정하고 싶으면 말해줘요</p>
          {chatMessages.length > 0 && (
            <div className="flex flex-col gap-3 mb-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-6 ${msg.role === "user" ? "bg-stone-800 text-white rounded-br-sm" : "bg-stone-100 text-stone-700 rounded-bl-sm"}`}>{msg.content}</div>
                </div>
              ))}
              {refining && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 text-stone-400 text-sm px-4 py-2 rounded-2xl rounded-bl-sm">수정 중...</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRefine()} placeholder="예: 더 감성적으로 써줘" className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-400" />
            <button onClick={handleRefine} disabled={!input.trim() || refining} className="bg-stone-800 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40">전송</button>
          </div>
        </div>
      )}
    </div>
  );
}
