import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PetBookLogo } from "@/components/PetBookLogo";
import { useAuth } from "@/contexts/AuthContext";
import { usePet, Pet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  PlusSquare,
  MessageCircle,
  Settings,
  LogOut,
  Briefcase,
  User as UserIcon,
  Stethoscope,
  PlusCircle,
  Trash2,
  Plus,
  Activity,
  PawPrint, // Usando PawPrint para representar a patinha
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, signOut, isAdmin, deleteAccount } = useAuth();
  const { currentPet, myPets, selectPet, deletePet } = usePet();
  const { profile, setAccountType } = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletePetOpen, setIsDeletePetOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPetListForDeletionOpen, setIsPetListForDeletionOpen] = useState(false);

  useEffect(() => {
    const isProfessional = profile?.account_type === 'professional';
    
    if (currentPet || (isProfessional && user)) {
      fetchUnreadNotifications();
      
      const filter = isProfessional && user 
        ? `related_user_id=eq.${user.id}` 
        : currentPet 
          ? `pet_id=eq.${currentPet.id}` 
          : '';

      if (!filter) return;

      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: filter
          },
          () => {
            fetchUnreadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentPet?.id, profile?.account_type, user?.id]);

  const fetchUnreadNotifications = async () => {
    const isProfessional = profile?.account_type === 'professional';
    
    let query = supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("is_read", false);

    if (isProfessional && user) {
      query = query.eq("related_user_id", user.id);
    } else if (user) {
      const { data: userPets } = await supabase.from("pets").select("id").eq("user_id", user.id);
      const petIds = (userPets as any[])?.map(p => p.id) || [];
      if (petIds.length > 0) {
        query = query.in("pet_id", petIds);
      } else {
        setUnreadCount(0);
        return;
      }
    } else {
      return;
    }
    
    const { count } = await query;
    setUnreadCount(count || 0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isProfessional = profile?.account_type === 'professional';

  const handleSwitchAccount = async (type: 'user' | 'professional') => {
    try {
      if (setAccountType) {
        await setAccountType(type);
      }
      if (type === 'professional') {
        navigate('/professional-dashboard');
      } else {
        navigate('/feed');
      }
    } catch (error) {
      console.error("Erro ao trocar tipo de conta:", error);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);
    setIsDeleteAccountOpen(false);
    
    if (error) {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Conta excluída",
        description: "Sua conta foi removida com sucesso.",
      });
      navigate("/auth");
    }
  };

  const handleDeletePet = async () => {
    if (!petToDelete) return;
    setIsDeleting(true);
    try {
      await deletePet(petToDelete.id);
      toast({
        title: "Pet excluído",
        description: `${petToDelete.name} foi removido com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir pet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeletePetOpen(false);
      setPetToDelete(null);
    }
  };

  const navItems = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "/explore", icon: Search, label: "Explorar" },
    { 
      href: isProfessional ? "/professional-dashboard" : (currentPet ? `/pet/${currentPet.id}/health` : "/feed"), 
      icon: Activity, 
      label: isProfessional ? "Painel" : "Saúde",
      isSpecial: true 
    },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
    { href: "/notifications", icon: PawPrint, label: "Notificações", hasBadge: true },
  ];

  const mobileBottomNavItems = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "/explore", icon: Search, label: "Explorar" },
    { 
      href: isProfessional ? "/professional-dashboard" : (currentPet ? `/pet/${currentPet.id}/health` : "/feed"), 
      icon: Activity, 
      label: isProfessional ? "Painel" : "Saúde",
      isSpecial: true 
    },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
    { href: "/notifications", icon: PawPrint, label: "Notificações", hasBadge: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="container flex h-full items-center justify-between px-4 max-w-6xl mx-auto">
          <Link to="/feed" className="flex-shrink-0">
            <PetBookLogo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-8 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex items-center justify-center p-2 rounded-full transition-all hover:bg-muted",
                  location.pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  item.isSpecial ? "h-6 w-6" : "h-5 w-5",
                  location.pathname === item.href && "fill-current"
                )} />
                
                {item.hasBadge && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 md:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Criar novo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/create-post" className="flex items-center gap-2">
                    <PlusSquare className="h-4 w-4" />
                    Novo Post
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/create-story" className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Novo Story
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/services">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Stethoscope className="h-5 w-5" />
              </Button>
            </Link>

            {/* Link do Perfil do Pet no Desktop */}
            <Link 
              to={isProfessional ? "/professional-profile" : (currentPet ? `/pet/${currentPet.id}` : "/feed")} 
              className="hidden md:flex items-center justify-center transition-all active:scale-95"
            >
              <div className={cn(
                "p-0.5 rounded-full border-2 transition-all",
                (location.pathname.includes('/pet/') || location.pathname.includes('/professional-profile')) ? "border-primary" : "border-transparent"
              )}>
                <Avatar className="h-8 w-8">
                  {isProfessional ? (
                    <>
                      <AvatarImage src={profile?.professional_avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {profile?.full_name?.[0] || 'P'}
                      </AvatarFallback>
                    </>
                  ) : currentPet ? (
                    <>
                      <AvatarImage src={currentPet.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-white text-xs">
                        {currentPet.name[0]}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-muted text-xs">
                      <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
            </Link>

            {/* Menu de Configurações (Engrenagem) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleSwitchAccount(isProfessional ? 'user' : 'professional')}>
                  {isProfessional ? (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Mudar para Modo Guardião
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Mudar para Modo Profissional
                    </div>
                  )}
                </DropdownMenuItem>

                {!isProfessional && myPets.length > 0 && (
                  <DropdownMenuItem onClick={() => setIsPetListForDeletionOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Pet
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setIsDeleteAccountOpen(true)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Conta
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da Conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modal para selecionar pet a excluir */}
      <AlertDialog open={isPetListForDeletionOpen} onOpenChange={setIsPetListForDeletionOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Selecione o pet para excluir</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha qual pet você deseja remover permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {myPets.map(pet => (
              <div 
                key={pet.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => {
                  setPetToDelete(pet);
                  setIsPetListForDeletionOpen(false);
                  setIsDeletePetOpen(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={pet.avatar_url || undefined} />
                    <AvatarFallback>{pet.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{pet.name}</span>
                </div>
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modais de Alerta */}
      <AlertDialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta, todos os seus pets, posts e dados profissionais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600" disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Sim, Excluir Conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeletePetOpen} onOpenChange={setIsDeletePetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pet?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perfil de <strong>{petToDelete?.name}</strong>? Todos os posts e dados deste pet serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePet} className="bg-red-500 hover:bg-red-600" disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Sim, Excluir Pet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="pt-14 min-h-screen max-w-6xl mx-auto pb-20 md:pb-0">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-lg border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
        {mobileBottomNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          if (item.isSpecial) {
            return (
              <Link 
                key={item.href} 
                to={item.href} 
                className="flex flex-col items-center justify-center -mt-8 transition-all active:scale-90"
              >
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center shadow-lg border-4 border-background transition-all",
                  isActive ? "bg-primary scale-110" : "bg-primary/90"
                )}>
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <span className={cn("text-[10px] mt-1 font-bold", isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link key={item.href} to={item.href} className="relative flex flex-col items-center justify-center w-full h-full transition-all active:scale-90">
              <item.icon className={cn(
                "h-6 w-6 transition-all",
                isActive ? "text-primary fill-primary/10" : "text-muted-foreground"
              )} />
              {item.hasBadge && unreadCount > 0 && (
                <span className="absolute top-2 right-1/4 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white border-2 border-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className={cn("text-[10px] mt-1", isActive ? "text-primary font-bold" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        <Link 
          to={isProfessional ? "/professional-profile" : (currentPet ? `/pet/${currentPet.id}` : "/feed")} 
          className="flex flex-col items-center justify-center w-full h-full transition-all active:scale-90"
        >
          <div className={cn(
            "p-0.5 rounded-full border-2 transition-all",
            (location.pathname.includes('/pet/') || location.pathname.includes('/professional-profile')) ? "border-primary" : "border-transparent"
          )}>
            <Avatar className="h-6 w-6">
              {isProfessional ? (
                <>
                  <AvatarImage src={profile?.professional_avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {profile?.full_name?.[0] || 'P'}
                  </AvatarFallback>
                </>
              ) : currentPet ? (
                <>
                  <AvatarImage src={currentPet.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-white text-[10px]">
                    {currentPet.name[0]}
                  </AvatarFallback>
                </>
              ) : (
                <AvatarFallback className="bg-muted text-[10px]">
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <span className={cn(
            "text-[10px] mt-1", 
            (location.pathname.includes('/pet/') || location.pathname.includes('/professional-profile')) ? "text-primary font-bold" : "text-muted-foreground"
          )}>
            Perfil
          </span>
        </Link>
      </nav>
    </div>
  );
};
