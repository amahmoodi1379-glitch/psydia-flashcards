import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}

export function useTelegramCheck() {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTelegram = () => {
      const tg = window.Telegram?.WebApp;
      // Check if we're inside Telegram Mini App
      const isInTelegram = !!tg?.initData && tg.initData.length > 0;
      setIsTelegram(isInTelegram);
      setIsLoading(false);
      
      // Initialize Telegram WebApp if available
      if (isInTelegram && tg) {
        tg.ready();
        tg.expand();
      }
    };
    
    // Small delay to ensure Telegram SDK is loaded
    const timer = setTimeout(checkTelegram, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return { isTelegram, isLoading };
}
