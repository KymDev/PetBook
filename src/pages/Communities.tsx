import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface Community {
  id: string;
  name: string;
  category: string;
  description: string | null;
  memberCount?: number;
  isMember?: boolean;
}

const Communities = () => {
  const { currentPet } = usePet();
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    fetchCommunities();
  }, [currentPet]);

  const fetchCommunities = async () => {
    const { data } = await supabase.from("communities").select("*");
    if (data && currentPet) {
      const withMembership = await Promise.all(
        data.map(async (c) => {
          const { count } = await supabase
            .from("community_members")
            .select("id", { count: "exact", head: true })
            .eq("community_id", c.id);
          const { data: membership } = await supabase
            .from("community_members")
            .select("id")
            .eq("community_id", c.id)
            .eq("pet_id", currentPet.id)
            .maybeSingle();
          return { ...c, memberCount: count || 0, isMember: !!membership };
        })
      );
      setCommunities(withMembership);
    }
  };

  const handleJoin = async (communityId: string, isMember: boolean) => {
    if (!currentPet) return;
    if (isMember) {
      await supabase.from("community_members").delete().eq("community_id", communityId).eq("pet_id", currentPet.id);
    } else {
      await supabase.from("community_members").insert({ community_id: communityId, pet_id: currentPet.id });
    }
    fetchCommunities();
  };

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-4">
        <h1 className="text-2xl font-heading font-bold">Comunidades</h1>
        {communities.length === 0 ? (
          <Card className="card-elevated border-0">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma comunidade disponível</p>
            </CardContent>
          </Card>
        ) : (
          communities.map((c) => (
            <Card key={c.id} className="card-elevated border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{c.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">{c.category}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-sm">{c.memberCount} membros</span>
                  <Button
                    variant={c.isMember ? "outline" : "default"}
                    className={!c.isMember ? "gradient-bg" : ""}
                    onClick={() => handleJoin(c.id, !!c.isMember)}
                  >
                    {c.isMember ? "Sair" : "Participar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default Communities;
