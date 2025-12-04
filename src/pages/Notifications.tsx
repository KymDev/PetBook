import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_pet_id: string | null;
  relatedPet?: Pet;
}

const Notifications = () => {
  const { currentPet } = usePet();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (currentPet) fetchNotifications();
  }, [currentPet]);

  const fetchNotifications = async () => {
    if (!currentPet) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("pet_id", currentPet.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const withPets = await Promise.all(
        data.map(async (n) => {
          if (n.related_pet_id) {
            const { data: pet } = await supabase.from("pets").select("*").eq("id", n.related_pet_id).single();
            return { ...n, relatedPet: pet };
          }
          return n;
        })
      );
      setNotifications(withPets);
      
      // Mark as read
      await supabase.from("notifications").update({ is_read: true }).eq("pet_id", currentPet.id).eq("is_read", false);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-4">
        <h1 className="text-2xl font-heading font-bold">Notificações</h1>
        {notifications.length === 0 ? (
          <Card className="card-elevated border-0">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className={`card-elevated border-0 ${!n.is_read ? "ring-2 ring-primary/20" : ""}`}>
              <CardContent className="flex items-center gap-4 p-4">
                {n.relatedPet ? (
                  <Link to={`/pet/${n.relatedPet.id}`}>
                    <Avatar>
                      <AvatarImage src={n.relatedPet.avatar_url || undefined} />
                      <AvatarFallback>{n.relatedPet.name[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
