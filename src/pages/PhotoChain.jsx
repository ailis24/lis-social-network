import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function PhotoChain() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState(null);
  const [showParticipateModal, setShowParticipateModal] = useState(false);

  const [theme, setTheme] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [taggedUser, setTaggedUser] = useState("");

  const highlightChainId = searchParams.get("highlight");

  // 🔷 Загрузка эстафет
  useEffect(() => {
    if (!currentUser) return;
    loadChains();
    const interval = setInterval(loadChains, 10000); // Обновление каждые 10 сек
    return () => clearInterval(interval);
  }, [currentUser]);

  // 🔷 Подсветка эстафеты из параметров
  useEffect(() => {
    if (highlightChainId && chains.length > 0 && !loading) {
      const element = document.getElementById(`chain-${highlightChainId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add(
          "ring-4",
          "ring-purple-400",
          "ring-offset-2",
          "scale-[1.02]",
        );
        element.style.transition = "all 0.3s ease";
        setTimeout(() => {
          element.classList.remove(
            "ring-4",
            "ring-purple-400",
            "ring-offset-2",
            "scale-[1.02]",
          );
        }, 3000);
      }
      navigate("/photo-chain", { replace: true });
    }
  }, [highlightChainId, chains, loading, navigate]);

  async function loadChains() {
    try {
      const res = await fetch("/api/photo-chains");
      if (res.ok) {
        const data = await res.json();
        setChains(data);
      }
    } catch (error) {
      console.error("Error loading chains:", error);
    } finally {
      setLoading(false);
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Файл слишком большой! Максимум 10MB");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // 🔷 Создание эстафеты
  const handleCreateChain = async () => {
    if (!theme.trim() || !photoPreview || !currentUser) {
      alert("Введите тему и выберите фото!");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);
      // Загрузка фото
      const photoUrl = await uploadFile(
        photoFile,
        currentUser.uid,
        "photo-chains",
      );
      setUploadProgress(70);

      // Создание эстафеты
      const res = await fetch("/api/photo-chains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          title: theme,
          description: "",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadProgress(100);
        // Добавляем первое фото
        await fetch(`/api/photo-chains/${data.chainId}/photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": currentUser.uid,
          },
          body: JSON.stringify({ photoUrl }),
        });

        alert("Эстафета создана! 📸");
        setShowCreateModal(false);
        setTheme("");
        setPhotoFile(null);
        setPhotoPreview(null);
        loadChains();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (error) {
      console.error("Error creating chain:", error);
      alert("Ошибка создания: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 🔷 Участие в эстафете
  const handleParticipate = async () => {
    if (!photoPreview || !selectedChain || !currentUser) {
      alert("Выберите фото!");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);
      const photoUrl = await uploadFile(
        photoFile,
        currentUser.uid,
        "photo-chains",
      );
      setUploadProgress(70);

      const res = await fetch(`/api/photo-chains/${selectedChain.id}/photos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({ photoUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadProgress(100);
        alert("Фото добавлено в эстафету! 🎉");
        setShowParticipateModal(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setTaggedUser("");
        setSelectedChain(null);
        loadChains();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (error) {
      console.error("Error participating:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 🔷 Удаление эстафеты (только создатель)
  const handleDeleteChain = async (chain) => {
    if (chain.creatorId !== currentUser?.uid) {
      alert("❌ Только создатель может удалить эстафету!");
      return;
    }
    if (!confirm("Удалить эту эстафету? Это действие нельзя отменить.")) return;

    try {
      const res = await fetch(`/api/photo-chains/${chain.id}`, {
        method: "DELETE",
        headers: { "X-User-Id": currentUser.uid },
      });
      if (res.ok) {
        alert("Эстафета удалена! 🗑️");
        loadChains();
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      alert("Ошибка удаления: " + error.message);
    }
  };

  const openParticipateModal = (chain) => {
    setSelectedChain(chain);
    setShowParticipateModal(true);
  };

  // 🔷 Форматирование времени (SQLite timestamp)
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return date.toLocaleDateString("ru-RU");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-600 to-white">
        <div className="text-purple-700 text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />
      <div className="max-w-2xl mx-auto pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            📸 Фото-эстафета
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            + Создать
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white">Загрузка...</div>
        ) : chains.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center border border-purple-100">
            <p className="text-gray-500 text-lg mb-2">Нет активных эстафет</p>
            <p className="text-gray-400 text-sm">
              Будьте первым кто создаст! 🦊
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((chain) => (
              <div
                id={`chain-${chain.id}`}
                key={chain.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl border border-purple-100"
              >
                {/* Шапка */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white relative">
                  {chain.creatorId === currentUser.uid && (
                    <button
                      onClick={() => handleDeleteChain(chain)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-red-500 rounded-full flex items-center justify-center transition-all"
                      title="Удалить эстафету"
                    >
                      <span className="text-xl leading-none text-white">×</span>
                    </button>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="pr-8">
                      <h3 className="font-bold text-lg">{chain.title}</h3>
                      <p className="text-sm opacity-90">
                        Начал:{" "}
                        <Link
                          to={`/profile/${chain.creatorId}`}
                          className="hover:underline"
                        >
                          @{chain.creator?.username}
                        </Link>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {chain.itemCount || 0} фото
                      </p>
                      <p className="text-xs opacity-80">участников</p>
                    </div>
                  </div>
                </div>

                {/* Фото */}
                <div className="p-4">
                  {chain.items?.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                      {chain.items.map((item, index) => (
                        <div key={item.id} className="relative aspect-square">
                          <img
                            src={item.photoUrl}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            loading="lazy"
                            onClick={() => window.open(item.photoUrl, "_blank")}
                          />
                          <Link
                            to={`/profile/${item.userId}`}
                            className="absolute bottom-1 left-1"
                          >
                            <img
                              src={
                                item.avatar ||
                                "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                              }
                              alt={item.username}
                              className="w-6 h-6 rounded-full border border-white"
                              loading="lazy"
                            />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Пока нет фото
                    </p>
                  )}

                  <button
                    onClick={() => openParticipateModal(chain)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    📸 Добавить фото
                  </button>

                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Обновлено: {formatTime(chain.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔷 МОДАЛКА: СОЗДАНИЕ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">📸</span> Создать эстафету
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setTheme("");
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="w-10 h-10 bg-gray-100 hover:bg-red-100 rounded-full flex items-center justify-center transition-all"
              >
                <span className="text-gray-600 text-2xl leading-none">×</span>
              </button>
            </div>

            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Тема эстафеты (например: Селфи с кофе ☕)"
              className="w-full p-3 border-2 border-purple-200 rounded-xl mb-4 focus:border-purple-500 focus:outline-none text-gray-800"
            />

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Выберите фото (макс. 10MB):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="w-full p-2 border-2 border-purple-200 rounded-xl bg-purple-50 text-gray-800"
              />
              {photoPreview && (
                <div className="mt-3 relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>
              )}
            </div>

            {uploading && (
              <div className="mb-4 bg-purple-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                  <span className="text-gray-700 text-sm">
                    Загрузка фото...
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCreateChain}
                disabled={uploading || !theme || !photoPreview}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? "⏳ Загрузка..." : "✨ Создать эстафету"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔷 МОДАЛКА: УЧАСТИЕ */}
      {showParticipateModal && selectedChain && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">📸</span> Добавить фото
              </h2>
              <button
                onClick={() => {
                  setShowParticipateModal(false);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setTaggedUser("");
                  setSelectedChain(null);
                }}
                className="w-10 h-10 bg-gray-100 hover:bg-red-100 rounded-full flex items-center justify-center transition-all"
              >
                <span className="text-gray-600 text-2xl leading-none">×</span>
              </button>
            </div>

            <p className="text-gray-700 mb-4 font-medium">
              Тема:{" "}
              <span className="font-bold text-purple-600">
                {selectedChain.title}
              </span>
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Ваше фото (макс. 10MB):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="w-full p-2 border-2 border-purple-200 rounded-xl bg-purple-50 text-gray-800"
              />
              {photoPreview && (
                <div className="mt-3 relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>
              )}
            </div>

            {uploading && (
              <div className="mb-4 bg-purple-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                  <span className="text-gray-700 text-sm">
                    Загрузка фото...
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleParticipate}
                disabled={uploading || !photoPreview}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? "⏳ Загрузка..." : "🚀 Отправить фото"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
