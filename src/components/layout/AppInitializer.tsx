import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';

export const AppInitializer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const setupBackButton = async () => {
      await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // Se houver um modal aberto ou algo que precise ser fechado primeiro,
        // a lógica deve ser adicionada aqui. 
        // Por padrão, se puder voltar no histórico do router, volta.
        
        if (location.pathname === '/feed' || location.pathname === '/auth' || location.pathname === '/') {
          // Se estiver na home, sai do app
          CapacitorApp.exitApp();
        } else if (canGoBack) {
          window.history.back();
        } else {
          navigate('/feed');
        }
      });
    };

    setupBackButton();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate, location]);

  return null;
};
