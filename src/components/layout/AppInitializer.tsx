import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export const AppInitializer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const setupApp = async () => {
      // Configuração da StatusBar para respeitar Safe Area
      const platform = (window as any).Capacitor?.getPlatform();
      if (platform === 'android' || platform === 'ios') {
        try {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (e) {
          console.warn('StatusBar not available', e);
        }
      }

      // Configuração do botão voltar
      await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (location.pathname === '/feed' || location.pathname === '/auth' || location.pathname === '/') {
          CapacitorApp.exitApp();
        } else if (canGoBack) {
          window.history.back();
        } else {
          navigate('/feed');
        }
      });
    };

    setupApp();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate, location]);

  return null;
};
