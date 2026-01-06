import { UserProfile } from '@/integrations/supabase/userProfilesService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ProfessionalBadge } from '@/components/ProfessionalBadge';
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle,
  Stethoscope,
  Scissors,
  Dog,
  ShoppingBag,
  Hotel,
  Star,
  Award
} from 'lucide-react';
import { formatDistance } from '@/integrations/supabase/geolocationService';
import { Link } from 'react-router-dom';

// O tipo UserProfile já contém os campos professional_latitude e professional_longitude
interface ProfessionalProfileCardProps {
  profile: UserProfile & { distance?: number };
}

// Mapeamento de tipos de serviço para configuração de exibição
const serviceTypeConfig: { [key: string]: { label: string, icon: any, color: string, gradient: string } } = {
  veterinario: { 
    label: 'Veterinário', 
    icon: Stethoscope, 
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-cyan-500'
  },
  banho_tosa: { 
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
  loja: { 
    label: 'Loja Pet', 
    icon: ShoppingBag, 
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-violet-500'
  },
  hotel: { 
    label: 'Hotel Pet', 
    icon: Hotel, 
    color: 'bg-orange-500',
    gradient: 'from-orange-500 to-amber-500'
  },
};

const ProfessionalProfileCard: React.FC<ProfessionalProfileCardProps> = ({ profile }) => {
  const serviceType = profile.professional_service_type || 'veterinario'; // Fallback
  const config = serviceTypeConfig[serviceType] || serviceTypeConfig.veterinario;
  const Icon = config.icon;
  const isHealthProfessional = serviceType === 'veterinario';

  const handleContact = (type: 'phone' | 'whatsapp') => {
    if (type === 'phone' && profile.professional_phone) {
      window.open(`tel:${profile.professional_phone}`, '_self');
    } else if (type === 'whatsapp' && profile.professional_whatsapp) {
      // Formato de link do WhatsApp: https://wa.me/SEUNUMERO
      window.open(`https://wa.me/${profile.professional_whatsapp.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleDirections = () => {
    if (profile.professional_address) {
      const query = encodeURIComponent(profile.professional_address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  // Simulação de avaliação (será implementado na fase 5)
  const averageRating = 4.5; 
  const totalReviews = 42;

  return (
    <Card className="card-elevated border-0 overflow-hidden animate-fade-in hover:shadow-xl transition-all duration-300">
      {/* Header com gradiente */}
      <div className={`h-24 bg-gradient-to-r ${config.gradient} relative`}>
        <div className="absolute -bottom-8 left-6">
          <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
            <AvatarFallback className={`${config.color} text-white text-2xl font-bold`}>
              <Icon className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
        </div>
        {isHealthProfessional && profile.professional_crmv && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white text-[10px]">
              CRMV: {profile.professional_crmv}-{profile.professional_crmv_state}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="pt-10 pb-6 space-y-4">
        {/* Nome e Badge */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold">{profile.full_name}</h3>
              {profile.is_professional_verified && <VerifiedBadge size="md" />}
              <ProfessionalBadge 
                isProfessional={true} 
                serviceType={serviceType} 
                size="sm" 
                showText={false}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                    {config.label}
                </Badge>
                {/* Avaliação */}
                <div className="flex items-center text-sm text-yellow-500">
                    <Star className="h-4 w-4 fill-yellow-500 mr-1" />
                    <span>{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground ml-1">({totalReviews})</span>
                </div>
            </div>
          </div>
        </div>

        {/* Descrição */}
        {profile.professional_bio && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
            {profile.professional_bio}
          </p>
        )}

        {/* Distancia (se disponivel) */}
        {profile.distance !== undefined && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-blue-600 font-semibold">{formatDistance(profile.distance)} de voce</span>
          </div>
        )}

        {/* Informacoes de Contato */}
        <div className="space-y-2 pt-2">
          {profile.professional_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{profile.professional_phone}</span>
            </div>
          )}
          {profile.professional_address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground line-clamp-2">{profile.professional_address}</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          {/* Botão de Chat */}
          <Link to={`/chat/professional/${profile.id}`} className="flex-1">
            <Button 
              className="w-full gradient-bg"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </Link>

          {profile.professional_whatsapp && (
            <Button 
              onClick={() => handleContact('whatsapp')}
              className="flex-1"
              variant="outline"
              size="sm"
            >
              <Phone className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
          
          {profile.professional_address && (
            <Button 
              onClick={handleDirections}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Rotas
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfessionalProfileCard;
