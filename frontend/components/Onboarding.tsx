"use client";

import { useState } from "react";

const STEPS = [
  {
    emoji: "📷",
    title: "사진을 올려요",
    desc: "오늘 찍은 사진 몇 장만 올리면\nAI가 장면을 분석해줘요",
  },
  {
    emoji: "✍️",
    title: "짧게 메모해요",
    desc: "한 줄이면 충분해요\n나머지는 AI가 채워줄게요",
  },
  {
    emoji: "📖",
    title: "일기가 완성돼요",
    desc: "AI가 초안을 써줘요\n질문에 답하면 더 풍성해지고\n바로 완성할 수도 있어요",
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      localStorage.setItem("harufilm_onboarded", "1");
      onDone();
    }
  }

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-stone-50 flex flex-col items-center justify-center px-8 z-50">
      <div className="flex flex-col items-center text-center gap-6 max-w-xs">
        <span className="text-6xl">{current.emoji}</span>
        <h2 className="text-xl font-semibold">{current.title}</h2>
        <p className="text-stone-500 text-sm leading-6 whitespace-pre-line">{current.desc}</p>

        {/* 페이지 인디케이터 */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === step ? "w-4 h-2 bg-stone-800" : "w-2 h-2 bg-stone-300"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full bg-stone-800 text-white rounded-xl py-3 text-sm font-medium"
        >
          {step < STEPS.length - 1 ? "다음" : "시작하기"}
        </button>

        {step < STEPS.length - 1 && (
          <button
            onClick={() => {
              localStorage.setItem("harufilm_onboarded", "1");
              onDone();
            }}
            className="text-stone-400 text-sm"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
