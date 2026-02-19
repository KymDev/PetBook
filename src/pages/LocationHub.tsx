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
  X,
  AlertTriangle,
  Plus,
  MessageCircle,
  Trash2,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

interface MissingPet {
  id: string;
  pet_id: string;
  user_id: string;
  description: string;
  last_seen_location: string;
  latitude: number;
  longitude: number;
  contact_whatsapp: string;
  photo_url: string;
  is_found: boolean;
  created_at: string;
  pet?: {
    name: string;
    breed: string;
    avatar_url: string;
  };
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
  const { user } = useAuth();
  const { myPets } = usePet();
  const { profile } = useUserProfile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [missingPets, setMissingPets] = useState<MissingPet[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedMissingPet, setSelectedMissingPet] = useState<MissingPet | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  
  // Modal states
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [selectedPetId, setSelectedPetId] = useState("");
  const [isThirdPartyPet, setIsThirdPartyPet] = useState(false);
  const [isProfessionalOwnPet, setIsProfessionalOwnPet] = useState(false);
  const [thirdPartyPetName, setThirdPartyPetName] = useState("");
  const [missingDescription, setMissingDescription] = useState("");
  const [missingLocation, setMissingLocation] = useState("");
  const [missingWhatsapp, setMissingWhatsapp] = useState("");
  const [missingPhotoFile, setMissingPhotoFile] = useState<File | null>(null);
  const [missingPhotoUrl, setMissingPhotoUrl] = useState<string | null>(null);

  const typeConfig: Record<string, { icon: any, color: string, label: string, emoji: string, markerColor: string }> = {
    veterinario: { icon: Stethoscope, color: "bg-rose-500", label: "Veterinários", emoji: "🏥", markerColor: "#f43f5e" },
    groomer: { icon: Scissors, color: "bg-pink-500", label: "Banho & Tosa", emoji: "✂️", markerColor: "#ec4899" },
    passeador: { icon: Dog, color: "bg-green-500", label: "Passeadores", emoji: "🐕", markerColor: "#22c55e" },
    adestrador: { icon: Award, color: "bg-purple-500", label: "Adestradores", emoji: "🎓", markerColor: "#a855f7" },
    pet_sitter: { icon: Hotel, color: "bg-orange-500", label: "Pet Sitter", emoji: "🏠", markerColor: "#f97316" },
    petshop: { icon: ShoppingBag, color: "bg-blue-500", label: "Pet Shops", emoji: "🛍️", markerColor: "#3b82f6" },
    parque: { icon: Trees, color: "bg-emerald-500", label: "Parques", emoji: "🌳", markerColor: "#10b981" },
    cafe: { icon: Coffee, color: "bg-amber-700", label: "Cafés", emoji: "☕", markerColor: "#b45309" },
    missing: { icon: AlertTriangle, color: "bg-red-600", label: "Desaparecidos", emoji: "🚨", markerColor: "#dc2626" },
    outros: { icon: MapPin, color: "bg-slate-500", label: "Outros", emoji: "📍", markerColor: "#64748b" }
  };

  const mapStyle = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  useEffect(() => {
    getLocation();
    fetchMissingPets();
  }, []);

  // Esconder controles quando algo for selecionado no mobile
  useEffect(() => {
    if ((selectedPlace || selectedMissingPet) && window.innerWidth < 768) {
      setIsControlsVisible(false);
    } else {
      setIsControlsVisible(true);
    }
  }, [selectedPlace, selectedMissingPet]);

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

  const fetchMissingPets = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("missing_pets")
        .select(`
          *,
          pet:pets(name, breed, avatar_url)
        `)
        .eq("is_found", false)
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) throw error;
      setMissingPets(data || []);
    } catch (err) {
      console.error("Erro ao carregar pets desaparecidos:", err);
    }
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
    setSelectedMissingPet(null);
    setSearchQuery(place.name);
    setShowResults(false);
  };

  const handleSelectMissingPet = (missingPet: MissingPet) => {
    setSelectedMissingPet(missingPet);
    setSelectedPlace(null);
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

  const handleTraceRoute = (place: Place | MissingPet) => {
    const lat = 'latitude' in place ? place.latitude : place.lat;
    const lng = 'longitude' in place ? place.longitude : place.lng;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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

  const handleContactWhatsapp = (missingPet: MissingPet) => {
    const message = encodeURIComponent(`Olá, vi seu pet ${missingPet.pet?.name} no mapa do PetBook e gostaria de ajudar.`);
    const url = `https://wa.me/${missingPet.contact_whatsapp.replace(/\D/g, '')}?text=${message}`;
    window.open(url, '_blank');
  };

  const handleDeleteMissingPet = async (id: string) => {
    try {
      const { error } = await supabase
        .from("missing_pets")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Anúncio removido com sucesso!");
      setMissingPets(prev => prev.filter(p => p.id !== id));
      setSelectedMissingPet(null);
    } catch (err) {
      toast.error("Erro ao remover o anúncio.");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMissingPhotoFile(file);
      setMissingPhotoUrl(URL.createObjectURL(file));
    }
  };

  const uploadMissingPhoto = async (): Promise<string | null> => {
    if (!missingPhotoFile || !user) return null;
    
    const fileExt = missingPhotoFile.name.split(".").pop();
    const fileName = `missing-${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `missing_pets/${fileName}`;

    const { error } = await supabase.storage
      .from("petbook-media")
      .upload(filePath, missingPhotoFile);

    if (error) throw error;

    const { data } = supabase.storage
      .from("petbook-media")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleReportMissing = async () => {
    const isProfessional = profile?.account_type === 'professional';
    const needsPetName = isThirdPartyPet || (isProfessional && isProfessionalOwnPet);
    
    if (!user || (!selectedPetId && !needsPetName) || !missingLocation || !missingWhatsapp) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (needsPetName && !thirdPartyPetName) {
      toast.error("Por favor, informe o nome do pet.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPhotoUrl = "";
      
      if (missingPhotoFile) {
        finalPhotoUrl = await uploadMissingPhoto() || "";
      } else if (!isThirdPartyPet) {
        const pet = myPets.find(p => p.id === selectedPetId);
        finalPhotoUrl = pet?.avatar_url || "";
      }

      const insertData: any = {
        user_id: user.id,
        description: isThirdPartyPet ? `[PET: ${thirdPartyPetName}] ${missingDescription}` : missingDescription,
        last_seen_location: missingLocation,
        latitude: userLocation?.lat || -23.5505,
        longitude: userLocation?.lng || -46.6333,
        contact_whatsapp: missingWhatsapp,
        photo_url: finalPhotoUrl,
        is_found: false
      };

      if (!isThirdPartyPet && !isProfessionalOwnPet) {
        insertData.pet_id = selectedPetId;
      }

      const { data, error } = await supabase
        .from("missing_pets")
        .insert(insertData)
        .select(`
          *,
          pet:pets(name, breed, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Se for pet de terceiro ou de profissional sem cadastro, o join com 'pet' virá nulo
      const displayData = {
        ...data,
        pet: data.pet || { 
          name: thirdPartyPetName, 
          breed: isProfessionalOwnPet ? "Meu Pet (Profissional)" : "Pet de Terceiro", 
          avatar_url: finalPhotoUrl 
        }
      };

      setMissingPets(prev => [displayData, ...prev]);
      setIsMissingModalOpen(false);
      toast.success("Pet cadastrado como desaparecido!");
      
      // Reset form
      setSelectedPetId("");
      setIsThirdPartyPet(false);
      setIsProfessionalOwnPet(false);
      setThirdPartyPetName("");
      setMissingDescription("");
      setMissingLocation("");
      setMissingWhatsapp("");
      setMissingPhotoFile(null);
      setMissingPhotoUrl(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cadastrar pet desaparecido.");
    } finally {
      setIsSubmitting(false);
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

  const createMissingPetMarker = (photoUrl: string) => {
    return L.divIcon({
      className: 'missing-pet-icon',
      html: `
        <div class="missing-marker-wrapper">
          <div class="missing-emoji-float">🚨</div>
          <div class="missing-photo-container">
            <img src="${photoUrl || '/placeholder-pet.png'}" class="missing-photo" />
          </div>
          <div class="missing-marker-pin"></div>
        </div>
      `,
      iconSize: [50, 60], iconAnchor: [25, 60], popupAnchor: [0, -60]
    });
  };

  const userIcon = L.divIcon({
    className: 'user-location-icon',
    html: `<div class="user-marker"><div class="user-ping"></div><div class="user-dot"></div></div>`,
    iconSize: [24, 24], iconAnchor: [12, 12]
  });

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] w-full bg-white relative overflow-hidden">
        
        {/* SEÇÃO 1: CONTROLES - Com transição suave de visibilidade */}
        <div className={cn(
          "p-4 space-y-4 border-b border-slate-100 shadow-sm z-[1001] bg-white relative transition-all duration-300",
          (!isControlsVisible || isMissingModalOpen) && "-translate-y-full opacity-0 pointer-events-none h-0 p-0 border-0"
        )}>
          {/* Busca com Lista de Resultados */}
          <div className="max-w-2xl mx-auto relative">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Search className="h-5 w-5" />
                </div>
                <input 
                  type="text" 
                  placeholder="Buscar veterinários, pet shops..." 
                  className="w-full pl-12 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button 
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedPlace(null);
                        setShowResults(false);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={getLocation}
                    className="p-2 hover:bg-white rounded-xl transition-colors text-primary"
                  >
                    <LocateFixed className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Botão Pet Desaparecido */}
              <button 
                onClick={() => setIsMissingModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 transition-all active:scale-95 shrink-0"
                title="Pet Desaparecido"
              >
                <AlertTriangle className="h-6 w-6" />
              </button>
            </div>

            {/* LISTA DE RESULTADOS DINÂMICA */}
            {showResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto z-[1002] animate-in fade-in slide-in-from-top-2">
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

        {/* Botão para mostrar controles novamente se estiverem escondidos (Mobile) */}
        {!isControlsVisible && (selectedPlace || selectedMissingPet) && (
          <button 
            onClick={() => {
              setSelectedPlace(null);
              setSelectedMissingPet(null);
            }}
            className="absolute top-4 left-4 z-[1002] bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-200 text-slate-900 animate-in fade-in zoom-in duration-300"
          >
            <ChevronDown className="h-6 w-6 rotate-180" />
          </button>
        )}

        {/* SEÇÃO 2: MAPA */}
        <div className="flex-1 relative w-full overflow-hidden z-[1]" onClick={() => setShowResults(false)}>
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
              {(selectedPlace || selectedMissingPet) && (
                <ChangeView 
                  center={selectedPlace ? [selectedPlace.lat, selectedPlace.lng] : [selectedMissingPet!.latitude, selectedMissingPet!.longitude]} 
                />
              )}
              
              {/* Marcadores de Lugares e Profissionais */}
              {filteredPlaces.map((place) => (
                <Marker 
                  key={place.id} 
                  position={[place.lat, place.lng]} 
                  icon={createCustomMarker(place.type, !!place.is_professional)}
                  eventHandlers={{ click: () => handleSelectPlace(place) }}
                />
              ))}

              {/* Marcadores de Pets Desaparecidos */}
              {(filter === "all" || filter === "missing") && missingPets.map((missingPet) => (
                <Marker 
                  key={missingPet.id} 
                  position={[missingPet.latitude, missingPet.longitude]} 
                  icon={createMissingPetMarker(missingPet.photo_url || missingPet.pet?.avatar_url || "")}
                  eventHandlers={{ click: () => handleSelectMissingPet(missingPet) }}
                />
              ))}
            </MapContainer>
          )}
        </div>

        {/* SEÇÃO 3: DETALHES DE LUGARES */}
        {selectedPlace && (
          <div className="bg-white border-t border-slate-100 p-6 animate-in slide-in-from-bottom-full duration-300 z-[1001] relative rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-center -mt-4 mb-2">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
              </div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm", selectedPlace.is_professional ? "bg-blue-600" : (typeConfig[selectedPlace.type] || typeConfig.outros).color)}>{(typeConfig[selectedPlace.type] || typeConfig.outros).emoji}</div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-1">{selectedPlace.name}{selectedPlace.is_professional && <BadgeCheck className="h-5 w-5 text-blue-600" />}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{(typeConfig[selectedPlace.type] || typeConfig.outros).label} • {selectedPlace.address}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPlace(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleTraceRoute(selectedPlace)} className="rounded-xl h-12 bg-slate-900 hover:bg-slate-800 font-black text-sm gap-2"><Navigation className="h-4 w-4" /> Traçar Rota</Button>
                <Button variant="outline" onClick={() => handleViewDetails(selectedPlace)} className="rounded-xl h-12 border-slate-200 font-black text-sm text-slate-700 hover:bg-slate-50 gap-2">{selectedPlace.is_professional ? <ExternalLink className="h-4 w-4" /> : <Search className="h-4 w-4" />} Ver Detalhes</Button>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 4: DETALHES DE PET DESAPARECIDO */}
        {selectedMissingPet && (
          <div className="bg-white border-t-4 border-red-600 p-6 animate-in slide-in-from-bottom-full duration-300 z-[1001] relative rounded-t-[32px] shadow-[0_-10px_40px_rgba(220,38,38,0.15)]">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-center -mt-4 mb-2">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
              </div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-red-600 shadow-md shrink-0">
                    <img src={selectedMissingPet.photo_url || selectedMissingPet.pet?.avatar_url || '/placeholder-pet.png'} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-red-600 text-xl truncate">
                      {selectedMissingPet.pet?.name} DESAPARECIDO
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tight truncate">
                      {selectedMissingPet.pet?.breed} • Visto em: {selectedMissingPet.last_seen_location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user?.id === selectedMissingPet.user_id && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-600 bg-slate-50 rounded-full"
                      onClick={() => handleDeleteMissingPet(selectedMissingPet.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                  <button onClick={() => setSelectedMissingPet(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="h-4 w-4" /></button>
                </div>
              </div>
              
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {selectedMissingPet.description || "Sem descrição adicional fornecida."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleTraceRoute(selectedMissingPet)} className="rounded-xl h-12 bg-slate-900 hover:bg-slate-800 font-black text-sm gap-2">
                  <Navigation className="h-4 w-4" /> Traçar Rota
                </Button>
                <Button onClick={() => handleContactWhatsapp(selectedMissingPet)} className="rounded-xl h-12 bg-green-600 hover:bg-green-700 font-black text-sm text-white gap-2 shadow-lg shadow-green-100">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              </div>
              
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                Publicado em {new Date(selectedMissingPet.created_at).toLocaleDateString()} • Expira em 7 dias
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal para reportar pet desaparecido */}
      <Dialog open={isMissingModalOpen} onOpenChange={setIsMissingModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-0 shadow-2xl z-[10000]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 font-black text-xl">
              <AlertTriangle className="h-6 w-6" /> Reportar Desaparecido
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              Ajude a comunidade a encontrar seu pet. O anúncio expira em 1 semana.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid gap-2">
              <Label className="font-black text-[10px] uppercase text-slate-400 tracking-wider">O pet é seu?</Label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant={(!isThirdPartyPet && !isProfessionalOwnPet) ? "default" : "outline"}
                  className="flex-1 rounded-xl font-bold text-[10px]"
                  onClick={() => {
                    setIsThirdPartyPet(false);
                    setIsProfessionalOwnPet(false);
                  }}
                >
                  Sim, é meu
                </Button>
                <Button 
                  type="button"
                  variant={isThirdPartyPet ? "default" : "outline"}
                  className="flex-1 rounded-xl font-bold text-[10px]"
                  onClick={() => {
                    setIsThirdPartyPet(true);
                    setIsProfessionalOwnPet(false);
                  }}
                >
                  Não, de outra pessoa
                </Button>
                {profile?.account_type === 'professional' && (
                  <Button 
                    type="button"
                    variant={isProfessionalOwnPet ? "default" : "outline"}
                    className="flex-1 rounded-xl font-bold text-[10px]"
                    onClick={() => {
                      setIsProfessionalOwnPet(true);
                      setIsThirdPartyPet(false);
                    }}
                  >
                    Meu Pet (S/ Cadastro)
                  </Button>
                )}
              </div>
            </div>

            {(!isThirdPartyPet && !isProfessionalOwnPet) ? (
              <div className="grid gap-2">
                <Label htmlFor="pet" className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Qual pet desapareceu?</Label>
                {myPets.length > 0 ? (
                  <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                    <SelectTrigger className="rounded-xl h-12 border-slate-200 bg-slate-50 font-bold">
                      <SelectValue placeholder="Selecione um pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {myPets.map(pet => (
                        <SelectItem key={pet.id} value={pet.id} className="font-bold">{pet.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-700">Você não tem pets cadastrados. Use a opção "Meu Pet (S/ Cadastro)" ou "Pet de Terceiro".</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="thirdPartyPetName" className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Nome do Pet</Label>
                <Input 
                  id="thirdPartyPetName" 
                  placeholder="Ex: Totó" 
                  className="rounded-xl h-12 border-slate-200 bg-slate-50 font-bold"
                  value={thirdPartyPetName}
                  onChange={(e) => setThirdPartyPetName(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Foto do Pet {isThirdPartyPet && "*"}</Label>
              <div className="flex items-center gap-4">
                {missingPhotoUrl && (
                  <div className="h-16 w-16 rounded-xl overflow-hidden border-2 border-red-100">
                    <img src={missingPhotoUrl} className="h-full w-full object-cover" />
                  </div>
                )}
                <Label htmlFor="missingPhoto" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all text-slate-500 font-bold text-sm">
                    <Plus className="h-4 w-4" />
                    {missingPhotoUrl ? "Alterar Foto" : "Adicionar Foto"}
                  </div>
                  <Input
                    id="missingPhoto"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </Label>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location" className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Onde foi visto por último?</Label>
              <Input 
                id="location" 
                placeholder="Ex: Próximo ao Parque Central" 
                className="rounded-xl h-12 border-slate-200 bg-slate-50 font-bold"
                value={missingLocation}
                onChange={(e) => setMissingLocation(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="whatsapp" className="font-black text-[10px] uppercase text-slate-400 tracking-wider">WhatsApp de Contato</Label>
              <Input 
                id="whatsapp" 
                placeholder="Ex: 11999999999" 
                className="rounded-xl h-12 border-slate-200 bg-slate-50 font-bold"
                value={missingWhatsapp}
                onChange={(e) => setMissingWhatsapp(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Descrição/Características</Label>
              <Textarea 
                id="description" 
                placeholder="Ex: Usava coleira azul, é muito dócil..." 
                className="rounded-xl border-slate-200 bg-slate-50 min-h-[100px] font-bold"
                value={missingDescription}
                onChange={(e) => setMissingDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl gap-2 shadow-lg shadow-red-100 transition-all active:scale-95"
              onClick={handleReportMissing}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Publicando..." : <><Plus className="h-5 w-5" /> Publicar no Mapa</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .marker-container { background-color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.15); border: 3px solid #64748b; position: relative; }
        .marker-emoji { font-size: 20px; }
        .professional-check { position: absolute; top: -6px; right: -6px; background-color: #2563eb; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid white; font-weight: bold; }
        .marker-pin { width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #64748b; margin-left: 12px; margin-top: -2px; }
        
        .missing-marker-wrapper { position: relative; width: 50px; height: 60px; display: flex; flex-direction: column; align-items: center; }
        .missing-emoji-float { position: absolute; top: -15px; font-size: 20px; animation: bounce 1s infinite; z-index: 10; }
        .missing-photo-container { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #dc2626; overflow: hidden; background: white; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4); z-index: 5; }
        .missing-photo { width: 100%; height: 100%; object-fit: cover; }
        .missing-marker-pin { width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #dc2626; margin-top: -2px; }
        
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        .user-marker { position: relative; width: 24px; height: 24px; }
        .user-dot { width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); position: absolute; top: 4px; left: 4px; z-index: 2; }
        .user-ping { position: absolute; width: 48px; height: 48px; background: rgba(59, 130, 246, 0.2); border-radius: 50%; top: -12px; left: -12px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        
        .loader-uber { width: 48px; height: 48px; border: 4px solid #f1f5f9; border-top: 4px solid #0f172a; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .leaflet-container { background: #f8fafc !important; z-index: 1 !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .leaflet-pane { z-index: 1 !important; }
        .leaflet-top, .leaflet-bottom { z-index: 2 !important; }
        
        /* Garantir que o modal do Radix UI fique acima de tudo */
        [data-radix-portal] { z-index: 10000 !important; }
      `}</style>
    </MainLayout>
  );
};

export default LocationHub;
