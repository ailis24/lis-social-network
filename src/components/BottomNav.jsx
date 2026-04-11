import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 px-6 py-3 pb-6 shadow-lg">
      <div className="max-w-2xl mx-auto flex justify-around items-center">
        {/* Главная */}
        <Link
          to="/"
          className={`flex flex-col items-center transition-all ${
            isActive("/")
              ? "text-white scale-110"
              : "text-white/70 hover:text-white"
          }`}
        >
          <span className="text-2xl">🏠</span>
          <span className="text-[10px] mt-0.5 font-medium">Главная</span>
        </Link>

        {/* Поиск */}
        <Link
          to="/search"
          className={`flex flex-col items-center transition-all ${
            isActive("/search")
              ? "text-white scale-110"
              : "text-white/70 hover:text-white"
          }`}
        >
          <span className="text-2xl">🔍</span>
          <span className="text-[10px] mt-0.5 font-medium">Поиск</span>
        </Link>

        {/* ✅ ЦЕНТРАЛЬНАЯ КНОПКА — БОЛЬШОЙ БЕЛЫЙ КРУГ С ПЛЮСИКОМ */}
        <Link to="/create" className="flex items-center justify-center -mt-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform border-4 border-purple-300">
            <span className="text-4xl font-bold text-purple-600 leading-none">
              +
            </span>
          </div>
        </Link>

        {/* Уведомления */}
        <Link
          to="/notifications"
          className={`flex flex-col items-center transition-all ${
            isActive("/notifications")
              ? "text-white scale-110"
              : "text-white/70 hover:text-white"
          }`}
        >
          <span className="text-2xl">🔔</span>
          <span className="text-[10px] mt-0.5 font-medium">Уведомления</span>
        </Link>

        {/* Профиль */}
        <Link
          to="/profile"
          className={`flex flex-col items-center transition-all ${
            isActive("/profile")
              ? "text-white scale-110"
              : "text-white/70 hover:text-white"
          }`}
        >
          <span className="text-2xl">👤</span>
          <span className="text-[10px] mt-0.5 font-medium">Профиль</span>
        </Link>
      </div>
    </nav>
  );
}
