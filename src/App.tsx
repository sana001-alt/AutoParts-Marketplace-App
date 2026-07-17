import React, { useState, useEffect } from "react";
import { 
  Home as HomeIcon, 
  PlusCircle, 
  User as UserIcon,
  Compass,
  Sparkles,
  Info,
  Calendar,
  X,
  Phone,
  MessageSquare,
  Car,
  MapPin,
  Maximize2,
  Star,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import PhoneSimulator from "./components/PhoneSimulator";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import SellScreen from "./components/SellScreen";
import ProfileScreen from "./components/ProfileScreen";
import ChatsScreen from "./components/ChatsScreen";
import ChatRoomWindow from "./components/ChatRoomWindow";
import ImageGalleryModal from "./components/ImageGalleryModal";
import InAppNotification from "./components/InAppNotification";
import SellerReviewsView from "./components/SellerReviewsView";
import GMap from "./components/GMap";
import { User, SparePart, Chat, Message } from "./types";
import { fetchSpareParts, subscribeToAuth, getOrCreateChat, fetchUserChats, fetchSellerReviews, updateSparePartListing } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "./lib/LanguageContext";
import { translateDynamic } from "./lib/translations";

// Fallback categories helper for cover swiping gallery consistency
const getFallbackImages = (category: string): string[] => {
  switch (category) {
    case "Engine & Mechanical":
      return [
        "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&q=80&w=600"
      ];
    case "Body & Exterior":
      return [
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=600"
      ];
    case "Lights & Electricals":
      return [
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=600"
      ];
    case "Suspension & Brakes":
      return [
        "https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600"
      ];
    case "Interior & Wheels":
      return [
        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600"
      ];
    case "Wiring & Harnesses":
      return [
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600"
      ];
    default:
      return [
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600"
      ];
  }
};

export default function App() {
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "sell" | "chats" | "profile">("home");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  
  // Spare parts database state
  const [parts, setParts] = useState<SparePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  
  // User's favorites list (store in localStorage for persistent client tracking)
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Detail overlay for spare parts clicked from outside the home feed
  const [detailedPart, setDetailedPart] = useState<SparePart | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  // Local notification & unread management state
  const [activeNotification, setActiveNotification] = useState<{ chat: Chat; text: string; id: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Master Detailed Seller Rating states
  const [detailedSellerRating, setDetailedSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showDetailedReviews, setShowDetailedReviews] = useState(false);

  useEffect(() => {
    const updateRating = () => {
      const sId = detailedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setDetailedSellerRating({ average, count });
        });
      } else {
        setDetailedSellerRating(null);
      }
    };

    updateRating();
    setDetailImageIndex(0);
    window.addEventListener("autoparts_reviews_updated", updateRating);
    window.addEventListener("storage", updateRating);
    return () => {
      window.removeEventListener("autoparts_reviews_updated", updateRating);
      window.removeEventListener("storage", updateRating);
    };
  }, [detailedPart]);

  // 1. Subscribe to Authentication Changes
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    // Load favorites from local storage
    const savedFavorites = localStorage.getItem("autoparts_favorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    return () => unsubscribe();
  }, []);

  // 1b. Listen to new messages for notifications and tab badges
  const checkNewMessages = async () => {
    if (!currentUser) return;
    try {
      const chatsList = await fetchUserChats(currentUser.id);
      const nextUnreadCounts: Record<string, number> = {};
      
      for (const chat of chatsList) {
        const localMsgKey = `autoparts_chat_messages_${chat.id}`;
        const localMsgRaw = localStorage.getItem(localMsgKey);
        const messages: Message[] = localMsgRaw ? JSON.parse(localMsgRaw) : [];
        
        if (messages.length > 0) {
          const latestMsg = messages[messages.length - 1];
          
          // Only interested in messages sent by other participants
          if (latestMsg.senderId !== currentUser.id) {
            const isCurrentlyViewing = activeChat && activeChat.id === chat.id;
            const lastReadId = localStorage.getItem(`autoparts_chat_last_read_${chat.id}`);
            
            if (isCurrentlyViewing) {
              // Mark as read immediately
              localStorage.setItem(`autoparts_chat_last_read_${chat.id}`, latestMsg.id);
              nextUnreadCounts[chat.id] = 0;
            } else {
              // If not read, count as unread!
              if (lastReadId !== latestMsg.id) {
                nextUnreadCounts[chat.id] = 1;
                
                // Show floating banner if message is very fresh (within 15s) and not yet notified
                const alreadyNotified = sessionStorage.getItem(`autoparts_notified_${latestMsg.id}`);
                const isFresh = (Date.now() - latestMsg.createdAt < 15000);
                if (!alreadyNotified && isFresh) {
                  sessionStorage.setItem(`autoparts_notified_${latestMsg.id}`, "true");
                  setActiveNotification({
                    chat,
                    text: latestMsg.text,
                    id: latestMsg.id
                  });
                }
              } else {
                nextUnreadCounts[chat.id] = 0;
              }
            }
          } else {
            nextUnreadCounts[chat.id] = 0;
          }
        } else {
          nextUnreadCounts[chat.id] = 0;
        }
      }
      setUnreadCounts(nextUnreadCounts);
    } catch (err) {
      console.error("Error monitoring messages", err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setUnreadCounts({});
      setActiveNotification(null);
      return;
    }

    // Run check initially
    checkNewMessages();

    // Listen to chat updates and storage changes
    const handleChatUpdated = () => {
      checkNewMessages();
    };

    window.addEventListener("autoparts_chat_updated", handleChatUpdated);
    window.addEventListener("storage", handleChatUpdated);

    // Also poll every 4 seconds as a fallback for real-time background sync
    const interval = setInterval(checkNewMessages, 4000);

    return () => {
      window.removeEventListener("autoparts_chat_updated", handleChatUpdated);
      window.removeEventListener("storage", handleChatUpdated);
      clearInterval(interval);
    };
  }, [currentUser, activeChat]);

  // Synchronize unread counts when activeChat changes
  useEffect(() => {
    if (activeChat) {
      // Clear unread count for active chat
      const localMsgKey = `autoparts_chat_messages_${activeChat.id}`;
      const localMsgRaw = localStorage.getItem(localMsgKey);
      const messages: Message[] = localMsgRaw ? JSON.parse(localMsgRaw) : [];
      if (messages.length > 0) {
        const latestMsg = messages[messages.length - 1];
        localStorage.setItem(`autoparts_chat_last_read_${activeChat.id}`, latestMsg.id);
      }
      setUnreadCounts((prev) => ({ ...prev, [activeChat.id]: 0 }));
      
      // If the current active notification is for this chat, dismiss it
      if (activeNotification && activeNotification.chat.id === activeChat.id) {
        setActiveNotification(null);
      }
    }
  }, [activeChat]);

  // 2. Fetch Spare Parts from Firestore / LocalStorage
  const loadPartsData = async () => {
    setPartsLoading(true);
    try {
      const data = await fetchSpareParts();
      setParts(data);
    } catch (err) {
      console.error("Failed to load spare parts", err);
    } finally {
      setPartsLoading(false);
    }
  };

  useEffect(() => {
    loadPartsData();
  }, []);

  // 3. Handle Favorite Toggle
  const handleFavoriteToggle = (partId: string) => {
    let updatedFavorites: string[];
    if (favorites.includes(partId)) {
      updatedFavorites = favorites.filter((id) => id !== partId);
    } else {
      updatedFavorites = [...favorites, partId];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem("autoparts_favorites", JSON.stringify(updatedFavorites));
  };

  // 4. Handle Listing Created
  const handlePublishSuccess = (newPart: SparePart) => {
    // Append to active listings and navigate back to Home feed
    setParts((prevParts) => [newPart, ...prevParts]);
    setActiveTab("home");
  };

  // 5. Handle Listing Deleted
  const handlePartDeleted = (deletedPartId: string) => {
    setParts((prevParts) => prevParts.filter((p) => p.id !== deletedPartId));
    // Clear from favorites as well if deleted
    if (favorites.includes(deletedPartId)) {
      const updated = favorites.filter((id) => id !== deletedPartId);
      setFavorites(updated);
      localStorage.setItem("autoparts_favorites", JSON.stringify(updated));
    }
    // Close detailed overlay if it was open and got deleted
    if (detailedPart && detailedPart.id === deletedPartId) {
      setDetailedPart(null);
    }
  };

  // 5b. Handle Profile Update
  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("autoparts_current_user", JSON.stringify(updatedUser));
    const usersRaw = localStorage.getItem("autoparts_users");
    if (usersRaw) {
      const usersList: any[] = JSON.parse(usersRaw);
      const updatedUsers = usersList.map((u) => 
        u.id === updatedUser.id 
          ? { 
              ...u, 
              name: updatedUser.name, 
              phone: updatedUser.phone, 
              state: updatedUser.state, 
              district: updatedUser.district,
              lat: updatedUser.lat,
              lng: updatedUser.lng 
            } 
          : u
      );
      localStorage.setItem("autoparts_users", JSON.stringify(updatedUsers));
    }
  };

  // 5c. Handle Toggle Sold Status
  const handleToggleSold = async (partId: string) => {
    const partToToggle = parts.find(p => p.id === partId);
    if (!partToToggle) return;
    const nextSoldState = !partToToggle.sold;

    await updateSparePartListing(partId, { sold: nextSoldState });

    setParts((prevParts) => 
      prevParts.map((p) => p.id === partId ? { ...p, sold: nextSoldState } : p)
    );
    const localData = localStorage.getItem("autoparts_listings");
    if (localData) {
      const list: SparePart[] = JSON.parse(localData);
      const updated = list.map((p) => p.id === partId ? { ...p, sold: nextSoldState } : p);
      localStorage.setItem("autoparts_listings", JSON.stringify(updated));
    }
    // Also update detailedPart if open
    if (detailedPart && detailedPart.id === partId) {
      setDetailedPart((prev) => prev ? { ...prev, sold: nextSoldState } : null);
    }
  };

  // 5d. Handle Update Price Status
  const handleUpdatePrice = async (partId: string, newPrice: number) => {
    await updateSparePartListing(partId, { price: newPrice });
    
    setParts((prevParts) => 
      prevParts.map((p) => p.id === partId ? { ...p, price: newPrice } : p)
    );
    const localData = localStorage.getItem("autoparts_listings");
    if (localData) {
      const list: SparePart[] = JSON.parse(localData);
      const updated = list.map((p) => p.id === partId ? { ...p, price: newPrice } : p);
      localStorage.setItem("autoparts_listings", JSON.stringify(updated));
    }
    // Also update detailedPart if open
    if (detailedPart && detailedPart.id === partId) {
      setDetailedPart((prev) => prev ? { ...prev, price: newPrice } : null);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    // Refresh listing views to pull updated data
    loadPartsData();
  };

  const handleStartChat = async (part: SparePart) => {
    if (!currentUser) return;
    const chat = await getOrCreateChat(part, currentUser);
    setActiveChat(chat);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Brand New":
        return "bg-emerald-500 text-white border-emerald-600";
      case "Like New":
        return "bg-cyan-500 text-white border-cyan-600";
      case "Used (Good)":
        return "bg-amber-500 text-white border-amber-600";
      case "For Scrap/Spares":
        return "bg-rose-500 text-white border-rose-600";
      default:
        return "bg-slate-500 text-white border-slate-600";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <PhoneSimulator>
      {authLoading ? (
        // Loading Splash screen
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white animate-fade-in">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-xs font-semibold tracking-wider text-slate-400 font-mono animate-pulse">
            LOADING EXPO DEV BUILD...
          </span>
        </div>
      ) : !currentUser ? (
        // Login screen
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      ) : (
        // Main App Screen Wrapper
        <div className="flex-1 flex flex-col bg-slate-50 relative h-full select-none" id="expo-app-shell">
          
          {/* Floating In-App Notifications Banner */}
          <InAppNotification
            notification={activeNotification}
            onClose={() => setActiveNotification(null)}
            onClick={(chat) => {
              setActiveChat(chat);
              setActiveTab("chats");
              setActiveNotification(null);
            }}
          />

          {/* Main Container view switching based on active tab */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                <motion.div
                  key="home-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <HomeScreen 
                    parts={parts} 
                    favorites={favorites}
                    onFavoriteToggle={handleFavoriteToggle} 
                    onStartChat={handleStartChat}
                    currentUser={currentUser}
                  />
                </motion.div>
              )}

              {activeTab === "sell" && (
                <motion.div
                  key="sell-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <SellScreen 
                    currentUser={currentUser} 
                    onPublishSuccess={handlePublishSuccess} 
                  />
                </motion.div>
              )}

              {activeTab === "chats" && (
                <motion.div
                  key="chats-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <ChatsScreen
                    currentUser={currentUser}
                    onSelectChat={(chat) => setActiveChat(chat)}
                  />
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <ProfileScreen
                    currentUser={currentUser}
                    onLogout={() => setCurrentUser(null)}
                    parts={parts}
                    favorites={favorites}
                    onPartDeleted={handlePartDeleted}
                    onFavoriteToggle={handleFavoriteToggle}
                    onViewPart={(part) => setDetailedPart(part)}
                    onUpdateUser={handleUpdateUser}
                    onToggleSold={handleToggleSold}
                    onUpdatePrice={handleUpdatePrice}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Tab Bar (Fully Mocked Mobile Design) */}
          <nav className="h-16 bg-white border-t border-slate-100 flex items-center justify-around px-4 pb-1 sticky bottom-0 z-20 shadow-lg">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all cursor-pointer ${
                activeTab === "home" ? "text-slate-900" : "text-slate-400 hover:text-slate-500"
              }`}
              id="nav-tab-home"
            >
              <HomeIcon size={20} className={activeTab === "home" ? "scale-105" : ""} />
              <span className="text-[10px] font-bold tracking-tight">Home</span>
            </button>

            <button
              onClick={() => setActiveTab("sell")}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all cursor-pointer ${
                activeTab === "sell" ? "text-slate-900" : "text-slate-400 hover:text-slate-500"
              }`}
              id="nav-tab-sell"
            >
              <PlusCircle size={20} className={activeTab === "sell" ? "scale-105" : ""} />
              <span className="text-[10px] font-bold tracking-tight">Sell</span>
            </button>

            <button
              onClick={() => setActiveTab("chats")}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all cursor-pointer ${
                activeTab === "chats" ? "text-slate-900" : "text-slate-400 hover:text-slate-500"
              }`}
              id="nav-tab-chats"
            >
              <div className="relative">
                <MessageSquare size={20} className={activeTab === "chats" ? "scale-105" : ""} />
                {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-[8px] text-white font-black h-4 w-4 rounded-full flex items-center justify-center border border-white animate-pulse">
                    {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0)}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight">Chats</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center gap-1 py-1.5 transition-all cursor-pointer ${
                activeTab === "profile" ? "text-slate-900" : "text-slate-400 hover:text-slate-500"
              }`}
              id="nav-tab-profile"
            >
              <UserIcon size={20} className={activeTab === "profile" ? "scale-105" : ""} />
              <span className="text-[10px] font-bold tracking-tight">My Ads</span>
            </button>
          </nav>

          {/* Master Detail Overlay (For clicks outside the home tab e.g. from profile or favorites) */}
          <AnimatePresence>
            {detailedPart && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDetailedPart(null)}
                className="absolute inset-0 bg-black/60 z-30 flex items-end"
                id="master-detail-backdrop"
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-t-[32px] w-full max-h-[80%] overflow-y-auto flex flex-col shadow-2xl relative text-slate-900"
                  id="master-detail-modal"
                >
                  <button
                    onClick={() => setDetailedPart(null)}
                    className="absolute top-4 right-4 bg-white text-slate-900 p-2.5 rounded-full hover:bg-slate-100 shadow-xl border border-slate-200/80 hover:scale-105 active:scale-95 z-20 transition-all flex items-center justify-center cursor-pointer"
                    id="close-master-detail-btn"
                  >
                    <X size={18} strokeWidth={3} />
                  </button>

                  {/* Cover Image Carousel */}
                  {(() => {
                    const imageList: string[] = [];
                    if (detailedPart.imageUrl) {
                      imageList.push(detailedPart.imageUrl);
                    }
                    if (detailedPart.imageUrls && detailedPart.imageUrls.length > 0) {
                      detailedPart.imageUrls.forEach(url => {
                        if (!imageList.includes(url)) {
                          imageList.push(url);
                        }
                      });
                    }
                    if (imageList.length === 1) {
                      const fallbacks = getFallbackImages(detailedPart.category);
                      fallbacks.forEach(url => {
                        if (!imageList.includes(url)) {
                          imageList.push(url);
                        }
                      });
                    }

                    // Touch swipe handlers
                    let touchStartX = 0;

                    const handleTouchStartLocal = (e: React.TouchEvent) => {
                      touchStartX = e.touches[0].clientX;
                    };

                    const handleTouchEndLocal = (e: React.TouchEvent) => {
                      const touchEndX = e.changedTouches[0].clientX;
                      const diffX = touchEndX - touchStartX;
                      if (Math.abs(diffX) > 40) {
                        if (diffX > 0) {
                          // swipe right -> previous image
                          setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                        } else {
                          // swipe left -> next image
                          setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                        }
                      }
                    };

                    return (
                      <div 
                        className="h-64 w-full bg-slate-100 relative cursor-pointer group overflow-hidden select-none touch-pan-y"
                        onTouchStart={handleTouchStartLocal}
                        onTouchEnd={handleTouchEndLocal}
                        onClick={() => setIsGalleryOpen(true)}
                        title="Swipe horizontally or click to view gallery"
                      >
                        <AnimatePresence mode="wait">
                          <motion.img
                            key={detailImageIndex}
                            src={imageList[detailImageIndex] || detailedPart.imageUrl}
                            alt={detailedPart.title}
                            referrerPolicy="no-referrer"
                            initial={{ opacity: 0.8, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0.8, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full object-cover"
                          />
                        </AnimatePresence>

                        {/* Left/Right click arrow buttons for desktop */}
                        {imageList.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-indigo-600 text-white rounded-full transition-all z-20 cursor-pointer shadow-md border border-white/5 opacity-0 group-hover:opacity-100 md:opacity-80"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-indigo-600 text-white rounded-full transition-all z-20 cursor-pointer shadow-md border border-white/5 opacity-0 group-hover:opacity-100 md:opacity-80"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </>
                        )}

                        {/* Progress indicators dots */}
                        {imageList.length > 1 && (
                          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                            {imageList.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailImageIndex(idx);
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  idx === detailImageIndex ? "w-4 bg-indigo-500" : "w-1.5 bg-white/40"
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        {/* Gallery hint badge */}
                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-[9px] font-black tracking-wider text-white px-2.5 py-1.5 rounded-xl flex items-center gap-1 border border-white/10 opacity-90 group-hover:opacity-100 transition-all duration-300 z-10">
                          <Maximize2 size={10} className="text-indigo-400" />
                          VIEW GALLERY ({detailImageIndex + 1}/{imageList.length})
                        </div>

                        {detailedPart.sold && (
                          <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-10 animate-fade-in">
                            <span className="text-sm font-black tracking-widest text-white bg-rose-600 px-4 py-1.5 rounded-lg uppercase shadow-xl border border-rose-500">
                              SOLD OUT
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-10 text-white z-10 pointer-events-none">
                          <div className="flex gap-1.5 flex-wrap mb-1.5 pointer-events-auto">
                            <span className="inline-block px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                              {detailedPart.carBrand}
                            </span>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10 ${getConditionColor(detailedPart.condition)}`}>
                              {detailedPart.condition}
                            </span>
                          </div>
                          <h3 className="text-base font-black tracking-tight leading-snug">
                            {detailedPart.title}
                          </h3>
                          <p className="text-xs text-slate-300 mt-1 font-medium">
                            Compatibility: <span className="font-extrabold text-white">{detailedPart.carBrand} {detailedPart.carModel}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-5 space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">{t("priceInIndia")}</span>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {formatPrice(detailedPart.price)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-medium block">{t("posted")}</span>
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1 justify-end">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(detailedPart.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Info size={13} className="text-slate-400" />
                        Description
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {detailedPart.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                        <span className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                          <Car size={16} />
                        </span>
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block leading-none">CATEGORY</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-1">{detailedPart.category}</span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                        <span className="p-2 bg-sky-50 text-sky-500 rounded-xl">
                          <MapPin size={16} />
                        </span>
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block leading-none">LOCATION</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-1">{detailedPart.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Google Map approximate location */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                        <MapPin size={13} className="text-indigo-500" />
                        Seller's Location Map
                      </h4>
                      <GMap
                        lat={detailedPart.lat}
                        lng={detailedPart.lng}
                        state={detailedPart.state}
                        district={detailedPart.district}
                        height="180px"
                      />
                    </div>

                    <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-4 shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block">CONTACT SELLER</span>
                          <h5 className="text-sm font-extrabold text-white mt-0.5">{detailedPart.contactName}</h5>
                          <span className="text-xs text-slate-400">{detailedPart.sellerEmail}</span>

                          {/* Interactive Rating Button */}
                          {detailedSellerRating && (
                            <button
                              onClick={() => setShowDetailedReviews(true)}
                              className="flex items-center gap-1 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/25 px-2.5 py-1 rounded-xl text-[10px] text-amber-300 font-black mt-2 transition-all cursor-pointer"
                              id="view-detailed-reviews-btn"
                            >
                              <Star size={11} className="fill-current text-amber-400" />
                              {detailedSellerRating.count > 0 ? `${detailedSellerRating.average} (${detailedSellerRating.count} reviews)` : "New Seller (No reviews)"}
                            </button>
                          )}
                        </div>
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-bold text-sky-400 border border-slate-700 uppercase">
                          {detailedPart.contactName.substring(0, 2)}
                        </div>
                      </div>

                       <div className="space-y-2">
                        <button
                          onClick={() => {
                            handleStartChat(detailedPart);
                            setDetailedPart(null); // Close detail dialog so the active chat overlay is visible
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md cursor-pointer"
                        >
                          <MessageSquare size={14} />
                          {t("inAppChat")}
                        </button>
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <a
                            href={`tel:${detailedPart.contactPhone}`}
                            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 rounded-2xl text-xs transition-colors"
                          >
                            <Phone size={14} />
                            {t("callSeller")}
                          </a>
                          <a
                            href={`https://wa.me/${detailedPart.contactPhone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-2xl text-xs transition-colors"
                          >
                            <MessageSquare size={14} />
                            {t("whatsApp")}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed Seller Reviews View Overlay */}
          <AnimatePresence>
            {showDetailedReviews && detailedPart && (
              <SellerReviewsView
                sellerId={detailedPart.sellerId}
                sellerName={detailedPart.contactName}
                currentUser={currentUser}
                onClose={() => setShowDetailedReviews(false)}
                currentPart={detailedPart}
              />
            )}
          </AnimatePresence>

          {/* Real-time active Chat room overlay */}
          <AnimatePresence>
            {activeChat && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute inset-0 z-40 bg-slate-50"
              >
                <ChatRoomWindow
                  chat={activeChat}
                  currentUser={currentUser}
                  onClose={() => setActiveChat(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full-screen Image Gallery Modal */}
          <ImageGalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            part={detailedPart}
            initialIndex={detailImageIndex}
          />

        </div>
      )}
    </PhoneSimulator>
  );
}
