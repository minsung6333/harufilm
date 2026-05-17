"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { getProfile, updateProfile, listDiaries } from "@/lib/api";
import { useSession } from "@/components/AuthProvider";
import ProfileForm from "@/components/ProfileForm";
import BottomNav from "@/components/BottomNav";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";

const DEFAULT = {
  nickname: "",
  default_style: "casual",
  topics: [] as string[],
  diary_length: "medium",
};

interface DiaryForStats {
  diary_date: string;
  mood: string | null;
  status: string;
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const dateSet = new Set(dates);
  let streak = 0;
  const cur = new Date(today);
  while (true) {
    const s = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
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

function StatsSection({ diaries }: { diaries: DiaryForStats[] }) {
  const completed = diaries.filter((d) => d.status === "completed");
  const streak = calcStreak(completed.map((d) => d.diary_date));

  // 감정 빈도 집계
  const moodCount: Record<string, number> = {};
  for (const d of completed) {
    if (!d.mood) continue;
    const key = d.mood.trim();
    if (!key) continue;
    moodCount[key] = (moodCount[key] ?? 0) + 1;
  }
  const topMoods = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxCount = topMoods[0]?.[1] ?? 1;

  return (
    <div className="bg-stone-50 rounded-2xl p-4 flex flex-col gap-4 mb-6">
      <p className="text-sm font-medium text-stone-700">나의 기록</p>

      {/* 숫자 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 flex flex-col gap-0.5">
          <p className="text-2xl font-bold text-stone-800">{completed.length}</p>
          <p className="text-xs text-stone-400">총 일기</p>
        </div>
        <div className="bg-white rounded-xl p-3 flex flex-col gap-0.5">
          <p className="text-2xl font-bold text-stone-800">
            {streak > 0 ? `🔥 ${streak}` : "0"}
          </p>
          <p className="text-xs text-stone-400">연속 작성일</p>
        </div>
      </div>

      {/* 감정 통계 */}
      {topMoods.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-stone-400">자주 느낀 감정</p>
          {topMoods.map(([mood, count]) => (
            <div key={mood} className="flex items-center gap-2">
              <p className="text-xs text-stone-600 w-28 truncate">{mood}</p>
              <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-stone-500 h-full rounded-full transition-all"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-stone-400 w-4 text-right">{count}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const [data, setData] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) router.replace("/login");
  }, [session, authLoading, router]);

  useEffect(() => {
    if (!session) return;
    getProfile()
      .then((profile) => {
        setData({
          nickname: profile.nickname ?? "",
          default_style: profile.default_style ?? "casual",
          topics: profile.topics ?? [],
          diary_length: profile.diary_length ?? "medium",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const { data: diaries = [], isLoading: diariesLoading } = useSWR<DiaryForStats[]>(
    session ? "diaries" : null,
    listDiaries,
    { revalidateOnFocus: false }
  );
  useLoadingTimeout(loading || diariesLoading);

  async function handleSave() {
    setSaving(true);
    await updateProfile(data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-stone-400 text-sm">불러오는 중...</div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">마이페이지</h1>
        <button onClick={handleLogout} className="text-stone-400 text-sm">로그아웃</button>
      </div>

      <StatsSection diaries={diaries} />

      <ProfileForm data={data} onChange={setData} />

      <div className="mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "저장 중..." : saved ? "저장됐어요 ✓" : "저장하기"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
