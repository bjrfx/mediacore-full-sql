import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Monitor, ExternalLink } from 'lucide-react';
import { usePWAStore } from '../../store';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export default function InstallPrompt() {
  const { 
    canInstall, 
    isInstalled, 
    installApp, 
    dismissInstall, 
    shouldShowPrompt,
    setDeferredPrompt,
    setInstalled,
  } = usePWAStore();
  
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);
    if (standalone) {
      setInstalled(true);
    }

    // Check for iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
    };

    // Listen for manual iOS install trigger from header button
    const handleShowIOSInstall = () => {
      if (iOS && !standalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('show-ios-install', handleShowIOSInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('show-ios-install', handleShowIOSInstall);
    };
  }, [setDeferredPrompt, setInstalled]);

  // Show banner after a delay if conditions are met
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowPrompt() || (isIOS && !isStandalone)) {
        setShowBanner(true);
      }
    }, 3000); // Show after 3 seconds

    return () => clearTimeout(timer);
  }, [shouldShowPrompt, isIOS, isStandalone]);

  const handleInstall = async () => {
    setInstalling(true);
    const result = await installApp();
    setInstalling(false);
    
    if (result.success) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    dismissInstall();
    setShowBanner(false);
  };

  const handleOpenApp = () => {
    // For iOS, we can't programmatically open the app
    // For Android/Desktop, the app should already be open if installed
    window.location.reload();
  };

  // If already in standalone mode, show "Open in App" button in browser
  if (isStandalone) {
    return null; // Already in app, no need to show anything
  }

  // If installed but not in standalone (opened in browser)
  if (isInstalled && !isStandalone) {
    return (
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <img src="/logo192.svg" alt="MediaCore" className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Open in App</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    MediaCore is installed. Open the app for better experience.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 -mt-1 -mr-1"
                  onClick={() => setShowBanner(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Button
                className="w-full mt-3"
                onClick={handleOpenApp}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open App
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // iOS instructions (can't auto-install on iOS)
  if (isIOS && !isInstalled) {
    return (
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <img src="/logo192.svg" alt="MediaCore" className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Install MediaCore</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add to your home screen for the best experience
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 -mt-1 -mr-1"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">To install:</p>
                <ol className="text-xs space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Tap the <strong>Share</strong> button <span className="inline-block w-4 h-4 bg-blue-500 rounded text-white text-[10px] leading-4 text-center">↑</span></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Tap <strong>"Add"</strong> to install</span>
                  </li>
                </ol>
              </div>
              
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={handleDismiss}
              >
                Maybe Later
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Standard install prompt (Android/Desktop)
  if (!canInstall) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <img src="/logo192.svg" alt="MediaCore" className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Install MediaCore</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Install our app for offline access and better experience
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 -mt-1 -mr-1"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                <span>Native feel</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDismiss}
              >
                Not Now
              </Button>
              <Button
                className="flex-1"
                onClick={handleInstall}
                disabled={installing}
              >
                {installing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Installing...
                  </span>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Install
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
