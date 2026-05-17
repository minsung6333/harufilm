"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && session) router.replace("/diary");
  }, [session, authLoading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("이메일 또는 비밀번호를 확인해주세요");
      setLoading(false);
    } else {
      router.replace("/diary");
    }
  }

  if (authLoading) return null;

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-2">하루필름</h1>
        <p className="text-stone-500 text-center text-sm mb-8">사진으로 만드는 나만의 하루 일기</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400"
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-stone-400 hover:text-stone-600">
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-stone-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-400 mt-6">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-stone-700 font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
