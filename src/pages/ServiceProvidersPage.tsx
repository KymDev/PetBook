
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllProfessionalProfiles, UserProfile } from '@/integrations/supabase/userProfilesService';
import { UserProfile } from '@/integrations/supabase/userProfilesService';
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
  { value: 'banho_tosa', label: 'Banho & Tosa' },
  { value: 'passeador', label: 'Passeador' },
  { value: 'loja', label: 'Loja Pet' },
  { value: 'hotel', label: 'Hotel Pet' },
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
      <div className="container max-w-xl py-6 space-y-6">
        <h1 className="text-3xl font-bold font-heading">Diretorio de Servicos Pet</h1>
        <p className="text-muted-foreground">Encontre veterinarios, passeadores, lojas e mais perto de voce.</p>

        {/* Filtros e Busca */}
        <Card className="p-4 shadow-sm">
          <CardContent className="p-0 space-y-3">
            {/* Busca por Texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou servico..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por Tipo */}
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as ServiceType | 'all')}
                >
                  <SelectTrigger className="pl-10">
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
              <div className="flex items-center gap-2 flex-1">
                <Select value={maxDistance.toString()} onValueChange={(value) => setMaxDistance(parseInt(value))}>
                  <SelectTrigger>
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
              </div>

              {/* Botao de Localizacao */}
              <Button
                onClick={handleRequestLocation}
                disabled={isLoadingLocation || !!userLocation}
                variant={userLocation ? "default" : "outline"}
                className="gap-2"
              >
                <Navigation className="h-4 w-4" />
                {isLoadingLocation ? "Localizando..." : userLocation ? "Localizado" : "Usar minha localizacao"}
              </Button>
            </div>

            {/* Informacao de Localizacao */}
            {userLocation && (
              <div className="text-sm text-muted-foreground p-2 bg-blue-50 rounded border border-blue-200">
                <MapPin className="h-4 w-4 inline mr-2" />
                Mostrando servicos ate {maxDistance}km de sua localizacao
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
          <div className="grid gap-4">
            {filteredProviders.map(provider => (
              <ProfessionalProfileCard key={provider.id} profile={provider} />
            ))}
          </div>
        ) : (
          <div className="text-center p-10 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Nenhum Provedor Encontrado</h2>
            <p className="text-gray-500">Tente ajustar os filtros ou a busca.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ServiceProvidersPage;
