import React, { useState } from "react";
import { X, MapPin, Check, Compass, Locate } from "lucide-react";
import GMap from "./GMap";

interface MapLocationModalProps {
  initialLat?: number;
  initialLng?: number;
  state?: string;
  district?: string;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}

export default function MapLocationModal({
  initialLat,
  initialLng,
  state,
  district,
  onConfirm,
  onClose
}: MapLocationModalProps) {
  const [selectedLat, setSelectedLat] = useState<number>(initialLat || 28.6139);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng || 77.2090);
  const [hasSelected, setHasSelected] = useState<boolean>(
    Boolean(initialLat && initialLng && initialLat !== 0 && initialLng !== 0)
  );

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setHasSelected(true);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          setSelectedLat(lat);
          setSelectedLng(lng);
          setHasSelected(true);
        },
        (error) => {
          console.error("Error getting geolocation", error);
          alert("Could not retrieve GPS location. You can still manually drop a pin on the map!");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSave = () => {
    onConfirm(selectedLat, selectedLng);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="map-picker-modal">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <MapPin size={16} />
            </span>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Select Location</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Drop a pin on your approximate location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            id="close-map-picker-modal-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content - Map Container */}
        <div className="p-4 flex-1 flex flex-col space-y-4">
          
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex-1 min-h-[280px]">
            <GMap
              lat={selectedLat}
              lng={selectedLng}
              state={state}
              district={district}
              interactive={true}
              onLocationSelect={handleLocationSelect}
              height="100%"
              className="absolute inset-0"
            />
          </div>

          {/* Location details and GPS controls */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 font-mono text-[10px]">
                <Compass size={13} className="text-indigo-400 animate-spin-slow" />
                <span className="font-extrabold text-slate-400">COORDINATES:</span>
                <span>{selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}</span>
              </div>
              
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-2.5 py-1 rounded-xl text-[9px] text-slate-300 font-bold transition-all cursor-pointer"
                id="gps-locate-btn"
              >
                <Locate size={10} />
                <span>My GPS</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 flex items-start gap-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
              <span className="text-indigo-400 font-bold mt-0.5">Note:</span>
              <span>
                {hasSelected
                  ? "Coordinates configured perfectly! You can move the pin at any time by clicking on different areas of the grid/map."
                  : `Currently centered on ${district || state || "your state"}. Click on the map grid to select your precise shop/listing pin!`}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/40 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs text-slate-300 font-bold transition-all cursor-pointer"
            id="cancel-map-picker-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer"
            id="confirm-map-picker-btn"
          >
            <Check size={14} />
            Confirm Pin
          </button>
        </div>

      </div>
    </div>
  );
}
