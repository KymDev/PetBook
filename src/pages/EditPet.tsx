import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePet, Pet } from "@/contexts/PetContext";
import { supabase } from "@/integrations/supabase/client";
import { PetBookLogo } from "@/components/PetBookLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DeleteAccountModal from "@/components/DeleteAccountModal";
	import { z } from "zod";
	import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
	import { Loader2, Upload, PawPrint, Save, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const petSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(50),
  species: z.string().min(1, "Espécie é obrigatória"),
  breed: z.string().min(1, "Raça é obrigatória").max(50),
  age: z.number().min(0, "Idade inválida").max(50),
  bio: z.string().max(300).optional(),
  guardian_name: z.string().min(1, "Nome do guardião é obrigatório").max(100),
  guardian_instagram_username: z.string().min(1, "Username do Instagram é obrigatório").max(30),
});

const speciesOptions = [
  { value: "cachorro", label: "🐶 Cachorro" },
  { value: "gato", label: "🐱 Gato" },
  { value: "passaro", label: "🐦 Pássaro" },
  { value: "reptil", label: "🦎 Réptil" },
  { value: "peixe", label: "🐠 Peixe" },
  { value: "roedor", label: "🐹 Roedor" },
  { value: "coelho", label: "🐰 Coelho" },
  { value: "outro", label: "🐾 Outro" },
];

const EditPet = () => {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const { myPets, refreshAll } = usePet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [initialPet, setInitialPet] = useState<Pet | null>(null);
  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    age: "",
    bio: "",
    guardian_name: "",
    guardian_instagram_username: "",
  });

  useEffect(() => {
    const petToEdit = myPets.find(p => p.id === petId);
    if (petToEdit) {
      setInitialPet(petToEdit);
      setForm({
        name: petToEdit.name,
        species: petToEdit.species,
        breed: petToEdit.breed,
        age: petToEdit.age.toString(),
        bio: petToEdit.bio || "",
        guardian_name: petToEdit.guardian_name,
        guardian_instagram_username: petToEdit.guardian_instagram_username,
      });
      setAvatarUrl(petToEdit.avatar_url);
      setLoading(false);
    } else if (petId) {
      // Se não estiver no contexto, tenta buscar no Supabase (caso seja o primeiro pet)
      fetchPetData(petId);
    } else {
      navigate("/feed"); // Redireciona se não tiver petId
    }
  }, [petId, myPets, navigate]);

  const fetchPetData = async (id: string) => {
    const { data, error } = await supabase
      .from("pets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast({
        title: "Erro",
        description: "Pet não encontrado ou você não tem permissão para editar.",
        variant: "destructive",
      });
      navigate("/feed");
      return;
    }

    setInitialPet(data as Pet);
    setForm({
      name: data.name,
      species: data.species,
      breed: data.breed,
      age: data.age.toString(),
      bio: data.bio || "",
      guardian_name: data.guardian_name,
      guardian_instagram_username: data.guardian_instagram_username,
    });
    setAvatarUrl(data.avatar_url);
    setLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return initialPet?.avatar_url || null;
    
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error } = await supabase.storage
      .from("petbook-media")
      .upload(filePath, avatarFile);

    if (error) throw error;

    const { data } = supabase.storage
      .from("petbook-media")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !petId) return;

    const validation = petSchema.safeParse({
      ...form,
      age: parseInt(form.age) || 0,
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let finalAvatarUrl = initialPet?.avatar_url || null;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar();
      }

      const { error } = await supabase.from("pets").update({
        name: form.name,
        species: form.species,
        breed: form.breed,
        age: parseInt(form.age),
        bio: form.bio || null,
        avatar_url: finalAvatarUrl,
        guardian_name: form.guardian_name,
        guardian_instagram_username: form.guardian_instagram_username.replace("@", ""),
      }).eq("id", petId).eq("user_id", user.id); // Garante que só o dono edita

      if (error) throw error;

      toast({
        title: "Pet atualizado!",
        description: `${form.name} teve seu perfil atualizado com sucesso.`,
      });

      await refreshAll();
      navigate(`/pet/${petId}`);
    } catch (error: any) {
      console.error("ERRO NO SUBMIT:", error);
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
	      setIsSaving(false);
	    }
	  };
	
	  const handleDelete = async () => {
	    if (!petId) return;
	
	    setIsSaving(true);
	    try {
	      await deletePet(petId);
	
	      toast({
	        title: "Pet Excluído",
	        description: `${initialPet?.name} foi removido com sucesso.`,
	      });
	
	      navigate("/feed"); // Redireciona para o feed ou lista de pets
	    } catch (error: any) {
	      console.error("ERRO AO EXCLUIR PET:", error);
	      toast({
	        title: "Erro",
	        description: error.message || "Algo deu errado ao excluir o pet. Tente novamente.",
	        variant: "destructive",
	      });
	    } finally {
	      setIsSaving(false);
	    }
	  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!initialPet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Pet não encontrado ou acesso negado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6 animate-slide-up">
        <div className="text-center">
          <PetBookLogo size="md" className="justify-center" />
          <h1 className="mt-4 text-2xl font-heading font-bold">Editar Perfil de {initialPet.name}</h1>
          <p className="text-muted-foreground">
            Atualize as informações do seu amiguinho
          </p>
        </div>

        <Card className="card-elevated border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              Informações do Pet
            </CardTitle>
            <CardDescription>
              Todos os campos marcados são obrigatórios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {form.name?.[0]?.toUpperCase() || "🐾"}
                  </AvatarFallback>
                </Avatar>
                <Label htmlFor="avatar" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    Mudar foto
                  </div>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Thor"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Idade *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Ex: 3"
                    min="0"
                    max="50"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="species">Espécie *</Label>
                  <Select
                    value={form.species}
                    onValueChange={(value) => setForm({ ...form, species: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">Raça *</Label>
                  <Input
                    id="breed"
                    placeholder="Ex: Golden Retriever"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Conte um pouco sobre seu pet..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  disabled={isSaving}
                  rows={3}
                />
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Guardião Humano
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="guardian_name">Seu nome *</Label>
                  <Input
                    id="guardian_name"
                    placeholder="Ex: João Silva"
                    value={form.guardian_name}
                    onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardian_instagram">Instagram (username) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="guardian_instagram"
                      placeholder="seuusername"
                      value={form.guardian_instagram_username}
                      onChange={(e) => setForm({ ...form, guardian_instagram_username: e.target.value.replace("@", "") })}
                      disabled={isSaving}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

	              <Button
	                type="submit"
	                disabled={isSaving}
	                className="w-full gradient-bg"
	                size="lg"
	              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
	                <Save className="h-4 w-4 mr-2" />
	                    Salvar Alterações
	                  </>
	                )}
	              </Button>
	
		              <AlertDialog>
		                <AlertDialogTrigger asChild>
		                  <Button
		                    type="button"
		                    variant="outline"
		                    className="w-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
		                    size="lg"
		                  >
		                    <Trash2 className="h-4 w-4 mr-2" />
		                    Deletar Pet
		                  </Button>
		                </AlertDialogTrigger>
		                <AlertDialogContent>
		                  <AlertDialogHeader>
		                    <AlertDialogTitle>Tem certeza que deseja excluir {initialPet.name}?</AlertDialogTitle>
		                    <AlertDialogDescription>
		                      Esta ação é irreversível. Todos os dados, posts e interações de {initialPet.name} serão permanentemente removidos.
		                    </AlertDialogDescription>
		                  </AlertDialogHeader>
		                  <AlertDialogFooter>
		                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
		                    <AlertDialogAction
		                      onClick={handleDelete}
		                      className="bg-red-500 hover:bg-red-600"
		                      disabled={isSaving}
		                    >
		                      {isSaving ? (
		                        <Loader2 className="h-4 w-4 animate-spin" />
		                      ) : (
		                        "Excluir Permanentemente"
		                      )}
		                    </AlertDialogAction>
		                  </AlertDialogFooter>
		                </AlertDialogContent>
		              </AlertDialog>
		              
		              <div className="pt-4 border-t border-border mt-4">
		                <DeleteAccountModal isProfessional={false} />
		              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditPet;
