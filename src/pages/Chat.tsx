import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";

interface ChatRoom {
  id: string;
  pet_1: string;
  pet_2: string;
  created_at: string;
  otherPet?: Pet;
}

const Chat = () => {
  const { currentPet } = usePet();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentPet) fetchRooms();
  }, [currentPet]);

  const fetchRooms = async () => {
    if (!currentPet) return;

    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .or(`pet_1.eq.${currentPet.id},pet_2.eq.${currentPet.id}`);

    if (data) {
      const roomsWithPets = await Promise.all(
        data.map(async (room) => {
          const otherPetId = room.pet_1 === currentPet.id ? room.pet_2 : room.pet_1;
          const { data: petData } = await supabase
            .from("pets")
            .select("*")
            .eq("id", otherPetId)
            .single();
          return { ...room, otherPet: petData };
        })
      );
      setRooms(roomsWithPets);
    }
    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-4">
        <h1 className="text-2xl font-heading font-bold">Conversas</h1>

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
                Visite o perfil de um pet para iniciar um chat
              </p>
            </CardContent>
          </Card>
        ) : (
          rooms.map((room) => (
            <Link key={room.id} to={`/chat/${room.otherPet?.id}`}>
              <Card className="card-elevated border-0 hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={room.otherPet?.avatar_url || undefined} />
                    <AvatarFallback>{room.otherPet?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{room.otherPet?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{room.otherPet?.guardian_instagram_username}
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
