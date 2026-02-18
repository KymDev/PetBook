import { useState, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Navigation, 
  Search, 
  Stethoscope, 
  Trees, 
  ShoppingBag, 
  Coffee,
  LocateFixed,
  BadgeCheck,
  Star,
  ChevronRight,
  ChevronLeft,
  Award,
  Dog,
  Hotel,
  Scissors,
  ExternalLink,
  Users,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from "react-router-dom";

// Fix para ícones padrão do Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Place {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  is_professional?: boolean;
}

const ChangeView = ({ center, zoom = 17 }: { center: [number, number], zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
};

const LocationHub = () => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const typeConfig: Record<string, { icon: any, color: string, label: string, emoji: string, markerColor: string }> = {
    veterinario: { icon: Stethoscope, color: "bg-rose-500", label: "Veterinários", emoji: "🏥", markerColor: "#f43f5e" },
    groomer: { icon: Scissors, color: "bg-pink-500", label: "Banho & Tosa", emoji: "✂️", markerColor: "#ec4899" },
    passeador: { icon: Dog, color: "bg-green-500", label: "Passeadores", emoji: "🐕", markerColor: "#22c55e" },
    adestrador: { icon: Award, color: "bg-purple-500", label: "Adestradores", emoji: "🎓", markerColor: "#a855f7" },
    pet_sitter: { icon: Hotel, color: "bg-orange-500", label: "Pet Sitter", emoji: "🏠", markerColor: "#f97316" },
    petshop: { icon: ShoppingBag, color: "bg-blue-500", label: "Pet Shops", emoji: "🛍️", markerColor: "#3b82f6" },
    parque: { icon: Trees, color: "bg-emerald-500", label: "Parques", emoji: "🌳", markerColor: "#10b981" },
    cafe: { icon: Coffee, color: "bg-amber-700", label: "Cafés", emoji: "☕", markerColor: "#b45309" },
    outros: { icon: MapPin, color: "bg-slate-500", label: "Outros", emoji: "📍", markerColor: "#64748b" }
  };

  const mapStyle = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          fetchNearbyPlaces(loc);
        },
        () => useDefaultLocation(),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      useDefaultLocation();
    }
  };

  const useDefaultLocation = () => {
    const defaultLoc = { lat: -23.5505, lng: -46.6333 }; 
    setUserLocation(defaultLoc);
    fetchNearbyPlaces(defaultLoc);
  };

  const fetchNearbyPlaces = async (loc: {lat: number, lng: number}) => {
    try {
      setLoading(true);
      const { data: profProfiles } = await supabase.from("user_profiles")
        .select("id, full_name, professional_service_type, professional_address, professional_latitude, professional_longitude")
        .eq("account_type", "professional")
        .not("professional_latitude", "is", null);

      const mappedProfessions: Place[] = (profProfiles || []).map(p => ({
        id: p.id,
        name: p.full_name || "Profissional Pet",
        type: p.professional_service_type || "outros",
        address: p.professional_address || "Endereço comercial",
        lat: p.professional_latitude || 0,
        lng: p.professional_longitude || 0,
        is_professional: true,
        rating: 4.5 + Math.random() * 0.5
      }));

      const { data: dbPlaces } = await supabase.from("places").select("*").limit(50);
      const combined = [...(dbPlaces || []).map(p => ({...p, is_professional: false})), ...mappedProfessions];
      
      if (combined.length === 0) {
        setPlaces([
          { id: "m1", name: "Vet Central", type: "veterinario", address: "Av. Paulista, 1000", lat: loc.lat + 0.002, lng: loc.lng + 0.002, rating: 4.9, is_professional: true },
          { id: "m2", name: "Pet Groomer", type: "groomer", address: "Rua Augusta, 500", lat: loc.lat - 0.003, lng: loc.lng + 0.001, rating: 4.8, is_professional: true },
          { id: "m3", name: "Parque Ibirapuera", type: "parque", address: "Vila Mariana", lat: loc.lat + 0.005, lng: loc.lng - 0.002, rating: 4.7 },
          { id: "m4", name: "Dog Walker Pro", type: "passeador", address: "Jardins", lat: loc.lat - 0.001, lng: loc.lng - 0.004, rating: 5.0, is_professional: true },
        ]);
      } else {
        setPlaces(combined as Place[]);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaces = useMemo(() => {
    let result = filter === "all" ? places : places.filter(p => p.type === filter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.address.toLowerCase().includes(query) ||
        (p.type && typeConfig[p.type]?.label.toLowerCase().includes(query))
      );
    }
    return result;
  }, [places, filter, searchQuery]);

  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setShowResults(false);
  };

  const scrollFilters = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleTraceRoute = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    window.open(url, '_blank');
  };

  const handleViewDetails = (place: Place) => {
    if (place.is_professional) {
      navigate(`/professional/${place.id}`);
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}`;
      window.open(url, '_blank');
    }
  };

  const createCustomMarker = (type: string, isProfessional: boolean) => {
    const config = typeConfig[type] || typeConfig.outros;
    const color = isProfessional ? "#2563eb" : config.markerColor;
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="marker-container" style="border-color: ${color}"><span class="marker-emoji">${config.emoji}</span>${isProfessional ? '<div class="professional-check">✓</div>' : ''}</div><div class="marker-pin" style="border-top-color: ${color}"></div>`,
      iconSize: [40, 48], iconAnchor: [20, 48], popupAnchor: [0, -48]
    });
  };

  const userIcon = L.divIcon({
    className: 'user-location-icon',
    html: `<div class="user-marker"><div class="user-ping"></div><div class="user-dot"></div></div>`,
    iconSize: [24, 24], iconAnchor: [12, 12]
  });

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] w-full bg-white">
        
        {/* SEÇÃO 1: CONTROLES */}
        <div className="p-4 space-y-4 border-b border-slate-100 shadow-sm z-[2000]">
          {/* Busca com Lista de Resultados */}
          <div className="max-w-2xl mx-auto relative">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <input 
                type="text" 
                placeholder="Buscar veterinários, pet shops ou endereços..." 
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
              />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedPlace(null);
                    setShowResults(false);
                  }}
                  className="absolute right-14 p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={getLocation}
                className="absolute right-4 p-2 hover:bg-white rounded-xl transition-colors text-primary"
              >
                <LocateFixed className="h-5 w-5" />
              </button>
            </div>

            {/* LISTA DE RESULTADOS DINÂMICA */}
            {showResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto z-[3000] animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {filteredPlaces.length} Opções Encontradas
                  </span>
                </div>
                {filteredPlaces.length > 0 ? (
                  filteredPlaces.map((place) => (
                    <div 
                      key={place.id}
                      onClick={() => handleSelectPlace(place)}
                      className="p-4 hover:bg-slate-50 cursor-pointer flex items-center gap-4 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0",
                        place.is_professional ? "bg-blue-100 text-blue-600" : (typeConfig[place.type] || typeConfig.outros).color + " bg-opacity-10"
                      )}>
                        {(typeConfig[place.type] || typeConfig.outros).emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate flex items-center gap-1">
                          {place.name}
                          {place.is_professional && <BadgeCheck className="h-4 w-4 text-blue-600" />}
                        </p>
                        <p className="text-[11px] text-slate-400 font-bold truncate">{place.address}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm font-bold text-slate-400">Nenhum resultado encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="max-w-2xl mx-auto relative flex items-center group">
            <button onClick={() => scrollFilters('left')} className="absolute -left-2 z-10 bg-white p-1.5 rounded-full shadow-md border border-slate-100 hover:bg-slate-50 transition-colors"><ChevronLeft className="h-4 w-4 text-slate-600" /></button>
            <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto py-1 scrollbar-hide px-8 w-full">
              <Button variant={filter === "all" ? "default" : "secondary"} size="sm" onClick={() => setFilter("all")} className={cn("rounded-full shrink-0 font-black text-[10px] uppercase tracking-wider px-5 h-10", filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}>Todos</Button>
              {Object.entries(typeConfig).map(([key, config]) => (
                <Button key={key} variant={filter === key ? "default" : "secondary"} size="sm" onClick={() => setFilter(key)} className={cn("rounded-full shrink-0 gap-2 font-black text-[10px] uppercase tracking-wider px-5 h-10", filter === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}><span>{config.emoji}</span>{config.label}</Button>
              ))}
            </div>
            <button onClick={() => scrollFilters('right')} className="absolute -right-2 z-10 bg-white p-1.5 rounded-full shadow-md border border-slate-100 hover:bg-slate-50 transition-colors"><ChevronRight className="h-4 w-4 text-slate-600" /></button>
          </div>
        </div>

        {/* SEÇÃO 2: MAPA */}
        <div className="flex-1 relative w-full overflow-hidden" onClick={() => setShowResults(false)}>
          {loading && !userLocation ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
              <div className="loader-uber" />
              <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Carregando Mapa...</p>
            </div>
          ) : (
            <MapContainer 
              center={userLocation ? [userLocation.lat, userLocation.lng] : [-23.5505, -46.6333]} 
              zoom={15} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer url={mapStyle} attribution='&copy; CARTO' />
              <ZoomControl position="bottomright" />
              {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />}
              {selectedPlace && <ChangeView center={[selectedPlace.lat, selectedPlace.lng]} />}
              {filteredPlaces.map((place) => (
                <Marker 
                  key={place.id} 
                  position={[place.lat, place.lng]} 
                  icon={createCustomMarker(place.type, !!place.is_professional)}
                  eventHandlers={{ click: () => setSelectedPlace(place) }}
                />
              ))}
            </MapContainer>
          )}
        </div>

        {/* SEÇÃO 3: DETALHES */}
        {selectedPlace && (
          <div className="bg-white border-t border-slate-100 p-6 animate-in slide-in-from-bottom-full duration-300">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm", selectedPlace.is_professional ? "bg-blue-600" : (typeConfig[selectedPlace.type] || typeConfig.outros).color)}>{(typeConfig[selectedPlace.type] || typeConfig.outros).emoji}</div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-1">{selectedPlace.name}{selectedPlace.is_professional && <BadgeCheck className="h-5 w-5 text-blue-600" />}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{(typeConfig[selectedPlace.type] || typeConfig.outros).label} • {selectedPlace.address}</p>
                  </div>
                </div>
                {selectedPlace.rating && <div className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-black"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {selectedPlace.rating.toFixed(1)}</div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleTraceRoute(selectedPlace)} className="rounded-xl h-12 bg-slate-900 hover:bg-slate-800 font-black text-sm gap-2"><Navigation className="h-4 w-4" /> Traçar Rota</Button>
                <Button variant="outline" onClick={() => handleViewDetails(selectedPlace)} className="rounded-xl h-12 border-slate-200 font-black text-sm text-slate-700 hover:bg-slate-50 gap-2">{selectedPlace.is_professional ? <ExternalLink className="h-4 w-4" /> : <Search className="h-4 w-4" />} Ver Detalhes</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .marker-container { background-color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.15); border: 3px solid #64748b; position: relative; }
        .marker-emoji { font-size: 20px; }
        .professional-check { position: absolute; top: -6px; right: -6px; background-color: #2563eb; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid white; font-weight: bold; }
        .marker-pin { width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #64748b; margin-left: 12px; margin-top: -2px; }
        .user-marker { position: relative; width: 24px; height: 24px; }
        .user-dot { width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); position: absolute; top: 4px; left: 4px; z-index: 2; }
        .user-ping { position: absolute; width: 48px; height: 48px; background: rgba(59, 130, 246, 0.2); border-radius: 50%; top: -12px; left: -12px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        .loader-uber { width: 48px; height: 48px; border: 4px solid #f1f5f9; border-top: 4px solid #0f172a; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .leaflet-container { background: #f8fafc !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </MainLayout>
  );
};

export default LocationHub;
