import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 border-t border-purple-400/30 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-2">
        {/* 🏠 ГЛАВНАЯ (ЛЕНТА) */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
            isActive("/")
              ? "text-white scale-110 drop-shadow-lg"
              : "text-white/60 hover:text-white"
          }`}
        >
          <span className="text-2xl mb-1">🏠</span>
          <span className="text-[10px] font-medium tracking-wide">Лента</span>
        </Link>

        {/* 🔍 ПОИСК */}
        <Link
          to="/search"
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
            isActive("/search")
              ? "text-white scale-110 drop-shadow-lg"
              : "text-white/60 hover:text-white"
          }`}
        >
          <span className="text-2xl mb-1">🔍</span>
          <span className="text-[10px] font-medium tracking-wide">Поиск</span>
        </Link>

        {/* ➕ ДОБАВИТЬ ПОСТ (Центральная кнопка) */}
        <Link
          to="/add-post"
          className="relative -top-5 flex flex-col items-center justify-center group"
        >
          <div className="w-14 h-14 bg-white rounded-full shadow-lg border-4 border-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <span className="text-3xl text-purple-600 font-bold">+</span>
          </div>
        </Link>

        {/* 🔔 УВЕДОМЛЕНИЯ */}
        <Link
          to="/notifications"
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
            isActive("/notifications")
              ? "text-white scale-110 drop-shadow-lg"
              : "text-white/60 hover:text-white"
          }`}
        >
          <span className="text-2xl mb-1">🔔</span>
          <span className="text-[10px] font-medium tracking-wide">Увед.</span>
        </Link>

        {/* 👤 ПРОФИЛЬ */}
        <Link
          to="/profile"
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
            isActive("/profile")
              ? "text-white scale-110 drop-shadow-lg"
              : "text-white/60 hover:text-white"
          }`}
        >
          <span className="text-2xl mb-1">👤</span>
          <span className="text-[10px] font-medium tracking-wide">Профиль</span>
        </Link>
      </div>
    </nav>
  );
}
