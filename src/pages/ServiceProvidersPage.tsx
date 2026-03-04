
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllProfessionalProfiles, UserProfile } from '@/integrations/supabase/userProfilesService';
import { Database } from '@/integrations/supabase/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { Loader2, Search, Filter, MapPin, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProfessionalProfileCard from '@/components/Services/ProfessionalProfileCard';
import { getUserLocation, filterProvidersByDistance, Location } from '@/integrations/supabase/geolocationService';

// Tipos do Supabase
// type ServiceProvider = Database['public']['Tables']['service_providers']['Row'];
type ServiceType = Database['public']['Enums']['service_type'];

const serviceTypeOptions: { value: ServiceType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os Serviços' },
  { value: 'veterinario', label: 'Veterinário' },
  { value: 'groomer', label: 'Banho & Tosa' },
  { value: 'passeador', label: 'Passeador' },
  { value: 'adestrador', label: 'Adestrador' },
  { value: 'pet_sitter', label: 'Pet Sitter' },
  { value: 'fotografo', label: 'Fotógrafo' },
  { value: 'outros', label: 'Outros' },
];

const ServiceProvidersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const { toast } = useToast();

  // 1. Busca de dados
  const { data: providers, isLoading } = useQuery<UserProfile[]>({
    queryKey: ['professionalProfiles'],
    queryFn: async () => {
      const { data, error } = await getAllProfessionalProfiles();
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Funcao para solicitar localizacao do usuario
  const handleRequestLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await getUserLocation();
      setUserLocation(location);
      toast({
        title: "Localizacao obtida",
        description: "Agora mostrando servicos proximos a voce.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao obter localizacao",
        description: error.message || "Nao foi possivel acessar sua localizacao.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 2. Filtragem e Busca
  const filteredProviders = useMemo(() => {
    if (!providers) return [];

    let filtered = providers.filter(provider => {
      // Filtro por Tipo
      const typeMatch = selectedType === 'all' || (provider.service_type && provider.service_type === selectedType);

      // Filtro por Termo de Busca (Nome ou Descricao)
      const searchLower = searchTerm.toLowerCase();
      const searchMatch = (provider.name || '').toLowerCase().includes(searchLower) ||
                          (provider.description && provider.description.toLowerCase().includes(searchLower));

      return typeMatch && searchMatch;
    });

    // Filtro por Distancia (se localizacao do usuario foi obtida)
    if (userLocation) {
      // O filtro de distância espera professional_latitude e professional_longitude, que estão em UserProfile.
      // O tipo T na função filterProvidersByDistance é genérico, então deve funcionar.
      filtered = filterProvidersByDistance(filtered, userLocation, maxDistance as number);
    }

    return filtered;
  }, [providers, searchTerm, selectedType, userLocation, maxDistance]);

  return (
    <MainLayout>
      <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Serviços Pet</h1>
          <p className="text-sm md:text-base text-muted-foreground">Encontre veterinários, passeadores, adestradores e os melhores profissionais para o seu pet perto de você.</p>
        </div>

        {/* Filtros e Busca */}
        <Card className="border-0 md:border rounded-none md:rounded-xl shadow-none md:shadow-sm p-3 md:p-4">
          <CardContent className="p-0 space-y-3">
            {/* Busca por Texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou servico..."
                className="pl-10 h-10 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por Tipo - Mobile Stack, Desktop Flex */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <div className="relative flex-1">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as ServiceType | 'all')}
                >
                  <SelectTrigger className="pl-10 h-10 rounded-lg">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro de Distancia */}
              <Select value={maxDistance.toString()} onValueChange={(value) => setMaxDistance(parseInt(value))}>
                <SelectTrigger className="h-10 rounded-lg md:w-32">
                  <SelectValue placeholder="Distancia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
              </Select>

              {/* Botao de Localizacao - Full Width Mobile */}
              <Button
                onClick={handleRequestLocation}
                disabled={isLoadingLocation || !!userLocation}
                variant={userLocation ? "default" : "outline"}
                className="gap-2 h-10 rounded-lg w-full md:w-auto whitespace-nowrap"
              >
                <Navigation className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">
                  {isLoadingLocation ? "Localizando..." : userLocation ? "Localizado" : "Usar minha localização"}
                </span>
                <span className="md:hidden text-xs">
                  {isLoadingLocation ? "..." : userLocation ? "✓" : "Local"}
                </span>
              </Button>
            </div>

            {/* Informacao de Localizacao */}
            {userLocation && (
              <div className="text-xs md:text-sm text-muted-foreground p-2 md:p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>Mostrando serviços até {maxDistance}km de sua localização</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Provedores */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredProviders.length > 0 ? (
          <div className="grid gap-3 md:gap-4">
            {filteredProviders.map(provider => (
              <ProfessionalProfileCard key={provider.id} profile={provider} />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 md:p-10 border border-dashed rounded-lg">
            <h2 className="text-lg md:text-xl font-semibold mb-2">Nenhum Provedor Encontrado</h2>
            <p className="text-sm md:text-base text-muted-foreground">Tente ajustar os filtros ou a busca.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ServiceProvidersPage;
