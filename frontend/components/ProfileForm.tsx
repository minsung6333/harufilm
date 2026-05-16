"use client";

const STYLES = [
  { value: "casual", label: "담백하게" },
  { value: "emotional", label: "감성적으로" },
  { value: "poetic", label: "시처럼" },
];

const TOPICS = ["일상", "감정", "여행", "음식", "사람", "자연", "생각"];

const LENGTHS = [
  { value: "short", label: "짧게", desc: "핵심만" },
  { value: "medium", label: "보통", desc: "적당하게" },
  { value: "long", label: "길게", desc: "자세하게" },
];

interface ProfileData {
  nickname: string;
  default_style: string;
  topics: string[];
  diary_length: string;
}

interface Props {
  data: ProfileData;
  onChange: (data: ProfileData) => void;
}

export default function ProfileForm({ data, onChange }: Props) {
  function update(patch: Partial<ProfileData>) {
    onChange({ ...data, ...patch });
  }

  function toggleTopic(topic: string) {
    const next = data.topics.includes(topic)
      ? data.topics.filter((t) => t !== topic)
      : [...data.topics, topic];
    update({ topics: next });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 닉네임 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-700">닉네임</label>
        <input
          type="text"
          value={data.nickname}
          onChange={(e) => update({ nickname: e.target.value })}
          placeholder="어떻게 불러드릴까요?"
          className="border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400"
        />
      </div>

      {/* 기본 문체 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-700">선호하는 일기 문체</label>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update({ default_style: s.value })}
              className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                data.default_style === s.value
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 주로 기록하는 것 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-700">주로 기록하는 것 (복수 선택)</label>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => toggleTopic(topic)}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                data.topics.includes(topic)
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* 일기 길이 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-700">선호하는 일기 길이</label>
        <div className="grid grid-cols-3 gap-2">
          {LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => update({ diary_length: l.value })}
              className={`flex flex-col items-center py-2.5 rounded-xl border text-sm transition-colors ${
                data.diary_length === l.value
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              <span className="font-medium">{l.label}</span>
              <span className={`text-xs mt-0.5 ${data.diary_length === l.value ? "text-stone-300" : "text-stone-400"}`}>
                {l.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
