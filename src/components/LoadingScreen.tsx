import { cn } from "@/lib/utils";
import { PetBookLogo } from "./PetBookLogo";
import { useTranslation } from "react-i18next";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({
  message,
  fullScreen = true,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  const displayMessage = message || t("common.loading_pet");

  return (
    <div
      className={cn(
        "relative overflow-hidden flex flex-col items-center justify-center",
        "bg-gradient-to-br from-primary/10 via-background to-secondary/10",
        fullScreen ? "fixed inset-0 z-50" : "w-full h-full min-h-[300px]"
      )}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 animate-glow opacity-40 pointer-events-none" />

      {/* Pegadas subindo no fundo */}
      <RisingPaws />

      {/* Logo */}
      <div className="animate-logo-pop z-10 mb-8 flex flex-col items-center">
        <PetBookLogo size="xl" />
        <span className="mt-3 font-bold text-2xl tracking-tight gradient-text">
          PetBook
        </span>
      </div>

      {/* Sequência de pegadas caminhando - animais diferentes */}
      <WalkingPawSequence />

      {/* Mensagem */}
      <p className="mt-8 text-lg font-medium text-foreground z-10 flex items-center gap-1">
        {displayMessage}
        <span className="inline-flex ml-1">
          <span className="animate-dot-1">.</span>
          <span className="animate-dot-2">.</span>
          <span className="animate-dot-3">.</span>
        </span>
      </p>

      {/* Progress bar */}
      <div className="mt-6 w-64 h-2 rounded-full bg-muted overflow-hidden z-10">
        <div className="h-full w-full animate-progress-fluid rounded-full bg-gradient-to-r from-primary to-secondary" />
      </div>
    </div>
  );
}

/* Pegadas subindo no fundo - translúcidas */
function RisingPaws() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Coluna 1 */}
      <DogPaw className="rising-paw absolute w-6 h-6 text-primary/8 left-[5%] -rotate-12" style={{ animationDelay: '0s' }} />
      <CatPaw className="rising-paw absolute w-5 h-5 text-secondary/8 left-[5%] rotate-8" style={{ animationDelay: '2s' }} />
      
      {/* Coluna 2 */}
      <RabbitPaw className="rising-paw absolute w-7 h-7 text-primary/6 left-[15%] rotate-15" style={{ animationDelay: '1s' }} />
      <DogPaw className="rising-paw absolute w-5 h-5 text-secondary/6 left-[15%] -rotate-20" style={{ animationDelay: '3.5s' }} />
      
      {/* Coluna 3 */}
      <CatPaw className="rising-paw absolute w-6 h-6 text-secondary/8 left-[25%] -rotate-8" style={{ animationDelay: '0.5s' }} />
      <BirdPaw className="rising-paw absolute w-5 h-5 text-primary/6 left-[25%] rotate-12" style={{ animationDelay: '2.5s' }} />
      
      {/* Coluna 4 */}
      <DogPaw className="rising-paw absolute w-5 h-5 text-primary/6 left-[35%] rotate-20" style={{ animationDelay: '1.5s' }} />
      <RabbitPaw className="rising-paw absolute w-6 h-6 text-secondary/8 left-[35%] -rotate-15" style={{ animationDelay: '4s' }} />
      
      {/* Coluna 5 - centro esquerda */}
      <CatPaw className="rising-paw absolute w-7 h-7 text-secondary/6 left-[45%] rotate-5" style={{ animationDelay: '0.8s' }} />
      <DogPaw className="rising-paw absolute w-5 h-5 text-primary/8 left-[45%] -rotate-10" style={{ animationDelay: '3s' }} />
      
      {/* Coluna 6 - centro direita */}
      <BirdPaw className="rising-paw absolute w-6 h-6 text-primary/8 left-[55%] -rotate-12" style={{ animationDelay: '1.2s' }} />
      <CatPaw className="rising-paw absolute w-5 h-5 text-secondary/6 left-[55%] rotate-18" style={{ animationDelay: '3.8s' }} />
      
      {/* Coluna 7 */}
      <RabbitPaw className="rising-paw absolute w-5 h-5 text-secondary/8 left-[65%] rotate-8" style={{ animationDelay: '0.3s' }} />
      <DogPaw className="rising-paw absolute w-6 h-6 text-primary/6 left-[65%] -rotate-18" style={{ animationDelay: '2.8s' }} />
      
      {/* Coluna 8 */}
      <CatPaw className="rising-paw absolute w-6 h-6 text-primary/6 left-[75%] -rotate-5" style={{ animationDelay: '1.8s' }} />
      <BirdPaw className="rising-paw absolute w-5 h-5 text-secondary/8 left-[75%] rotate-15" style={{ animationDelay: '4.2s' }} />
      
      {/* Coluna 9 */}
      <DogPaw className="rising-paw absolute w-7 h-7 text-secondary/6 left-[85%] rotate-10" style={{ animationDelay: '0.6s' }} />
      <RabbitPaw className="rising-paw absolute w-5 h-5 text-primary/8 left-[85%] -rotate-12" style={{ animationDelay: '3.2s' }} />
      
      {/* Coluna 10 */}
      <CatPaw className="rising-paw absolute w-5 h-5 text-primary/8 left-[95%] -rotate-8" style={{ animationDelay: '2.2s' }} />
      <DogPaw className="rising-paw absolute w-6 h-6 text-secondary/6 left-[95%] rotate-20" style={{ animationDelay: '4.5s' }} />
    </div>
  );
}

/* Sequência principal de pegadas caminhando - animais diferentes */
function WalkingPawSequence() {
  return (
    <div className="relative w-80 h-20 z-10">
      {/* Cachorro - esquerda */}
      <DogPaw 
        className="paw-step-1 absolute w-8 h-8 text-primary drop-shadow-md left-[5%] top-[55%] -rotate-12" 
      />
      {/* Gato - direita */}
      <CatPaw 
        className="paw-step-2 absolute w-7 h-7 text-secondary drop-shadow-md left-[20%] top-[30%] rotate-12" 
      />
      {/* Coelho - esquerda */}
      <RabbitPaw 
        className="paw-step-3 absolute w-8 h-8 text-primary drop-shadow-md left-[35%] top-[55%] -rotate-12" 
      />
      {/* Pássaro - direita */}
      <BirdPaw 
        className="paw-step-4 absolute w-7 h-7 text-secondary drop-shadow-md left-[50%] top-[30%] rotate-12" 
      />
      {/* Cachorro - esquerda */}
      <DogPaw 
        className="paw-step-5 absolute w-8 h-8 text-primary drop-shadow-md left-[65%] top-[55%] -rotate-12" 
      />
      {/* Gato - direita */}
      <CatPaw 
        className="paw-step-6 absolute w-7 h-7 text-secondary drop-shadow-md left-[80%] top-[30%] rotate-12" 
      />
    </div>
  );
}

/* 🐶 Pata de cachorro */
function DogPaw({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="currentColor" 
      className={cn("drop-shadow", className)}
      style={style}
    >
      <ellipse cx="50" cy="65" rx="22" ry="18" />
      <ellipse cx="28" cy="38" rx="10" ry="12" />
      <ellipse cx="72" cy="38" rx="10" ry="12" />
      <ellipse cx="42" cy="28" rx="9" ry="11" />
      <ellipse cx="58" cy="28" rx="9" ry="11" />
    </svg>
  );
}

/* 🐱 Pata de gato - mais delicada */
function CatPaw({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="currentColor" 
      className={cn("drop-shadow", className)}
      style={style}
    >
      <ellipse cx="50" cy="62" rx="18" ry="15" />
      <ellipse cx="32" cy="40" rx="8" ry="10" />
      <ellipse cx="68" cy="40" rx="8" ry="10" />
      <ellipse cx="44" cy="30" rx="7" ry="9" />
      <ellipse cx="56" cy="30" rx="7" ry="9" />
    </svg>
  );
}

/* 🐰 Pata de coelho - mais alongada */
function RabbitPaw({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg 
      viewBox="0 0 100 120" 
      fill="currentColor" 
      className={cn("drop-shadow", className)}
      style={style}
    >
      <ellipse cx="50" cy="80" rx="20" ry="28" />
      <ellipse cx="32" cy="45" rx="10" ry="18" />
      <ellipse cx="68" cy="45" rx="10" ry="18" />
      <ellipse cx="45" cy="25" rx="8" ry="14" />
      <ellipse cx="55" cy="25" rx="8" ry="14" />
    </svg>
  );
}

/* 🐦 Pata de pássaro - 3 dedos */
function BirdPaw({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="currentColor" 
      className={cn("drop-shadow", className)}
      style={style}
    >
      {/* Centro */}
      <ellipse cx="50" cy="70" rx="8" ry="6" />
      {/* Dedo central */}
      <ellipse cx="50" cy="45" rx="5" ry="20" />
      {/* Dedo esquerdo */}
      <ellipse cx="32" cy="50" rx="5" ry="18" transform="rotate(-25 32 50)" />
      {/* Dedo direito */}
      <ellipse cx="68" cy="50" rx="5" ry="18" transform="rotate(25 68 50)" />
    </svg>
  );
}
