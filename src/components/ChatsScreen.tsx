import React, { useState, useEffect } from "react";
import { MessageSquare, ArrowRight, Compass, Search, Sparkles } from "lucide-react";
import { User, Chat } from "../types";
import { fetchUserChats, sendChatMessage } from "../lib/firebase";

interface ChatsScreenProps {
  currentUser: User;
  onSelectChat: (chat: Chat) => void;
}

export default function ChatsScreen({ currentUser, onSelectChat }: ChatsScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSimulateInquiry = async () => {
    // Let's create an inquiry on a popular item
    const mockPartner = {
      id: "seller-2", // Amit Patel
      name: "Amit Patel",
      phone: "+91 95432 10987",
      email: "amit@mumbaicars.com"
    };

    // Construct a simulated chat
    const chatId = `${currentUser.id}_${mockPartner.id}_part-2`;
    const chatMeta = {
      partId: "part-2",
      partTitle: "Hyundai Creta Genuine Left-side LED Headlight Assembly",
      partImageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600",
      partPrice: 12500,
      buyerId: currentUser.id,
      buyerName: currentUser.name,
      sellerId: mockPartner.id,
      sellerName: mockPartner.name,
    };

    const messages = [
      "Hi! I saw you viewing my Hyundai Creta LED Headlight. Is it compatible with your car?",
      "Hey! Are you still interested in the Creta LED Headlight assembly? I can lower the price to ₹11,000 if you want.",
      "Hello! Just checking in if you need any other components, I have the matching right-side headlight too!",
      "Hi! Let me know if you want to negotiate on the LED Headlight. Ready to courier it today.",
      "Hello, let me know if you would like to come see the headlight assembly. Located in Mumbai!"
    ];

    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    
    try {
      await sendChatMessage(chatId, mockPartner.id, randomMsg, chatMeta);
    } catch (e) {
      console.error("Failed to simulate message", e);
    }
  };

  const loadChats = async () => {
    try {
      const data = await fetchUserChats(currentUser.id);
      setChats(data);
    } catch (err) {
      console.error("Failed to load user chats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();

    // Re-fetch on storage updates or custom dispatch events
    const handleUpdate = () => {
      loadChats();
    };

    window.addEventListener("autoparts_chat_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    
    return () => {
      window.removeEventListener("autoparts_chat_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [currentUser.id]);

  const filteredChats = chats.filter((chat) => {
    const isUserBuyer = currentUser.id === chat.buyerId;
    const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
    return (
      partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.partTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getRelativeTime = (timestamp: number) => {
    const difference = Date.now() - timestamp;
    const minutes = Math.floor(difference / (60 * 1000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full relative" id="chats-screen-container">
      {/* Title Header */}
      <div className="bg-slate-900 text-white pt-5 pb-4 px-4 sticky top-0 z-10 shadow-md">
        <h2 className="text-sm font-black tracking-wider uppercase mb-3">My Inbox</h2>
        
        {/* Custom Inbox Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats by user or product..."
            className="w-full bg-slate-800 border-none rounded-full py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
            id="chats-search-input"
          />
        </div>

        {/* Local Notification Test Driver Action Banner */}
        <div className="mt-3 bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-900/40 p-2.5 rounded-2xl flex items-center justify-between text-white shadow-inner gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
              <Sparkles size={12} className="text-indigo-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-100 leading-none">LOCAL ALERT SERVICE</p>
              <p className="text-[8px] text-slate-400 mt-0.5 truncate">Simulate a buyer inquiry</p>
            </div>
          </div>
          <button
            onClick={handleSimulateInquiry}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-[9px] font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer text-white shrink-0 shadow-md"
            id="test-alert-simulate-btn"
          >
            TEST ALERT
          </button>
        </div>
      </div>

      {/* Main Lists Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12" id="chats-loading">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-[10px] font-bold text-slate-400 tracking-wide font-mono animate-pulse">
              SYNCING CHATS...
            </span>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm" id="chats-empty">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3">
              <MessageSquare size={24} />
            </div>
            <h4 className="text-xs font-extrabold text-slate-800">No Conversations Found</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              {searchQuery 
                ? "No chat matches your search terms. Try searching something else." 
                : "Your chat inbox is empty. Browse listings and select 'Chat with Seller' to start negotiating!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2" id="chats-list">
            {filteredChats.map((chat) => {
              const isUserBuyer = currentUser.id === chat.buyerId;
              const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
              const partnerRole = isUserBuyer ? "Seller" : "Buyer";

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md transition-all duration-200 flex items-center gap-3 cursor-pointer group"
                  id={`chat-item-${chat.id}`}
                >
                  {/* Part Thumbnail */}
                  <div className="relative shrink-0">
                    <img
                      src={chat.partImageUrl}
                      alt={chat.partTitle}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-100"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600/10 border border-white text-indigo-600 rounded-full flex items-center justify-center text-[8px] font-black uppercase">
                      {partnerName.substring(0, 1)}
                    </div>
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-xs text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {partnerName}
                        </span>
                        <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1 py-0.2 rounded shrink-0 uppercase">
                          {partnerRole}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 font-mono shrink-0">
                        {getRelativeTime(chat.lastMessageAt)}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-slate-700 truncate leading-snug">
                      {chat.partTitle}
                    </p>
                    
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium italic">
                      {chat.lastMessageText || "No messages yet"}
                    </p>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="text-slate-300 group-hover:text-slate-500 transition-colors pl-1 shrink-0">
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
