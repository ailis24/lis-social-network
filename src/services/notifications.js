import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

// Типы уведомлений
export const NOTIFICATION_TYPES = {
  LIKE: "like",
  COMMENT: "comment",
  FOLLOW: "follow",
  MENTION: "mention",
};

// Создать уведомление
export async function createNotification({
  recipientId,
  senderId,
  senderUsername,
  senderAvatar,
  type,
  postId = null,
  commentId = null,
  message,
}) {
  // Не создаём уведомление, если пользователь лайкает/комментирует свой пост
  if (recipientId === senderId) return null;

  try {
    const docRef = await addDoc(collection(db, "notifications"), {
      recipientId,
      senderId,
      senderUsername,
      senderAvatar,
      type,
      postId,
      commentId,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, createdAt: new Date() };
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Подписаться на уведомления пользователя (real-time)
export function subscribeToNotifications(userId, callback) {
  const q = query(
    collection(db, "notifications"),
    where("recipientId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(notifications);
    },
    (error) => {
      console.error("Error subscribing to notifications:", error);
      callback([]);
    },
  );
}

// Отметить уведомление как прочитанное
export async function markNotificationAsRead(notificationId) {
  try {
    const ref = doc(db, "notifications", notificationId);
    await updateDoc(ref, { read: true });
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

// Отметить ВСЕ уведомления как прочитанные
export async function markAllNotificationsAsRead(userId) {
  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", userId),
      where("read", "==", false),
    );
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true }),
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

// Удалить уведомление
export async function deleteNotification(notificationId) {
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
}

// Получить количество непрочитанных
export function getUnreadCount(notifications) {
  return notifications.filter((n) => !n.read).length;
}
