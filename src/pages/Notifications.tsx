import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, UserPlus, Heart, PawPrint, Cookie, Stethoscope, Clock, UserCheck, ChevronRight, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_pet_id: string | null;
  related_user_id: string | null;
  related_post_id: string | null;
  pet_id: string | null;
  pet_actor_id: string | null; // Adicionado para filtrar quem fez a ação
  user_actor_id: string | null; // Adicionado para filtrar quem fez a ação
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
  const { t } = useTranslation();

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
          } else if (n.related_user_id && n.type !== 'message') { 
            const { data: userProfile } = await supabase.from("user_profiles").select("full_name, professional_avatar_url, account_type").eq("id", n.related_user_id).single();
            relatedUser = userProfile;
          }

          return { ...n, relatedPet, relatedUser, isFollowingBack };
        })
      );
      
      const filteredNotifications = withRelatedData.filter(n => {
        // Filtro 1: Se a ação foi feita por um pet do próprio usuário logado
        if (n.pet_actor_id) {
          // Precisamos verificar se o pet_actor_id pertence ao usuário logado
          // Como não temos a lista de pets aqui, podemos checar se o user_id do pet_actor é o user.id
          // Mas para simplificar e ser mais preciso:
          if (n.relatedPet && n.relatedPet.user_id === user?.id) {
            return false;
          }
        }
        
        // Filtro 2: Se a ação foi feita pelo próprio usuário (caso de profissionais)
        if (n.user_actor_id === user?.id) {
          return false;
        }

        // Filtro 3: Heurística baseada no nome (caso o banco não tenha os campos de actor)
        if (profile?.full_name && n.message.startsWith(profile.full_name)) {
          return false;
        }

        return true;
      });

      setNotifications(filteredNotifications);
      
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
    if (n.type === 'message') {
      navigate(`/chat`);
    } else if (n.related_post_id) {
      if (n.related_pet_id) navigate(`/pet/${n.related_pet_id}`);
    } else if (n.related_pet_id) {
      navigate(`/pet/${n.related_pet_id}`);
    } else if (n.type === 'health_access_request' || n.type === 'health_reminder') {
      if (currentPet) navigate(`/pet/${currentPet.id}/health`);
    } else if (n.type === 'health_access_granted') {
      if (n.related_pet_id) navigate(`/pet/${n.related_pet_id}/health`);
    }
  };

  const isProfessionalUI = profile?.account_type === 'professional';

  return (
    <MainLayout>
      <div className="container max-w-xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight">{t("menu.notifications")}</h1>
          {isProfessionalUI && (
            <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t("common.professional")}</span>
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="border-none bg-muted/10 shadow-inner">
            <CardContent className="py-16 text-center">
              <div className="bg-background w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-border/50">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="font-bold text-foreground/80">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground mt-1">Fique atento às interações dos seus pets e clientes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card 
                key={n.id} 
                className={cn(
                  "border-primary/5 hover:border-primary/20 cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden hover:shadow-md",
                  !n.is_read ? "bg-primary/5 border-primary/20" : "bg-card"
                )}
                onClick={() => handleNotificationClick(n)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="relative shrink-0">
                    {n.relatedPet ? (
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarImage src={n.relatedPet.avatar_url || undefined} />
                        <AvatarFallback className="font-bold bg-primary/10 text-primary">{n.relatedPet.name[0]}</AvatarFallback>
                      </Avatar>
                    ) : n.relatedUser ? (
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarImage src={n.relatedUser.professional_avatar_url || undefined} />
                        <AvatarFallback className={cn("font-bold", n.relatedUser?.account_type === 'professional' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground')}>
                          {n.relatedUser?.full_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center shadow-md">
                        <Bell className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full shadow-sm border border-border/20">
                      {(() => {
                        switch (n.type) {
                          case "message": return <MessageSquare className="h-3 w-3 text-blue-500" />;
                          case "follow": return <UserPlus className="h-3 w-3 text-primary" />;
                          case "like": return <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />;
                          case "abraco": return <Heart className="h-3 w-3 text-rose-500" />;
                          case "patinha": return <PawPrint className="h-3 w-3 text-primary" />;
                          case "petisco": return <Cookie className="h-3 w-3 text-amber-500" />;
                          case "health_access_request": return <Stethoscope className="h-3 w-3 text-blue-500" />;
                          case "health_access_granted": return <Stethoscope className="h-3 w-3 text-green-500" />;
                          case "health_reminder": return <Clock className="h-3 w-3 text-purple-500" />;
                          default: return <Bell className="h-3 w-3 text-muted-foreground" />;
                        }
                      })()}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className={cn("text-sm leading-relaxed", !n.is_read ? "font-bold text-foreground" : "text-foreground/80 font-medium")}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                          {!n.is_read && <div className="w-1 h-1 bg-primary rounded-full" />}
                        </div>
                      </div>
                      
                      {n.type === 'follow' && !isProfessionalUI && (
                        <Button
                          size="sm"
                          variant={n.isFollowingBack ? "outline" : "default"}
                          className={cn("h-8 rounded-full text-[10px] font-black uppercase tracking-tighter px-3", !n.isFollowingBack && "gradient-bg")}
                          onClick={(e) => handleFollowBack(e, n)}
                          disabled={loadingFollow[n.id]}
                        >
                          {loadingFollow[n.id] ? "..." : n.isFollowingBack ? "Seguindo" : "Seguir de Volta"}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 self-center" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
