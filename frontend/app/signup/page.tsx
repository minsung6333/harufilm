"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/setup`,
      },
    });
    if (error) {
      setError("회원가입에 실패했어요. 다시 시도해줘요");
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">📬</div>
          <h1 className="text-xl font-semibold">이메일을 확인해줘요</h1>
          <p className="text-sm text-stone-500 leading-6">
            <span className="font-medium text-stone-700">{email}</span>로<br />
            인증 링크를 보냈어요.<br />
            링크를 클릭하면 가입이 완료돼요.
          </p>
          <p className="text-xs text-stone-400 mt-2">
            이메일이 안 보이면 스팸함도 확인해줘요
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
        <h1 className="text-2xl font-semibold text-center mb-2">하루필름</h1>
        <p className="text-stone-500 text-center text-sm mb-8">사진으로 만드는 나만의 하루 일기</p>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400"
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400"
            required
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400"
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-400 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-stone-700 font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
