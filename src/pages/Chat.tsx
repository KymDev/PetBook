import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { MessageCircle, Stethoscope, Search, UserCheck, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ChatRoom {
  id: string;
  pet_1: string;
  pet_2: string;
  created_at: string;
  is_professional_chat?: boolean;
  otherParty?: {
    id: string;
    name: string;
    avatar_url: string | null;
    isProfessional: boolean;
    subtitle?: string;
  };
}

const Chat = () => {
  const { t } = useTranslation();
  const { currentPet } = usePet();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (currentPet || user) fetchRooms();
  }, [currentPet, user]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => 
      room.otherParty?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.otherParty?.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rooms, searchQuery]);

  const fetchRooms = async () => {
    if (!user) return;

    const query = currentPet 
      ? `pet_1.eq.${currentPet.id},pet_2.eq.${currentPet.id},pet_2.eq.${user.id}`
      : `pet_2.eq.${user.id}`;

    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .or(query);

    if (error) {
      console.error("Erro ao buscar salas de chat:", error);
      setLoading(false);
      return;
    }

    if (data) {
      const roomsWithDetails = await Promise.all(
        data.map(async (room) => {
          const isPet1Me = currentPet && room.pet_1 === currentPet.id;
          const isPet2Me = (currentPet && room.pet_2 === currentPet.id) || (room.pet_2 === user.id);
          
          const otherId = isPet1Me ? room.pet_2 : room.pet_1;

          const { data: petData } = await supabase
            .from("pets")
            .select("id, name, avatar_url, guardian_name, species")
            .eq("id", otherId)
            .maybeSingle();

          if (petData) {
            return {
              ...room,
              otherParty: {
                id: petData.id,
                name: petData.name,
                avatar_url: petData.avatar_url,
                isProfessional: false,
                subtitle: `Tutor: ${petData.guardian_name || 'N/A'} • ${petData.species || 'Pet'}`
              }
            };
          }

          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("id, full_name, professional_avatar_url, professional_service_type")
            .eq("id", otherId)
            .maybeSingle();

          if (profileData) {
            return {
              ...room,
              otherParty: {
                id: profileData.id,
                name: profileData.full_name || "Profissional",
                avatar_url: profileData.professional_avatar_url,
                isProfessional: true,
                subtitle: profileData.professional_service_type || "Profissional de Serviço"
              }
            };
          }

          return { ...room };
        })
      );
      
      setRooms(roomsWithDetails.filter(r => r.otherParty) as ChatRoom[]);
    }
    setLoading(false);
  };

  const isProfessional = profile?.account_type === 'professional';

  return (
    <MainLayout>
      <div className="container max-w-xl py-8 px-4 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight">{t("common.chat")}</h1>
            {isProfessional && (
              <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                Modo Profissional
              </span>
            )}
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-inner"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-full bg-muted/40 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <Card className="border-none bg-muted/10 shadow-inner">
            <CardContent className="py-16 text-center">
              <div className="bg-background w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-border/50">
                <MessageCircle className="h-8 w-8 text-primary/40" />
              </div>
              <p className="font-bold text-foreground/80">Nenhuma conversa ainda</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                {isProfessional 
                  ? "Aguarde o contato de clientes ou inicie conversas pelo painel." 
                  : "Inicie uma conversa visitando o perfil de um pet ou profissional."}
              </p>
            </CardContent>
          </Card>
        ) : filteredRooms.length === 0 ? (
          <Card className="border-none bg-muted/10 shadow-inner">
            <CardContent className="py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum resultado encontrado para "{searchQuery}"</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => (
              <Link 
                key={room.id} 
                to={room.otherParty?.isProfessional ? `/chat/professional/${room.otherParty.id}` : `/chat/pet/${room.otherParty?.id}`}
                className="block group"
              >
                <Card className="border-primary/5 group-hover:border-primary/20 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 border-2 border-primary/5 group-hover:border-primary/20 transition-colors">
                        <AvatarImage src={room.otherParty?.avatar_url || undefined} />
                        <AvatarFallback className={cn(
                          "font-bold",
                          room.otherParty?.isProfessional ? "bg-blue-500 text-white" : "bg-primary/10 text-primary"
                        )}>
                          {room.otherParty?.isProfessional ? <Stethoscope className="h-6 w-6" /> : room.otherParty?.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {room.otherParty?.isProfessional && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 border-2 border-white w-4 h-4 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {room.otherParty?.name}
                        </p>
                        {room.otherParty?.isProfessional && (
                          <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                            {t("common.professional")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        {!room.otherParty?.isProfessional && <UserCheck size={12} className="text-primary/50" />}
                        <span className="truncate">{room.otherParty?.subtitle}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Chat;
