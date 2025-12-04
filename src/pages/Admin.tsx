import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, PawPrint, FileText, Trash2 } from "lucide-react";

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/feed");
      return;
    }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    const [usersRes, petsRes, postsRes] = await Promise.all([
      supabase.from("profiles").select("*").limit(50),
      supabase.from("pets").select("*").limit(50),
      supabase.from("posts").select("*").limit(50),
    ]);
    if (usersRes.data) setUsers(usersRes.data);
    if (petsRes.data) setPets(petsRes.data);
    if (postsRes.data) setPosts(postsRes.data);
  };

  const deletePet = async (id: string) => {
    await supabase.from("pets").delete().eq("id", id);
    toast({ title: "Pet removido" });
    fetchData();
  };

  const deletePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    toast({ title: "Post removido" });
    fetchData();
  };

  if (!isAdmin) return null;

  return (
    <MainLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Painel Admin</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="card-elevated border-0">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Usuários</p>
            </CardContent>
          </Card>
          <Card className="card-elevated border-0">
            <CardContent className="p-4 text-center">
              <PawPrint className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{pets.length}</p>
              <p className="text-sm text-muted-foreground">Pets</p>
            </CardContent>
          </Card>
          <Card className="card-elevated border-0">
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-accent-foreground" />
              <p className="text-2xl font-bold">{posts.length}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </CardContent>
          </Card>
        </div>

        <Card className="card-elevated border-0">
          <Tabs defaultValue="pets">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="users">Usuários</TabsTrigger>
                <TabsTrigger value="pets">Pets</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="users" className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">{u.email}</span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="pets" className="space-y-2">
                {pets.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>{p.name} ({p.species})</span>
                    <Button variant="destructive" size="sm" onClick={() => deletePet(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="posts" className="space-y-2">
                {posts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="truncate flex-1">{p.description || "Sem descrição"}</span>
                    <Button variant="destructive" size="sm" onClick={() => deletePost(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Admin;
