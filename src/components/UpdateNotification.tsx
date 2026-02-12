import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from 'react-i18next';
import { Download, Sparkles } from 'lucide-react';

interface VersionInfo {
  latestVersion: string;
  minVersion: string;
  downloadUrl: string;
  releaseNotes: Record<string, string>;
}

export const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [versionData, setVersionData] = useState<VersionInfo | null>(null);
  const { i18n, t } = useTranslation();

  useEffect(() => {
    const checkVersion = async () => {
      // Só verifica se estiver rodando como App (Capacitor)
      const platform = (window as any).Capacitor?.getPlatform();
      if (platform !== 'android' && platform !== 'ios') return;

      try {
        const info = await CapacitorApp.getInfo();
        const currentVersion = info.version;

        // Busca a versão mais recente do servidor (usando cache busting)
        const response = await fetch(`/version.json?t=${Date.now()}`);
        const data: VersionInfo = await response.json();

        if (isVersionLower(currentVersion, data.latestVersion)) {
          setVersionData(data);
          setShowUpdate(true);
        }
      } catch (error) {
        console.error('Erro ao verificar versão:', error);
      }
    };

    checkVersion();
  }, []);

  const isVersionLower = (current: string, latest: string) => {
    const v1 = current.split('.').map(Number);
    const v2 = latest.split('.').map(Number);
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false;
  };

  const handleUpdate = () => {
    if (versionData?.downloadUrl) {
      window.open(versionData.downloadUrl, '_blank');
    }
  };

  if (!versionData) return null;

  const notes = versionData.releaseNotes[i18n.language] || versionData.releaseNotes['pt'];

  return (
    <AlertDialog open={showUpdate} onOpenChange={setShowUpdate}>
      <AlertDialogContent className="rounded-[2rem] border-primary/20 shadow-2xl">
        <AlertDialogHeader>
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <AlertDialogTitle className="text-2xl font-black text-center">
            {t('update.title', 'Nova Versão Disponível!')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg pt-2">
            {notes}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm font-bold text-primary">
              v{versionData.latestVersion}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center mt-6">
          <AlertDialogAction 
            onClick={handleUpdate}
            className="w-full sm:w-auto h-12 px-8 rounded-full font-black text-lg shadow-lg shadow-primary/20"
          >
            <Download className="mr-2 w-5 h-5" /> {t('update.button', 'Atualizar Agora')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
