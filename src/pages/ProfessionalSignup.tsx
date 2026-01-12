import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { geocodeAddress } from "@/integrations/supabase/geolocationService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, MapPin, Award, DollarSign, ArrowLeft, Loader2, Stethoscope, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PROFESSIONAL_TYPES = [
  { value: "veterinario", label: "Veterinário(a)" },
  { value: "banho_tosa", label: "Banho & Tosa" },
  { value: "passeador", label: "Passeador" },
  { value: "loja", label: "Loja Pet" },
  { value: "hotel", label: "Hotel Pet" },
  { value: "treinador", label: "Treinador(a) de Pets" },
  { value: "pet_sitter", label: "Pet Sitter" },
  { value: "fotografo", label: "Fotógrafo(a) de Pets" },
  { value: "outro", label: "Outro" },
];

const SPECIALTIES = [
  "Cães",
  "Gatos",
  "Pássaros",
  "Roedores",
  "Répteis",
  "Peixes",
  "Coelhos",
  "Hamsters",
  "Cirurgia",
  "Dermatologia",
  "Cardiologia",
  "Ortopedia",
  "Comportamento",
  "Nutrição",
  "Emergência 24h"
];

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function ProfessionalSignup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateProfessionalProfile, refreshProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    professional_service_type: "",
    professional_custom_service_type: "",
    professional_bio: "",
    professional_phone: "",
    professional_whatsapp: "",
    professional_address: "",
    professional_city: "",
    professional_state: "",
    professional_zip: "",
    professional_specialties: [] as string[],
    professional_price_range: "",
    professional_crmv: "",
    professional_crmv_state: "",
    professional_latitude: null as number | null,
    professional_longitude: null as number | null,
  });

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      professional_service_type: value,
      // Limpa o tipo customizado se mudar de 'outro'
      professional_custom_service_type: value === 'outro' ? prev.professional_custom_service_type : "",
    }));
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      professional_specialties: prev.professional_specialties.includes(specialty)
        ? prev.professional_specialties.filter((s) => s !== specialty)
        : [...prev.professional_specialties, specialty],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error("Preencha seu nome completo");
      return;
    }

    if (!formData.professional_service_type) {
      toast.error("Selecione sua profissão");
      return;
    }

    if (formData.professional_service_type === 'outro' && !formData.professional_custom_service_type.trim()) {
      toast.error("Especifique sua profissão");
      return;
    }

    if (formData.professional_service_type === 'veterinario') {
      if (!formData.professional_crmv.trim()) {
        toast.error("CRMV é obrigatório para veterinários");
        return;
      }
      if (!formData.professional_crmv_state) {
        toast.error("Estado do CRMV é obrigatório para veterinários");
        return;
      }
    }

    if (!formData.professional_bio.trim()) {
      toast.error("Preencha sua bio profissional");
      return;
    }

    if (!formData.professional_phone.trim()) {
      toast.error("Preencha seu telefone");
      return;
    }

    if (!formData.professional_city.trim()) {
      toast.error("Preencha sua cidade");
      return;
    }

    if (!formData.professional_state.trim()) {
      toast.error("Preencha seu estado");
      return;
    }

    if (!formData.professional_zip.trim()) {
      toast.error("Preencha seu CEP");
      return;
    }

    if (formData.professional_specialties.length === 0) {
      toast.error("Selecione pelo menos uma especialidade");
      return;
    }

    setLoading(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      // Tenta geocodificar o endereço
      const addressToGeocode = `${formData.professional_address ? formData.professional_address + ', ' : ''}${formData.professional_city}, ${formData.professional_state}, Brasil`;
      
      try {
        const location = await geocodeAddress(addressToGeocode);
        latitude = location.latitude;
        longitude = location.longitude;
      } catch (geoError) {
        console.warn("Erro ao geocodificar endereço, continuando sem coordenadas:", geoError);
        // Não bloqueia o cadastro se a geocodificação falhar
      }

      // Mapeia o tipo de serviço para o enum do banco de dados se necessário
      // O banco usa: "adestrador" | "passeador" | "veterinario" | "pet_sitter" | "groomer" | "fotografo" | "outros"
      const serviceTypeMap: Record<string, string> = {
        'veterinario': 'veterinario',
        'banho_tosa': 'groomer',
        'passeador': 'passeador',
        'loja': 'outros',
        'hotel': 'outros',
        'treinador': 'adestrador',
        'pet_sitter': 'pet_sitter',
        'fotografo': 'fotografo',
        'outro': 'outros'
      };

      const dbServiceType = serviceTypeMap[formData.professional_service_type] || 'outros';

      await updateProfessionalProfile({
        full_name: formData.full_name,
        professional_latitude: latitude,
        professional_longitude: longitude,
        account_type: "professional",
        professional_bio: formData.professional_bio,
        professional_phone: formData.professional_phone,
        professional_whatsapp: formData.professional_whatsapp,
        professional_address: formData.professional_address,
        professional_city: formData.professional_city,
        professional_state: formData.professional_state,
        professional_zip: formData.professional_zip,
        professional_specialties: formData.professional_specialties,
        professional_service_type: dbServiceType,
        professional_custom_service_type: formData.professional_custom_service_type || formData.professional_service_type,
        professional_price_range: formData.professional_price_range,
        professional_crmv: formData.professional_crmv,
        professional_crmv_state: formData.professional_crmv_state,
      });

      toast.success("Perfil profissional criado com sucesso!");
      await refreshProfile();
      navigate("/professional-dashboard", { replace: true });
    } catch (error: any) {
      console.error("Erro ao criar perfil profissional:", error);
      const errorMessage = error.message || "Erro ao criar perfil profissional";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex flex-col items-center justify-center px-4 py-8">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/signup-choice")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Briefcase className="w-8 h-8 text-secondary" />
              </div>
            </div>
            <h1 className="text-4xl font-heading font-bold mb-2">
              Cadastro Profissional
            </h1>
            <p className="text-muted-foreground">
              Complete seu perfil para começar a oferecer seus serviços
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-secondary/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Informações Profissionais</CardTitle>
              <CardDescription>
                Preencha os dados abaixo para criar seu perfil profissional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome Completo */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2 font-semibold">
                    Nome Completo *
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    placeholder="Seu nome completo ou nome do seu negócio"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Professional Type */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="professional_service_type" className="flex items-center gap-2 font-semibold">
                      <Award className="w-4 h-4" />
                      Tipo de Profissional *
                    </Label>
                    <Select value={formData.professional_service_type} onValueChange={handleSelectChange}>
                      <SelectTrigger id="professional_service_type" className="h-11">
                        <SelectValue placeholder="Selecione sua profissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSIONAL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <AnimatePresence>
                    {(formData.professional_service_type === 'outro' || formData.professional_service_type === 'loja' || formData.professional_service_type === 'hotel') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="professional_custom_service_type" className="flex items-center gap-2 font-semibold text-secondary">
                          <PlusCircle className="w-4 h-4" />
                          Especifique sua Profissão *
                        </Label>
                        <Input
                          id="professional_custom_service_type"
                          name="professional_custom_service_type"
                          placeholder="Ex: Adestrador, Terapeuta Holístico, etc."
                          value={formData.professional_custom_service_type}
                          onChange={handleInputChange}
                          className="h-11 border-secondary/30 focus-visible:ring-secondary"
                        />
                      </motion.div>
                    )}

                    {formData.professional_service_type === 'veterinario' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 p-4 rounded-lg bg-blue-50/50 border border-blue-200"
                      >
                        <Label className="flex items-center gap-2 font-semibold text-blue-600">
                          <Stethoscope className="w-4 h-4" />
                          Dados do CRMV *
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="professional_crmv">Número CRMV</Label>
                            <Input
                              id="professional_crmv"
                              name="professional_crmv"
                              placeholder="00000"
                              value={formData.professional_crmv}
                              onChange={handleInputChange}
                              className="bg-background"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="professional_crmv_state">Estado (UF)</Label>
                            <Select 
                              value={formData.professional_crmv_state} 
                              onValueChange={(val) => setFormData(prev => ({ ...prev, professional_crmv_state: val }))}
                            >
                              <SelectTrigger id="professional_crmv_state" className="bg-background">
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                              <SelectContent>
                                {BRAZILIAN_STATES.map(state => (
                                  <SelectItem key={state} value={state}>{state}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600/80 italic">
                          O CRMV é obrigatório para exibir o selo de verificação de saúde.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="professional_bio" className="font-semibold">Bio Profissional *</Label>
                  <Textarea
                    id="professional_bio"
                    name="professional_bio"
                    placeholder="Conte um pouco sobre sua experiência e serviços..."
                    maxLength={500}
                    value={formData.professional_bio}
                    onChange={handleInputChange}
                    className="min-h-24 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.professional_bio.length}/500 caracteres
                  </p>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="professional_phone" className="font-semibold">Telefone (Obrigatório) *</Label>
                    <Input
                      id="professional_phone"
                      name="professional_phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.professional_phone}
                      onChange={handleInputChange}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="professional_whatsapp" className="font-semibold">WhatsApp (Opcional)</Label>
                    <Input
                      id="professional_whatsapp"
                      name="professional_whatsapp"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.professional_whatsapp}
                      onChange={handleInputChange}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                  <Label className="flex items-center gap-2 font-semibold text-base">
                    <MapPin className="w-4 h-4" />
                    Localização *
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="professional_city" className="text-sm">Cidade *</Label>
                      <Input
                        id="professional_city"
                        name="professional_city"
                        placeholder="São Paulo"
                        value={formData.professional_city}
                        onChange={handleInputChange}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="professional_state" className="text-sm">Estado *</Label>
                      <Input
                        id="professional_state"
                        name="professional_state"
                        placeholder="SP"
                        value={formData.professional_state}
                        onChange={handleInputChange}
                        maxLength={2}
                        className="h-10 uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="professional_address" className="text-sm">Endereço (opcional)</Label>
                    <Input
                      id="professional_address"
                      name="professional_address"
                      placeholder="Rua, número, bairro"
                      value={formData.professional_address}
                      onChange={handleInputChange}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="professional_zip" className="font-semibold">CEP *</Label>
                    <Input
                      id="professional_zip"
                      name="professional_zip"
                      placeholder="00000-000"
                      value={formData.professional_zip}
                      onChange={handleInputChange}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Specialties */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Award className="w-4 h-4" />
                    Especialidades *
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Selecione as espécies que você trabalha
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALTIES.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => toggleSpecialty(specialty)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          formData.professional_specialties.includes(specialty)
                            ? "border-secondary bg-secondary text-secondary-foreground shadow-md"
                            : "border-border bg-background text-foreground hover:border-secondary/50"
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label htmlFor="professional_price_range" className="flex items-center gap-2 font-semibold">
                    <DollarSign className="w-4 h-4" />
                    Faixa de Preço (Opcional)
                  </Label>
                  <Select
                    value={formData.professional_price_range}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        professional_price_range: value,
                      }))
                    }
                  >
                    <SelectTrigger id="professional_price_range" className="h-11">
                      <SelectValue placeholder="Selecione uma faixa de preço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R$">R$ (Baixo)</SelectItem>
                      <SelectItem value="R$$">R$$ (Médio)</SelectItem>
                      <SelectItem value="R$$$">R$$$ (Alto)</SelectItem>
                      <SelectItem value="Sob Consulta">Sob Consulta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando perfil...
                    </>
                  ) : (
                    "Criar Perfil Profissional"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          <p>
            Você poderá editar essas informações a qualquer momento no seu perfil profissional
          </p>
        </motion.div>
      </div>
    </div>
  );
}
