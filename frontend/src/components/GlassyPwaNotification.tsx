import React, { useState, useEffect } from 'react';
import { usePwa } from '../context/PwaContext';
import { Download, X, Sparkles, Smartphone, Check } from 'lucide-react';

const DISMISS_KEY = 'levix_pwa_banner_closed_at';
const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export const GlassyPwaNotification: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePwa();
  const [visible, setVisible] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // If already installed in standalone mode, do not show
    if (isInstalled) return;

    // Closed recently? Stay hidden for a week.
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < HIDE_FOR_MS) return;
      if (sessionStorage.getItem('levix_pwa_banner_dismissed')) return;
    } catch {
      /* storage blocked — just show it */
    }

    // Show after 1.5 seconds delay with smooth animation
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const handleDismiss = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      sessionStorage.setItem('levix_pwa_banner_dismissed', 'true');
    } catch {
      /* ignore */
    }
  };

  const handleInstallClick = async () => {
    const success = await promptInstall();
    if (success) {
      setInstalledSuccess(true);
      setTimeout(() => {
        setVisible(false);
      }, 3000);
    }
  };

  if (!visible || isInstalled) return null;

  return (
    <aside
      aria-label="App installation notification"
      className="fixed z-50 bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md animate-in fade-in slide-in-from-bottom-6 duration-500"
    >
      {/* Outer Glassmorphic Card */}
      <div className="relative overflow-hidden rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/20 p-4 sm:p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all">
        
        {/* Glossy Reflection Highlight */}
        <div className="absolute -top-px left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-2xl" />

        {/* Ambient Orange Glow */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#FF5400]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 z-30 w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 flex items-start gap-3.5 sm:gap-4">
          
          {/* App Icon with Glossy Ring */}
          <div className="relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-black border border-white/25 flex items-center justify-center shadow-lg overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-black via-neutral-900 to-neutral-700" />
            <span className="relative font-display font-black text-sm sm:text-base tracking-widest text-white">
              LVX
            </span>
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[#FF5400] shadow-[0_0_8px_#FF5400]" />
          </div>

          {/* Notification Content */}
          <div className="flex-1 pr-6 space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
              <Sparkles className="w-3 h-3 text-[#FF5400]" />
              <span>OFFICIAL LEVIX APP</span>
            </div>

            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight text-white leading-tight">
              Install App on Mobile
            </h2>

            <p className="text-[11px] text-white/70 leading-relaxed">
              Add LEVIX directly to your home screen for 1-tap checkout, instant drop alerts & faster navigation.
            </p>

            {/* Action Buttons */}
            <div className="pt-2.5 flex items-center gap-2.5">
              {installedSuccess ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/90 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
                  <Check className="w-3.5 h-3.5" />
                  <span>Installed!</span>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF5400] to-[#ff6a20] hover:from-[#e04a00] hover:to-[#FF5400] text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#FF5400]/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 text-[11px] text-white/60 hover:text-white uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>

        </div>

      </div>
    </aside>
  );
};
