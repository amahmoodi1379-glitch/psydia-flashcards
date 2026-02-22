import { useEffect, useMemo, useState } from 'react';

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

/**
 * @deprecated This hook no longer gates access to the app.
 * Use it only for analytics/observability to know whether the session started inside Telegram WebApp.
 */
export function useTelegramCheck() {
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const isInTelegram = Boolean(tg?.initData && tg.initData.length > 0);

    setIsTelegram(isInTelegram);
    setIsLoading(false);

    if (isInTelegram && tg) {
      tg.ready();
    }
  }, []);

  const source = useMemo<'telegram' | 'web'>(() => (isTelegram ? 'telegram' : 'web'), [isTelegram]);

  return { isTelegram, isLoading, source };
}
