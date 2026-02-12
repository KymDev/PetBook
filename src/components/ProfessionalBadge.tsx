import { Briefcase, BadgeCheck, Shield, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ProfessionalBadgeProps {
  isProfessional: boolean;
  serviceType?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const ProfessionalBadge = ({
  isProfessional,
  serviceType,
  size = "md",
  showText = true,
  className,
}: ProfessionalBadgeProps) => {
  const { t } = useTranslation();
  if (!isProfessional) return null;

  const isHealthProfessional = serviceType === 'veterinario';

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r shadow-sm",
        isHealthProfessional 
          ? "from-blue-500/10 to-cyan-500/10 border-blue-500/30" 
          : "from-secondary/10 to-primary/10 border-secondary/30",
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-center rounded-full", 
        isHealthProfessional ? "bg-blue-500/20" : "bg-secondary/20",
        sizeClasses[size]
      )}>
        {isHealthProfessional ? (
          <Stethoscope className={cn("text-blue-600", {
            "w-3 h-3": size === "sm",
            "w-4 h-4": size === "md",
            "w-5 h-5": size === "lg",
          })} />
        ) : (
          <Briefcase className={cn("text-secondary", {
            "w-3 h-3": size === "sm",
            "w-4 h-4": size === "md",
            "w-5 h-5": size === "lg",
          })} />
        )}
      </div>
      {showText && (
        <span className={cn(
          "font-semibold", 
          isHealthProfessional ? "text-blue-700" : "text-secondary-foreground",
          textSizeClasses[size]
        )}>
          {isHealthProfessional ? t("badges.pet_health_professional") : t("badges.professional")}
        </span>
      )}
      <BadgeCheck className={cn(isHealthProfessional ? "text-blue-600" : "text-secondary", {
        "w-3 h-3": size === "sm",
        "w-4 h-4": size === "md",
        "w-5 h-5": size === "lg",
      })} />
    </div>
  );
};

export const ProfessionalBadgeSmall = ({ isProfessional, serviceType }: { isProfessional: boolean, serviceType?: string }) => {
  if (!isProfessional) return null;
  const isHealthProfessional = serviceType === 'veterinario';

  return (
    <div className={cn(
      "inline-flex items-center justify-center w-6 h-6 rounded-full border font-bold text-xs",
      isHealthProfessional 
        ? "bg-blue-500/20 border-blue-500/40 text-blue-600" 
        : "bg-secondary/20 border-secondary/40 text-secondary"
    )}>
      {isHealthProfessional ? <Stethoscope className="w-3 h-3" /> : "P"}
    </div>
  );
};

// Selo de verificação profissional - Versão compacta com ícone
export const ProfessionalVerifiedBadge = ({ 
  isProfessional, 
  serviceType,
  size = "md",
  variant = "default" 
}: { 
  isProfessional: boolean; 
  serviceType?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal";
}) => {
  const { t } = useTranslation();
  if (!isProfessional) return null;
  const isHealthProfessional = serviceType === 'veterinario';

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  if (variant === "minimal") {
    return (
      <BadgeCheck 
        className={cn(
          isHealthProfessional ? "text-blue-600 fill-blue-500/20" : "text-secondary fill-secondary/20",
          sizeClasses[size]
        )} 
      />
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border",
      isHealthProfessional 
        ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30" 
        : "bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/30"
    )}>
      <BadgeCheck className={cn(isHealthProfessional ? "text-blue-600" : "text-secondary", sizeClasses[size])} />
      <span className={cn("text-xs font-semibold", isHealthProfessional ? "text-blue-700" : "text-secondary")}>
        {isHealthProfessional ? t("badges.verified_health") : t("badges.verified")}
      </span>
    </div>
  );
};
