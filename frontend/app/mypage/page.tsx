"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, updateProfile } from "@/lib/api";
import ProfileForm from "@/components/ProfileForm";
import BottomNav from "@/components/BottomNav";

const DEFAULT = {
  nickname: "",
  default_style: "casual",
  topics: [] as string[],
  diary_length: "medium",
};

export default function MyPage() {
  const router = useRouter();
  const [data, setData] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => {
      if (!s.session) router.replace("/login");
    });
    getProfile().then((profile) => {
      setData({
        nickname: profile.nickname ?? "",
        default_style: profile.default_style ?? "casual",
        topics: profile.topics ?? [],
        diary_length: profile.diary_length ?? "medium",
      });
      setLoading(false);
    });
  }, [router]);

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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold">마이페이지</h1>
        <button onClick={handleLogout} className="text-stone-400 text-sm">로그아웃</button>
      </div>

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
