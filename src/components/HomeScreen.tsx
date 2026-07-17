import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Filter, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Car, 
  Compass, 
  X, 
  Tag, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Info,
  Layers,
  Heart,
  SlidersHorizontal,
  Plus,
  Maximize2,
  Star
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, POPULAR_LOCATIONS, User } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { motion, AnimatePresence } from "motion/react";
import ImageGalleryModal from "./ImageGalleryModal";
import { fetchSellerReviews } from "../lib/firebase";
import SellerReviewsView from "./SellerReviewsView";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import LanguageSelector from "./LanguageSelector";

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

interface HomeScreenProps {
  parts: SparePart[];
  onFavoriteToggle?: (partId: string) => void;
  favorites: string[];
  onStartChat?: (part: SparePart) => void;
  currentUser: User | null;
}

export default function HomeScreen({ parts, onFavoriteToggle, favorites, onStartChat, currentUser }: HomeScreenProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedPartName, setSelectedPartName] = useState("All Parts");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  
  // Local state for toggling advanced filters drawer
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Seller Rating & Reviews states
  const [sellerRating, setSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showReviews, setShowReviews] = useState(false);

  React.useEffect(() => {
    const updateRating = () => {
      const sId = selectedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setSellerRating({ average, count });
        });
      } else {
        setSellerRating(null);
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
  }, [selectedPart]);

  // Flat list of all spare part names for suggestions and search
  const ALL_SPARE_PART_NAMES = Object.values(CAR_SPARE_PARTS_BY_CATEGORY).flat();

  // Search and Filter Logic
  const filteredParts = parts.filter((part) => {
    const matchesSearch = 
      part.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.carModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.carBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (part.partName && part.partName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesBrand = 
      selectedBrand === "All Brands" || 
      part.carBrand === selectedBrand;
      
    const matchesModel = 
      selectedModel === "All Models" || 
      part.carModel === selectedModel;

    const matchesCategory = 
      selectedCategory === "All Categories" || 
      part.category === selectedCategory;

    const matchesPartName = 
      selectedPartName === "All Parts" || 
      part.partName === selectedPartName || 
      (part.title && part.title.toLowerCase().includes(selectedPartName.toLowerCase()));
      
    const matchesLocation = (() => {
      if (selectedState === "All States" || selectedState === "All India") return true;
      
      const matchesStateField = part.state === selectedState || 
        (!part.state && part.location.toLowerCase().includes(selectedState.toLowerCase()));
      
      if (!matchesStateField) return false;

      if (selectedDistrict === "All Districts") return true;
      return part.district === selectedDistrict || 
        (!part.district && part.location.toLowerCase().includes(selectedDistrict.toLowerCase()));
    })();

    const matchesCondition = 
      selectedCondition === "All Conditions" || 
      part.condition === selectedCondition;

    return matchesSearch && matchesBrand && matchesModel && matchesCategory && matchesPartName && matchesLocation && matchesCondition;
  });

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const suggestions = trimmedQuery 
    ? ALL_SPARE_PART_NAMES.filter(name => name.toLowerCase().includes(trimmedQuery))
    : [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  const getRelativeTime = (timestamp: number) => {
    const difference = Date.now() - timestamp;
    const hours = Math.floor(difference / (3600 * 1000));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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

  // Handle brand selection change to sync/reset model
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("All Models");
  };

  // Get available models based on selected brand
  const availableModels = selectedBrand !== "All Brands" ? INDIAN_CAR_BRANDS[selectedBrand] || [] : [];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full relative" id="home-screen-container">
      {/* Search Header */}
      <div className="bg-slate-900 text-white pt-5 pb-4 px-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-sky-400 shrink-0" />
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict("All Districts"); // reset district
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer border-none"
                id="header-state-picker"
              >
                <option value="All States" className="bg-slate-900 text-white">All India</option>
                {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                  <option key={s.state} value={s.state} className="bg-slate-900 text-white text-xs">
                    {s.state}
                  </option>
                ))}
              </select>
            </div>

            {selectedState !== "All States" && (
              <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-transparent text-xs font-bold text-sky-300 focus:outline-none cursor-pointer border-none"
                  id="header-district-picker"
                >
                  <option value="All Districts" className="bg-slate-900 text-white">All Districts</option>
                  {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === selectedState)?.districts || []).map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-white text-xs">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSelector />
            <div className="text-[10px] font-mono bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded border border-sky-400/25 shrink-0">
              C2C INDIA
            </div>
          </div>
        </div>

        {/* Custom Search Input */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-slate-800 border-none rounded-full py-2 pl-9 pr-8 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              id="search-parts-input"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                }} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                id="search-clear-btn"
              >
                <X size={14} />
              </button>
            )}

            {/* Auto-suggestions list */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto"
                id="search-suggestions-dropdown"
              >
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors flex items-center justify-between"
                  >
                    <span>{suggestion}</span>
                    <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">Part Name</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFiltersModal(true)}
            className={`p-2 rounded-full border transition-all relative ${
              selectedBrand !== "All Brands" || 
              selectedModel !== "All Models" || 
              selectedCategory !== "All Categories" || 
              selectedPartName !== "All Parts" ||
              selectedState !== "All States" ||
              selectedDistrict !== "All Districts" ||
              selectedCondition !== "All Conditions"
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
            id="filters-modal-toggle"
            title="Advanced Filters"
          >
            <Filter size={15} />
            {(selectedBrand !== "All Brands" || selectedModel !== "All Models" || selectedCategory !== "All Categories" || selectedPartName !== "All Parts" || selectedState !== "All States" || selectedDistrict !== "All Districts" || selectedCondition !== "All Conditions") && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-slate-900" />
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Category Slider */}
      <div className="bg-white border-b border-slate-100 py-3 px-4 overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none">
         <button
          onClick={() => {
            setSelectedCategory("All Categories");
            setSelectedPartName("All Parts");
          }}
          className={`inline-block px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            selectedCategory === "All Categories"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          id="category-pill-all"
        >
          {t("allParts")}
        </button>
        {CAR_PART_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedPartName("All Parts");
              }}
              className={`inline-block px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              id={`category-pill-${cat.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {translateDynamic(cat, language)}
            </button>
          );
        })}
      </div>

      {/* Quick brand shortcuts under category slider */}
      <div className="bg-slate-50 border-b border-slate-100 py-2 px-4 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
        <span className="text-[10px] text-slate-400 font-bold uppercase self-center mr-1">Brands:</span>
        <button
          onClick={() => handleBrandChange("All Brands")}
          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
            selectedBrand === "All Brands"
              ? "bg-slate-900/10 text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All
        </button>
        {Object.keys(INDIAN_CAR_BRANDS).map((b) => (
          <button
            key={b}
            onClick={() => handleBrandChange(b)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
              selectedBrand === b
                ? "bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Parts Feed list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        <div className="flex justify-between items-center mb-1">
          <div className="flex flex-col">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {selectedCategory === "All Categories" ? "RECOMMENDED FOR YOU" : selectedCategory.toUpperCase()}
            </h3>
            {selectedBrand !== "All Brands" && (
              <span className="text-[10px] text-indigo-600 font-medium mt-0.5">
                Fitment: {selectedBrand} {selectedModel !== "All Models" ? `• ${selectedModel}` : ""}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">
            {filteredParts.length} Parts
          </span>
        </div>

        {filteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-400">
              <Compass size={24} />
            </div>
            <h4 className="text-xs font-extrabold text-slate-800">No Parts Matching Filters</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              Try changing the brand, selecting a different category, or resetting all search filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedBrand("All Brands");
                setSelectedModel("All Models");
                setSelectedCategory("All Categories");
                setSelectedPartName("All Parts");
                setSelectedState("All States");
                setSelectedDistrict("All Districts");
                setSelectedCondition("All Conditions");
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              id="reset-filters-btn"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3" id="parts-grid">
            {filteredParts.map((part) => {
              const isFav = favorites.includes(part.id);
              return (
                <div
                  key={part.id}
                  onClick={() => setSelectedPart(part)}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer relative group"
                  id={`part-card-${part.id}`}
                >
                  {/* Image container clickable for direct fullscreen view */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPart(part);
                      setDetailImageIndex(0);
                      setIsGalleryOpen(true);
                    }}
                    className="h-28 w-full bg-slate-200 relative overflow-hidden group/img cursor-zoom-in"
                    title="Click to view full-screen image gallery"
                  >
                    <img
                      src={part.imageUrl}
                      alt={part.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                    />

                    {/* Interactive hover overlay */}
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-slate-900/85 backdrop-blur-sm p-1.5 rounded-full text-white border border-white/15 scale-90 group-hover/img:scale-100 transition-transform duration-300 shadow-lg">
                        <Maximize2 size={11} className="text-indigo-400" />
                      </div>
                    </div>

                    {part.sold && (
                      <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-10">
                        <span className="text-[10px] font-black tracking-widest text-white bg-rose-600 px-2 py-0.5 rounded uppercase shadow-md">
                          SOLD
                        </span>
                      </div>
                    )}
                    
                    {/* Condition badge */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm border ${getConditionColor(part.condition)}`}>
                        {part.condition.toUpperCase()}
                      </span>
                    </div>

                    {/* Price Tag Overlay */}
                    <div className="absolute bottom-2 left-2 bg-slate-900/95 text-white text-[11px] font-black px-2 py-0.5 rounded shadow-sm font-mono">
                      {formatPrice(part.price)}
                    </div>

                    {/* Favorite Button */}
                    {onFavoriteToggle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle(part.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
                          isFav 
                            ? "bg-rose-50/95 text-rose-500 border border-rose-100" 
                            : "bg-slate-950/45 text-white hover:bg-slate-950/60 border border-white/10"
                        }`}
                        id={`fav-btn-${part.id}`}
                      >
                        <Heart size={12} fill={isFav ? "currentColor" : "none"} />
                      </button>
                    )}
                  </div>

                  {/* Card Content details */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                          {part.carBrand}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[9px] font-bold text-indigo-500 uppercase truncate">
                          {part.carModel}
                        </span>
                      </div>
                      
                      <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {part.title}
                      </h4>
                      <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                        {part.category}
                      </p>
                    </div>

                    <div className="border-t border-slate-50 pt-2 mt-2 flex items-center justify-between text-[8px] text-slate-400 font-bold">
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <MapPin size={8} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[50px]">{part.location}</span>
                      </span>
                      <span>{getRelativeTime(part.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Part Detail Drawer Overlay */}
      <AnimatePresence>
        {selectedPart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPart(null)}
            className="absolute inset-0 bg-black/60 z-30 flex items-end"
            id="part-detail-backdrop"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[32px] w-full max-h-[80%] overflow-y-auto flex flex-col shadow-2xl relative text-slate-900"
              id="part-detail-modal"
            >
              {/* Close handler */}
              <button
                onClick={() => setSelectedPart(null)}
                className="absolute top-4 right-4 bg-white text-slate-900 p-2.5 rounded-full hover:bg-slate-100 shadow-xl border border-slate-200/80 hover:scale-105 active:scale-95 z-20 transition-all flex items-center justify-center cursor-pointer"
                id="close-detail-btn"
              >
                <X size={18} strokeWidth={3} />
              </button>

              {/* Cover Image Carousel */}
              {(() => {
                const imageList: string[] = [];
                if (selectedPart.imageUrl) {
                  imageList.push(selectedPart.imageUrl);
                }
                if (selectedPart.imageUrls && selectedPart.imageUrls.length > 0) {
                  selectedPart.imageUrls.forEach(url => {
                    if (!imageList.includes(url)) {
                      imageList.push(url);
                    }
                  });
                }
                if (imageList.length === 1) {
                  const fallbacks = getFallbackImages(selectedPart.category);
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
                        src={imageList[detailImageIndex] || selectedPart.imageUrl}
                        alt={selectedPart.title}
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

                    {selectedPart.sold && (
                      <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-10 animate-fade-in">
                        <span className="text-sm font-black tracking-widest text-white bg-rose-600 px-4 py-1.5 rounded-lg uppercase shadow-xl border border-rose-500">
                          SOLD OUT
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-10 text-white z-10 pointer-events-none">
                      <div className="flex gap-1.5 flex-wrap mb-1.5 pointer-events-auto">
                        <span className="inline-block px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                          {selectedPart.carBrand}
                        </span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10 ${getConditionColor(selectedPart.condition)}`}>
                          {selectedPart.condition}
                        </span>
                      </div>
                      <h3 className="text-base font-black tracking-tight leading-snug">
                        {selectedPart.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 font-medium">
                        Fits models: <span className="font-extrabold text-white">{selectedPart.carBrand} {selectedPart.carModel}</span>
                      </p>
                    </div>
                  </div>
                );
              })()}
              {/* Body details */}
              <div className="p-5 space-y-4">
                {/* Price and date */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold tracking-wider block">{t("priceInIndia")}</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                      {formatPrice(selectedPart.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-extrabold tracking-wider block">{t("posted")}</span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-1 justify-end">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(selectedPart.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  </div>
                </div>

                {/* Description details */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Info size={12} />
                    Item Description
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {selectedPart.description}
                  </p>
                </div>

                {/* Technical specs block */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                      <Car size={15} />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-extrabold block leading-none uppercase">CATEGORY</span>
                      <span className="text-xs font-black text-slate-800 block mt-1 truncate">{selectedPart.category}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                    <span className="p-2 bg-sky-50 text-sky-500 rounded-xl">
                      <MapPin size={15} />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-extrabold block leading-none uppercase">LOCATION</span>
                      <span className="text-xs font-black text-slate-800 block mt-1 truncate">{selectedPart.location}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Seller Panel */}
                <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-lg border border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">VERIFIED SELLER</span>
                      <h5 className="text-sm font-black text-white mt-0.5">{selectedPart.contactName}</h5>
                      <span className="text-[10px] text-slate-400">{selectedPart.sellerEmail}</span>
                      
                      {/* Interactive Rating Button */}
                      {sellerRating && (
                        <button
                          onClick={() => setShowReviews(true)}
                          className="flex items-center gap-1 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/25 px-2.5 py-1 rounded-xl text-[10px] text-amber-300 font-black mt-2 transition-all cursor-pointer"
                          id="view-seller-reviews-btn"
                        >
                          <Star size={11} className="fill-current text-amber-400" />
                          {sellerRating.count > 0 ? `${sellerRating.average} (${sellerRating.count} reviews)` : "New Seller (No reviews)"}
                        </button>
                      )}
                    </div>
                    <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center font-bold text-sky-400 border border-slate-700 uppercase text-xs">
                      {selectedPart.contactName.substring(0, 2)}
                    </div>
                  </div>

                  {/* Actions: In-App Chat, call, whatsapp */}
                  <div className="space-y-2">
                    {onStartChat && (
                      <button
                        onClick={() => {
                          if (selectedPart.sold) return;
                          onStartChat(selectedPart);
                          setSelectedPart(null); // Close the detail drawer so the chat window overlay is visible
                        }}
                        disabled={selectedPart.sold}
                        className={`w-full flex items-center justify-center gap-2 font-black py-2.5 rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md cursor-pointer ${
                          selectedPart.sold
                            ? "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                        id="inapp-chat-btn"
                      >
                        <MessageSquare size={14} />
                        {selectedPart.sold ? t("soldOut") : t("inAppChat")}
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${selectedPart.contactPhone}`}
                        className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 rounded-2xl text-xs transition-all active:scale-[0.98]"
                        id="call-seller-btn"
                      >
                        <Phone size={13} />
                        {t("callSeller")}
                      </a>
                      <a
                        href={`https://wa.me/${selectedPart.contactPhone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-2xl text-xs transition-all active:scale-[0.98]"
                        id="whatsapp-seller-btn"
                      >
                        <MessageSquare size={13} />
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

      {/* Seller Reviews View Overlay */}
      <AnimatePresence>
        {showReviews && selectedPart && (
          <SellerReviewsView
            sellerId={selectedPart.sellerId}
            sellerName={selectedPart.contactName}
            currentUser={currentUser}
            onClose={() => setShowReviews(false)}
            currentPart={selectedPart}
          />
        )}
      </AnimatePresence>

      {/* Advanced Filter Drawer */}
      <AnimatePresence>
        {showFiltersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFiltersModal(false)}
            className="absolute inset-0 bg-black/60 z-30 flex items-end"
            id="filters-backdrop"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[32px] w-full max-h-[85%] overflow-y-auto p-5 space-y-5 shadow-2xl relative text-slate-900"
              id="filters-modal-body"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <SlidersHorizontal size={16} className="text-indigo-600" />
                  Advanced Filter
                </h3>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full"
                  id="close-filters-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1. Brand Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  1. Select Car Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Brands">All Brands (India)</option>
                  {Object.keys(INDIAN_CAR_BRANDS).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* 2. Model Dropdown (Disabled if Brand is All Brands) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  2. Select Specific Model
                </label>
                <select
                  value={selectedModel}
                  disabled={selectedBrand === "All Brands"}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Models">All Models</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {selectedBrand === "All Brands" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Brand first to view specific models.</span>
                )}
              </div>

              {/* 3. Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3. Part Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedPartName("All Parts");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Categories">All Categories</option>
                  {CAR_PART_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 3b. Specific Part Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3b. Specific Spare Part
                </label>
                <select
                  value={selectedPartName}
                  disabled={selectedCategory === "All Categories"}
                  onChange={(e) => setSelectedPartName(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Parts">All Parts</option>
                  {(selectedCategory !== "All Categories" ? CAR_SPARE_PARTS_BY_CATEGORY[selectedCategory] || [] : []).map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
                {selectedCategory === "All Categories" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Category first to view specific spare parts.</span>
                )}
              </div>

              {/* 4. Condition Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  4. Part Condition
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["All Conditions", "Brand New", "Like New", "Used (Good)", "For Scrap/Spares"].map((cond) => (
                    <button
                      key={cond}
                      onClick={() => setSelectedCondition(cond)}
                      className={`py-1.5 px-1 text-[10px] font-bold rounded-xl border text-center transition-all truncate ${
                        selectedCondition === cond
                          ? "bg-indigo-50 border-indigo-500 text-indigo-600 font-black"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      title={cond}
                    >
                      {cond === "All Conditions" ? "All" : cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Cascading Location Filter */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  5. Location (Cascading Filter)
                </span>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">STATE</span>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedDistrict("All Districts");
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All States">All India</option>
                      {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                        <option key={s.state} value={s.state}>{s.state}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">DISTRICT</span>
                    <select
                      value={selectedDistrict}
                      disabled={selectedState === "All States"}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full bg-white disabled:opacity-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="All Districts">All Districts</option>
                      {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === selectedState)?.districts || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedBrand("All Brands");
                    setSelectedModel("All Models");
                    setSelectedCategory("All Categories");
                    setSelectedPartName("All Parts");
                    setSelectedState("All States");
                    setSelectedDistrict("All Districts");
                    setSelectedCondition("All Conditions");
                    setShowFiltersModal(false);
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-2xl hover:bg-slate-50 transition-all text-center"
                  id="filter-reset-all-btn"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm text-center"
                  id="filter-apply-all-btn"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        part={selectedPart}
        initialIndex={detailImageIndex}
      />
    </div>
  );
}
