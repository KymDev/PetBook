/**
 * Serviço de Geolocalização
 * Fornece funcionalidades para trabalhar com localização e distância entre pontos
 */

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  address?: string;
}

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lon1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lon2 Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Obtém a localização atual do usuário usando a Geolocation API
 * @returns Promise com latitude e longitude
 */
export function getUserLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não é suportada pelo seu navegador"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Erro ao obter localização: ${error.message}`));
      }
    );
  });
}

/**
 * Converte um endereço em coordenadas usando a API de Geocodificação
 * @param address Endereço a ser convertido
 * @returns Promise com latitude e longitude
 */
export async function geocodeAddress(address: string): Promise<Location> {
  try {
    // Tenta primeiro com o endereço completo
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'User-Agent': 'PetBook-App'
        }
      }
    );
    let data = await response.json();

    // Se não encontrar, tenta simplificar o endereço (apenas cidade e estado)
    if (data.length === 0) {
      const parts = address.split(',');
      if (parts.length > 2) {
        const simplifiedAddress = parts.slice(-2).join(',').trim();
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(simplifiedAddress)}&limit=1`,
          {
            headers: {
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'User-Agent': 'PetBook-App'
            }
          }
        );
        data = await response.json();
      }
    }

    if (data.length === 0) {
      throw new Error("Endereço não encontrado");
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      address: result.display_name,
    };
  } catch (error) {
    console.error("Erro detalhado na geocodificação:", error);
    throw error;
  }
}

/**
 * Filtra provedores de serviço por distância máxima
 * @param providers Lista de provedores com localização
 * @param userLocation Localização do usuário
 * @param maxDistance Distância máxima em km
 * @returns Provedores filtrados e ordenados por distância
 */
export function filterProvidersByDistance<T extends { professional_latitude?: number | null; professional_longitude?: number | null }>(
  providers: T[],
  userLocation: Location,
  maxDistance: number = 50
): (T & { distance?: number })[] {
  return providers
    .map((provider) => {
      if (
        provider.professional_latitude !== null &&
        provider.professional_latitude !== undefined &&
        provider.professional_longitude !== null &&
        provider.professional_longitude !== undefined
      ) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          provider.professional_latitude,
          provider.professional_longitude
        );
        return { ...provider, distance };
      }
      return provider;
    })
    .filter((provider) => !provider.distance || provider.distance <= maxDistance)
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
}

/**
 * Formata a distância para exibição
 * @param distance Distância em km
 * @returns String formatada
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

/**
 * Busca locais de interesse (restaurantes, parques, etc) ao redor de uma coordenada
 */
export async function searchNearbyPlaces(lat: number, lon: number, radius: number = 1000): Promise<any[]> {
  try {
    // Usando a API Overpass do OpenStreetMap para buscar locais reais
    const query = `
      [out:json];
      (
        node["amenity"~"restaurant|cafe|pub|park"](around:${radius},${lat},${lon});
        way["amenity"~"restaurant|cafe|pub|park"](around:${radius},${lat},${lon});
        node["leisure"~"park|garden"](around:${radius},${lat},${lon});
        way["leisure"~"park|garden"](around:${radius},${lat},${lon});
        node["shop"~"pet|mall"](around:${radius},${lat},${lon});
        way["shop"~"pet|mall"](around:${radius},${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;
    
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    return data.elements
      .filter((e: any) => e.tags && e.tags.name)
      .map((e: any) => ({
        id: `osm-${e.id}`,
        name: e.tags.name,
        latitude: e.lat || (e.center ? e.center.lat : lat),
        longitude: e.lon || (e.center ? e.center.lon : lon),
        category: e.tags.amenity || e.tags.leisure || e.tags.shop || "Local",
        address: e.tags["addr:street"] || "Endereço não disponível",
        is_osm: true
      }));
  } catch (error) {
    console.error("Erro ao buscar locais próximos:", error);
    return [];
  }
}
