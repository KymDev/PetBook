import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'pt', name: t('languages.pt'), flag: '🇧🇷' },
    { code: 'en', name: t('languages.en'), flag: '🇺🇸' },
    { code: 'es', name: t('languages.es'), flag: '🇪🇸' },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div className={cn("", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 rounded-full px-3 hover:bg-primary/5 transition-colors">
            <Languages className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider">{currentLanguage.code}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px] p-2 shadow-2xl border-gray-100">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                "flex items-center justify-between gap-3 cursor-pointer rounded-xl px-3 py-2.5 transition-all mb-1 last:mb-0",
                i18n.language === lang.code 
                  ? 'bg-primary/10 font-bold text-primary' 
                  : 'hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl leading-none">{lang.flag}</span>
                <span className="text-sm font-bold">{lang.name}</span>
              </div>
              {i18n.language === lang.code && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
