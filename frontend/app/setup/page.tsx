"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/api";
import ProfileForm from "@/components/ProfileForm";

const DEFAULT = {
  nickname: "",
  default_style: "casual",
  topics: [] as string[],
  diary_length: "medium",
};

export default function SetupPage() {
  const router = useRouter();
  const [data, setData] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await updateProfile(data);
    router.replace("/diary");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1">취향을 알려줘요</h1>
        <p className="text-sm text-stone-500">AI가 나에게 맞는 일기를 써줄 수 있게 도와줘요</p>
      </div>

      <ProfileForm data={data} onChange={setData} />

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "저장 중..." : "시작하기"}
        </button>
        <button
          onClick={() => router.replace("/diary")}
          className="text-stone-400 text-sm text-center"
        >
          나중에 설정할게요
        </button>
      </div>
    </div>
  );
}
