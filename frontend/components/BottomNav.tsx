"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex">
      <Link
        href="/diary"
        className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
          pathname === "/diary" ? "text-stone-800" : "text-stone-400"
        }`}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
        </svg>
        목록
      </Link>
      <Link
        href="/calendar"
        className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
          pathname === "/calendar" ? "text-stone-800" : "text-stone-400"
        }`}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        캘린더
      </Link>
      <Link
        href="/mypage"
        className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
          pathname === "/mypage" ? "text-stone-800" : "text-stone-400"
        }`}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        마이
      </Link>
    </div>
  );
}
