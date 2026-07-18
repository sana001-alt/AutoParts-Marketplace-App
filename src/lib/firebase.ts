import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot
} from "firebase/firestore";
import { SparePart, User, Chat, Message, SellerReview } from "../types";
import { INITIAL_SPARE_PARTS, INITIAL_SELLER_REVIEWS } from "../data/mockData";
import firebaseAppletConfig from "../../firebase-applet-config.json";

const metaEnv = (import.meta as any).env || {};

const configFromFile = (firebaseAppletConfig || {}) as any;

// Look for Firebase config in environment variables first, then firebase-applet-config.json file
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || configFromFile.apiKey || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || configFromFile.authDomain || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || configFromFile.projectId || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || configFromFile.storageBucket || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || configFromFile.messagingSenderId || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || configFromFile.appId || ""
};

// Determine if configuration is valid and fully provided
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId
);

let app: any = null;
let auth: any = null;
let db: any = null;
let useFirebase = false;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    useFirebase = true;
    console.log("Firebase initialized successfully with configuration:", firebaseConfig.projectId);
  } catch (error) {
    console.error("Failed to initialize Firebase, falling back to LocalStorage:", error);
    useFirebase = false;
  }
} else {
  console.log("Firebase config not found or incomplete. Falling back to LocalStorage mode.");
}

// Ensure local storage has initial spare parts if empty
const LOCAL_STORAGE_PARTS_KEY = "autoparts_listings";
const LOCAL_STORAGE_USERS_KEY = "autoparts_users";
const LOCAL_STORAGE_CURRENT_USER_KEY = "autoparts_current_user";
const LOCAL_STORAGE_REVIEWS_KEY = "autoparts_seller_reviews";

if (!localStorage.getItem(LOCAL_STORAGE_PARTS_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(INITIAL_SPARE_PARTS));
}

if (!localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(INITIAL_SELLER_REVIEWS));
}

// ----------------------------------------------------
// DATABASE SERVICES (FIRESTORE / LOCALSTORAGE)
// ----------------------------------------------------

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Log the error but do not throw, allowing the caller functions to fall back to LocalStorage gracefully.
}

export async function uploadProductImage(base64Data: string, partId?: string): Promise<string> {
  try {
    const url = "https://api.cloudinary.com/v1_1/rqf1hlrx/image/upload";
    const formData = new FormData();
    formData.append("file", base64Data);
    formData.append("upload_preset", "autoparts_upload");

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloudinary upload failed: ${errText}`);
    }

    const data = await response.json();
    console.log("Image uploaded successfully to Cloudinary:", data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed, using fallback string:", error);
    return base64Data;
  }
}

export function isUsingFirebase(): boolean {
  return useFirebase;
}

export async function fetchSpareParts(): Promise<SparePart[]> {
  if (useFirebase && db) {
    const path = "products/listings/items";
    try {
      const partsRef = collection(db, "products", "listings", "items");
      const q = query(partsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const parts: SparePart[] = [];
      snapshot.forEach((docSnapshot) => {
        parts.push({ id: docSnapshot.id, ...docSnapshot.data() } as SparePart);
      });
      return parts;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        handleFirestoreError(err, OperationType.GET, path);
      }
      console.error("Firestore fetch error, falling back to LocalStorage", err);
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    const parts: SparePart[] = JSON.parse(localData);
    // sort by newest
    return parts.sort((a, b) => b.createdAt - a.createdAt);
  }
  return INITIAL_SPARE_PARTS;
}

export async function createSparePartListing(part: Omit<SparePart, "id" | "createdAt">): Promise<SparePart> {
  const tempId = "part-" + Math.random().toString(36).substr(2, 9);
  const newPart: SparePart = {
    ...part,
    id: useFirebase ? "" : "local-part-" + tempId,
    createdAt: Date.now()
  };

  if (useFirebase && db) {
    const path = "products/listings/items";
    try {
      let finalImageUrl = newPart.imageUrl;
      if (newPart.imageUrl && newPart.imageUrl.startsWith("data:image/")) {
        finalImageUrl = await uploadProductImage(newPart.imageUrl, tempId);
      }
      newPart.imageUrl = finalImageUrl;

      const partsRef = collection(db, "products", "listings", "items");
      const docRef = await addDoc(partsRef, newPart);
      newPart.id = docRef.id;
      return newPart;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      console.error("Firestore save error, saving to LocalStorage fallback:", err);
    }
  }

  // Fallback / standard LocalStorage save
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  const partsList: SparePart[] = localData ? JSON.parse(localData) : [];
  if (!newPart.id) {
    newPart.id = "local-part-" + tempId;
  }
  partsList.unshift(newPart);
  localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
  return newPart;
}

export async function deleteSparePartListing(partId: string): Promise<boolean> {
  if (useFirebase && db && !partId.startsWith("local-part-")) {
    const path = `products/listings/items/${partId}`;
    try {
      const docRef = doc(db, "products", "listings", "items", partId);
      await deleteDoc(docRef);
      return true;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      console.error("Firestore delete error, falling back to LocalStorage delete:", err);
    }
  }

  // LocalStorage delete fallback
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    let partsList: SparePart[] = JSON.parse(localData);
    partsList = partsList.filter(p => p.id !== partId);
    localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
    return true;
  }
  return false;
}

export async function updateSparePartListing(partId: string, updates: Partial<SparePart>): Promise<boolean> {
  if (useFirebase && db && !partId.startsWith("local-part-")) {
    const path = `products/listings/items/${partId}`;
    try {
      const docRef = doc(db, "products", "listings", "items", partId);
      await updateDoc(docRef, updates);
      return true;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      console.error("Firestore update error, falling back to LocalStorage:", err);
    }
  }

  // LocalStorage update fallback
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    let partsList: SparePart[] = JSON.parse(localData);
    partsList = partsList.map(p => p.id === partId ? { ...p, ...updates } : p);
    localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
    return true;
  }
  return false;
}

// ----------------------------------------------------
// AUTHENTICATION SERVICES (FIREBASE AUTH / LOCALSTORAGE)
// ----------------------------------------------------

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (useFirebase && auth) {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Resolve user display details
        const u: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          phone: firebaseUser.phoneNumber || undefined,
        };
        
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            u.name = data.name || u.name;
            u.phone = data.phone || u.phone;
            u.state = data.state || u.state;
            u.district = data.district || u.district;
          }
        } catch (e) {
          console.error("Failed to load user profile from Firestore:", e);
        }
        
        callback(u);
      } else {
        callback(null);
      }
    });
  }

  callback(null);
  return () => {};
}

export async function updateUserProfile(userId: string, profile: Partial<User>): Promise<void> {
  if (useFirebase && db) {
    try {
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        ...profile,
        id: userId,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to update user profile in Firestore:", e);
    }
  }
}

export function createRecaptchaVerifier(elementId: string): any {
  if (useFirebase && auth) {
    try {
      return new RecaptchaVerifier(auth, elementId, {
        size: "invisible",
        callback: () => {
          console.log("reCAPTCHA solved successfully");
        }
      });
    } catch (e) {
      console.error("Failed to create RecaptchaVerifier:", e);
      return null;
    }
  }
  return null;
}

export async function sendOtp(phoneNumber: string, appVerifier: any): Promise<any> {
  if (useFirebase && auth) {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  }
  throw new Error("Authentication service is not initialized.");
}

export async function verifyOtp(confirmationResult: any, otpCode: string): Promise<User> {
  if (!confirmationResult || typeof confirmationResult.confirm !== "function") {
    throw new Error("Verification session has expired or is invalid. Please request a new OTP code.");
  }
  const credential = await confirmationResult.confirm(otpCode);
  const firebaseUser = credential.user;

  const u: User = {
    id: firebaseUser.uid,
    phone: firebaseUser.phoneNumber || "",
    name: firebaseUser.displayName || "User " + (firebaseUser.phoneNumber || "").slice(-4),
    email: firebaseUser.email || "",
  };

  if (db) {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          id: firebaseUser.uid,
          name: u.name,
          phone: u.phone,
          email: u.email,
          createdAt: Date.now()
        });
      } else {
        const data = userDoc.data();
        u.name = data.name || u.name;
        u.email = data.email || u.email;
        u.phone = data.phone || u.phone;
        u.state = data.state || u.state;
        u.district = data.district || u.district;
      }
    } catch (e) {
      console.error("Failed to check or create user document in Firestore:", e);
    }
  }

  return u;
}

export async function signOut(): Promise<void> {
  if (auth) {
    await firebaseSignOut(auth);
  } else {
    throw new Error("Authentication service is not available.");
  }
}

export async function signUpWithEmail(email: string, password: string, name: string, phone?: string): Promise<User> {
  if (auth) {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const firebaseUser = credential.user;
    
    const u: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || email.trim(),
      name: name.trim() || email.split("@")[0],
      phone: phone?.trim() || undefined,
    };

    if (db) {
      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        await setDoc(userDocRef, {
          id: firebaseUser.uid,
          name: u.name,
          email: u.email,
          phone: u.phone,
          createdAt: Date.now()
        });
      } catch (e) {
        console.error("Failed to create user profile in Firestore:", e);
      }
    }
    return u;
  }
  throw new Error("Authentication service is not initialized.");
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (auth) {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const firebaseUser = credential.user;

    const u: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || email.trim(),
      name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
      phone: firebaseUser.phoneNumber || undefined,
    };

    if (db) {
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          u.name = data.name || u.name;
          u.phone = data.phone || u.phone;
          u.state = data.state || u.state;
          u.district = data.district || u.district;
        }
      } catch (e) {
        console.error("Failed to fetch user profile from Firestore on login:", e);
      }
    }
    return u;
  }
  throw new Error("Authentication service is not initialized.");
}

export async function resetPassword(email: string): Promise<void> {
  if (auth) {
    await sendPasswordResetEmail(auth, email.trim());
    return;
  }
  throw new Error("Authentication service is not initialized.");
}

// ----------------------------------------------------
// IN-APP CHAT SERVICES (FIRESTORE / LOCALSTORAGE FALLBACK)
// ----------------------------------------------------

const LOCAL_STORAGE_CHATS_KEY = "autoparts_chats_list";

export async function fetchUserChats(userId: string): Promise<Chat[]> {
  if (useFirebase && db) {
    try {
      const chatsRef = collection(db, "chats");
      
      // Query as buyer
      const qBuyer = query(chatsRef, where("buyerId", "==", userId));
      const buyerSnap = await getDocs(qBuyer);
      
      // Query as seller
      const qSeller = query(chatsRef, where("sellerId", "==", userId));
      const sellerSnap = await getDocs(qSeller);
      
      const chatsMap = new Map<string, Chat>();
      
      buyerSnap.forEach((d) => {
        chatsMap.set(d.id, { id: d.id, ...d.data() } as Chat);
      });
      
      sellerSnap.forEach((d) => {
        chatsMap.set(d.id, { id: d.id, ...d.data() } as Chat);
      });
      
      return Array.from(chatsMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    } catch (err) {
      console.error("Firestore chats fetch failed:", err);
    }
  }

  // LocalStorage Mock
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  if (localChatsRaw) {
    const chats: Chat[] = JSON.parse(localChatsRaw);
    return chats
      .filter((c) => c.buyerId === userId || c.sellerId === userId)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }
  return [];
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  if (useFirebase && db) {
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      const messages: Message[] = [];
      snapshot.forEach((d) => {
        messages.push({ id: d.id, ...d.data() } as Message);
      });
      return messages;
    } catch (err) {
      console.error("Firestore message fetch failed:", err);
    }
  }

  // LocalStorage Mock
  const localMsgKey = `autoparts_chat_messages_${chatId}`;
  const localMsgRaw = localStorage.getItem(localMsgKey);
  return localMsgRaw ? JSON.parse(localMsgRaw) : [];
}

export function subscribeToChatMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
  if (useFirebase && db) {
    const msgRef = collection(db, "chats", chatId, "messages");
    const q = query(msgRef, orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((d) => {
        messages.push({ id: d.id, ...d.data() } as Message);
      });
      callback(messages);
    }, (err) => {
      console.error("Firestore messages subscription error:", err);
    });
  }

  // LocalStorage Mock with Custom Event and polling fallback
  const getLocalMessages = () => {
    const localMsgKey = `autoparts_chat_messages_${chatId}`;
    const localMsgRaw = localStorage.getItem(localMsgKey);
    callback(localMsgRaw ? JSON.parse(localMsgRaw) : []);
  };

  // Run once immediately
  getLocalMessages();

  // Listen to custom updates inside the app simulator
  const handleUpdate = () => {
    getLocalMessages();
  };

  window.addEventListener("autoparts_chat_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);
  
  return () => {
    window.removeEventListener("autoparts_chat_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function sendChatMessage(
  chatId: string, 
  senderId: string, 
  text: string, 
  chatMeta?: Omit<Chat, "id" | "lastMessageText" | "lastMessageAt">
): Promise<Message> {
  const timestamp = Date.now();
  const newMessageId = "msg-" + Math.random().toString(36).substr(2, 9);
  
  const newMessage: Omit<Message, "id"> = {
    senderId,
    text,
    createdAt: timestamp
  };

  if (useFirebase && db) {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      // If chat document does not exist, initialize it with metadata
      if (!chatDoc.exists()) {
        if (!chatMeta) {
          throw new Error("Chat metadata is required to initialize a new conversation document");
        }
        await setDoc(chatDocRef, {
          ...chatMeta,
          lastMessageText: text,
          lastMessageAt: timestamp
        });
      } else {
        await updateDoc(chatDocRef, {
          lastMessageText: text,
          lastMessageAt: timestamp
        });
      }
      
      // Add message
      const msgCollectionRef = collection(db, "chats", chatId, "messages");
      const addedDoc = await addDoc(msgCollectionRef, newMessage);
      
      return { id: addedDoc.id, ...newMessage };
    } catch (err) {
      console.error("Firestore message send error, falling back to LocalStorage:", err);
    }
  }

  // LocalStorage Mock
  // 1. Update/Create Chat Room
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  const chatsList: Chat[] = localChatsRaw ? JSON.parse(localChatsRaw) : [];
  let existingChat = chatsList.find((c) => c.id === chatId);
  
  if (!existingChat) {
    if (!chatMeta) {
      throw new Error("Chat metadata is required to initialize a new conversation");
    }
    existingChat = {
      ...chatMeta,
      id: chatId,
      lastMessageText: text,
      lastMessageAt: timestamp
    };
    chatsList.push(existingChat);
  } else {
    existingChat.lastMessageText = text;
    existingChat.lastMessageAt = timestamp;
  }
  localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(chatsList));

  // 2. Append Message
  const localMsgKey = `autoparts_chat_messages_${chatId}`;
  const localMsgRaw = localStorage.getItem(localMsgKey);
  const messages: Message[] = localMsgRaw ? JSON.parse(localMsgRaw) : [];
  
  const fullMessage: Message = { id: newMessageId, ...newMessage };
  messages.push(fullMessage);
  localStorage.setItem(localMsgKey, JSON.stringify(messages));

  // Dispatch custom events to refresh any active chat drawers in real-time
  window.dispatchEvent(new CustomEvent("autoparts_chat_updated", { detail: { chatId } }));
  window.dispatchEvent(new Event("storage"));
  
  return fullMessage;
}

export async function getOrCreateChat(part: SparePart, buyer: User): Promise<Chat> {
  const chatId = `${buyer.id}_${part.sellerId}_${part.id}`;
  
  if (useFirebase && db) {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      if (chatDoc.exists()) {
        return { id: chatDoc.id, ...chatDoc.data() } as Chat;
      }
    } catch (err) {
      console.error("Firestore getOrCreateChat check failed:", err);
    }
  }

  // LocalStorage Mock check
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  const chatsList: Chat[] = localChatsRaw ? JSON.parse(localChatsRaw) : [];
  const foundChat = chatsList.find((c) => c.id === chatId);
  
  if (foundChat) {
    return foundChat;
  }

  // Return non-existing metadata with computed ID. Sending a message will automatically persist it.
  return {
    id: chatId,
    partId: part.id,
    partTitle: part.title,
    partImageUrl: part.imageUrl,
    partPrice: part.price,
    buyerId: buyer.id,
    buyerName: buyer.name,
    sellerId: part.sellerId,
    sellerName: part.contactName,
    lastMessageText: "",
    lastMessageAt: Date.now()
  };
}

// ----------------------------------------------------
// SELLER RATING & REVIEWS SERVICES
// ----------------------------------------------------

export async function fetchSellerReviews(sellerId: string): Promise<SellerReview[]> {
  if (useFirebase && db) {
    try {
      const reviewsRef = collection(db, "seller_reviews");
      const q = query(reviewsRef, where("sellerId", "==", sellerId));
      const snapshot = await getDocs(q);
      const reviews: SellerReview[] = [];
      snapshot.forEach((docSnapshot) => {
        reviews.push({ id: docSnapshot.id, ...docSnapshot.data() } as SellerReview);
      });
      return reviews.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error("Firestore reviews fetch error, falling back to LocalStorage", err);
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
  if (localData) {
    const reviews: SellerReview[] = JSON.parse(localData);
    return reviews
      .filter((r) => r.sellerId === sellerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  return [];
}

export async function createSellerReview(review: Omit<SellerReview, "id" | "createdAt">): Promise<SellerReview> {
  const newReview: SellerReview = {
    ...review,
    id: useFirebase ? "" : "local-rev-" + Math.random().toString(36).substr(2, 9),
    createdAt: Date.now()
  };

  if (useFirebase && db) {
    try {
      const reviewsRef = collection(db, "seller_reviews");
      const docRef = await addDoc(reviewsRef, newReview);
      newReview.id = docRef.id;
      return newReview;
    } catch (err) {
      console.error("Firestore review save error, saving to LocalStorage fallback:", err);
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
  const reviewsList: SellerReview[] = localData ? JSON.parse(localData) : [];
  if (!newReview.id) {
    newReview.id = "local-rev-" + Math.random().toString(36).substr(2, 9);
  }
  reviewsList.unshift(newReview);
  localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviewsList));
  
  // Dispatch custom events to refresh real-time reviews
  window.dispatchEvent(new Event("autoparts_reviews_updated"));
  window.dispatchEvent(new Event("storage"));
  
  return newReview;
}

