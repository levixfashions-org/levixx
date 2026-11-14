import React, { createContext, useContext, useState, useEffect } from 'react';

/** Which iPhone/iPad browser we're in — each one installs differently. */
export type IosBrowser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'inapp' | 'other';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  iosBrowser: IosBrowser;
  /** Name of the app whose built-in browser we're in (Instagram, Facebook…), if any. */
  inAppName: string;
  promptInstall: () => Promise<boolean>;
}

function detectInApp(ua: string): string {
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  if (/Twitter/i.test(ua)) return 'X';
  if (/\bLine\//i.test(ua)) return 'LINE';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/GSA\//i.test(ua)) return 'Google app';
  return '';
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  iosBrowser: 'other',
  inAppName: '',
  promptInstall: async () => false
});

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosBrowser, setIosBrowser] = useState<IosBrowser>('other');
  const [inAppName, setInAppName] = useState('');

  useEffect(() => {
    // Check if already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect iPhone / iPad (iPadOS pretends to be a Mac, so also check for a touch screen)
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    setIsIOS(isIosDevice);
    const app = detectInApp(ua);
    setInAppName(app);
    if (isIosDevice) {
      setIosBrowser(app ? 'inapp' : /CriOS/i.test(ua) ? 'chrome' : /EdgiOS/i.test(ua) ? 'edge' : /FxiOS/i.test(ua) ? 'firefox' : /Safari/i.test(ua) ? 'safari' : 'other');
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    }

    // iPhone/iPad (and browsers without an install prompt): the banner shows step-by-step help instead.
    return false;
  };

  return (
    <PwaContext.Provider value={{ isInstallable, isInstalled, isIOS, iosBrowser, inAppName, promptInstall }}>
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => useContext(PwaContext);
