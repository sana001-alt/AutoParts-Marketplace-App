import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Hand
} from "lucide-react";
import { SparePart } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: SparePart | null;
  initialIndex?: number;
}

// Category fallback gallery images so every part has a premium swipeable gallery
const GET_FALLBACK_IMAGES = (category: string): string[] => {
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

export default function ImageGalleryModal({ isOpen, onClose, part, initialIndex = 0 }: ImageGalleryModalProps) {
  if (!isOpen || !part) return null;

  // Build images array
  const images: string[] = [];
  if (part.imageUrl) {
    images.push(part.imageUrl);
  }
  if (part.imageUrls && part.imageUrls.length > 0) {
    // Merge without duplicates
    part.imageUrls.forEach(url => {
      if (!images.includes(url)) {
        images.push(url);
      }
    });
  }
  
  // If we only have 1 image, add high quality relevant fallbacks to make sure swipe works
  if (images.length === 1) {
    const fallbacks = GET_FALLBACK_IMAGES(part.category);
    fallbacks.forEach(url => {
      if (!images.includes(url)) {
        images.push(url);
      }
    });
  }

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  // Sync index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex < images.length ? initialIndex : 0);
      resetZoom();
    }
  }, [isOpen, initialIndex, images.length]);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(images.length - 1); // loop
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // loop
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = prev - 0.5;
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
        setIsPanning(false);
        return 1;
      }
      return next;
    });
  };

  const toggleDoubleTapZoom = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length]);

  // Touch handlers for swipe & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (e.touches.length === 1) {
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        // Double tap gesture detected!
        toggleDoubleTapZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Single touch - either Swipe or Pan depending on zoom scale
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      if (scale > 1) {
        setIsPanning(true);
        dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      } else {
        setIsDragging(true);
      }
    } else if (e.touches.length === 2) {
      // Multi touch - pinch to zoom setup
      setIsDragging(false);
      setIsPanning(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialPinchDistanceRef.current = distance;
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      if (scale > 1 && isPanning) {
        // Pan image smoothly
        const newX = touch.clientX - dragStartRef.current.x;
        const newY = touch.clientY - dragStartRef.current.y;
        
        // Dynamic boundaries scaling with actual screen space
        const limitX = (scale - 1) * (containerRef.current?.clientWidth || 300) / 2;
        const limitY = (scale - 1) * (containerRef.current?.clientHeight || 400) / 2;
        setPosition({
          x: Math.max(-limitX, Math.min(limitX, newX)),
          y: Math.max(-limitY, Math.min(limitY, newY))
        });
      }
    } else if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      // Pinching
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const ratio = distance / initialPinchDistanceRef.current;
      const newScale = Math.max(1, Math.min(initialScaleRef.current * ratio, 4));
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
        setIsPanning(false);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDragging && touchStartRef.current && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;

      if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
        if (diffX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    }
    
    // Clean up
    touchStartRef.current = null;
    initialPinchDistanceRef.current = null;
    setIsDragging(false);
  };

  // Mouse drag handlers for desktop panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsPanning(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    } else {
      setIsDragging(true);
      touchStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (scale > 1 && isPanning) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const limitX = (scale - 1) * (containerRef.current?.clientWidth || 300) / 2;
      const limitY = (scale - 1) * (containerRef.current?.clientHeight || 400) / 2;
      setPosition({
        x: Math.max(-limitX, Math.min(limitX, newX)),
        y: Math.max(-limitY, Math.min(limitY, newY))
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && touchStartRef.current) {
      const diffX = e.clientX - touchStartRef.current.x;
      if (Math.abs(diffX) > 60) {
        if (diffX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    }
    setIsPanning(false);
    setIsDragging(false);
    touchStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 0.15;
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale(prev => {
      const next = Math.max(1, Math.min(prev + direction * zoomFactor, 4));
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
        setIsPanning(false);
      }
      return next;
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden"
        id="image-gallery-modal-backdrop"
      >
        {/* Top Header Controls */}
        <div className="px-4 py-4.5 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase leading-none">
              AUTO PARTS GALLERY
            </span>
            <span className="text-xs font-extrabold truncate max-w-[200px] mt-1 text-slate-100">
              {part.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct counter */}
            <span className="bg-white/10 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full text-slate-300">
              {currentIndex + 1} of {images.length}
            </span>

            {/* Quick zoom reset indicator */}
            {scale > 1 && (
              <button 
                onClick={resetZoom}
                className="p-1.5 bg-indigo-600/80 hover:bg-indigo-600 rounded-xl text-white transition-colors cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl transition-all cursor-pointer text-white"
              id="gallery-close-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Central Display & Gestures Area */}
        <div 
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onMouseLeave={() => { setIsPanning(false); setIsDragging(false); }}
          className={`flex-1 w-full flex items-center justify-center relative touch-none select-none ${
            scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          }`}
          id="gallery-gesture-stage"
          onDoubleClick={toggleDoubleTapZoom}
        >
          {/* Side navigation arrows - hidden when fully zoomed in */}
          {scale === 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3.5 p-2.5 bg-black/45 hover:bg-black/60 rounded-full text-white border border-white/5 z-20 transition-all hover:scale-105 active:scale-95"
                id="gallery-arrow-left"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3.5 p-2.5 bg-black/45 hover:bg-black/60 rounded-full text-white border border-white/5 z-20 transition-all hover:scale-105 active:scale-95"
                id="gallery-arrow-right"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Main Displayed Image with Zoom/Position Styling */}
          <div className="overflow-hidden p-2 flex items-center justify-center max-w-full max-h-[70vh]">
            <img
              ref={imageRef}
              src={images[currentIndex]}
              alt={`Spare Part ${currentIndex + 1}`}
              referrerPolicy="no-referrer"
              className="object-contain max-w-full max-h-[70vh] select-none pointer-events-none rounded-lg"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isPanning ? "none" : "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>

          {/* Prompt banner shown briefly when scale is 1 to inform user */}
          {scale === 1 && (
            <div className="absolute bottom-4 bg-black/60 text-[9px] font-extrabold tracking-wider text-slate-300 px-3.5 py-1.5 rounded-full uppercase flex items-center gap-1 border border-white/5 select-none pointer-events-none animate-pulse">
              <Hand size={11} className="text-indigo-400" />
              Double click/tap to Zoom · Drag or Swipe
            </div>
          )}
        </div>

        {/* Bottom Panel: Thumbnails Strip + Zoom Controller Toolbar */}
        <div className="bg-gradient-to-t from-black/95 via-black/85 to-transparent px-4 pb-6 pt-6 z-10 flex flex-col gap-4">
          
          {/* Magnification Floating Toolbar */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            
            <span className="text-[10px] font-mono font-bold text-slate-400 w-12 text-center select-none">
              {scale.toFixed(1)}x
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <button
              onClick={toggleDoubleTapZoom}
              className="p-2 bg-white/5 hover:bg-indigo-600/40 rounded-xl text-indigo-400 transition-all cursor-pointer"
              title={scale > 1 ? "Actual Size" : "Zoom Fit"}
            >
              {scale > 1 ? <RotateCcw size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>

          {/* Thumbnails strip */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full">
            {images.map((url, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  resetZoom();
                }}
                className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all border ${
                  index === currentIndex 
                    ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/20" 
                    : "border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Slide Indicator Dots */}
          <div className="flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-4 bg-indigo-500" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
