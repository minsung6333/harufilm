"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("비밀번호 변경에 실패했어요. 다시 시도해줘요");
      setLoading(false);
    } else {
      router.replace("/diary");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-2">새 비밀번호 설정</h1>
        <p className="text-stone-500 text-center text-sm mb-8">
          새로운 비밀번호를 입력해줘요
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="새 비밀번호 (6자 이상)"
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
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
