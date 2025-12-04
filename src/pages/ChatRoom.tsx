import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";

interface Message {
  id: string;
  message: string | null;
  sender_pet_id: string;
  created_at: string;
}

const ChatRoom = () => {
  const { petId } = useParams<{ petId: string }>();
  const { currentPet } = usePet();
  const [otherPet, setOtherPet] = useState<Pet | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentPet && petId) {
      initializeChat();
    }
  }, [currentPet, petId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const initializeChat = async () => {
    if (!currentPet || !petId) return;

    // Fetch other pet
    const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();
    if (pet) setOtherPet(pet);

    // Find or create room
    const { data: existingRoom } = await supabase
      .from("chat_rooms")
      .select("*")
      .or(`and(pet_1.eq.${currentPet.id},pet_2.eq.${petId}),and(pet_1.eq.${petId},pet_2.eq.${currentPet.id})`)
      .maybeSingle();

    if (existingRoom) {
      setRoomId(existingRoom.id);
      fetchMessages(existingRoom.id);
    } else {
      const { data: newRoom } = await supabase
        .from("chat_rooms")
        .insert({ pet_1: currentPet.id, pet_2: petId })
        .select()
        .single();
      if (newRoom) setRoomId(newRoom.id);
    }
  };

  const fetchMessages = async (id: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!currentPet || !roomId || !newMessage.trim()) return;

    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_pet_id: currentPet.id,
      message: newMessage.trim(),
    });

    setNewMessage("");
  };

  return (
    <MainLayout>
      <div className="container max-w-xl py-6">
        <Card className="card-elevated border-0 h-[calc(100vh-8rem)] flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherPet?.avatar_url || undefined} />
                <AvatarFallback>{otherPet?.name[0]}</AvatarFallback>
              </Avatar>
              {otherPet?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_pet_id === currentPet?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-2xl ${
                    msg.sender_pet_id === currentPet?.id
                      ? "gradient-bg text-white rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="p-4 border-t border-border flex gap-2">
            <Input
              placeholder="Digite uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage} className="gradient-bg">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ChatRoom;
