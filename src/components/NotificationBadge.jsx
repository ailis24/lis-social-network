export default function NotificationBadge({ count, className = "" }) {
  if (!count || count === 0) return null;

  const displayCount = count > 99 ? "99+" : count;

  return (
    <span
      className={`absolute -top-1 -right-1 min-w-[18px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full animate-bounce-short ${className}`}
    >
      {displayCount}
    </span>
  );
}
