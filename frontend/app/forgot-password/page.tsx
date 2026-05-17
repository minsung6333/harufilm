"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError("이메일 전송에 실패했어요. 다시 시도해줘요");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">📬</div>
          <h1 className="text-xl font-semibold">이메일을 확인해줘요</h1>
          <p className="text-sm text-stone-500 leading-6">
            <span className="font-medium text-stone-700">{email}</span>로<br />
            비밀번호 재설정 링크를 보냈어요.
          </p>
          <Link href="/login" className="text-sm text-stone-400 underline underline-offset-2 mt-4">
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-2">비밀번호 찾기</h1>
        <p className="text-stone-500 text-center text-sm mb-8">
          가입한 이메일로 재설정 링크를 보내드려요
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400"
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "전송 중..." : "재설정 링크 보내기"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-400 mt-6">
          <Link href="/login" className="text-stone-700 font-medium">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
