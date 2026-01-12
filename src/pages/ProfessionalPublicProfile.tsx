import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { UserProfile, getUserProfile } from "@/integrations/supabase/userProfilesService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProfessionalBadge } from "@/components/ProfessionalBadge";
import { LoadingScreen } from "@/components/LoadingScreen";
import { 
  Phone, 
  MapPin, 
  MessageCircle, 
  Stethoscope, 
  Scissors, 
  Dog, 
  ShoppingBag, 
  Hotel, 
  Award,
  Star,
  ChevronLeft
} from "lucide-react";

const serviceTypeConfig: { [key: string]: { label: string, icon: any, color: string, gradient: string } } = {
  veterinario: { 
    label: 'Veterinário', 
    icon: Stethoscope, 
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-cyan-500'
  },
  groomer: { 
    label: 'Banho & Tosa', 
    icon: Scissors, 
    color: 'bg-pink-500',
    gradient: 'from-pink-500 to-rose-500'
  },
  passeador: { 
    label: 'Passeador', 
    icon: Dog, 
    color: 'bg-green-500',
    gradient: 'from-green-500 to-emerald-500'
  },
  adestrador: { 
    label: 'Adestrador', 
    icon: Award, 
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-violet-500'
  },
  pet_sitter: { 
    label: 'Pet Sitter', 
    icon: Hotel, 
    color: 'bg-orange-500',
    gradient: 'from-orange-500 to-amber-500'
  },
  fotografo: { 
    label: 'Fotógrafo', 
    icon: ShoppingBag, 
    color: 'bg-indigo-500',
    gradient: 'from-indigo-500 to-blue-500'
  },
  outros: { 
    label: 'Serviços', 
    icon: ShoppingBag, 
    color: 'bg-gray-500',
    gradient: 'from-gray-500 to-slate-500'
  },
};

const ProfessionalPublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserProfile(userId!);
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Erro ao buscar perfil profissional:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = (type: 'phone' | 'whatsapp') => {
    if (!profile) return;
    
    if (type === 'phone' && profile.professional_phone) {
      window.open(`tel:${profile.professional_phone}`, '_self');
    } else if (type === 'whatsapp' && profile.professional_whatsapp) {
      const cleanNumber = profile.professional_whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }
  };

  if (loading) return <LoadingScreen message="Carregando perfil..." />;
  if (!profile) return <MainLayout><div>Perfil não encontrado.</div></MainLayout>;

  const serviceType = profile.professional_service_type || 'outros';
  const config = serviceTypeConfig[serviceType] || serviceTypeConfig.outros;
  const Icon = config.icon;
  
  const displayLabel = (serviceType === 'outros' && profile.professional_custom_service_type) 
    ? profile.professional_custom_service_type 
    : config.label;

  return (
    <MainLayout>
      <div className="container max-w-2xl py-8 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="overflow-hidden border-0 shadow-lg">
          <div className={`h-32 bg-gradient-to-r ${config.gradient} relative`}>
            <div className="absolute -bottom-12 left-8">
              <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                <AvatarImage src={profile.professional_avatar_url || undefined} />
                <AvatarFallback className={`${config.color} text-white text-3xl font-bold`}>
                  {profile.full_name?.[0] || <Icon className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <CardContent className="pt-16 pb-8 px-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                  {profile.is_professional_verified && <VerifiedBadge size="md" />}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{displayLabel}</Badge>
                  {serviceType === 'veterinario' && profile.professional_crmv && (
                    <a 
                      href={`https://www.cfmv.gov.br/consulta-ao-cadastro-nacional-de-medicos-veterinarios-e-zootecnistas/`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-600">
                        CRMV: {profile.professional_crmv}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Badge>
                    </a>
                  )}
                  <div className="flex items-center text-sm text-yellow-500">
                    <Star className="h-4 w-4 fill-yellow-500 mr-1" />
                    <span>4.5</span>
                    <span className="text-muted-foreground ml-1">(42 avaliações)</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate(`/chat/professional/${profile.id}`)}
                  className="gradient-bg"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </Button>
                {profile.professional_whatsapp && (
                  <Button 
                    onClick={() => handleContact('whatsapp')}
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sobre</h3>
                  <p className="text-sm leading-relaxed">{profile.professional_bio || "Sem descrição disponível."}</p>
                </div>
                
                {profile.professional_specialties && profile.professional_specialties.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Especialidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.professional_specialties.map((spec, i) => (
                        <Badge key={i} variant="outline" className="bg-primary/5">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Localização e Contato</h3>
                  <div className="space-y-3">
                    {profile.professional_address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{profile.professional_address}, {profile.professional_city} - {profile.professional_state}</span>
                      </div>
                    )}
                    {profile.professional_phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{profile.professional_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {profile.professional_price_range && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Faixa de Preço</h3>
                    <p className="text-sm">{profile.professional_price_range}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ProfessionalPublicProfile;
