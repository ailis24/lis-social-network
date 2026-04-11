import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  deleteDoc, // ✅ ДОБАВЛЕНО
} from "firebase/firestore";

// Создать новый челлендж
export async function createChallenge({
  title,
  description,
  creatorId,
  creatorUsername,
  duration = 7,
  category,
}) {
  try {
    const challengeRef = await addDoc(collection(db, "challenges"), {
      title,
      description,
      creator: {
        userId: creatorId,
        username: creatorUsername,
      },
      participants: [creatorId],
      duration, // дней
      category, // например: "sugar", "smoking", "social_media"
      startDate: serverTimestamp(),
      endDate: null,
      isActive: true,
      completions: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: challengeRef.id, success: true };
  } catch (error) {
    console.error("Error creating challenge:", error);
    return { success: false, error: error.message };
  }
}

// Присоединиться к челленджу
export async function joinChallenge(challengeId, userId) {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    await updateDoc(challengeRef, {
      participants: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error joining challenge:", error);
    return { success: false, error: error.message };
  }
}

// Отметить день как выполненный
export async function markDayComplete(challengeId, userId, dayNumber) {
  try {
    const challengeRef = doc(db, "challenges", challengeId);
    const challengeSnap = await getDoc(challengeRef);
    const challengeData = challengeSnap.data();

    // Создаём или обновляем прогресс пользователя
    const progressRef = doc(db, "challenges", challengeId, "progress", userId);
    await updateDoc(progressRef, {
      completedDays: arrayUnion(dayNumber),
      lastUpdate: serverTimestamp(),
    }).catch(async () => {
      // Если документ не существует, создаём его
      await addDoc(collection(db, "challenges", challengeId, "progress"), {
        userId,
        completedDays: [dayNumber],
        createdAt: serverTimestamp(),
        lastUpdate: serverTimestamp(),
      });
    });

    // Если все дни пройдены
    if (dayNumber >= challengeData.duration) {
      await updateDoc(challengeRef, {
        completions: increment(1),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking day complete:", error);
    return { success: false, error: error.message };
  }
}

// Получить все активные челленджи
export function getActiveChallenges(callback) {
  const q = query(
    collection(db, "challenges"),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const challenges = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(challenges);
    },
    (error) => {
      console.error("Error getting challenges:", error);
      callback([]);
    },
  );
}

// Получить прогресс пользователя в челлендже
export async function getUserProgress(challengeId, userId) {
  try {
    const q = query(
      collection(db, "challenges", challengeId, "progress"),
      where("userId", "==", userId),
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user progress:", error);
    return null;
  }
}

// Подписаться на прогресс пользователя
export function subscribeToUserProgress(challengeId, userId, callback) {
  const q = query(
    collection(db, "challenges", challengeId, "progress"),
    where("userId", "==", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        callback(snapshot.docs[0].data());
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to progress:", error);
      callback(null);
    },
  );
}

// Удалить челлендж (только создатель)
export async function deleteChallenge(challengeId, userId, creatorId) {
  if (userId !== creatorId) {
    return { success: false, error: "Только создатель может удалить челлендж" };
  }

  try {
    await deleteDoc(doc(db, "challenges", challengeId)); // ✅ Теперь работает!
    return { success: true };
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return { success: false, error: error.message };
  }
}
