"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { listDiaries } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

interface Diary {
  id: string;
  diary_date: string;
  title: string | null;
  photos: { image_url: string }[];
}

export default function CalendarPage() {
  const router = useRouter();
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
    listDiaries().then(setDiaries);
  }, [router]);

  const diaryByDate = diaries.reduce<Record<string, Diary>>((acc, d) => {
    acc[d.diary_date] = d;
    return acc;
  }, {});

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );
  while (cells.length % 7 !== 0) cells.push(null);

  function toDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function handleDayClick(day: number) {
    const dateStr = toDateStr(day);
    const existing = diaryByDate[dateStr];
    if (existing) {
      setSelected(dateStr);
    } else {
      setSelected(dateStr);
    }
  }

  function handleAction() {
    if (!selected) return;
    const existing = diaryByDate[selected];
    if (existing) {
      router.push(`/diary/${existing.id}`);
    } else {
      router.push(`/diary/new?date=${selected}`);
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedDiary = selected ? diaryByDate[selected] : null;

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
          className="text-stone-400 p-1"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
          className="text-stone-400 p-1"
        >
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center text-xs text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = toDateStr(day);
          const hasDiary = !!diaryByDate[dateStr];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selected;

          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              className="flex flex-col items-center py-1 gap-0.5"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
                  isSelected
                    ? "bg-stone-800 text-white"
                    : isToday
                    ? "bg-stone-100 text-stone-800 font-semibold"
                    : "text-stone-700"
                }`}
              >
                {day}
              </span>
              {hasDiary && (
                <span
                  className={`w-1 h-1 rounded-full ${
                    isSelected ? "bg-white" : "bg-stone-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜 프리뷰 */}
      {selected && (
        <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
          {selectedDiary ? (
            <div className="flex gap-3 items-center">
              {selectedDiary.photos?.[0] && (
                <img
                  src={selectedDiary.photos[0].image_url}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-400 mb-0.5">{selected}</p>
                <p className="text-sm font-medium truncate">
                  {selectedDiary.title ?? "제목 없음"}
                </p>
              </div>
              <button
                onClick={handleAction}
                className="shrink-0 text-xs bg-stone-800 text-white px-3 py-1.5 rounded-lg"
              >
                보기
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400 mb-0.5">{selected}</p>
                <p className="text-sm text-stone-500">아직 일기가 없어요</p>
              </div>
              <button
                onClick={handleAction}
                className="shrink-0 text-xs bg-stone-800 text-white px-3 py-1.5 rounded-lg"
              >
                필름 만들기
              </button>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
