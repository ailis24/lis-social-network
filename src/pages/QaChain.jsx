import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getQaChains,
  createQaChain,
  addAnswer,
  likeQaChain,
} from "../services/qaChain";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function QaChain() {
  const { currentUser } = useAuth();
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [category, setCategory] = useState("general");

  useEffect(() => {
    loadChains();
  }, []);

  const loadChains = async () => {
    try {
      setLoading(true);
      const data = await getQaChains();
      setChains(data);
    } catch (error) {
      console.error("Load chains error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createQaChain({
        question: newQuestion,
        creatorId: currentUser.uid,
        creatorUsername: currentUser.username,
        category,
      });
      setNewQuestion("");
      setShowCreateModal(false);
      loadChains();
      alert("✅ Цепочка создана!");
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleAddAnswer = async (chainId, answer) => {
    try {
      await addAnswer(chainId, currentUser.uid, currentUser.username, answer);
      loadChains();
      alert("✅ Ответ добавлен!");
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleLike = async (chainId) => {
    try {
      await likeQaChain(chainId);
      loadChains();
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">❓ Вопросы и ответы</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors text-sm"
          >
            ➕ Задать вопрос
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white">Загрузка...</div>
        ) : chains.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
            <p className="text-white text-lg mb-2">Нет вопросов</p>
            <p className="text-white/80 text-sm">
              Будь первым кто задаст вопрос!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((chain) => (
              <div
                key={chain.id}
                className="bg-white rounded-2xl shadow-xl p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">❓</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">
                      {chain.question}
                    </h3>
                    <p className="text-sm text-gray-500">
                      @{chain.creator?.username || "Пользователь"} •{" "}
                      {chain.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(chain.id)}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    ❤️ {chain.likes || 0}
                  </button>
                  <span className="text-sm text-gray-500">
                    💬 {chain.answers?.length || 0} ответов
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Задать вопрос
            </h3>
            <form onSubmit={handleCreate}>
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ваш вопрос..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 mb-4"
                rows="3"
                required
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 mb-4"
              >
                <option value="general">Общее</option>
                <option value="tech">Техника</option>
                <option value="lifestyle">Образ жизни</option>
                <option value="fitness">Фитнес</option>
              </select>
              <div className="space-y-3">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold"
                >
                  ✨ Опубликовать
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
