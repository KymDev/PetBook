import { useState } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  CheckCircle,
  AlertCircle,
  Save,
  Trash2,
  MapPin,
  DollarSign,
  Stethoscope
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { useNavigate, Navigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

const serviceTypeOptions = [
  { value: "veterinario", label: "Veterinário(a)" },
  { value: "banho_tosa", label: "Banho & Tosa" },
  { value: "passeador", label: "Passeador" },
  { value: "loja", label: "Loja Pet" },
  { value: "hotel", label: "Hotel Pet" },
  { value: "treinador", label: "Treinador(a) de Pets" },
  { value: "pet_sitter", label: "Pet Sitter" },
  { value: "fotografo", label: "Fotógrafo(a) de Pets" },
  { value: "outros", label: "Outro" }
];

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const ProfessionalProfile = () => {
  const { profile, updateProfessionalProfile, loading: profileLoading } = useUserProfile();
  const { deleteAccount, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const isProfileComplete = (p: any) => {
    if (!p) return false;

    const requiredFields = [
      p.professional_service_type,
      p.professional_bio,
      p.professional_phone,
      p.professional_address,
      p.professional_city,
      p.professional_state,
      p.professional_zip,
    ];

    const isServiceTypeValid = p.professional_service_type && (
      p.professional_service_type !== 'outros' || (p.professional_service_type === 'outros' && p.professional_custom_service_type)
    );

    const hasSpecialties = p.professional_specialties && p.professional_specialties.length > 0;
    
    // Se for veterinário, CRMV e Estado do CRMV são obrigatórios para ser "completo"
    const isVet = p.professional_service_type === 'veterinario';
    const hasCrmv = !isVet || (p.professional_crmv && p.professional_crmv_state);

    return requiredFields.every(field => !!field) && isServiceTypeValid && hasSpecialties && hasCrmv;
  };

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    professional_bio: profile?.professional_bio || "",
    professional_phone: profile?.professional_phone || "",
    professional_address: profile?.professional_address || "",
    professional_service_type: profile?.professional_service_type || "",
    professional_specialties: profile?.professional_specialties || [] as string[],
    professional_whatsapp: profile?.professional_whatsapp || "",
    professional_city: profile?.professional_city || "",
    professional_state: profile?.professional_state || "",
    professional_zip: profile?.professional_zip || "",
    professional_price_range: profile?.professional_price_range || "",
    professional_custom_service_type: profile?.professional_custom_service_type || "",
    professional_avatar_url: profile?.professional_avatar_url || "",
    professional_crmv: profile?.professional_crmv || "",
    professional_crmv_state: profile?.professional_crmv_state || ""
  });

  if (authLoading || profileLoading) {
    return <LoadingScreen message="Carregando perfil..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.account_type !== 'professional') {
    return <Navigate to="/feed" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfessionalProfile({
        ...formData,
        professional_avatar_url: formData.professional_avatar_url || null,
      });
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações profissionais foram salvas com sucesso."
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      professional_specialties: prev.professional_specialties.includes(specialty)
        ? prev.professional_specialties.filter(s => s !== specialty)
        : [...prev.professional_specialties, specialty]
    }));
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      const { error } = await deleteAccount();
      if (error) throw error;

      toast({
        title: "Conta deletada",
        description: "Sua conta foi removida com sucesso."
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro ao deletar conta",
        description: error.message || "Algo deu errado ao deletar a conta.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-2xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-8 w-8" />
              Perfil Profissional
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete suas informações para aparecer no diretório de serviços
            </p>
          </div>

          {profile.is_professional_verified ? (
            <Badge className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Verificado
            </Badge>
          ) : isProfileComplete(profile) ? (
            <Badge className="gap-1 bg-green-500 hover:bg-green-600">
              <CheckCircle className="h-3 w-3" />
              Completo
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Pendente
            </Badge>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Seu nome e foto de perfil profissional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <AvatarUpload
                  currentAvatarUrl={formData.professional_avatar_url}
                  onUploadSuccess={(newUrl) =>
                    setFormData((prev) => ({
                      ...prev,
                      professional_avatar_url: newUrl,
                    }))
                  }
                  bucketPath={`professional_avatars/${profile.id}`}
                  bucketName="petbook-media"
                  fallbackText={profile.full_name ? profile.full_name[0] : "P"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo / Nome do Negócio</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Seu nome profissional"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Adicione uma foto de perfil para seu negócio.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={formData.professional_avatar_url}
                onUploadSuccess={(newUrl) =>
                  setFormData((prev) => ({
                    ...prev,
                    professional_avatar_url: newUrl,
                  }))
                }
                bucketPath={`professional_avatars/${profile.id}`}
                bucketName="petbook-media"
                fallbackText={profile.full_name ? profile.full_name[0] : "P"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Tipo de Serviço
              </CardTitle>
              <CardDescription>
                Selecione o tipo principal de serviço que você oferece
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.professional_service_type}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    professional_service_type: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {formData.professional_service_type === "veterinario" && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Stethoscope className="h-5 w-5" />
                  Dados do CRMV
                </CardTitle>
                <CardDescription>
                  Necessário para o selo de Profissional de Saúde Pet.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="professional_crmv">Número CRMV</Label>
                  <Input
                    id="professional_crmv"
                    value={formData.professional_crmv}
                    onChange={e => setFormData(prev => ({ ...prev, professional_crmv: e.target.value }))}
                    placeholder="00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professional_crmv_state">Estado (UF)</Label>
                  <Select 
                    value={formData.professional_crmv_state} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, professional_crmv_state: val }))}
                  >
                    <SelectTrigger id="professional_crmv_state">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {formData.professional_service_type === "outros" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Serviço Personalizado *
                </CardTitle>
                <CardDescription>
                  Preencha o nome do seu serviço.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  id="professional_custom_service_type"
                  name="professional_custom_service_type"
                  type="text"
                  placeholder="Ex: Adestrador, Acupunturista, etc."
                  value={formData.professional_custom_service_type}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      professional_custom_service_type: e.target.value
                    }))
                  }
                  required
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Especialidades
              </CardTitle>
              <CardDescription>
                Selecione suas áreas de especialização (ex: tipos de pets, procedimentos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_specialty" className="font-semibold">
                    Adicionar Especialidade (Pets e Procedimentos)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="new_specialty"
                      type="text"
                      placeholder="Ex: Cães, Gatos, Cirurgia, etc."
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const newSpecialty = e.currentTarget.value.trim();
                          if (newSpecialty && !formData.professional_specialties.includes(newSpecialty)) {
                            toggleSpecialty(newSpecialty);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("new_specialty") as HTMLInputElement;
                        const newSpecialty = input.value.trim();
                        if (newSpecialty && !formData.professional_specialties.includes(newSpecialty)) {
                          toggleSpecialty(newSpecialty);
                          input.value = "";
                        }
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={formData.professional_specialties.includes("Pets em Geral") ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSpecialty("Pets em Geral")}
                  >
                    Pets em Geral
                  </Badge>
                  <Badge
                    variant={formData.professional_specialties.includes("Procedimentos em Geral") ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSpecialty("Procedimentos em Geral")}
                  >
                    Procedimentos em Geral
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {formData.professional_specialties.map(specialty => (
                    <Badge
                      key={specialty}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleSpecialty(specialty)}
                    >
                      {specialty} <span className="ml-2 text-xs">x</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Bio Profissional
              </CardTitle>
              <CardDescription>
                Descreva sua experiência, qualificações e o que torna seu serviço único.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={5}
                value={formData.professional_bio}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    professional_bio: e.target.value
                  }))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Faixa de Preço
              </CardTitle>
              <CardDescription>
                Indique a faixa de preço dos seus serviços (opcional).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.professional_price_range}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    professional_price_range: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma faixa de preço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R$">R$ (Baixo)</SelectItem>
                  <SelectItem value="R$$">R$$ (Médio)</SelectItem>
                  <SelectItem value="R$$$">R$$$ (Alto)</SelectItem>
                  <SelectItem value="Sob Consulta">Sob Consulta</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Localização e Contato
              </CardTitle>
              <CardDescription>
                Informações de contato e endereço para o diretório de serviços.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="professional_phone">Telefone</Label>
                  <Input
                    id="professional_phone"
                    value={formData.professional_phone}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        professional_phone: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="professional_whatsapp">WhatsApp</Label>
                  <Input
                    id="professional_whatsapp"
                    value={formData.professional_whatsapp}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        professional_whatsapp: e.target.value
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="professional_address">Endereço Completo</Label>
                <Input
                  id="professional_address"
                  value={formData.professional_address}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      professional_address: e.target.value
                    }))
                  }
                  placeholder="Rua, Número, Bairro"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="professional_city">Cidade</Label>
                  <Input
                    id="professional_city"
                    value={formData.professional_city}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        professional_city: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="professional_state">Estado (UF)</Label>
                  <Input
                    id="professional_state"
                    value={formData.professional_state}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        professional_state: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="professional_zip">CEP</Label>
                  <Input
                    id="professional_zip"
                    value={formData.professional_zip}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        professional_zip: e.target.value
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Perfil"}
          </Button>

          <Card className="border-red-500/50 bg-red-500/10">
            <CardHeader>
              <CardTitle className="text-red-600">
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full border-red-500 text-red-500">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Deletar conta permanentemente?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
};

export default ProfessionalProfile;
