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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
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
  PawPrint,
  Languages,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Input } from "@/components/ui/input";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { i18n, t } = useTranslation();
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
  const [deletePassword, setDeletePassword] = useState("");

  const languages = [
    { code: 'pt', name: t('languages.pt'), flag: '🇧🇷' },
    { code: 'en', name: t('languages.en'), flag: '🇺🇸' },
    { code: 'es', name: t('languages.es'), flag: '🇪🇸' },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

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
    if (!deletePassword) {
      toast({
        title: t("common.error"),
        description: t("auth.password_required") || "Senha necessária",
        variant: "destructive",
      });
      return;
    }
    setIsDeleting(true);
    const { error } = await deleteAccount(deletePassword);
    setIsDeleting(false);
    
    if (error) {
      toast({
        title: t("modals.delete_error"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("modals.delete_success"),
        description: t("modals.account_deleted_desc") || "Sua conta foi removida.",
      });
      setIsDeleteAccountOpen(false);
      navigate("/auth");
    }
  };

  const handleDeletePet = async () => {
    if (!petToDelete) return;
    setIsDeleting(true);
    try {
      await deletePet(petToDelete.id);
      toast({
        title: t("modals.delete_success"),
        description: `${petToDelete.name} foi removido com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: t("modals.delete_error"),
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
    { href: "/feed", icon: Home, label: t("common.home") },
    { href: "/explore", icon: Search, label: t("common.explore") },
    { 
      href: isProfessional ? "/professional-dashboard" : (currentPet ? `/pet/${currentPet.id}/health` : "/feed"), 
      icon: Activity, 
      label: isProfessional ? t("common.panel") : t("common.health"),
      isSpecial: true 
    },
    { href: "/chat", icon: MessageCircle, label: t("common.chat") },
  ];

  const profileUrl = isProfessional ? "/professional-profile" : (currentPet ? `/pet/${currentPet.id}` : "/feed");

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-lg hidden md:block">
        <div className="container flex h-full items-center justify-between px-4 max-w-6xl mx-auto">
          <Link to="/feed" className="flex-shrink-0">
            <PetBookLogo size="sm" />
          </Link>

          <nav className="flex items-center gap-4 lg:gap-8 absolute left-1/2 -translate-x-1/2">
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
                title={item.label}
              >
                <item.icon className={cn(
                  item.isSpecial ? "h-6 w-6" : "h-5 w-5",
                  location.pathname === item.href && "fill-current"
                )} />
              </Link>
            ))}
            <Link
              to="/notifications"
              className={cn(
                "relative flex items-center justify-center p-2 rounded-full transition-all hover:bg-muted",
                location.pathname === "/notifications"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t("common.notifications")}
            >
              <PawPrint className={cn("h-5 w-5", location.pathname === "/notifications" && "fill-current")} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </nav>

          <div className="flex items-center gap-1 md:gap-3">
            <LanguageSwitcher />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t("common.create_new")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/create-post" className="flex items-center gap-2">
                    <PlusSquare className="h-4 w-4" />
                    {t("common.new_post")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/create-story" className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t("common.new_story")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/services" title={t("common.services")}>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Stethoscope className="h-5 w-5" />
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0 overflow-hidden">
                  <Avatar className="h-9 w-9">
                    {isProfessional ? (
                      <>
                        <AvatarImage src={profile?.professional_avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-xs">
                          {profile?.full_name?.[0] || 'P'}
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src={currentPet?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-xs">
                          {currentPet?.name?.[0] || 'P'}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>{t("common.profile")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isProfessional ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/professional-dashboard" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {t("menu.professional_panel")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/professional-profile" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {t("common.settings")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSwitchAccount('user')} className="flex items-center gap-2 text-primary">
                      <UserIcon className="h-4 w-4" />
                      {t("menu.switch_to_guardian")}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={currentPet ? `/pet/${currentPet.id}` : "/feed"} className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        {t("menu.pet_profile")}
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Outros Pets */}
                    {myPets && myPets.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("menu.my_pets")}</DropdownMenuLabel>
                        {myPets.map(pet => pet.id !== currentPet?.id && (
                          <DropdownMenuItem key={pet.id} onClick={() => selectPet(pet.id)} className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={pet.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px]">{pet.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{pet.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}

                    <DropdownMenuItem asChild>
                      <Link to="/create-pet" className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        {t("menu.add_pet")}
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setIsPetListForDeletionOpen(true)} className="flex items-center gap-2 text-red-600">
                      <Trash2 className="h-4 w-4" />
                      {t("menu.delete_pet")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleSwitchAccount('professional')} className="flex items-center gap-2 text-secondary">
                      <Briefcase className="h-4 w-4" />
                      {t("menu.switch_to_professional")}
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteAccountOpen(true)} className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-4 w-4" />
                  {t("menu.delete_account")}
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-border bg-background/95 backdrop-blur-lg md:hidden flex items-center justify-between px-4">
        <Link to="/feed" className="flex-shrink-0">
          <PetBookLogo size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/notifications" className="relative p-2">
            <PawPrint className={cn("h-5 w-5", location.pathname === "/notifications" && "fill-current")} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t("common.create_new")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/create-post" className="flex items-center gap-2">
                  <PlusSquare className="h-4 w-4" />
                  {t("common.new_post")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/create-story" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  {t("common.new_story")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/services" className="p-2">
            <Stethoscope className={cn("h-5 w-5", location.pathname === "/services" && "fill-current")} />
          </Link>
        </div>
      </header>

      <main className="pt-12 md:pt-14 pb-16 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-background/95 backdrop-blur-lg md:hidden flex items-center justify-around px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-all",
              location.pathname === item.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn(
              item.isSpecial ? "h-6 w-6" : "h-5 w-5",
              location.pathname === item.href && "fill-current"
            )} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </Link>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all outline-none",
                (location.pathname.startsWith("/pet/") && !location.pathname.endsWith("/health")) || location.pathname === "/professional-profile"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Avatar className="h-6 w-6 border border-current">
                {isProfessional ? (
                  <AvatarImage src={profile?.professional_avatar_url || undefined} />
                ) : (
                  <AvatarImage src={currentPet?.avatar_url || undefined} />
                )}
                <AvatarFallback className="text-[8px]">
                  {isProfessional ? (profile?.full_name?.[0] || 'P') : (currentPet?.name?.[0] || 'P')}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] mt-1 font-medium">{t("common.profile")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-64 mb-2">
            <DropdownMenuLabel>{t("common.profile")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {isProfessional ? (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/professional-dashboard" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t("menu.professional_panel")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/professional-profile" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t("common.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSwitchAccount('user')} className="flex items-center gap-2 text-primary">
                  <UserIcon className="h-4 w-4" />
                  {t("menu.switch_to_guardian")}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link to={currentPet ? `/pet/${currentPet.id}` : "/feed"} className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    {t("menu.pet_profile")}
                  </Link>
                </DropdownMenuItem>
                
                {myPets && myPets.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("menu.my_pets")}</DropdownMenuLabel>
                    {myPets.map(pet => pet.id !== currentPet?.id && (
                      <DropdownMenuItem key={pet.id} onClick={() => selectPet(pet.id)} className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={pet.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">{pet.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{pet.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuItem asChild>
                  <Link to="/create-pet" className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t("menu.add_pet")}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => setIsPetListForDeletionOpen(true)} className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-4 w-4" />
                  {t("menu.delete_pet")}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleSwitchAccount('professional')} className="flex items-center gap-2 text-secondary">
                  <Briefcase className="h-4 w-4" />
                  {t("menu.switch_to_professional")}
                </DropdownMenuItem>
              </>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <span>{t("languages.title") || "Idioma"}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[140px]">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={cn(
                        "gap-3 cursor-pointer",
                        i18n.language === lang.code && "bg-primary/10 font-bold text-primary"
                      )}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm">{lang.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsDeleteAccountOpen(true)} className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              {t("menu.delete_account")}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Modais de Exclusão */}
      <AlertDialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("modals.delete_account_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("modals.delete_account_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder={t("modals.delete_account_password_placeholder")}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePassword("")}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting || !deletePassword}
            >
              {isDeleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeletePetOpen} onOpenChange={setIsDeletePetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("modals.delete_pet_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("modals.delete_pet_description", { name: petToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePet}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lista de Pets para Exclusão */}
      <AlertDialog open={isPetListForDeletionOpen} onOpenChange={setIsPetListForDeletionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("menu.delete_pet")}</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o pet que deseja excluir:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto py-2">
            {myPets?.map(pet => (
              <div key={pet.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={pet.avatar_url || undefined} />
                    <AvatarFallback>{pet.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{pet.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600"
                  onClick={() => {
                    setPetToDelete(pet);
                    setIsDeletePetOpen(true);
                    setIsPetListForDeletionOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
