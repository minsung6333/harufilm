"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/AuthProvider";

const FEATURES = [
  {
    emoji: "📷",
    title: "사진을 올려요",
    desc: "오늘 찍은 사진 몇 장이면 충분해요",
  },
  {
    emoji: "🤖",
    title: "AI가 분석해요",
    desc: "장면을 읽고 기억할 내용을 정리해줘요",
  },
  {
    emoji: "📖",
    title: "일기가 완성돼요",
    desc: "짧은 메모만 더하면 나만의 일기가 돼요",
  },
];

export default function Home() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && session) router.replace("/diary");
  }, [session, loading, router]);

  // 백엔드 워밍업 — 콜드스타트 방지
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/ping`).catch(() => {});
  }, []);

  if (loading || session) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold">하루필름</span>
        <Link href="/login" className="text-sm text-stone-500 hover:text-stone-700">
          로그인
        </Link>
      </header>

      {/* 히어로 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 py-16">
        <div className="text-6xl mb-2">🎞️</div>
        <div>
          <h1 className="text-3xl font-bold text-stone-800 mb-3 leading-tight">
            사진으로 만드는<br />나만의 하루 일기
          </h1>
          <p className="text-stone-500 text-sm leading-6">
            사진을 올리면 AI가 그날의 이야기를<br />
            일기로 써줘요. 매일 3분이면 충분해요.
          </p>
        </div>

        {/* 기능 카드 */}
        <div className="w-full max-w-sm flex flex-col gap-3 mt-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3 shadow-sm text-left">
              <span className="text-2xl">{f.emoji}</span>
              <div>
                <p className="text-sm font-medium text-stone-800">{f.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full max-w-sm flex flex-col gap-3 mt-2">
          <Link
            href="/signup"
            className="w-full bg-stone-800 text-white rounded-xl py-3.5 text-sm font-medium text-center"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/login"
            className="w-full border border-stone-200 text-stone-600 rounded-xl py-3.5 text-sm font-medium text-center"
          >
            이미 계정이 있어요
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-stone-300 pb-8">
        © 2025 하루필름
      </footer>
    </div>
  );
}
