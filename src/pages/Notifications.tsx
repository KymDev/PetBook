import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, UserPlus, Heart, PawPrint, Cookie, Stethoscope, Clock, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_pet_id: string | null;
  related_user_id: string | null;
  related_post_id: string | null;
  relatedPet?: Pet;
  relatedUser?: { full_name: string, professional_avatar_url: string | null, account_type: string };
  isFollowingBack?: boolean;
}

const Notifications = () => {
  const { currentPet, followPet, unfollowPet, isProfessionalFollowing } = usePet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingFollow, setLoadingFollow] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const { profile } = useUserProfile();
  const { user } = useAuth();

  useEffect(() => {
    const isProfessional = profile?.account_type === 'professional';
    if (currentPet || (isProfessional && user)) fetchNotifications();
  }, [currentPet, profile, user]);

  const checkFollowingStatus = async (n: Notification) => {
    if (!n.related_pet_id) return false;
    
    const isProfessional = profile?.account_type === 'professional';
    
    if (isProfessional) {
      return await isProfessionalFollowing(n.related_pet_id);
    } else if (currentPet) {
      const { data } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", currentPet.id)
        .eq("target_pet_id", n.related_pet_id)
        .eq("is_user_follower", false)
        .single();
      return !!data;
    }
    return false;
  };

  const fetchNotifications = async () => {
    const isProfessional = profile?.account_type === 'professional';
    
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (isProfessional && user) {
      query = query.eq("related_user_id", user.id);
    } else if (user) {
      const { data: userPets } = await supabase.from("pets").select("id").eq("user_id", user.id);
      const petIds = userPets?.map(p => p.id) || [];
      if (petIds.length > 0) {
        query = query.in("pet_id", petIds);
      } else {
        setNotifications([]);
        return;
      }
    } else {
      return;
    }

    const { data } = await query;

    if (data) {
      const withRelatedData = await Promise.all(
        data.map(async (n) => {
          let relatedPet: Pet | undefined;
          let relatedUser: any | undefined;
          let isFollowingBack = false;

          if (n.related_pet_id) {
            const { data: pet } = await supabase.from("pets").select("*").eq("id", n.related_pet_id).single();
            relatedPet = pet as Pet;
            
            if (n.type === 'follow') {
              isFollowingBack = await checkFollowingStatus({ ...n, related_pet_id: n.related_pet_id });
            }
          } else if (n.related_user_id) {
            const { data: userProfile } = await supabase.from("user_profiles").select("full_name, professional_avatar_url, account_type").eq("id", n.related_user_id).single();
            relatedUser = userProfile;
          }

          return { ...n, relatedPet, relatedUser, isFollowingBack };
        })
      );
      setNotifications(withRelatedData);
      
      // Mark as read
      let updateQuery = supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      if (isProfessional && user) {
        await updateQuery.eq("related_user_id", user.id);
      } else if (user) {
        const { data: userPets } = await supabase.from("pets").select("id").eq("user_id", user.id);
        const petIds = userPets?.map(p => p.id) || [];
        if (petIds.length > 0) {
          await updateQuery.in("pet_id", petIds);
        }
      }
    }
  };

  const handleFollowBack = async (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation();
    if (!n.related_pet_id) return;

    setLoadingFollow(prev => ({ ...prev, [n.id]: true }));
    try {
      if (n.isFollowingBack) {
        await unfollowPet(n.related_pet_id);
        toast({ title: "Deixou de seguir", description: `Você não segue mais ${n.relatedPet?.name}.` });
      } else {
        await followPet(n.related_pet_id);
        toast({ title: "Seguindo de volta", description: `Agora você segue ${n.relatedPet?.name}!` });
      }
      
      // Atualiza o estado local
      setNotifications(prev => prev.map(item => 
        item.id === n.id ? { ...item, isFollowingBack: !item.isFollowingBack } : item
      ));
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível completar a ação.", 
        variant: "destructive" 
      });
    } finally {
      setLoadingFollow(prev => ({ ...prev, [n.id]: false }));
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (n.related_post_id) {
      if (n.related_pet_id) navigate(`/pet/${n.related_pet_id}`);
    } else if (n.related_pet_id) {
      navigate(`/pet/${n.related_pet_id}`);
    } else if (n.type === 'health_access_request' || n.type === 'health_reminder') {
      if (currentPet) navigate(`/pets/${currentPet.id}/saude`);
    } else if (n.type === 'health_access_granted') {
      if (n.related_pet_id) navigate(`/pet/${n.related_pet_id}/health`);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-xl px-4 py-6 space-y-4">
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
            <Card 
              key={n.id} 
              className={`card-elevated border-0 cursor-pointer transition-colors hover:bg-muted/50 ${!n.is_read ? "ring-2 ring-primary/20" : ""}`}
              onClick={() => handleNotificationClick(n)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {n.relatedPet ? (
                  <Avatar>
                    <AvatarImage src={n.relatedPet.avatar_url || undefined} />
                    <AvatarFallback>{n.relatedPet.name[0]}</AvatarFallback>
                  </Avatar>
                ) : n.relatedUser ? (
                  <Avatar>
                    <AvatarImage src={n.relatedUser.professional_avatar_url || undefined} />
                    <AvatarFallback className={n.relatedUser?.account_type === 'professional' ? 'bg-secondary text-secondary-foreground' : ''}>
                      {n.relatedUser?.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="mt-1">
                        {(() => {
                          switch (n.type) {
                            case "message": return <MessageSquare className="h-4 w-4 text-blue-500" />;
                            case "follow": return <UserPlus className="h-4 w-4 text-primary" />;
                            case "like": return <Heart className="h-4 w-4 text-secondary" />;
                            case "abraco": return <Heart className="h-4 w-4 text-secondary" />;
                            case "patinha": return <PawPrint className="h-4 w-4 text-primary" />;
                            case "petisco": return <Cookie className="h-4 w-4 text-amber-500" />;
                            case "health_access_request": return <Stethoscope className="h-4 w-4 text-blue-500" />;
                            case "health_access_granted": return <Stethoscope className="h-4 w-4 text-green-500" />;
                            case "health_reminder": return <Clock className="h-4 w-4 text-purple-500" />;
                            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {n.type === 'follow' && n.related_pet_id && n.related_pet_id !== currentPet?.id && (
                    <div className="mt-3">
                      <Button 
                        size="sm" 
                        variant={n.isFollowingBack ? "outline" : "default"}
                        className={n.isFollowingBack ? "h-8 text-xs" : "h-8 text-xs gradient-bg"}
                        onClick={(e) => handleFollowBack(e, n)}
                        disabled={loadingFollow[n.id]}
                      >
                        {loadingFollow[n.id] ? (
                          "Processando..."
                        ) : n.isFollowingBack ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Seguindo
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1" />
                            Seguir de Volta
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
