import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteAccountModalProps {
  isProfessional: boolean;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isProfessional }) => {
  const { deleteAccount } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await deleteAccount();

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Conta Excluída",
        description: "Sua conta foi permanentemente removida. Sentiremos sua falta!",
        variant: "default",
      });

      // Redireciona para a página de login após a exclusão
      navigate("/auth");
    } catch (error: any) {
      console.error("ERRO AO EXCLUIR CONTA:", error);
      toast({
        title: "Erro ao Excluir Conta",
        description: error.message || "Algo deu errado ao excluir sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const title = isProfessional ? "Excluir Perfil Profissional e Conta" : "Excluir Conta de Guardião";
  const description = isProfessional
    ? "Esta ação irá remover seu perfil profissional, todos os seus dados de atendimento, e sua conta de usuário. Todos os seus pets e posts também serão excluídos. Esta ação é irreversível."
    : "Esta ação irá remover sua conta de usuário, todos os seus pets e posts. Esta ação é irreversível.";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
          size="lg"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isProfessional ? "Deletar Profissional" : "Deletar Conta"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Excluir Permanentemente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountModal;
