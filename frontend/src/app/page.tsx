

"use client";
import React, { useState } from "react";

const MOODS = [
  { emoji: "😄", label: "Humorous", bg: "bg-yellow-100" },
  { emoji: "🌟", label: "Inspirational", bg: "bg-indigo-100" },
  { emoji: "📚", label: "Informative", bg: "bg-teal-100" },
  { emoji: "👋", label: "Casual", bg: "bg-pink-100" },
  { emoji: "🧐", label: "Formal", bg: "bg-gray-200" },
  { emoji: "🙃", label: "Witty", bg: "bg-purple-100" },
  { emoji: "🎉", label: "Enthusiastic", bg: "bg-green-100" },
  { emoji: "🤗", label: "Empathetic", bg: "bg-pink-200" },
  { emoji: "🫡", label: "Convincing", bg: "bg-blue-100" },
  { emoji: "😛", label: "Teasing", bg: "bg-orange-100" },
  { emoji: "🔥", label: "Controversial", bg: "bg-red-100" },
];
const LENGTHS = ["Short", "Medium", "Long"];

export default function Home() {
  const [post, setPost] = useState("");
  const [selectedMood, setSelectedMood] = useState(MOODS[0].label);
  const [length, setLength] = useState(LENGTHS[0]);
  const [useEmojis, setUseEmojis] = useState(true);
  const [comments, setComments] = useState(["", "", ""]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const PLATFORM_OPTIONS = [
    { label: "LinkedIn", value: "linkedin" },
    { label: "X (Twitter)", value: "x" }
  ];
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0].value);

  // Clipboard paste support
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPost(text);
    } catch {
      // fallback: do nothing
    }
  };

  // Copy comment to clipboard
  const handleCopy = (idx: number) => {
    if (comments[idx]) {
      navigator.clipboard.writeText(comments[idx]);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    }
  };

  // Generate comments using FastAPI backend
  const handleGenerate = async () => {
    setLoading(true);
    setComments(["Generating comments...", "", ""]);
    try {
      const res = await fetch("http://127.0.0.1:8000/generate-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post,
          mood: selectedMood,
          length,
          use_emojis: useEmojis,
          platform
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setComments(data.comments || ["No comments generated.", "", ""]);
    } catch (e: any) {
      setComments(["Error: " + (e.message || e), "", ""]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col items-center py-4 px-2 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-4 flex flex-row gap-4 items-start">
        {/* Left Column: Input & Options */}
        <div className="flex-1 flex flex-col gap-3">
          <h1 className="text-xl font-bold text-center text-gray-900 mb-1">AI Social Media Comment Generator</h1>
          <div>
            <label className="block font-semibold mb-1 text-gray-900">Post Content</label>
            <textarea
              className="w-full rounded-lg border-2 border-blue-100 bg-blue-50 p-2 text-base min-h-[70px] focus:outline-none focus:border-blue-400 resize-vertical text-gray-900 placeholder-gray-500"
              placeholder="Paste or type a post here..."
              value={post}
              onChange={e => setPost(e.target.value)}
            />
            <button
              className="mt-1 text-xs text-blue-600 hover:underline"
              type="button"
              onClick={handlePaste}
            >
              Paste from clipboard
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 w-full justify-center">
            <label className="font-semibold text-gray-900">Platform:</label>
            <div className="flex gap-2">
              {PLATFORM_OPTIONS.map(opt => (
                <button key={opt.value} className={"px-3 py-1 rounded-lg border-2 font-semibold text-sm transition-all " + (platform === opt.value ? "border-blue-500 bg-blue-100 text-blue-700" : "border-blue-100 bg-blue-50 text-gray-700")} onClick={() => setPlatform(opt.value)} type="button">{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-center w-full">
          <div className="w-full flex flex-col items-center">
            <span className="font-semibold mr-2 mb-1 text-gray-900">Mood:</span>
            <div className="grid grid-cols-4 gap-1 w-full justify-items-center">
              {MOODS.map((mood) => (
                <button key={mood.label} className={"flex flex-col items-center justify-center w-16 h-12 rounded-lg border-2 transition-all " + (selectedMood === mood.label ? "border-blue-500 bg-blue-100 " : "border-transparent ") + mood.bg} onClick={() => setSelectedMood(mood.label)} type="button" title={mood.label}><span className="text-lg">{mood.emoji}</span><span className="text-[10px] font-semibold text-gray-600">{mood.label}</span></button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 w-full justify-center">
            <label className="font-semibold text-gray-900">Length:</label>
            <div className="flex gap-1">
              {LENGTHS.map(l => (
                <button key={l} className={"px-3 py-1 rounded-lg border-2 font-semibold text-sm transition-all " + (length === l ? "border-blue-500 bg-blue-100 text-blue-700" : "border-blue-100 bg-blue-50 text-gray-700")} onClick={() => setLength(l)} type="button">{l}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full justify-center">
            <label className="font-semibold text-gray-900">Use emojis?</label>
            <button
              type="button"
              aria-pressed={useEmojis}
              onClick={() => setUseEmojis(v => !v)}
              className={"relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none border-2 border-blue-200 " + (useEmojis ? "bg-blue-500" : "bg-gray-300")}
            >
              <span
                className={"absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 " + (useEmojis ? "translate-x-4" : "")}
              />
            </button>
          </div>
        </div>
        </div>
        {/* Right Column: Generated Comments & Generate Button */}
        <div className="flex-1 flex flex-col gap-3 items-start justify-start border-l border-blue-100 pl-4">
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-blue-100 font-bold py-2 rounded-xl text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-2"
            onClick={handleGenerate}
            disabled={!post.trim() || loading}
          >
            {loading ? <span className="text-blue-100">Generating...</span> : <span className="text-blue-100">✨ Generate Comments</span>}
          </button>
          <h2 className="text-base font-semibold mb-2 text-gray-900">Best AI Comments:</h2>
          <div className="flex flex-col gap-2 w-full">
            {comments.map((comment, idx) => (
              <div key={idx} className={"flex items-center bg-" + (["yellow-50","green-50","pink-50"][idx]) + " rounded-lg border border-blue-100 p-2 shadow-sm w-full"}> 
                <span className="flex-1 text-base text-gray-900">{comment}</span>
                <button
                  className={"ml-3 text-xl transition-all duration-300 " + (copiedIdx === idx ? "text-green-600 scale-125" : "hover:text-blue-600 text-gray-900")}
                  onClick={() => handleCopy(idx)}
                  title={copiedIdx === idx ? "Copied!" : "Copy comment"}
                  type="button"
                  style={copiedIdx === idx ? { pointerEvents: "none" } : {}}
                >{copiedIdx === idx ? "✅" : "📋"}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

}
