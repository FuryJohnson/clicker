import { useEffect, useState } from 'react';

const DEV_USER: TelegramWebAppUser = {
  id: 12345,
  first_name: 'Dev',
  last_name: 'User',
  username: 'dev_user',
  language_code: 'ru',
  photo_url: 'https://ui-avatars.com/api/?name=Dev+User&background=0D8ABC&color=fff',
};

const DEV_INIT_DATA = `user=${encodeURIComponent(JSON.stringify(DEV_USER))}`;

const isDev = import.meta.env.DEV;

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();
      setWebApp(tg);
      setIsReady(true);
      return;
    }

    if (isDev) {
      setIsReady(true);
    }
  }, []);

  const initData = webApp?.initData || (isDev ? DEV_INIT_DATA : '');
  const user = webApp?.initDataUnsafe?.user || (isDev ? DEV_USER : undefined);

  return { webApp, initData, user, isReady };
};
