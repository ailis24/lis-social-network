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
  limit,
  deleteDoc,
} from "firebase/firestore";

// ✅ Конвертировать файл в base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// ✅ Создать уведомление в ленте об эстафете
export async function createChainNotification({
  chainId,
  chainTheme,
  userId,
  username,
  avatar,
  action,
  participantCount,
  maxParticipants,
}) {
  try {
    // Рассчитываем время завершения (24 часа от создания)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await addDoc(collection(db, "posts"), {
      type: "chain_notification",
      chainId,
      chainTheme,
      userId,
      username,
      avatar,
      action,
      participantCount: participantCount || 1,
      maxParticipants: maxParticipants || 10,
      content:
        action === "started"
          ? `🦊 ${username} начал фото-эстафету: "${chainTheme}"`
          : `📸 ${username} продолжил эстафету: "${chainTheme}"`,
      expiresAt, // время завершения
      likes: [],
      comments: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating chain notification:", error);
    return { success: false, error: error.message };
  }
}

// Создать новую эстафету
export async function createPhotoChain({
  theme,
  starterId,
  starterUsername,
  starterAvatar,
  firstPhoto,
}) {
  try {
    const maxSize = 1 * 1024 * 1024;
    const base64Length = firstPhoto.length;
    const estimatedSize = (base64Length * 3) / 4;

    if (estimatedSize > maxSize) {
      return {
        success: false,
        error: "Фото слишком большое! Максимум 1MB.",
      };
    }

    const now = new Date();

    const chainRef = await addDoc(collection(db, "photoChains"), {
      theme,
      starter: {
        userId: starterId,
        username: starterUsername,
        avatar: starterAvatar,
      },
      participants: [starterId],
      photos: [
        {
          userId: starterId,
          username: starterUsername,
          avatar: starterAvatar,
          photoUrl: firstPhoto,
          timestamp: now,
          taggedNext: null,
        },
      ],
      maxParticipants: 10,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // ✅ Создаём уведомление в ленте
    await createChainNotification({
      chainId: chainRef.id,
      chainTheme: theme,
      userId: starterId,
      username: starterUsername,
      avatar: starterAvatar,
      action: "started",
      participantCount: 1,
      maxParticipants: 10,
    });

    return { id: chainRef.id, success: true };
  } catch (error) {
    console.error("Error creating photo chain:", error);
    return { success: false, error: error.message };
  }
}

// Получить все активные эстафеты
export function getActivePhotoChains(callback) {
  const q = query(
    collection(db, "photoChains"),
    where("isActive", "==", true),
    orderBy("updatedAt", "desc"),
    limit(50),
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
      console.error("Error getting photo chains:", error);
      callback([]);
    },
  );
}

// Получить эстафету по ID
export async function getPhotoChain(chainId) {
  try {
    const chainRef = doc(db, "photoChains", chainId);
    const chainSnap = await getDoc(chainRef);
    if (chainSnap.exists()) {
      return { id: chainSnap.id, ...chainSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting photo chain:", error);
    return null;
  }
}

// Добавить фото в эстафету
export async function addPhotoToChain(
  chainId,
  userId,
  username,
  avatar,
  photoBase64,
  taggedNextUserId = null,
) {
  try {
    const maxSize = 1 * 1024 * 1024;
    const base64Length = photoBase64.length;
    const estimatedSize = (base64Length * 3) / 4;

    if (estimatedSize > maxSize) {
      return {
        success: false,
        error: "Фото слишком большое! Максимум 1MB.",
      };
    }

    const chainRef = doc(db, "photoChains", chainId);
    const now = new Date();

    // Получаем текущие данные эстафеты
    const chainSnap = await getDoc(chainRef);
    const chainData = chainSnap.data();

    const newParticipantCount = (chainData.photos?.length || 0) + 1;

    await updateDoc(chainRef, {
      participants: arrayUnion(userId),
      photos: arrayUnion({
        userId,
        username,
        avatar,
        photoUrl: photoBase64,
        timestamp: now,
        taggedNext: taggedNextUserId,
      }),
      updatedAt: serverTimestamp(),
    });

    // ✅ Создаём уведомление о продолжении эстафеты
    await createChainNotification({
      chainId,
      chainTheme: chainData.theme,
      userId,
      username,
      avatar,
      action: "continued",
      participantCount: newParticipantCount,
      maxParticipants: chainData.maxParticipants || 10,
    });

    const updatedChainSnap = await getDoc(chainRef);
    const updatedChainData = updatedChainSnap.data();

    if (
      updatedChainData.photos &&
      updatedChainData.photos.length >= updatedChainData.maxParticipants
    ) {
      await updateDoc(chainRef, {
        isActive: false,
        completedAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding photo to chain:", error);
    return { success: false, error: error.message };
  }
}

// Передать эстафету другому пользователю
export async function passChain(chainId, fromUserId, toUserId) {
  try {
    const chainRef = doc(db, "photoChains", chainId);
    await updateDoc(chainRef, {
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error passing chain:", error);
    return { success: false, error: error.message };
  }
}

// Удалить эстафету (только создатель)
export async function deletePhotoChain(chainId, userId, starterId) {
  if (userId !== starterId) {
    return { success: false, error: "Только создатель может удалить эстафету" };
  }

  try {
    await deleteDoc(doc(db, "photoChains", chainId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting photo chain:", error);
    return { success: false, error: error.message };
  }
}

// Получить эстафеты, где пользователь должен ответить
export function getChainsForUser(userId, callback) {
  const q = query(collection(db, "photoChains"), where("isActive", "==", true));

  return onSnapshot(
    q,
    (snapshot) => {
      const chains = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((chain) => {
          const lastPhoto = chain.photos?.[chain.photos.length - 1];
          return lastPhoto?.taggedNext === userId;
        });
      callback(chains);
    },
    (error) => {
      console.error("Error getting chains for user:", error);
      callback([]);
    },
  );
}
