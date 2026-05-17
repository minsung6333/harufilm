"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { listDiaries, searchDiaries } from "@/lib/api";
import { formatDate } from "@/lib/date";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Onboarding from "@/components/Onboarding";

interface Diary {
  id: string;
  title: string | null;
  diary_date: string;
  mood: string | null;
  status: string;
  photos: { image_url: string }[];
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
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
    if (!localStorage.getItem("harufilm_onboarded")) {
      setShowOnboarding(true);
    }
    listDiaries().then((data) => {
      setDiaries(data);
      setLoading(false);
    });
  }, [router]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setSearching(false);
      listDiaries().then(setDiaries);
      return;
    }
    setSearching(true);
    const results = await searchDiaries(q);
    setDiaries(Array.isArray(results) ? results : []);
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">하루필름</h1>
      </div>

      {/* 검색창 */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          width="16" height="16" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}
        >
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
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-lg leading-none"
          >
            ×
          </button>
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

      {loading ? (
        <div className="flex flex-col gap-3">
          <DiaryCardSkeleton />
          <DiaryCardSkeleton />
          <DiaryCardSkeleton />
        </div>
      ) : diaries.length === 0 ? (
        <EmptyState searching={searching} query={query} />
      ) : (
        <div className="flex flex-col gap-3">
          {searching && (
            <p className="text-xs text-stone-400 mb-1">{diaries.length}개의 일기를 찾았어요</p>
          )}
          {diaries.map((diary) => {
            const isComplete = diary.status === "completed";
            const singlePhoto = diary.photos?.length === 1;
            return (
              <Link
                key={diary.id}
                href={isComplete ? `/diary/${diary.id}` : `/diary/new?resumeId=${diary.id}`}
              >
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {diary.photos?.length > 0 && (
                    singlePhoto ? (
                      <img
                        src={diary.photos[0].image_url}
                        alt=""
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="grid grid-cols-2">
                        {diary.photos.slice(0, 2).map((p, i) => (
                          <img
                            key={i}
                            src={p.image_url}
                            alt=""
                            className="w-full h-40 object-cover"
                          />
                        ))}
                      </div>
                    )
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-stone-400">{formatDate(diary.diary_date)}</p>
                      {!isComplete && (
                        <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                          이어 작성
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm">{diary.title ?? "제목 없음"}</p>
                    {diary.mood && (
                      <p className="text-xs text-stone-400 mt-1">{diary.mood}</p>
                    )}
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
