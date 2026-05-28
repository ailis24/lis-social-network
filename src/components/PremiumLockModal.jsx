import React from "react";
import { useNavigate } from "react-router-dom";

const ALL_FEATURES = [
  "📸 Загрузка сторис",
  "📞 Аудио и видео звонки",
  "🦊 Авто-уход за лисёнком",
  "👁 Кто смотрел профиль",
  "📊 Статистика постов",
  "📎 Файлы до 500 МБ",
  "🎬 Анимированный аватар",
  "👤 Анонимный просмотр сторис",
  "⭐ Приоритет в ленте",
  "✓✓ Зелёные отметки прочтения",
];

export default function PremiumLockModal({ onClose, feature, featureList }) {
  const navigate = useNavigate();

  const handleGetPremium = () => {
    onClose();
    navigate("/premium");
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">👑</div>
          <h2 className="text-xl font-bold text-gray-800">
            {feature ? `🔒 ${feature}` : "🔒 Требуется Premium"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Эта функция доступна только с Premium подпиской
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-purple-700 mb-2">
            С Premium вы получите:
          </p>
          <ul className="space-y-1.5">
            {(featureList || ALL_FEATURES).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-500 font-bold text-xs">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all"
          >
            Позже
          </button>
          <button
            onClick={handleGetPremium}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            👑 Оформить
          </button>
        </div>
      </div>
    </div>
  );
}
