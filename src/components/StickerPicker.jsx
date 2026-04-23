import React, { useState } from "react";

const STICKER_PACKS = {
  Лисы: ["🦊", "🐺", "🐶", "🐱", "🐰", "🐻", "🐼", "🐨"],
  Эмоции: [
    "😀",
    "😍",
    "🤩",
    "😂",
    "🥺",
    "😎",
    "🤔",
    "😴",
    "🤯",
    "🥳",
    "😡",
    "🙄",
  ],
  Жесты: [
    "👍",
    "👎",
    "👏",
    "🙌",
    "🙏",
    "💪",
    "🤝",
    "✌️",
    "🤘",
    "👌",
    "🫶",
    "🤙",
  ],
  Сердца: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "💕",
    "💖",
    "💘",
    "💝",
  ],
  Веселье: [
    "🎉",
    "🎊",
    "🎁",
    "🎂",
    "🍰",
    "🍕",
    "🍔",
    "🍟",
    "🌮",
    "🍩",
    "☕",
    "🍺",
  ],
  Природа: [
    "🌸",
    "🌺",
    "🌻",
    "🌹",
    "🌷",
    "🌳",
    "🌴",
    "⭐",
    "🌙",
    "☀️",
    "⛅",
    "🌈",
  ],
};

export default function StickerPicker({ onPick, onClose }) {
  const [activeTab, setActiveTab] = useState("Лисы");

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {Object.keys(STICKER_PACKS).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setActiveTab(name)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap ${
              activeTab === name
                ? "bg-purple-100 text-purple-700 border-b-2 border-purple-500"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto px-3 py-2 text-gray-400 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="p-3 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
        {STICKER_PACKS[activeTab].map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            className="text-3xl hover:scale-125 transition-transform p-1"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
