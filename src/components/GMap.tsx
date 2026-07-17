import React, { useState, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { MapPin, Compass, HelpCircle, Copy, Check, Sliders } from "lucide-react";
import { getApproxCoordinates, LatLng } from "../utils/locationHelper";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

interface GMapProps {
  lat?: number;
  lng?: number;
  state?: string;
  district?: string;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export default function GMap({
  lat,
  lng,
  state,
  district,
  interactive = false,
  onLocationSelect,
  height = "200px",
  className = ""
}: GMapProps) {
  const [coords, setCoords] = useState<LatLng>({ lat: 28.6139, lng: 77.2090 });
  const [copied, setCopied] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [forceMock, setForceMock] = useState(true);

  // Resolve coordinate changes or fallback location
  useEffect(() => {
    if (lat !== undefined && lng !== undefined && lat !== 0 && lng !== 0) {
      setCoords({ lat, lng });
    } else {
      const approx = getApproxCoordinates(state, district);
      setCoords(approx);
    }
  }, [lat, lng, state, district]);

  const handleMapClick = (e: any) => {
    if (!interactive || !onLocationSelect) return;
    
    // Check if real google maps click event has latLng
    if (e.detail?.latLng) {
      const newLat = e.detail.latLng.lat;
      const newLng = e.detail.latLng.lng;
      setCoords({ lat: newLat, lng: newLng });
      onLocationSelect(newLat, newLng);
    }
  };

  const handleMockMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onLocationSelect) return;
    
    // For the mock map, click relative to the container and map to coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Map click percentage around the current center coords
    const pctX = (x / rect.width) - 0.5;
    const pctY = (y / rect.height) - 0.5;
    
    // Scale slightly to simulate coordinate change (roughly +/- 0.05 degrees)
    const deltaLat = -pctY * 0.12; // up is positive latitude
    const deltaLng = pctX * 0.12;  // right is positive longitude
    
    const newLat = parseFloat((coords.lat + deltaLat).toFixed(6));
    const newLng = parseFloat((coords.lng + deltaLng).toFixed(6));
    
    setCoords({ lat: newLat, lng: newLng });
    onLocationSelect(newLat, newLng);
  };

  const copyKeyInstructions = () => {
    navigator.clipboard.writeText("GOOGLE_MAPS_PLATFORM_KEY");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -----------------------------------------------------------------
  // 1. LIVE GOOGLE MAP (RENDERED WHEN API KEY IS SET)
  // -----------------------------------------------------------------
  if (hasValidKey && !forceMock) {
    return (
      <div 
        className={`relative rounded-2xl overflow-hidden border border-slate-800 shadow-lg ${className}`} 
        style={{ height }}
        id="live-google-map-container"
      >
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={coords}
            center={coords}
            defaultZoom={11}
            zoom={interactive ? 13 : 11}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: "100%", height: "100%" }}
            gestureHandling={"cooperative"}
            disableDefaultUI={!interactive}
          >
            <AdvancedMarker position={coords}>
              <Pin background="#6366f1" borderColor="#4f46e5" glyphColor="#ffffff" />
            </AdvancedMarker>
          </Map>
        </APIProvider>

        {interactive && (
          <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-slate-800 px-2.5 py-1 rounded-lg shadow text-[9px] font-mono text-slate-400 pointer-events-none z-10">
            📍 Click map to drop pin
          </div>
        )}

        {/* Back to Simulated Map toggle */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setForceMock(true);
            }}
            className="bg-slate-900/95 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg shadow text-[9px] font-bold text-indigo-400 cursor-pointer transition-all active:scale-95"
            id="map-toggle-mock-btn"
          >
            🔌 Bypass Billing (Simulated)
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // 2. SIMULATED MAP FALLBACK (PREMIUM DARK LOOK WITH KEY INSTRUCTIONS)
  // -----------------------------------------------------------------
  return (
    <div 
      className={`relative rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-950 flex flex-col text-white shadow-xl ${className}`}
      style={{ height }}
      id="fallback-map-container"
    >
      {/* Visual Simulated Grid Map */}
      <div 
        className={`relative flex-1 bg-slate-950 overflow-hidden ${interactive ? "cursor-crosshair" : ""}`}
        onClick={handleMockMapClick}
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, #1e293b 0.5px, transparent 1.5px),
            linear-gradient(to right, rgba(30, 41, 59, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(30, 41, 59, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px, 40px 40px, 40px 40px",
          backgroundPosition: "center center"
        }}
        id="mock-grid-canvas"
      >
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-950/40 to-slate-950 pointer-events-none" />

        {/* Outer Circular Radar Grid */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-slate-800/25 rounded-full pointer-events-none flex items-center justify-center animate-pulse">
          <div className="w-32 h-32 border border-slate-800/35 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 border border-slate-800/50 rounded-full" />
          </div>
        </div>

        {/* Laser Sweep Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-gradient-to-tr from-transparent via-indigo-500/5 to-transparent pointer-events-none animate-[spin_8s_linear_infinite]" />

        {/* State / Location Marker overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          {/* Pulsing indicator */}
          <span className="absolute inline-flex h-12 w-12 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="bg-indigo-600 border-2 border-indigo-400 p-2 rounded-full shadow-lg relative z-10 text-white">
            <MapPin size={16} />
          </div>

          <div className="mt-2 bg-slate-900/95 border border-slate-800 py-1.5 px-3 rounded-2xl shadow-xl backdrop-blur-md text-center max-w-[150px]">
            <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase leading-none block">
              {district ? "DISTRICT CENTER" : "STATE CENTER"}
            </span>
            <span className="text-[11px] font-black text-white mt-0.5 block truncate">
              {district || state || "India"}
            </span>
          </div>
        </div>

        {/* Active Coordinate overlay badge */}
        <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1.5 rounded-xl font-mono text-[9px] text-slate-300 shadow-md flex items-center gap-1.5 backdrop-blur-sm">
          <Compass size={11} className="text-indigo-400 animate-spin-slow" />
          <span>LAT: {coords.lat.toFixed(4)}</span>
          <span className="text-slate-600">|</span>
          <span>LNG: {coords.lng.toFixed(4)}</span>
        </div>

        {/* Live Setup Banner / Toggles */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {hasValidKey && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setForceMock(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 px-2.5 py-1.5 rounded-xl text-[9px] font-black text-white shadow-md flex items-center gap-1 backdrop-blur-sm cursor-pointer transition-all active:scale-95"
              id="map-toggle-live-btn"
            >
              <span>Switch to Live Map</span>
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowConfigGuide(!showConfigGuide);
            }}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 rounded-xl text-[9px] font-bold text-indigo-300 shadow-md flex items-center gap-1 backdrop-blur-sm cursor-pointer transition-all active:scale-95"
            id="map-api-key-setup-help-btn"
          >
            <HelpCircle size={11} className="text-indigo-400" />
            <span>Map Key Setup</span>
          </button>
        </div>

        {interactive && (
          <div className="absolute bottom-3 left-3 bg-indigo-950/90 border border-indigo-900/50 px-2.5 py-1.5 rounded-xl text-[9px] font-black text-indigo-300 uppercase tracking-wider shadow-md pointer-events-none backdrop-blur-sm animate-bounce">
            🎯 Click grid to move pin
          </div>
        )}
      </div>

      {/* Slide-Up Config Guide Panel */}
      {showConfigGuide && (
        <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-2.5 text-left text-xs absolute inset-x-0 bottom-0 z-30 shadow-2xl overflow-y-auto max-h-full">
          <div className="flex justify-between items-center pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider">
              <Sliders size={12} />
              <span>Google Maps API Key Setup</span>
            </div>
            <button 
              onClick={() => setShowConfigGuide(false)}
              className="text-[10px] text-slate-400 hover:text-white font-extrabold uppercase px-1.5 py-0.5 bg-slate-800 rounded-md"
            >
              Hide
            </button>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            The code has been built with an automatic Google Maps integration. To display the active live map:
          </p>
          <ol className="space-y-1.5 text-[9px] text-slate-400 font-medium">
            <li className="flex gap-1">
              <span className="text-indigo-400 font-bold">1.</span>
              <span>
                Get an API key:{" "}
                <a 
                  href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline font-bold"
                >
                  Create Key Link
                </a>
              </span>
            </li>
            <li className="flex gap-1 items-start">
              <span className="text-indigo-400 font-bold">2.</span>
              <div className="flex-1">
                <span>Add the key as a Secret in the workspace Settings menu:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800/80 mt-1">
                  <span className="font-mono text-slate-300 select-all block truncate text-[8px] flex-1">GOOGLE_MAPS_PLATFORM_KEY</span>
                  <button 
                    onClick={copyKeyInstructions}
                    className="p-1 text-slate-400 hover:text-white bg-slate-900 rounded-md transition-colors"
                    title="Copy secret name"
                  >
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
            </li>
            <li className="flex gap-1">
              <span className="text-indigo-400 font-bold">3.</span>
              <span>The platform automatically rebuilds and loads the live interactive map!</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
