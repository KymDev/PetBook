import { useState } from "react";
import { useUserProfile, AccountType } from "@/contexts/UserProfileContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export const AccountSwitcher = () => {
  const { t } = useTranslation();
  const { profile, switchAccountType } = useUserProfile();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  if (!profile) return null;

  const isProfessional = profile.account_type === 'professional';

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      const newType: AccountType = isProfessional ? 'user' : 'professional';
      await switchAccountType(newType);
      
      toast({
        title: t("menu.account_switched_success"),
        description: t("menu.account_switched_desc", { mode: newType === 'professional' ? t("common.professional") : t("common.user") }),
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: t("menu.account_switch_error"),
        description: t("menu.account_switch_error_desc"),
        variant: "destructive",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {isProfessional ? (
            <>
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.professional")}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.user")}</span>
            </>
          )}
          {profile.is_professional_verified && (
            <CheckCircle className="h-3 w-3 text-primary" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("menu.switch_account_title")}</DialogTitle>
          <DialogDescription>
            {t("menu.switch_account_description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status Atual */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isProfessional ? (
                <Briefcase className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">
                  {t("menu.account_mode")} {isProfessional ? t("common.professional") : t("common.user")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isProfessional 
                    ? t("menu.professional_mode_desc") 
                    : t("menu.user_mode_desc")}
                </p>
              </div>
            </div>
            {profile.is_professional_verified && isProfessional && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {t("common.verified")}
              </Badge>
            )}
          </div>

          {/* Alternador */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                checked={isProfessional}
                onCheckedChange={handleSwitch}
                disabled={isSwitching}
              />
              <Label htmlFor="account-type" className="cursor-pointer">
                {isProfessional 
                  ? t("menu.switch_to_user") 
                  : t("menu.switch_to_professional")}
              </Label>
            </div>
          </div>

          {/* Aviso para não verificados */}
          {!profile.is_professional_verified && isProfessional && (
            <div className="flex items-start gap-3 p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/10">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-600">
                  {t("menu.account_not_verified")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("menu.account_not_verified_desc")}
                </p>
              </div>
            </div>
          )}

          {/* Informações sobre recursos */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t("common.user")} Mode</p>
                <p className="text-muted-foreground text-xs">
                  {t("menu.user_mode_features")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t("common.professional")} Mode</p>
                <p className="text-muted-foreground text-xs">
                  {t("menu.professional_mode_features")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
