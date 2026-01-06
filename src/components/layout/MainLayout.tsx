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
  Shield,
  Briefcase,
  User as UserIcon,
  Stethoscope,
  Users,
  PawPrint,
  PlusCircle,
  Trash2,
  UserCircle,
  ChevronRight,
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
  
  // Estados para modais de exclusão
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletePetOpen, setIsDeletePetOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [currentPet, profile, user]);

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
    try {
      const { error } = await deleteAccount();
      if (error) throw error;
      toast({ title: "Conta excluída", description: "Sua conta foi removida com sucesso." });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "Erro ao excluir conta", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteAccountOpen(false);
    }
  };

  const handleDeletePet = async () => {
    if (!petToDelete) return;
    setIsDeleting(true);
    try {
      await deletePet(petToDelete.id);
      toast({ title: "Pet excluído", description: `${petToDelete.name} foi removido com sucesso.` });
    } catch (error: any) {
      toast({ title: "Erro ao excluir pet", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeletePetOpen(false);
      setPetToDelete(null);
    }
  };

  const navItems = [
    { href: "/feed", icon: Home, label: "Feed" },
    { href: "/explore", icon: Search, label: "Explorar" },
    { href: "/create-post", icon: PlusSquare, label: "Postar", hideOnDesktop: true },
    { href: "/services", icon: Stethoscope, label: "Serviços" },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="container flex h-full items-center justify-between px-4 max-w-6xl mx-auto">
          <Link to="/feed" className="flex-shrink-0">
            <PetBookLogo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            {navItems.filter(i => !i.hideOnDesktop).map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href} className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-accent",
                  isActive ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                  <item.icon className="h-5 w-5" />
                  <span className="hidden lg:inline text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 md:gap-3">
            {/* Notificações com ícone de Patinha */}
            <Link to="/notifications" className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
              <PawPrint className={cn("h-6 w-6", location.pathname === "/notifications" && "text-primary")} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Menu de Configurações (Engrenagem) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSwitchAccount('user')} className={!isProfessional ? 'bg-primary/10' : ''}>
                  <UserIcon className="h-4 w-4 mr-2" />
                  <span>Modo Guardião</span>
                  {!isProfessional && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSwitchAccount('professional')} className={isProfessional ? 'bg-primary/10' : ''}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  <span>Modo Profissional</span>
                  {isProfessional && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Opções de Gerenciamento de Pets (Apenas Modo Guardião) */}
                {!isProfessional && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/create-pet" className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Adicionar Novo Pet
                      </Link>
                    </DropdownMenuItem>
                    {myPets.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-full">
                          <div className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-default">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="text-destructive">Excluir um Pet</span>
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="left" className="w-48">
                          {myPets.map(pet => (
                            <DropdownMenuItem key={pet.id} onClick={() => { setPetToDelete(pet); setIsDeletePetOpen(true); }} className="text-destructive">
                              {pet.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem asChild>
                  <Link to="/communities" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Comunidades
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Painel Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteAccountOpen(true)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Conta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu do Pet / Perfil */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 border border-border hover:ring-2 ring-primary/20 transition-all cursor-pointer">
                  {isProfessional ? (
                    <>
                      <AvatarImage src={profile?.professional_avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {profile?.full_name?.[0] || <Briefcase className="h-4 w-4" />}
                      </AvatarFallback>
                    </>
                  ) : currentPet ? (
                    <>
                      <AvatarImage src={currentPet.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {currentPet.name[0]}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  {isProfessional ? profile?.full_name : (currentPet?.name || "Seu Perfil")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={isProfessional ? "/professional-profile" : (currentPet ? `/pet/${currentPet.id}` : "/create-pet")} className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Ver Perfil
                  </Link>
                </DropdownMenuItem>
                
                {/* Lista de outros pets para trocar */}
                {!isProfessional && myPets.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Seus outros pets</DropdownMenuLabel>
                    {myPets.filter(p => p.id !== currentPet?.id).map(pet => (
                      <DropdownMenuItem key={pet.id} onClick={() => selectPet(pet)} className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pet.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{pet.name[0]}</AvatarFallback>
                        </Avatar>
                        <span>{pet.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modais de Exclusão */}
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
              Tem certeza que deseja excluir o perfil de <strong>{petToDelete?.name}</strong>? Todos os posts e dados deste pet serão removidos.
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

      {/* Main Content */}
      <main className="pt-14 min-h-screen max-w-6xl mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-background border-t border-border flex items-center justify-around z-50 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.href} to={item.href} className="flex flex-col items-center justify-center w-full h-full transition-colors">
              <item.icon className={cn(
                "h-6 w-6 transition-all",
                isActive ? "text-primary scale-110" : "text-muted-foreground"
              )} />
            </Link>
          );
        })}
        <Link to={isProfessional ? "/professional-profile" : (currentPet ? `/pet/${currentPet.id}` : "/create-pet")} className="flex items-center justify-center w-full h-full">
          <Avatar className={cn(
            "h-7 w-7 border transition-all",
            location.pathname.includes("/pet/") || location.pathname === "/professional-profile" ? "border-primary ring-1 ring-primary" : "border-border"
          )}>
            {isProfessional ? (
              <AvatarImage src={profile?.professional_avatar_url || undefined} />
            ) : (
              <AvatarImage src={currentPet?.avatar_url || undefined} />
            )}
            <AvatarFallback className="text-[10px]">
              {isProfessional ? profile?.full_name?.[0] : currentPet?.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </nav>
    </div>
  );
};
