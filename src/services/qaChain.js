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
  deleteDoc,
} from "firebase/firestore";

// Создать новую цепочку вопросов
export async function createQaChain({
  question,
  creatorId,
  creatorUsername,
  category,
}) {
  try {
    const chainRef = await addDoc(collection(db, "qaChains"), {
      question,
      creator: {
        userId: creatorId,
        username: creatorUsername,
      },
      answers: [],
      category,
      isActive: true,
      views: 0,
      likes: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: chainRef.id, success: true };
  } catch (error) {
    console.error("Error creating QA chain:", error);
    return { success: false, error: error.message };
  }
}

// Добавить ответ
export async function addAnswer(chainId, userId, username, answer) {
  try {
    const chainRef = doc(db, "qaChains", chainId);
    const now = new Date(); // ✅ ИСПРАВЛЕНО

    await updateDoc(chainRef, {
      answers: arrayUnion({
        userId,
        username,
        answer,
        timestamp: now, // ✅ ИСПРАВЛЕНО: обычный Date
        likes: 0,
        likedBy: [],
        becomesQuestion: false,
      }),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error adding answer:", error);
    return { success: false, error: error.message };
  }
}

// Сделать ответ новым вопросом
export async function promoteToQuestion(chainId, answerIndex, newQuestion) {
  try {
    const chainRef = doc(db, "qaChains", chainId);
    const chainSnap = await getDoc(chainRef);
    const chainData = chainSnap.data();

    // Обновляем текущий ответ
    const updatedAnswers = [...chainData.answers];
    updatedAnswers[answerIndex] = {
      ...updatedAnswers[answerIndex],
      becomesQuestion: true,
    };

    await updateDoc(chainRef, {
      answers: updatedAnswers,
      updatedAt: serverTimestamp(),
    });

    // Создаём новую цепочку с этим вопросом
    if (newQuestion) {
      await addDoc(collection(db, "qaChains"), {
        question: newQuestion,
        creator: {
          userId: updatedAnswers[answerIndex].userId,
          username: updatedAnswers[answerIndex].username,
        },
        answers: [],
        category: chainData.category,
        isActive: true,
        views: 0,
        likes: 0,
        likedBy: [],
        parentChain: chainId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error promoting to question:", error);
    return { success: false, error: error.message };
  }
}

// Лайкнуть цепочку
export async function likeQaChain(chainId, userId) {
  try {
    const chainRef = doc(db, "qaChains", chainId);
    const chainSnap = await getDoc(chainRef);
    const chainData = chainSnap.data();

    const isLiked = chainData.likedBy?.includes(userId);

    if (isLiked) {
      await updateDoc(chainRef, {
        likes: increment(-1),
        likedBy: chainData.likedBy.filter((id) => id !== userId),
      });
    } else {
      await updateDoc(chainRef, {
        likes: increment(1),
        likedBy: arrayUnion(userId),
      });
    }

    return { success: true, isLiked: !isLiked };
  } catch (error) {
    console.error("Error liking chain:", error);
    return { success: false, error: error.message };
  }
}

// Лайкнуть ответ
export async function likeAnswer(chainId, answerIndex, userId) {
  try {
    const chainRef = doc(db, "qaChains", chainId);
    const chainSnap = await getDoc(chainRef);
    const chainData = chainSnap.data();

    const updatedAnswers = [...chainData.answers];
    const answer = updatedAnswers[answerIndex];

    const isLiked = answer.likedBy?.includes(userId);

    if (isLiked) {
      updatedAnswers[answerIndex] = {
        ...answer,
        likes: (answer.likes || 0) - 1,
        likedBy: answer.likedBy.filter((id) => id !== userId),
      };
    } else {
      updatedAnswers[answerIndex] = {
        ...answer,
        likes: (answer.likes || 0) + 1,
        likedBy: arrayUnion(userId),
      };
    }

    await updateDoc(chainRef, {
      answers: updatedAnswers,
      updatedAt: serverTimestamp(),
    });

    return { success: true, isLiked: !isLiked };
  } catch (error) {
    console.error("Error liking answer:", error);
    return { success: false, error: error.message };
  }
}

// Получить все активные цепочки
export function getActiveQaChains(callback) {
  const q = query(
    collection(db, "qaChains"),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const chains = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(chains);
    },
    (error) => {
      console.error("Error getting QA chains:", error);
      callback([]);
    },
  );
}

// Удалить цепочку (только создатель)
export async function deleteQaChain(chainId, userId, creatorId) {
  if (userId !== creatorId) {
    return { success: false, error: "Только создатель может удалить цепочку" };
  }

  try {
    await deleteDoc(doc(db, "qaChains", chainId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting QA chain:", error);
    return { success: false, error: error.message };
  }
}
