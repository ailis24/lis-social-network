import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePremium } from "../context/PremiumContext";
import PremiumLockModal from "../components/PremiumLockModal";

const API = "";
const CATEGORIES = [
  "Все",
  "Одежда",
  "Электроника",
  "Мебель",
  "Транспорт",
  "Недвижимость",
  "Услуги",
  "Спорт",
  "Книги",
  "Другое",
];

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Item Card ────────────────────────────────────────────────────────────────
function ItemCard({ item, onClick, currentUser, onDelete }) {
  const images = Array.isArray(item.images)
    ? item.images
    : JSON.parse(item.images || "[]");
  const thumb = images[0] || null;
  const canDelete =
    currentUser && (currentUser.uid === item.seller_id || currentUser.is_admin);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirm("Удалить объявление?")) return;
    onDelete(item.id);
  };

  return (
    <div
      onClick={() => onClick(item)}
      className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow active:scale-[0.98] relative"
    >
      {canDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 z-10 w-7 h-7 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-base leading-none transition-colors"
          title="Удалить"
        >
          ×
        </button>
      )}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
            🖼
          </div>
        )}
        {item.status === "sold" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg bg-red-500 px-3 py-1 rounded-full">
              Продано
            </span>
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs rounded-full px-2 py-0.5">
            📷 {images.length}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-purple-700 text-base truncate">
          {item.price.toLocaleString("ru-RU")} ₽
        </p>
        <p className="text-gray-800 text-sm font-medium truncate mt-0.5">
          {item.title}
        </p>
        <p className="text-gray-400 text-xs mt-1 truncate">
          📍 {item.location || "Не указано"}
        </p>
        <p className="text-gray-400 text-xs truncate">@{item.seller_name}</p>
      </div>
    </div>
  );
}

// ── Item Detail Modal ────────────────────────────────────────────────────────
function ItemDetail({ item, currentUser, onClose, onSold, onDelete, onChat }) {
  const images = Array.isArray(item.images)
    ? item.images
    : JSON.parse(item.images || "[]");
  const contacts =
    typeof item.contacts === "object"
      ? item.contacts
      : JSON.parse(item.contacts || "{}");
  const [imgIdx, setImgIdx] = useState(0);
  const isSeller = currentUser?.uid === item.seller_id;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photos */}
        <div className="relative bg-gray-100 aspect-[4/3] overflow-hidden">
          {images.length > 0 ? (
            <>
              <img
                src={images[imgIdx]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition ${i === imgIdx ? "bg-white" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImgIdx((i) => (i - 1 + images.length) % images.length)
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    ›
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
              🖼
            </div>
          )}
          {item.status === "sold" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-2xl bg-red-500 px-4 py-2 rounded-full">
                Продано
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold text-gray-900 flex-1">
              {item.title}
            </h2>
            <p className="text-2xl font-bold text-purple-700 whitespace-nowrap">
              {item.price.toLocaleString("ru-RU")} ₽
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
              {item.category}
            </span>
            {item.location && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                📍 {item.location}
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-gray-700 text-sm leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="border-t pt-3">
            <p className="text-sm text-gray-500">
              Продавец:{" "}
              <span className="font-semibold text-gray-800">
                @{item.seller_name}
              </span>
            </p>
            <p className="text-xs text-gray-400">
              {new Date(item.created_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Contact buttons */}
          {item.status !== "sold" && (
            <div className="space-y-2">
              {!isSeller && (
                <button
                  onClick={() => onChat(item.seller_id)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  💬 Написать продавцу
                </button>
              )}
              {contacts.phone && (
                <a
                  href={`tel:${contacts.phone}`}
                  className="w-full py-2.5 rounded-xl bg-green-50 text-green-700 font-semibold text-sm flex items-center justify-center gap-2 border border-green-200"
                >
                  📞 Позвонить {contacts.phone}
                </a>
              )}
              {contacts.telegram && (
                <a
                  href={`https://t.me/${contacts.telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm flex items-center justify-center gap-2 border border-blue-200"
                >
                  ✈️ Telegram: {contacts.telegram}
                </a>
              )}
              {contacts.whatsapp && (
                <a
                  href={`https://wa.me/${contacts.whatsapp.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-green-50 text-green-700 font-semibold text-sm flex items-center justify-center gap-2 border border-green-200"
                >
                  💬 WhatsApp: {contacts.whatsapp}
                </a>
              )}
            </div>
          )}

          {isSeller && item.status !== "sold" && (
            <button
              onClick={() => onSold(item.id)}
              className="w-full py-2.5 rounded-xl bg-orange-50 text-orange-700 font-semibold text-sm border border-orange-200"
            >
              ✅ Пометить как продано
            </button>
          )}
          {(isSeller || currentUser?.is_admin) && (
            <button
              onClick={() => onDelete(item.id)}
              className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm border border-red-200"
            >
              🗑 Удалить объявление
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Form Modal ────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "Разное",
    location: "",
    phone: "",
    telegram: "",
    whatsapp: "",
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Укажите название");
    if (!form.price || isNaN(+form.price))
      return setError("Укажите корректную цену");
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("price", form.price);
      fd.append("category", form.category);
      fd.append("location", form.location.trim());
      fd.append(
        "contacts",
        JSON.stringify({
          phone: form.phone.trim() || undefined,
          telegram: form.telegram.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
        }),
      );
      images.forEach((f) => fd.append("images", f));

      const res = await fetch(`${API}/api/marketplace`, {
        method: "POST",
        headers: getAuthHeader(),
        body: fd,
      });

      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (
          res.status === 401 ||
          data.error === "Invalid token" ||
          data.error === "No token"
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }
        throw new Error(data.error || "Нет доступа");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка при публикации");
      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inp =
    "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">
            📦 Разместить товар
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Photo upload */}
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-purple-200 rounded-xl py-4 text-purple-500 text-sm font-medium hover:border-purple-400 transition"
            >
              📷 Добавить фото (до 5 штук)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {previews.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-200"
                    alt=""
                  />
                ))}
              </div>
            )}
          </div>

          <input
            className={inp}
            placeholder="Название (обязательно)"
            maxLength={100}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <textarea
            className={`${inp} resize-none h-20`}
            placeholder="Описание"
            maxLength={500}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              className={inp}
              placeholder="Цена ₽"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <select
              className={inp}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.filter((c) => c !== "Все").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <input
            className={inp}
            placeholder="📍 Где забрать (район, адрес)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <p className="text-xs text-gray-400 font-medium pt-1">
            Контакты (хотя бы один):
          </p>
          <input
            className={inp}
            placeholder="📞 Телефон"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className={inp}
            placeholder="✈️ Telegram (@username)"
            value={form.telegram}
            onChange={(e) => setForm({ ...form, telegram: e.target.value })}
          />
          <input
            className={inp}
            placeholder="💬 WhatsApp (номер)"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm disabled:opacity-60 mt-2"
          >
            {loading ? "Публикация..." : "📢 Опубликовать"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Marketplace() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPremiumLock, setShowPremiumLock] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "Все") params.set("category", category);
      params.set("sort", sort);
      const res = await fetch(`${API}/api/marketplace?${params}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoading(false);
  }, [search, category, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    if (!isPremium) {
      setShowPremiumLock(true);
      return;
    }
    setShowCreate(true);
  };

  const handleSold = async (id) => {
    await fetch(`${API}/api/marketplace/${id}/sold`, {
      method: "PUT",
      headers: getAuthHeader(),
    });
    setSelected(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить объявление?")) return;
    await fetch(`${API}/api/marketplace/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    });
    setSelected(null);
    load();
  };

  const handleChat = (sellerId) => {
    navigate(`/messages?uid=${sellerId}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white drop-shadow">
          🏪 Маркетплейс
        </h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold shadow active:scale-95 transition"
        >
          {isPremium ? "➕ Разместить" : "🔒 Разместить"}
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Поиск товаров..."
          className="w-full bg-white/90 backdrop-blur rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow"
        />
      </div>

      {/* Filters row */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
              category === c
                ? "bg-purple-600 text-white shadow"
                : "bg-white/80 text-gray-600 hover:bg-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex justify-end mb-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-white/80 border-0 text-xs text-gray-600 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/70">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-lg font-semibold">Объявлений пока нет</p>
          <p className="text-sm mt-1">Будьте первым — разместите товар!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={setSelected}
              currentUser={user}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selected && (
        <ItemDetail
          item={selected}
          currentUser={user}
          onClose={() => setSelected(null)}
          onSold={handleSold}
          onDelete={handleDelete}
          onChat={handleChat}
        />
      )}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(item) => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {showPremiumLock && (
        <PremiumLockModal
          feature="Маркетплейс — размещение товаров"
          onClose={() => setShowPremiumLock(false)}
        />
      )}
    </div>
  );
}
