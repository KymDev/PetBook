import { UserProfile } from '@/integrations/supabase/userProfilesService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ProfessionalBadge } from '@/components/ProfessionalBadge';
import { 
  Phone, 
  MapPin, 
  Stethoscope,
  Scissors,
  Dog,
  ShoppingBag,
  Hotel,
  Star,
  Award,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { formatDistance } from '@/integrations/supabase/geolocationService';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProfessionalProfileCardProps {
  profile: UserProfile & { distance?: number };
}

const serviceTypeConfig: { [key: string]: { label: string, icon: any, color: string, gradient: string } } = {
  veterinario: { 
    label: 'Veterinário', 
    icon: Stethoscope, 
    color: 'bg-blue-500',
    gradient: 'from-blue-600 to-blue-400'
  },
  groomer: { 
    label: 'Banho & Tosa', 
    icon: Scissors, 
    color: 'bg-pink-500',
    gradient: 'from-pink-600 to-pink-400'
  },
  passeador: { 
    label: 'Passeador', 
    icon: Dog, 
    color: 'bg-green-500',
    gradient: 'from-green-600 to-green-400'
  },
  adestrador: { 
    label: 'Adestrador', 
    icon: Award, 
    color: 'bg-purple-500',
    gradient: 'from-purple-600 to-purple-400'
  },
  pet_sitter: { 
    label: 'Pet Sitter', 
    icon: Hotel, 
    color: 'bg-orange-500',
    gradient: 'from-orange-600 to-orange-400'
  },
  fotografo: { 
    label: 'Fotógrafo', 
    icon: ShoppingBag, 
    color: 'bg-indigo-500',
    gradient: 'from-indigo-600 to-indigo-400'
  },
  outros: { 
    label: 'Serviços', 
    icon: ShoppingBag, 
    color: 'bg-gray-500',
    gradient: 'from-gray-600 to-gray-400'
  },
};

const ProfessionalProfileCard: React.FC<ProfessionalProfileCardProps> = ({ profile }) => {
  const serviceType = profile.professional_service_type || 'outros';
  const config = serviceTypeConfig[serviceType] || serviceTypeConfig.outros;
  const Icon = config.icon;
  
  // Se for 'outros' e tiver um tipo customizado, usa o customizado
  const displayLabel = (serviceType === 'outros' && profile.professional_custom_service_type) 
    ? profile.professional_custom_service_type 
    : config.label;
  const isHealthProfessional = serviceType === 'veterinario';

  const handleContact = (type: 'phone' | 'whatsapp') => {
    if (type === 'phone' && profile.professional_phone) {
      window.open(`tel:${profile.professional_phone}`, '_self');
    } else if (type === 'whatsapp' && profile.professional_whatsapp) {
      window.open(`https://wa.me/${profile.professional_whatsapp.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleDirections = () => {
    if (profile.professional_address) {
      const query = encodeURIComponent(`${profile.professional_address}, ${profile.professional_city || ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const averageRating = 4.5; 
  const totalReviews = 42;

  const fullAddress = [
    profile.professional_address,
    profile.professional_city,
    profile.professional_state
  ].filter(Boolean).join(', ');

  return (
    <Card className="card-elevated border-0 md:border rounded-none md:rounded-xl overflow-hidden animate-fade-in hover:shadow-xl transition-all duration-300 shadow-none md:shadow-sm">
      {/* Header com gradiente e informações principais */}
      <div className={`h-28 md:h-32 bg-gradient-to-r ${config.gradient} relative p-4 md:p-6 flex items-center`}>
        <div className="flex items-center gap-3 md:gap-4 w-full min-w-0">
          <Avatar className="h-16 md:h-20 w-16 md:w-20 border-4 border-white/30 shadow-xl shrink-0">
            <AvatarImage src={profile.professional_avatar_url || undefined} className="object-cover" />
            <AvatarFallback className={`${config.color} text-white text-xl md:text-2xl font-bold`}>
              {profile.full_name?.[0] || <Icon className="h-6 w-6 md:h-8 md:w-8" />}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-white min-w-0">
            <h3 className="text-lg md:text-2xl font-black leading-tight tracking-tight drop-shadow-sm truncate">
              {profile.full_name}
            </h3>
            <p className="text-xs md:text-sm font-medium opacity-90 tracking-wide uppercase mt-0.5 truncate">
              {displayLabel}
            </p>
          </div>
        </div>

        {isHealthProfessional && profile.professional_crmv && (
          <div className="absolute top-2 right-2 md:top-3 md:right-3">
            <a 
              href={`https://www.cfmv.gov.br/consulta-ao-cadastro-nacional-de-medicos-veterinarios-e-zootecnistas/`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block hover:scale-105 transition-transform"
              title="Validar CRMV no portal CFMV"
            >
              <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white text-[9px] md:text-[10px] font-bold cursor-pointer hover:bg-white/20">
                CRMV: {profile.professional_crmv}
                <ExternalLink className="h-2 w-2 ml-1" />
              </Badge>
            </a>
          </div>
        )}
      </div>

      <CardContent className="pt-3 md:pt-4 pb-4 md:pb-6 space-y-3 md:space-y-5">
        {/* Área com Selos e Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selo da Profissão Dinâmica */}
          <div className="inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20 shadow-sm">
            <ProfessionalBadge 
              isProfessional={true} 
              serviceType={serviceType} 
              size="sm" 
              showText={false}
            />
            <span className="text-[10px] md:text-[11px] font-bold text-primary uppercase tracking-wider">
              {displayLabel}
            </span>
          </div>

          {profile.is_professional_verified && (
            <div className="inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 shadow-sm">
              <VerifiedBadge size="sm" />
              <span className="text-[10px] md:text-[11px] font-bold text-blue-600 uppercase tracking-wider">Verificado</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 shadow-sm md:ml-auto">
            <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
            <span className="text-[10px] md:text-[11px] font-bold text-yellow-700">{averageRating.toFixed(1)}</span>
            <span className="text-[9px] md:text-[10px] text-yellow-600/70 font-medium">({totalReviews})</span>
          </div>
        </div>

        {/* Descrição */}
        {profile.professional_bio && (
          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-2">
            {profile.professional_bio}
          </p>
        )}

        {/* Informações de Localização e Distância */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-t border-dashed pt-3 md:pt-4">
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground min-w-0 flex-1">
            <MapPin className="h-4 w-4 text-primary/40 shrink-0" />
            <span className={cn("truncate", !fullAddress && "italic text-red-400 font-medium")}>
              {fullAddress || 'Endereço não informado'}
            </span>
          </div>
          
          {profile.distance !== undefined && (
            <div className="text-[9px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tighter shrink-0">
              {formatDistance(profile.distance)}
            </div>
          )}
        </div>

        {/* Ações - Stack Mobile, Flex Desktop */}
        <div className="flex flex-col md:flex-row gap-2 pt-1">
          <Link to={`/professional/${profile.id}`} className="flex-1">
            <Button className="w-full gradient-bg shadow-md hover:shadow-lg transition-all font-bold h-10 rounded-lg text-sm md:text-base" size="sm">
              Ver Perfil
            </Button>
          </Link>

          <div className="flex gap-2 flex-1 md:flex-none">
            {profile.professional_address && (
              <Button 
                onClick={handleDirections}
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/5 font-bold h-10 rounded-lg"
                title="Abrir no Google Maps"
              >
                <Navigation className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Mapa</span>
              </Button>
            )}

            {profile.professional_whatsapp && (
              <Button 
                onClick={() => handleContact('whatsapp')}
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/5 font-bold h-10 rounded-lg text-sm"
              >
                <span className="hidden md:inline">WhatsApp</span>
                <span className="md:hidden">Chat</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfessionalProfileCard;
