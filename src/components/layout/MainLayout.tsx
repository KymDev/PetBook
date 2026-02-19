import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PetBookLogo } from "@/components/PetBookLogo";
import { useAuth } from "@/contexts/AuthContext";
import { usePet, Pet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MobileLayout } from "./MobileLayout";
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
  Map as MapIcon,
  LayoutDashboard
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
  const { profile } = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletePetOpen, setIsDeletePetOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPetListForDeletionOpen, setIsPetListForDeletionOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const isProfessional = profile?.account_type === 'professional';

  useEffect(() => {
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

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        title: t("common.error"),
        description: t("auth.password_required"),
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
        description: t("modals.account_deleted_desc"),
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
        description: t("modals.delete_pet_success_desc", { name: petToDelete.name }) || `${petToDelete.name} was removed successfully.`,
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

  const navItems = isProfessional ? [
    { href: "/professional-dashboard", icon: LayoutDashboard, label: t("common.panel") },
    { href: "/feed", icon: Home, label: t("common.home") },
    { href: "/explore", icon: Search, label: t("common.explore") },
    { href: "/map", icon: MapIcon, label: t("common.map") },
    { href: "/chat", icon: MessageCircle, label: t("common.chat") },
    { href: "/notifications", icon: PawPrint, label: t("common.notifications"), hasBadge: true },
  ] : [
    { href: "/feed", icon: Home, label: t("common.home") },
    { href: "/explore", icon: Search, label: t("common.explore") },
    { href: "/map", icon: MapIcon, label: t("common.map") },
    { 
      href: currentPet ? `/pet/${currentPet.id}/health` : "/feed", 
      icon: Activity, 
      label: t("common.health"),
      isSpecial: true 
    },
    { href: "/chat", icon: MessageCircle, label: t("common.chat") },
  ];

  // Use MobileLayout for mobile devices
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <div className="min-h-screen bg-background hidden md:flex md:flex-col">
      {/* Desktop Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-white dark:bg-background/95 backdrop-blur-lg w-full">
        <div className="container flex h-full items-center justify-between px-4 max-w-6xl mx-auto">
          <Link to="/feed" className="flex-shrink-0">
            <PetBookLogo size="sm" />
          </Link>

          <nav className="flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-muted group",
                  location.pathname === item.href
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  location.pathname === item.href && "fill-current"
                )} />
                <span className="text-sm font-medium hidden lg:inline-block">{item.label}</span>
                {item.hasBadge && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
            {!isProfessional && (
              <Link
                to="/notifications"
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-muted group",
                  location.pathname === "/notifications"
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PawPrint className={cn("h-5 w-5 transition-transform group-hover:scale-110", location.pathname === "/notifications" && "fill-current")} />
                <span className="text-sm font-medium hidden lg:inline-block">{t("common.notifications")}</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
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

            {!isProfessional && (
              <Link to="/services" title={t("common.services")}>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Stethoscope className="h-5 w-5" />
                </Button>
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0 overflow-hidden">
                  <Avatar className={cn("h-9 w-9", isProfessional && "ring-2 ring-blue-500")}>
                    {isProfessional ? (
                      <>
                        <AvatarImage src={profile?.professional_avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-500 text-white text-xs font-bold">
                          {profile?.full_name?.[0] || 'P'}
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src={currentPet?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {currentPet?.name?.[0] || 'P'}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-2">
                  {t("common.profile")}
                  {isProfessional && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase tracking-widest">Profissional</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isProfessional ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/professional-dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {t("menu.professional_panel")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/professional-profile" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {t("common.settings")}
                      </Link>
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

      {/* Main Content */}
      <main className="flex-1 pt-14 w-full">
        {children}
      </main>

      {/* Modals remain the same... */}
      <AlertDialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("modals.delete_account_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("modals.delete_account_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder={t("auth.confirm_password")}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeletePetOpen} onOpenChange={setIsDeletePetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("modals.delete_pet_title", { name: petToDelete?.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("modals.delete_pet_desc", { name: petToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPetToDelete(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePet}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPetListForDeletionOpen} onOpenChange={setIsPetListForDeletionOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("menu.delete_pet")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("modals.select_pet_to_delete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-4">
            {myPets && myPets.map(pet => (
              <Button
                key={pet.id}
                variant="outline"
                className="justify-start gap-3 h-14"
                onClick={() => {
                  setPetToDelete(pet);
                  setIsDeletePetOpen(true);
                  setIsPetListForDeletionOpen(false);
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={pet.avatar_url || undefined} />
                  <AvatarFallback>{pet.name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-bold text-sm">{pet.name}</p>
                  <p className="text-xs text-muted-foreground">{pet.species}</p>
                </div>
              </Button>
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
