import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { MessageCircle, Stethoscope, Search } from "lucide-react";

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
  const { currentPet } = usePet();
  const { user } = useAuth();
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

    // Busca salas onde o pet atual está envolvido OU onde o usuário (se profissional) está envolvido
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
          // Determina quem é a outra parte
          const isPet1Me = currentPet && room.pet_1 === currentPet.id;
          const isPet2Me = (currentPet && room.pet_2 === currentPet.id) || (room.pet_2 === user.id);
          
          const otherId = isPet1Me ? room.pet_2 : room.pet_1;

          // Tenta buscar como Pet primeiro
          const { data: petData } = await supabase
            .from("pets")
            .select("id, name, avatar_url, guardian_instagram_username")
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
                subtitle: `@${petData.guardian_instagram_username}`
              }
            };
          }

          // Se não for pet, tenta buscar como Profissional (User Profile)
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
      
      // Filtra salas que não conseguimos identificar a outra parte
      setRooms(roomsWithDetails.filter(r => r.otherParty) as ChatRoom[]);
    }
    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-4">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-heading font-bold">Conversas</h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-muted/50 border-0 focus-visible:ring-primary"
            />
          </div>
        </div>

        {loading ? (
          <Card className="card-elevated border-0">
            <CardContent className="p-6 text-center text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        ) : rooms.length === 0 ? (
          <Card className="card-elevated border-0">
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma conversa ainda</p>
              <p className="text-sm text-muted-foreground">
                Inicie uma conversa visitando o perfil de um pet ou profissional
              </p>
            </CardContent>
          </Card>
        ) : filteredRooms.length === 0 ? (
          <Card className="card-elevated border-0">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum resultado encontrado para "{searchQuery}"</p>
            </CardContent>
          </Card>
        ) : (
          filteredRooms.map((room) => (
            <Link 
              key={room.id} 
              to={room.otherParty?.isProfessional ? `/chat/professional/${room.otherParty.id}` : `/chat/pet/${room.otherParty?.id}`}
            >
              <Card className="card-elevated border-0 hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={room.otherParty?.avatar_url || undefined} />
                    <AvatarFallback className={room.otherParty?.isProfessional ? "bg-blue-500 text-white" : ""}>
                      {room.otherParty?.isProfessional ? <Stethoscope className="h-6 w-6" /> : room.otherParty?.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{room.otherParty?.name}</p>
                      {room.otherParty?.isProfessional && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                          Profissional
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {room.otherParty?.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default Chat;
