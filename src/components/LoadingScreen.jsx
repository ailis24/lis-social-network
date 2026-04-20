// src/components/LoadingScreen.jsx
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-purple-400 to-pink-400 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🦊</div>
        <h2 className="text-2xl font-bold text-white mb-2">LIS</h2>
        <p className="text-white/80">Загрузка...</p>
        <div className="mt-6 flex justify-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-100"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-200"></div>
        </div>
      </div>
    </div>
  );
}
