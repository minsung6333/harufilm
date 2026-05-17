"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { listDiaries, searchDiaries } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { useSession } from "@/components/AuthProvider";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Onboarding from "@/components/Onboarding";

function ExitConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 text-center">
          <p className="font-medium text-stone-800 mb-1">앱을 종료할까요?</p>
          <p className="text-sm text-stone-400">하루필름을 닫아요</p>
        </div>
        <div className="flex border-t border-stone-100">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-sm text-stone-500 font-medium border-r border-stone-100"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 text-sm text-stone-800 font-semibold"
          >
            종료
          </button>
        </div>
      </div>
    </div>
  );
}

interface Diary {
  id: string;
  title: string | null;
  diary_date: string;
  mood: string | null;
  status: string;
  photos: { image_url: string }[];
}

interface Notice {
  id: string;
  title: string;
  body: string | null;
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const dateSet = new Set(dates);
  let streak = 0;
  const cur = new Date(today);
  while (true) {
    const s = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    if (dateSet.has(s)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else if (s === todayStr) {
      break;
    } else {
      break;
    }
  }
  return streak;
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  return (
    <div className="bg-stone-800 text-white rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
      <span className="text-base mt-0.5">📢</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{notice.title}</p>
        {notice.body && <p className="text-xs text-stone-300 mt-0.5 leading-5">{notice.body}</p>}
      </div>
      <button onClick={onDismiss} className="text-stone-400 hover:text-white text-xl leading-none shrink-0 mt-0.5">×</button>
    </div>
  );
}

function DiaryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-40 bg-stone-100" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-3 w-24 bg-stone-100 rounded" />
        <div className="h-4 w-40 bg-stone-100 rounded" />
      </div>
    </div>
  );
}

function EmptyState({ searching, query }: { searching: boolean; query: string }) {
  if (searching) {
    return (
      <div className="flex flex-col items-center gap-3 mt-20 text-center">
        <div className="text-4xl">🔍</div>
        <p className="text-stone-500 text-sm">&ldquo;{query}&rdquo;에 대한 결과가 없어요</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 mt-20 text-center">
      <div className="text-5xl">📷</div>
      <div>
        <p className="text-stone-700 font-medium text-sm mb-1">아직 기록이 없어요</p>
        <p className="text-stone-400 text-xs leading-5">
          오늘의 사진을 올려서<br />첫 번째 하루필름을 만들어봐요
        </p>
      </div>
    </div>
  );
}

export default function DiaryListPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Diary[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // auth 체크
  useEffect(() => {
    if (!authLoading && !session) router.replace("/login");
  }, [session, authLoading, router]);

  // Android 뒤로가기 가로채기
  useEffect(() => {
    window.history.pushState({ exitGuard: true }, "");
    function handlePopState() {
      setShowExitConfirm(true);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 온보딩 & 공지
  useEffect(() => {
    if (!session) return;
    if (!localStorage.getItem("harufilm_onboarded")) setShowOnboarding(true);
    supabase
      .from("notices")
      .select("id, title, body")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const dismissed = JSON.parse(localStorage.getItem("harufilm_dismissed_notices") ?? "[]");
        if (!dismissed.includes(data.id)) setNotice(data);
      });
  }, [session]);

  // SWR로 일기 목록 캐싱 — 뒤로가기 시 즉시 표시
  const { data: diaries = [], isLoading } = useSWR(
    session ? "diaries" : null,
    listDiaries,
    { revalidateOnFocus: false }
  );

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const results = await searchDiaries(q);
    setSearchResults(Array.isArray(results) ? results : []);
  }, []);

  function dismissNotice() {
    if (!notice) return;
    const dismissed = JSON.parse(localStorage.getItem("harufilm_dismissed_notices") ?? "[]");
    localStorage.setItem("harufilm_dismissed_notices", JSON.stringify([...dismissed, notice.id]));
    setNotice(null);
  }

  const displayed = searching ? searchResults : diaries;
  const completedDates = diaries.filter((d: Diary) => d.status === "completed").map((d: Diary) => d.diary_date);
  const streak = calcStreak(completedDates);

  if (authLoading) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      {showExitConfirm && (
        <ExitConfirmDialog
          onConfirm={() => window.history.go(-2)}
          onCancel={() => {
            window.history.pushState({ exitGuard: true }, "");
            setShowExitConfirm(false);
          }}
        />
      )}
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">하루필름</h1>
          {streak > 0 && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-medium px-2 py-0.5 rounded-full">
              🔥 {streak}일 연속
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-stone-700" : "text-stone-400"}`}
            aria-label="리스트 보기"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-stone-700" : "text-stone-400"}`}
            aria-label="갤러리 보기"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* 공지 배너 */}
      {notice && <NoticeBanner notice={notice} onDismiss={dismissNotice} />}

      {/* 검색창 */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="제목, 내용, 감정으로 검색"
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 bg-white"
        />
        {query && (
          <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-lg leading-none">×</button>
        )}
      </div>

      {!searching && (
        <Link
          href="/diary/new"
          className="flex items-center justify-center w-full border-2 border-dashed border-stone-200 rounded-2xl py-5 text-stone-400 text-sm mb-4 hover:border-stone-300 transition-colors"
        >
          + 오늘의 필름 만들기
        </Link>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <DiaryCardSkeleton />
          <DiaryCardSkeleton />
          <DiaryCardSkeleton />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState searching={searching} query={query} />
      ) : viewMode === "grid" ? (
        <div>
          {searching && <p className="text-xs text-stone-400 mb-2">{displayed.length}개의 일기를 찾았어요</p>}
          <div className="grid grid-cols-3 gap-1">
            {displayed.map((diary: Diary) => {
              const isComplete = diary.status === "completed";
              const thumb = diary.photos?.[0]?.image_url;
              return (
                <Link key={diary.id} href={isComplete ? `/diary/${diary.id}` : `/diary/new?resumeId=${diary.id}`} className="relative aspect-square">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-full bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xs text-center px-1">
                      {diary.title ?? "제목 없음"}
                    </div>
                  )}
                  {!isComplete && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />}
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {searching && <p className="text-xs text-stone-400 mb-1">{displayed.length}개의 일기를 찾았어요</p>}
          {displayed.map((diary: Diary) => {
            const isComplete = diary.status === "completed";
            const singlePhoto = diary.photos?.length === 1;
            return (
              <Link key={diary.id} href={isComplete ? `/diary/${diary.id}` : `/diary/new?resumeId=${diary.id}`}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {diary.photos?.length > 0 && (
                    singlePhoto ? (
                      <img src={diary.photos[0].image_url} alt="" className="w-full h-48 object-cover" />
                    ) : (
                      <div className="grid grid-cols-2">
                        {diary.photos.slice(0, 2).map((p: { image_url: string }, i: number) => (
                          <img key={i} src={p.image_url} alt="" className="w-full h-40 object-cover" />
                        ))}
                      </div>
                    )
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-stone-400">{formatDate(diary.diary_date)}</p>
                      {!isComplete && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">이어 작성</span>}
                    </div>
                    <p className="font-medium text-sm">{diary.title ?? "제목 없음"}</p>
                    {diary.mood && <p className="text-xs text-stone-400 mt-1">{diary.mood}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
