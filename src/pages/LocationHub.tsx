
import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, AlertTriangle, Navigation, Check, X, Store, Briefcase, Search, Info, Loader2 } from "lucide-react";
import { locationHubService, MissingPet, PetFriendlyPlace } from "@/integrations/supabase/locationHubService";
import { getUserLocation, searchNearbyPlaces, Location } from "@/integrations/supabase/geolocationService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Leaflet Icon Fix
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícones Customizados
const createPetIcon = (photoUrl: string) => new L.DivIcon({
    html: `<div class="relative w-14 h-14 rounded-full border-4 border-red-600 bg-white shadow-2xl overflow-hidden transform transition-all hover:scale-125 hover:z-[1000]">
            <img src="${photoUrl}" class="w-full h-full object-cover" />
            <div class="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full border-2 border-white animate-pulse"></div>
          </div>`,
    className: '', iconSize: [56, 56], iconAnchor: [28, 56],
});

const createProfessionalIcon = (avatarUrl: string) => new L.DivIcon({
    html: `<div class="w-12 h-12 rounded-full border-4 border-blue-500 bg-white shadow-xl overflow-hidden transform transition-all hover:scale-110">
            <img src="${avatarUrl || 'https://via.placeholder.com/48'}" class="w-full h-full object-cover" />
          </div>`,
    className: '', iconSize: [48, 48], iconAnchor: [24, 48],
});

const createPlaceIcon = (color: string) => new L.DivIcon({
    html: `<div class="w-10 h-10 rounded-full border-4 border-${color} bg-white shadow-lg flex items-center justify-center text-${color} transform transition-all hover:scale-110">
            <Store size={20} />
          </div>`,
    className: '', iconSize: [40, 40], iconAnchor: [20, 40],
});

const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
    useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
    return null;
};

const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => { map.setView(center, 15); }, [center, map]);
    return null;
};

const LocationHub = () => {
  const { user } = useAuth();
  const { myPets } = usePet();
  const [missingPets, setMissingPets] = useState<MissingPet[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  
  // Modais
  const [isReportingPet, setIsReportingPet] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);

  // Forms
  const [petForm, setPetForm] = useState({ petId: "", desc: "", whatsapp: "", photo: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setMapCenter([loc.latitude, loc.longitude]);
      await loadMapData(loc.latitude, loc.longitude);
    } catch (e) { 
      toast.error("Habilite o GPS para ver locais próximos");
      await loadMapData(mapCenter[0], mapCenter[1]);
    }
    setIsLoading(false);
  };

  const loadMapData = async (lat: number, lon: number) => {
    setIsSearching(true);
    try {
      const [m, pro, osm] = await Promise.all([
        locationHubService.getMissingPets(),
        locationHubService.getProfessionals(),
        searchNearbyPlaces(lat, lon)
      ]);
      setMissingPets(m); 
      setProfessionals(pro || []);
      setNearbyPlaces(osm);
    } catch (e) { toast.error("Erro ao carregar dados do mapa"); }
    finally { setIsSearching(false); }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedCoord([lat, lng]);
    toast("Local marcado!", { description: "Clique em 'Pet Perdido' para lançar um alerta aqui." });
  };

  const handleToggleFriendly = async (place: any, isFriendly: boolean) => {
    if (!user) return toast.error("Faça login para avaliar");
    setIsSubmitting(true);
    try {
      await locationHubService.togglePetFriendlyStatus(place, isFriendly, user.id);
      toast.success(isFriendly ? "Marcado como Pet Friendly! 🐾" : "Marcado como Não Amigável");
      setSelectedPlace(null);
      await loadMapData(mapCenter[0], mapCenter[1]);
    } catch (e) { toast.error("Erro ao salvar avaliação"); }
    finally { setIsSubmitting(false); }
  };

  const handleReportPet = async () => {
    if (!petForm.petId || !petForm.whatsapp || !selectedCoord) return toast.error("Preencha os campos e marque no mapa");
    setIsSubmitting(true);
    try {
      let photoUrl = null;
      if (petForm.photo) photoUrl = await locationHubService.uploadPetPhoto(petForm.photo);
      await locationHubService.reportMissingPet({
        pet_id: petForm.petId, user_id: user?.id, description: petForm.desc,
        contact_whatsapp: petForm.whatsapp, photo_url: photoUrl,
        latitude: selectedCoord[0], longitude: selectedCoord[1]
      });
      toast.success("Alerta de pet perdido publicado!");
      setIsReportingPet(false); setSelectedCoord(null);
      await loadMapData(mapCenter[0], mapCenter[1]);
    } catch (e) { toast.error("Erro ao publicar alerta"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-80px)] relative flex flex-col">
        {/* Barra de Busca Estilo Uber */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2">
            <div className="relative">
                <Input 
                    className="w-full h-14 pl-12 pr-4 rounded-2xl shadow-2xl border-0 bg-white/95 backdrop-blur-md text-lg font-medium"
                    placeholder="Encontre locais pet-friendly ao redor..."
                    readOnly
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" size={20} />}
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Badge className="bg-red-600 hover:bg-red-700 cursor-pointer px-4 py-2 rounded-full shadow-lg" onClick={() => setIsReportingPet(true)}>
                    <AlertTriangle size={14} className="mr-2" /> Pet Perdido
                </Badge>
                <Badge variant="secondary" className="bg-white hover:bg-gray-100 text-black cursor-pointer px-4 py-2 rounded-full shadow-lg border-0">
                    <Store size={14} className="mr-2" /> {nearbyPlaces.length} Locais Reais
                </Badge>
            </div>
        </div>

        {/* Mapa */}
        <div className="flex-1 w-full relative">
            {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-[1001]">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-primary">Solicitando GPS...</p>
                </div>
            ) : (
                <MapContainer center={mapCenter} zoom={15} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapEvents onMapClick={handleMapClick} />
                    <MapUpdater center={mapCenter} />
                    
                    {selectedCoord && <Marker position={selectedCoord}><Popup><p className="font-bold">Local Selecionado</p></Popup></Marker>}

                    {/* Pets Perdidos */}
                    {missingPets.map(p => p.latitude && (
                        <Marker key={p.id} position={[p.latitude, p.longitude!]} icon={createPetIcon(p.photo_url || p.pet?.avatar_url || 'https://via.placeholder.com/64')}>
                            <Popup className="rounded-2xl overflow-hidden">
                                <div className="p-0 w-56">
                                    <div className="bg-red-600 p-2 text-white text-center font-bold text-sm">PET DESAPARECIDO</div>
                                    <img src={p.photo_url || p.pet?.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-32 object-cover" />
                                    <div className="p-3">
                                        <h3 className="font-bold text-lg">{p.pet?.name}</h3>
                                        <Button className="w-full bg-green-500 mt-2" onClick={() => window.open(`https://wa.me/${p.contact_whatsapp?.replace(/\D/g, '')}`)}>
                                            <Phone size={16} className="mr-2" /> WhatsApp
                                        </Button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Profissionais */}
                    {professionals.map(pro => pro.professional_latitude && (
                        <Marker key={pro.id} position={[pro.professional_latitude, pro.professional_longitude]} icon={createProfessionalIcon(pro.professional_avatar_url)}>
                            <Popup><div className="p-2 text-center">
                                <h3 className="font-bold">{pro.full_name}</h3>
                                <Badge variant="outline" className="my-1">{pro.professional_service_type}</Badge>
                                <Button size="sm" variant="outline" className="w-full mt-2 rounded-full" onClick={() => window.location.href=`/professional/${pro.id}`}>Ver Perfil</Button>
                            </div></Popup>
                        </Marker>
                    ))}

                    {/* Locais Reais para Validação */}
                    {nearbyPlaces.map(p => (
                        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={createPlaceIcon("primary")}>
                            <Popup>
                                <div className="p-2 w-48">
                                    <h3 className="font-bold leading-tight">{p.name}</h3>
                                    <p className="text-[10px] text-muted-foreground mb-3">{p.category} • {p.address}</p>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-center mb-1">Este local aceita pets?</p>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 h-8" onClick={() => handleToggleFriendly(p, true)}><Check size={14} /></Button>
                                            <Button size="sm" variant="destructive" className="flex-1 h-8" onClick={() => handleToggleFriendly(p, false)}><X size={14} /></Button>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            )}
            
            <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-3">
                <Button size="icon" className="h-14 w-14 rounded-2xl bg-white text-primary shadow-2xl" onClick={() => userLoc && setMapCenter([userLoc.latitude, userLoc.longitude])}>
                    <Navigation className="h-6 w-6" />
                </Button>
            </div>
        </div>

        {/* Modal Pet Perdido */}
        <Dialog open={isReportingPet} onOpenChange={setIsReportingPet}>
            <DialogContent className="rounded-3xl">
                <DialogHeader><DialogTitle className="text-xl font-bold text-red-600">Lançar Alerta de Pet Perdido</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <select className="w-full p-3 rounded-xl border-2 border-muted" value={petForm.petId} onChange={e => setPetForm({...petForm, petId: e.target.value})}>
                        <option value="">Selecione seu pet...</option>
                        {myPets?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Input placeholder="WhatsApp para contato" value={petForm.whatsapp} onChange={e => setPetForm({...petForm, whatsapp: e.target.value})} />
                    <Textarea placeholder="Descreva onde foi visto..." value={petForm.desc} onChange={e => setPetForm({...petForm, desc: e.target.value})} />
                    {!selectedCoord && <p className="text-xs text-amber-600 font-bold">⚠️ Clique no mapa para marcar onde o pet foi visto.</p>}
                </div>
                <DialogFooter>
                    <Button variant="destructive" className="w-full h-12 rounded-2xl text-lg font-bold" onClick={handleReportPet} disabled={isSubmitting || !selectedCoord}>
                        {isSubmitting ? "Publicando..." : "Publicar no Mapa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default LocationHub;
