import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PetBookLogo } from "@/components/PetBookLogo";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  PlusCircle,
  MessageCircle,
  Users,
  Bell,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  PawPrint,
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/explore", icon: Search, label: "Explorar" },
  { href: "/create-post", icon: PlusCircle, label: "Postar" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/communities", icon: Users, label: "Comunidades" },
  { href: "/notifications", icon: Bell, label: "Notificações" },
];

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, signOut, isAdmin } = useAuth();
  const { currentPet, pets } = usePet();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="container flex h-full items-center justify-between">
          <Link to="/feed">
            <PetBookLogo size="sm" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "gradient-bg"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* Pet Selector */}
            {currentPet && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={currentPet.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {currentPet.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{currentPet.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {pets.map((pet) => (
                    <DropdownMenuItem key={pet.id} asChild>
                      <Link to={`/pet/${pet.id}`} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pet.avatar_url || undefined} />
                          <AvatarFallback>{pet.name[0]}</AvatarFallback>
                        </Avatar>
                        {pet.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/create-pet" className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4" />
                      Cadastrar novo pet
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 pt-16 md:hidden">
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative bg-card border-b border-border p-4 space-y-2 animate-slide-up">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn("w-full justify-start gap-3", isActive && "gradient-bg")}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
};
