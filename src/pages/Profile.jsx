import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePremium } from "../context/PremiumContext";
import {
  userService,
  postService,
  friendService,
  messageService,
  callService,
  adminService,
  profileViewsService,
} from "../services";
import { CameraIcon } from "@heroicons/react/24/outline";
import CallModal from "../components/CallModal";
import PremiumLockModal from "../components/PremiumLockModal";

export default function Profile() {
  const { uid: paramUid } = useParams();
  const { user: currentUser, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const uid = paramUid || currentUser?.uid;
  const isOwn = uid === currentUser?.uid;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ username: "", bio: "" });
  const [friendStatus, setFriendStatus] = useState("none"); // none | sent | friends
  const [activeCall, setActiveCall] = useState(null); // { type: 'audio'|'video' }
  const [savingProfile, setSavingProfile] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsListLoading, setFriendsListLoading] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [profileIsPremium, setProfileIsPremium] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferPhone, setTransferPhone] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMsg, setTransferMsg] = useState("");

  const { isPremium: currentUserIsPremium } = usePremium();
  const isViewerAdmin = !!currentUser?.is_admin;

  const [showPremiumLock, setShowPremiumLock] = useState(false);
  const [premiumLockFeature, setPremiumLockFeature] = useState("");
  const [profileViews, setProfileViews] = useState([]);
  const [showViews, setShowViews] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const p = await userService.getProfile(uid);
      setProfile(p);
      setEditData({ username: p.username, bio: p.bio || "" });
      setProfileIsPremium(!!p.isPremium);

      const allPosts = await postService.getFeed();
      setPosts(allPosts.filter((post) => post.author_id === uid));

      if (!isOwn) {
        try {
          const s = await friendService.getStatus(uid);
          setFriendStatus(s.status || "none");
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [uid, isOwn]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      await userService.updateProfile(editData);
      setProfile((p) => ({ ...p, ...editData }));
      if (isOwn) updateUser(editData);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarError("");
    if ((file.type === "image/gif" || file.type === "video/mp4") && !currentUserIsPremium) {
      setPremiumLockFeature("Анимированный аватар");
      setShowPremiumLock(true);
      e.target.value = "";
      return;
    }
    try {
      const result = await userService.uploadAvatar(file);
      setProfile((p) => ({ ...p, avatar: result.avatar }));
      if (isOwn) updateUser({ avatar: result.avatar });
    } catch (err) {
      setAvatarError("Ошибка загрузки. Попробуй снова.");
    }
  };

  const handleCall = (type) => {
    if (!currentUserIsPremium) {
      setPremiumLockFeature("Звонки только для Premium");
      setShowPremiumLock(true);
      return;
    }
    setActiveCall({ type });
  };

  const loadProfileViews = useCallback(async () => {
    if (!isOwn || !profileIsPremium) return;
    try {
      const views = await profileViewsService.getViews(uid);
      setProfileViews(views);
    } catch (_) {}
  }, [isOwn, profileIsPremium, uid]);

  useEffect(() => {
    loadProfileViews();
  }, [loadProfileViews]);

  const handleAddFriend = async () => {
    if (friendStatus !== "none") return;
    try {
      await friendService.sendRequest(uid);
      setFriendStatus("sent");
    } catch (err) {
      try {
        const s = await friendService.getStatus(uid);
        setFriendStatus(s.status || "sent");
      } catch {
        setFriendStatus("sent");
      }
    }
  };

  const handleOpenFriendsList = async () => {
    setShowFriendsList(true);
    setFriendsListLoading(true);
    try {
      const list = await friendService.getList();
      setFriendsList(list);
    } catch {
      setFriendsList([]);
    } finally {
      setFriendsListLoading(false);
    }
  };

  const handleMessage = async () => {
    setStartingChat(true);
    try {
      const data = await messageService.createConversation(uid);
      navigate(`/messages?conv=${data.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setStartingChat(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleTogglePremium = async () => {
    setPremiumLoading(true);
    try {
      const result = await adminService.togglePremium(uid);
      setProfileIsPremium(result.isPremium);
    } catch (err) {
      alert(err.message);
    } finally {
      setPremiumLoading(false);
    }
  };

  const handleTransferRights = async () => {
    if (!transferPhone.trim()) return;
    if (!confirm(`Передать права администратора на номер ${transferPhone}? Вы потеряете доступ к панели администратора.`)) return;
    setTransferLoading(true);
    setTransferMsg("");
    try {
      const result = await adminService.transferRights(transferPhone.trim());
      setTransferMsg(`✅ Права переданы пользователю @${result.newAdmin}`);
      setTransferPhone("");
    } catch (err) {
      setTransferMsg(`❌ ${err.message}`);
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-white">
        <div className="text-5xl mb-3">😕</div>
        <p className="text-xl font-semibold">Профиль не найден</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      {/* Profile card */}
      <div className="bg-white/95 rounded-3xl shadow-lg p-6 mb-6">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            {profile.isPremium && <div className="crown-badge">👑</div>}
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                loading="lazy"
                className={`w-24 h-24 rounded-full object-cover border-4 shadow ${profile.isPremium ? "premium-avatar-ring border-yellow-400" : "border-purple-200"}`}
              />
            ) : (
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold shadow ${profile.isPremium ? "premium-avatar-ring" : ""}`}>
                {profile.username?.charAt(0)?.toUpperCase()}
              </div>
            )}

            {isOwn && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center cursor-pointer hover:bg-purple-50 border border-purple-200">
                <CameraIcon className="w-4 h-4 text-purple-600" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>

          {avatarError && (
            <p className="text-red-500 text-xs mb-2">{avatarError}</p>
          )}

          {editing ? (
            <input
              className="text-xl font-bold text-center border-b-2 border-purple-400 focus:outline-none bg-transparent mb-2"
              value={editData.username}
              onChange={(e) =>
                setEditData({ ...editData, username: e.target.value })
              }
            />
          ) : (
            <div className="flex items-center gap-2 justify-center flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">
                @{profile.username}
              </h1>
              {profileIsPremium && (
                <span className="text-yellow-500 text-xl" title="Премиум">💎</span>
              )}
              {profile.is_admin && (
                <span className="text-purple-600 text-xl" title="Администратор">👑</span>
              )}
              {/* Admin-only: toggle premium button */}
              {isViewerAdmin && (
                <button
                  onClick={handleTogglePremium}
                  disabled={premiumLoading}
                  title={profileIsPremium ? "Отключить Премиум" : "Включить Премиум"}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow transition-all hover:scale-110 active:scale-95 ${
                    profileIsPremium
                      ? "bg-yellow-400 text-white hover:bg-yellow-500"
                      : "bg-gray-200 text-gray-500 hover:bg-yellow-100 border border-dashed border-yellow-400"
                  } disabled:opacity-50`}
                >
                  {premiumLoading ? "..." : "💎"}
                </button>
              )}
            </div>
          )}
          {/* Admin sees phone number */}
          {isViewerAdmin && profile.phone && (
            <p className="text-xs text-gray-400 mt-1 font-mono">{profile.phone}</p>
          )}

          {editing ? (
            <textarea
              className="w-full mt-2 text-sm text-center border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50 resize-none"
              rows={3}
              value={editData.bio}
              placeholder="О себе..."
              onChange={(e) =>
                setEditData({ ...editData, bio: e.target.value })
              }
            />
          ) : (
            <p className="text-gray-500 mt-1 text-sm">
              {profile.bio || "Нет описания"}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{posts.length}</p>
            <p className="text-xs text-gray-500">Публикации</p>
          </div>
          <button
            onClick={handleOpenFriendsList}
            className="flex flex-col items-center hover:bg-purple-50 rounded-xl py-1 transition-colors cursor-pointer"
          >
            <p className="text-2xl font-bold text-gray-800">
              {profile.friendsCount || 0}
            </p>
            <p className="text-xs text-purple-600 font-semibold">Друзья</p>
          </button>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {profile.followersCount || 0}
            </p>
            <p className="text-xs text-gray-500">Подписчики</p>
          </div>
        </div>

        {/* Action buttons */}
        {isOwn ? (
          <>
          <div className="flex flex-col gap-2">
            {editing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={savingProfile}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {savingProfile ? "Сохранение..." : "✓ Сохранить"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                ✏️ Редактировать профиль
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-red-50 text-red-500 font-semibold rounded-xl hover:bg-red-100 transition-all"
            >
              🚪 Выйти
            </button>
          </div>

          {/* Admin-only section: transfer rights */}
          {isViewerAdmin && isOwn && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowTransfer((v) => !v)}
                className="w-full py-2 bg-purple-50 text-purple-700 font-semibold rounded-xl hover:bg-purple-100 transition-all text-sm flex items-center justify-center gap-2"
              >
                🛡️ Права администратора
              </button>
              {showTransfer && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500 text-center">
                    Введите номер нового администратора. Ваши права будут переданы.
                  </p>
                  <input
                    type="tel"
                    placeholder="+79991234567"
                    value={transferPhone}
                    onChange={(e) => setTransferPhone(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button
                    onClick={handleTransferRights}
                    disabled={transferLoading || !transferPhone.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 text-sm"
                  >
                    {transferLoading ? "Передаём..." : "Передать права"}
                  </button>
                  {transferMsg && (
                    <p className="text-sm text-center font-medium">{transferMsg}</p>
                  )}
                </div>
              )}
            </div>
          )}
          </>
        ) : (
          <>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleAddFriend}
                disabled={friendStatus === "sent" || friendStatus === "friends"}
                className={`flex-1 py-2.5 font-semibold rounded-xl transition-all ${
                  friendStatus === "sent"
                    ? "bg-green-100 text-green-600"
                    : friendStatus === "friends"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg"
                }`}
              >
                {friendStatus === "sent"
                  ? "✓ Заявка отправлена"
                  : friendStatus === "friends"
                    ? "👫 В друзьях"
                    : "👤 Добавить в друзья"}
              </button>
              <button
                onClick={handleMessage}
                disabled={startingChat}
                className="flex-1 py-2.5 border border-purple-300 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all"
              >
                {startingChat ? "..." : "💬 Написать"}
              </button>
            </div>
            {/* Call buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCall("audio")}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                📞 {currentUserIsPremium ? "Аудиозвонок" : "🔒 Аудио"}
              </button>
              <button
                onClick={() => handleCall("video")}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                📹 {currentUserIsPremium ? "Видеозвонок" : "🔒 Видео"}
              </button>
            </div>
          </div>
          {activeCall && (
            <CallModal
              side="caller"
              targetId={uid}
              targetName={`@${profile?.username || ""}`}
              callType={activeCall.type}
              onEnd={() => setActiveCall(null)}
            />
          )}
          </>
        )}
      </div>

      {/* Profile views — premium owners only */}
      {isOwn && profileIsPremium && (
        <div className="bg-white/95 rounded-3xl shadow-lg p-5 mb-6">
          <button
            onClick={() => setShowViews((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <span className="font-bold text-gray-800 flex items-center gap-2">
              <span>👁</span> Кто смотрел профиль
              {profileViews.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {profileViews.length}
                </span>
              )}
            </span>
            <span className="text-gray-400 text-sm">{showViews ? "▲" : "▼"}</span>
          </button>
          {showViews && (
            <div className="mt-3 space-y-2">
              {profileViews.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-3">Пока никто не заходил</p>
              ) : (
                profileViews.map((v) => (
                  <Link key={v.id} to={`/profile/${v.viewer_id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50 transition-colors">
                    {v.avatar ? (
                      <img src={v.avatar} alt={v.username} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
                        {v.username?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">@{v.username}</p>
                      <p className="text-gray-400 text-xs">
                        {new Date(v.viewed_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {showPremiumLock && (
        <PremiumLockModal
          feature={premiumLockFeature}
          onClose={() => setShowPremiumLock(false)}
        />
      )}

      {/* Friends list modal */}
      {showFriendsList && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowFriendsList(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm max-h-[75vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">👫 Друзья</h3>
              <button
                onClick={() => setShowFriendsList(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {friendsListLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-400 border-t-transparent" />
                </div>
              ) : friendsList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">👤</div>
                  <p>Пока нет друзей</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendsList.map((f) => (
                    <Link
                      key={f.uid}
                      to={`/profile/${f.uid}`}
                      onClick={() => setShowFriendsList(false)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50 transition-colors"
                    >
                      {f.avatar ? (
                        <img
                          src={f.avatar}
                          alt={f.username}
                          className="w-11 h-11 rounded-full object-cover border-2 border-purple-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                          {f.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800">@{f.username}</p>
                        {f.bio && <p className="text-xs text-gray-500 truncate max-w-[180px]">{f.bio}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Posts grid */}
      <h2 className="text-white font-bold text-lg mb-3 drop-shadow">
        Публикации
      </h2>
      {posts.length === 0 ? (
        <div className="text-center py-12 text-white/70">
          <div className="text-4xl mb-2">📭</div>
          <p>Публикаций пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white/90 rounded-2xl shadow p-4">
              {post.image && (
                <img
                  src={post.image}
                  alt="Post"
                  loading="lazy"
                  className="w-full max-h-64 object-cover rounded-xl mb-3"
                />
              )}
              {post.video && (
                <video controls className="w-full rounded-xl mb-3 max-h-64">
                  <source src={post.video} />
                </video>
              )}
              {post.content && (
                <p className="text-gray-800 text-sm">{post.content}</p>
              )}
              {post.poll_data && (
                <div className="mt-2 bg-purple-50 rounded-xl p-3">
                  <p className="font-semibold text-gray-700 text-sm mb-2">
                    📊 {post.poll_data.question}
                  </p>
                  {post.poll_data.options?.map((opt, i) => {
                    const o = typeof opt === "string" ? { text: opt, votes: 0 } : opt;
                    const total =
                      post.poll_data.options.reduce(
                        (s, x) => s + (typeof x === "string" ? 0 : x.votes || 0),
                        0,
                      ) || 0;
                    const pct = total ? Math.round(((o.votes || 0) / total) * 100) : 0;
                    return (
                      <div
                        key={i}
                        className="relative overflow-hidden rounded-full border border-purple-200 mb-1.5"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-200 to-pink-200"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between px-3 py-1.5 text-xs text-gray-700">
                          <span>{o.text}</span>
                          <span className="font-semibold text-purple-700">
                            {pct}% ({o.votes || 0})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>❤️ {post.likes?.length || 0}</span>
                <span>💬 {post.comments_count}</span>
                <span>
                  {new Date(post.created_at).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
