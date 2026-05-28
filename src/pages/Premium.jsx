import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "../context/PremiumContext";
import { adminService, premiumService } from "../services";

const PAYMENT_PHONE = "+79999099549";

const FEATURES = [
  { icon: "📸", title: "Загрузка сторис", desc: "Публикуй фото и видео истории" },
  { icon: "📞", title: "Аудио и видео звонки", desc: "Безлимитные звонки в HD" },
  { icon: "🦊", title: "Авто-уход за лисёнком", desc: "Лис сам кушает и спит" },
  { icon: "👁", title: "Кто смотрел профиль", desc: "Список посетителей за 30 дней" },
  { icon: "📊", title: "Статистика постов", desc: "Охваты, лайки, вовлечённость" },
  { icon: "📎", title: "Файлы до 500 МБ", desc: "Большие файлы в сообщениях" },
  { icon: "🎬", title: "Анимированный аватар", desc: "GIF и видео аватары" },
  { icon: "👤", title: "Анонимный просмотр сторис", desc: "Смотри и не светись" },
  { icon: "⭐", title: "Приоритет в ленте", desc: "Твои посты первые в ленте" },
  { icon: "✓✓", title: "Зелёные отметки прочтения", desc: "Видно что сообщение прочли" },
];

export default function Premium() {
  const navigate = useNavigate();
  const { isPremium, premiumExpires, loading } = usePremium();

  const [showPayment, setShowPayment] = useState(false);
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmitCheck = async () => {
    if (!phone.trim()) { setSubmitError("Введите номер телефона"); return; }
    if (!receipt) { setSubmitError("Прикрепите скриншот чека"); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      await adminService.submitCheck(phone.trim(), receipt);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">👑</div>
        <h1 className="text-3xl font-bold text-white drop-shadow">Lis Premium</h1>
        <p className="text-white/80 mt-1 text-sm">Разблокируй все возможности</p>
      </div>

      {/* Already premium */}
      {isPremium && premiumExpires && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 mb-6 text-center shadow-lg">
          <div className="text-2xl mb-1">🌟</div>
          <p className="font-bold text-white text-lg">У тебя есть Premium!</p>
          <p className="text-white/90 text-sm">
            Активен до {new Date(premiumExpires).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      )}

      {/* Features grid */}
      <div className="bg-white/95 rounded-3xl p-5 mb-6 shadow-xl">
        <h2 className="font-bold text-gray-800 text-lg mb-4 text-center">
          Что входит в Premium:
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50 transition-colors">
              <div className="text-2xl w-10 text-center flex-shrink-0">{f.icon}</div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                <p className="text-gray-400 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price block */}
      <div className="bg-white/95 rounded-3xl p-5 mb-5 shadow-xl text-center">
        <p className="text-gray-500 text-sm mb-1">Стоимость</p>
        <p className="text-4xl font-black text-purple-700 mb-1">299 ₽</p>
        <p className="text-gray-400 text-xs mb-4">в месяц</p>
        <div className="bg-purple-50 rounded-2xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Перевод по СБП на номер:</p>
          <p className="text-xl font-bold text-gray-800 select-all tracking-wide">{PAYMENT_PHONE}</p>
          <p className="text-xs text-gray-400 mt-1">Банк: любой</p>
        </div>
        {!isPremium && (
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-lg rounded-2xl hover:shadow-2xl active:scale-95 transition-all"
          >
            💳 Я оплатил
          </button>
        )}
        {isPremium && (
          <div className="py-3 text-green-600 font-bold text-lg">
            ✅ Подписка активна
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(-1)}
        className="w-full py-3 bg-white/20 text-white font-semibold rounded-2xl hover:bg-white/30 transition-all"
      >
        ← Назад
      </button>

      {/* Payment modal */}
      {showPayment && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => { if (!submitting) setShowPayment(false); }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Чек отправлен!</h3>
                <p className="text-gray-500 text-sm mb-5">
                  Администратор проверит платёж в течение 24 часов и активирует Premium
                </p>
                <button
                  onClick={() => { setShowPayment(false); setSubmitted(false); }}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-800">🧾 Загрузка чека</h3>
                  <button
                    onClick={() => setShowPayment(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Номер телефона с которого платили:
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 999-99-99"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Скриншот чека перевода:
                  </label>
                  <label className="block w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-purple-400 transition-colors">
                    {receipt ? (
                      <div>
                        <p className="text-sm font-semibold text-purple-600">{receipt.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Нажми чтобы сменить</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl mb-1">📷</p>
                        <p className="text-sm text-gray-500">Выбрать файл</p>
                        <p className="text-xs text-gray-400 mt-0.5">Скриншот из банковского приложения</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setReceipt(e.target.files[0])}
                    />
                  </label>
                </div>

                {submitError && (
                  <p className="text-red-500 text-sm bg-red-50 rounded-xl p-2.5 mb-4 text-center">
                    {submitError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPayment(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmitCheck}
                    disabled={submitting}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50"
                  >
                    {submitting ? "Отправка..." : "📤 Отправить"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
