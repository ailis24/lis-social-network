import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getActiveQaChains,
  createQaChain,
  addAnswer,
  promoteToQuestion,
  likeQaChain,
  likeAnswer,
  deleteQaChain,
} from "../services/qaChain";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Avatar from "../components/Avatar";

export default function QaChain() {
  const { currentUser, userData } = useAuth();
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedChain, setExpandedChain] = useState(null);

  // Для создания цепочки
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("other");

  // Для ответа
  const [answerText, setAnswerText] = useState("");
  const [answeringChain, setAnsweringChain] = useState(null);

  useEffect(() => {
    const unsubscribe = getActiveQaChains((data) => {
      setChains(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateChain = async () => {
    if (!question.trim()) {
      alert("Введите вопрос!");
      return;
    }

    try {
      const result = await createQaChain({
        question,
        creatorId: currentUser.uid,
        creatorUsername: userData?.username || currentUser.email.split("@")[0],
        category,
      });

      if (result.success) {
        alert("Цепочка создана! ❓");
        setShowCreateModal(false);
        setQuestion("");
        setCategory("other");
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      alert("Ошибка создания: " + error.message);
    }
  };

  const handleAddAnswer = async (chainId) => {
    if (!answerText.trim()) {
      alert("Введите ответ!");
      return;
    }

    try {
      const result = await addAnswer(
        chainId,
        currentUser.uid,
        userData?.username || currentUser.email.split("@")[0],
        answerText,
      );

      if (result.success) {
        alert("Ответ добавлен! 💬");
        setAnswerText("");
        setAnsweringChain(null);
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handlePromoteToQuestion = async (chainId, answerIndex, answer) => {
    const newQuestion = prompt(
      "Введите новый вопрос на основе этого ответа:",
      answer.answer,
    );

    if (!newQuestion) return;

    try {
      const result = await promoteToQuestion(chainId, answerIndex, newQuestion);

      if (result.success) {
        alert("Ответ стал новым вопросом! 🎯");
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleLikeChain = async (chainId) => {
    try {
      await likeQaChain(chainId, currentUser.uid);
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleLikeAnswer = async (chainId, answerIndex) => {
    try {
      await likeAnswer(chainId, answerIndex, currentUser.uid);
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleDeleteChain = async (chain) => {
    if (!confirm("Удалить эту цепочку?")) return;

    try {
      const result = await deleteQaChain(
        chain.id,
        currentUser.uid,
        chain.creator.userId,
      );

      if (result.success) {
        alert("Цепочка удалена! 🗑️");
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      alert("Ошибка удаления: " + error.message);
    }
  };

  const getCategoryEmoji = (cat) => {
    const emojis = {
      personal: "👤",
      fun: "😄",
      deep: "🤔",
      random: "🎲",
      other: "❓",
    };
    return emojis[cat] || "❓";
  };

  const getCategoryName = (cat) => {
    const names = {
      personal: "О себе",
      fun: "Весёлое",
      deep: "Глубокое",
      random: "Случайное",
      other: "Другое",
    };
    return names[cat] || cat;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            ❓ Вопрос-ответ цепочкой
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            + Задать вопрос
          </button>
        </div>

        {/* Инфо блок */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6 text-white">
          <p className="text-sm">
            <strong>💡 Как это работает:</strong> Задай вопрос → друзья отвечают
            → лучшие ответы становятся новыми вопросами! Цепочка растёт
            бесконечно! 🔗
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white">Загрузка...</div>
        ) : chains.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
            <p className="text-white text-lg mb-2">Нет активных цепочек</p>
            <p className="text-white/80 text-sm">
              Будь первым кто задаст вопрос! ❓
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((chain) => (
              <div
                key={chain.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                {/* Заголовок */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white relative">
                  {chain.creator.userId === currentUser.uid && (
                    <button
                      onClick={() => handleDeleteChain(chain)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center transition-all"
                      title="Удалить цепочку"
                    >
                      <span className="text-xl leading-none text-white">×</span>
                    </button>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {getCategoryEmoji(chain.category)}
                        </span>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                          {getCategoryName(chain.category)}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mb-2">
                        {chain.question}
                      </h3>
                      <div className="flex items-center gap-3 text-sm opacity-90">
                        <span>👤 {chain.creator.username}</span>
                        <span>💬 {chain.answers?.length || 0} ответов</span>
                        <span>❤️ {chain.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ответы */}
                <div className="p-4">
                  {/* Кнопка развернуть/свернуть */}
                  <button
                    onClick={() =>
                      setExpandedChain(
                        expandedChain === chain.id ? null : chain.id,
                      )
                    }
                    className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 rounded-xl font-semibold mb-4 transition-all"
                  >
                    {expandedChain === chain.id
                      ? "🔼 Свернуть ответы"
                      : `🔽 Показать ответы (${chain.answers?.length || 0})`}
                  </button>

                  {/* Развёрнутые ответы */}
                  {expandedChain === chain.id && (
                    <div className="space-y-3 mb-4">
                      {chain.answers?.map((answer, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-xl ${
                            answer.becomesQuestion
                              ? "bg-yellow-50 border-2 border-yellow-400"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar
                              src={answer.userAvatar}
                              username={answer.username}
                              size="sm"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm text-gray-900">
                                  {answer.username}
                                </span>
                                {answer.becomesQuestion && (
                                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">
                                    → Стал вопросом
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-800 text-sm mb-2">
                                {answer.answer}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleLikeAnswer(chain.id, index)
                                  }
                                  className={`text-sm px-3 py-1 rounded-full transition-all ${
                                    answer.likedBy?.includes(currentUser.uid)
                                      ? "bg-red-100 text-red-600"
                                      : "bg-gray-200 text-gray-600 hover:bg-red-50"
                                  }`}
                                >
                                  ❤️ {answer.likes || 0}
                                </button>
                                {!answer.becomesQuestion && (
                                  <button
                                    onClick={() =>
                                      handlePromoteToQuestion(
                                        chain.id,
                                        index,
                                        answer,
                                      )
                                    }
                                    className="text-sm px-3 py-1 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-all"
                                  >
                                    🎯 Сделать вопросом
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Форма ответа */}
                      {answeringChain === chain.id ? (
                        <div className="mt-4">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Твой ответ..."
                            rows="3"
                            className="w-full p-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 mb-2"
                            style={{ color: "#000" }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddAnswer(chain.id)}
                              disabled={!answerText.trim()}
                              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-xl font-semibold disabled:opacity-50"
                            >
                              💬 Ответить
                            </button>
                            <button
                              onClick={() => {
                                setAnsweringChain(null);
                                setAnswerText("");
                              }}
                              className="px-4 py-2 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAnsweringChain(chain.id)}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                          💬 Написать ответ
                        </button>
                      )}
                    </div>
                  )}

                  {/* Лайк цепочки */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <button
                      onClick={() => handleLikeChain(chain.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        chain.likedBy?.includes(currentUser.uid)
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50"
                      }`}
                    >
                      <span className="text-xl">
                        {chain.likedBy?.includes(currentUser.uid) ? "❤️" : "🤍"}
                      </span>
                      <span className="font-semibold">{chain.likes || 0}</span>
                    </button>
                    <p className="text-xs text-gray-500">
                      {chain.answers?.length || 0} ответов в цепочке
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">❓ Задать вопрос</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                >
                  <option value="personal">👤 О себе</option>
                  <option value="fun">😄 Весёлое</option>
                  <option value="deep">🤔 Глубокое</option>
                  <option value="random">🎲 Случайное</option>
                  <option value="other">❓ Другое</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Твой вопрос *
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Например: Какой твой самый странный страх?"
                  rows="4"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateChain}
                disabled={!question.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                Задать вопрос
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setQuestion("");
                  setCategory("other");
                }}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
