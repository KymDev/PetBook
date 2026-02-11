import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft, Stethoscope, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  message: string | null;
  sender_pet_id: string | null;
  sender_user_id: string | null;
  created_at: string;
}

interface OtherParty {
  id: string;
  name: string;
  avatar_url: string | null;
  isProfessional: boolean;
}

const ChatRoom = () => {
  const { petId, userId } = useParams<{ petId?: string; userId?: string }>();
  const { currentPet } = usePet();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isProfessional = profile?.account_type === 'professional';
  const myId = isProfessional ? user?.id : currentPet?.id;

  useEffect(() => {
    if (!myId) {
      setLoading(false);
      return;
    }
    initializeChat();
  }, [myId, petId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`chat-messages-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, 
      (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const initializeChat = async () => {
    setLoading(true);
    try {
      let party: OtherParty | null = null;
      let otherId = petId || userId;

      if (userId) {
        const { data } = await supabase.from("user_profiles").select("full_name, professional_avatar_url").eq("id", userId).single();
        if (data) party = { id: userId, name: data.full_name || "Profissional", avatar_url: data.professional_avatar_url, isProfessional: true };
      } else if (petId) {
        const { data } = await supabase.from("pets").select("id, name, avatar_url").eq("id", petId).single();
        if (data) party = { id: petId, name: data.name, avatar_url: data.avatar_url, isProfessional: false };
      }

      if (!party || !otherId) throw new Error("Destinatário não encontrado");
      setOtherParty(party);

      // Buscar sala existente
      const { data: existingRoom } = await supabase
        .from("chat_rooms")
        .select("*")
        .or(`and(pet_1.eq.${myId},pet_2.eq.${otherId}),and(pet_1.eq.${otherId},pet_2.eq.${myId})`)
        .maybeSingle();

      if (existingRoom) {
        setRoomId(existingRoom.id);
        fetchMessages(existingRoom.id);
      } else {
        const { data: newRoom } = await supabase.from("chat_rooms").insert({ pet_1: myId, pet_2: otherId }).select().single();
        if (newRoom) setRoomId(newRoom.id);
      }
    } catch (error: any) {
      console.error("Erro ao inicializar chat:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("room_id", id).order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!myId || !roomId || !newMessage.trim() || sending || !otherParty) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    try {
      const msgData = isProfessional 
        ? { room_id: roomId, sender_user_id: myId, message: text }
        : { room_id: roomId, sender_pet_id: myId, message: text };

      const { error } = await supabase.from("chat_messages").insert(msgData);
      if (error) throw error;

      // Criar notificação para o destinatário
      await supabase.from("notifications").insert({
        // Destinatário
        pet_id: otherParty.isProfessional ? null : otherParty.id,
        related_user_id: otherParty.isProfessional ? otherParty.id : null,
        
        type: "message",
        message: `${isProfessional ? profile?.full_name : currentPet?.name} enviou uma mensagem`,
        
        // Autor (quem gerou a notificação)
        related_pet_id: isProfessional ? null : currentPet?.id,
        // Adicionamos o related_user_id do autor se ele for profissional para que o destinatário saiba quem mandou
        author_user_id: isProfessional ? user?.id : null,
        
        is_read: false,
      });
    } catch (error) {
      console.error("Erro ao enviar:", error);
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <MainLayout><div className="container max-w-xl py-6 text-center">Carregando...</div></MainLayout>;

  return (
    <MainLayout>
      <div className="container max-w-xl py-6">
        <Card className="card-elevated border-0 h-[calc(100vh-8rem)] flex flex-col">
          <CardHeader className="border-b border-border p-4">
            <CardTitle className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}><ArrowLeft className="h-5 w-5" /></Button>
              <Avatar>
                <AvatarImage src={otherParty?.avatar_url || undefined} />
                <AvatarFallback>{otherParty?.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{otherParty?.name}</p>
                {otherParty?.isProfessional && <p className="text-xs text-blue-500">Profissional</p>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isMe = isProfessional ? msg.sender_user_id === myId : msg.sender_pet_id === myId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${isMe ? "gradient-bg text-white rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="p-4 border-t border-border flex gap-2">
            <Input placeholder="Mensagem..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
            <Button onClick={sendMessage} className="gradient-bg" disabled={!newMessage.trim() || sending}><Send className="h-4 w-4" /></Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ChatRoom;
