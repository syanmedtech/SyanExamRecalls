
import React, { useState, useEffect, useRef } from 'react';
import { SecuritySettings } from '../types';
import { logSecurityEvent } from '../services/firebaseService';

interface SecurityWrapperProps {
  settings: SecuritySettings;
  onViolation: (type: string) => void;
  onMaxViolations: () => void;
  children: React.ReactNode;
  quizId?: string;
  shareId?: string;
  attemptId?: string;
}

// Detection for iOS Safari (and other iOS browsers which all use WebKit and lack element-level Fullscreen API)
const isIOSSafari = () => {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS;
};

const SecurityWrapper: React.FC<SecurityWrapperProps> = ({ 
  settings, 
  onViolation, 
  onMaxViolations, 
  children,
  quizId,
  shareId,
  attemptId
}) => {
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const lastViolationTime = useRef(0);

  const isIOS = isIOSSafari();

  const triggerViolation = (type: string) => {
    // Throttling violations to prevent double triggers
    const now = Date.now();
    if (now - lastViolationTime.current < 2000) return;
    lastViolationTime.current = now;

    const newCount = violationCount + 1;
    setViolationCount(newCount);
    onViolation(type);
    setShowWarning(`${type} violation recorded! (${newCount}/${settings.maxViolations})`);

    if (newCount >= settings.maxViolations) {
      onMaxViolations();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (settings.fullscreenRequired && !isFull && !isPseudoFullscreen && violationCount < settings.maxViolations && !isIOS) {
        triggerViolation('EXIT_FULLSCREEN');
      }
    };

    const handleVisibilityChange = () => {
      if (settings.focusModeEnabled && document.visibilityState === 'hidden') {
        triggerViolation('TAB_SWITCH');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (settings.rightClickDisabled) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (settings.rightClickDisabled) document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      // Cleanup pseudo fullscreen styles on unmount
      if (isPseudoFullscreen) {
        document.documentElement.style.height = "";
        document.body.style.height = "";
        document.body.style.overflow = "";
      }
    };
  }, [violationCount, settings, isPseudoFullscreen, isIOS]);

  const enterExamDisplayMode = async () => {
    if (isIOS) {
      // Fallback for iOS: Pseudo Fullscreen
      setIsPseudoFullscreen(true);
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
      document.body.style.overflow = "hidden";
      
      // Telemetry
      logSecurityEvent({
        type: "IOS_PSEUDO_FULLSCREEN_USED",
        area: "QUIZ_ATTEMPT",
        quizId,
        shareId,
        attemptId
      });
    } else {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error("Fullscreen failed", err);
        alert("Unable to enter fullscreen mode. Please check browser permissions and try again.");
      }
    }
  };

  const isFullscreenSatisfied = !settings.fullscreenRequired || isFullscreen || isPseudoFullscreen;

  if (!isFullscreenSatisfied) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-2xl animate-scale-up">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl sm:text-4xl">⛨</div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Security Enforcement</h2>
          
          <p className="text-slate-500 mb-8 leading-relaxed text-sm sm:text-base">
            {isIOS 
              ? "iOS Safari doesn't support fullscreen reliably. Tap Continue to start in Secure Mode." 
              : "This exam requires active fullscreen mode to ensure clinical integrity. Please enter fullscreen to continue."
            }
          </p>

          <button 
            onClick={enterExamDisplayMode}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl sm:rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 min-h-[54px]"
          >
            {isIOS ? "Continue to Exam" : "Enter Fullscreen Mode"}
          </button>
        </div>
      </div>
    );
  }

  // Wrapper for Pseudo Fullscreen (Fixed container that covers viewport)
  const content = (
    <div className={isPseudoFullscreen ? "fixed inset-0 w-screen h-screen bg-slate-50 overflow-auto z-[9990] flex flex-col" : "relative min-h-screen select-none flex flex-col"}>
      {isPseudoFullscreen && (
        <div className="sticky top-0 z-[10000] bg-blue-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-2 px-4 text-center pt-[calc(8px+env(safe-area-inset-top))]">
          Secure iOS Mode Active • Do not switch tabs
        </div>
      )}
      
      <div className="flex-1">
        {children}
      </div>
      
      {showWarning && (
        <div className="fixed top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 z-[10000] bg-red-600 text-white px-6 py-4 rounded-xl sm:rounded-2xl shadow-2xl font-bold animate-bounce flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠</span> 
            <span className="text-sm sm:text-base">{showWarning}</span>
          </div>
          <button onClick={() => setShowWarning(null)} className="ml-2 opacity-70 hover:opacity-100 p-1">✕</button>
        </div>
      )}

      {/* Screenshot protection overlay (blackout on blur) */}
      {settings.screenshotRestricted && (
        <div className="fixed inset-0 pointer-events-none z-[9998] transition-opacity duration-300 opacity-0 bg-black backdrop-blur-3xl print:opacity-100" />
      )}
    </div>
  );

  return content;
};

export default SecurityWrapper;