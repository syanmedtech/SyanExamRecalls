
import { useState, useEffect, useRef } from 'react';
import { logSecurityEvent } from '../services/firebaseService';

interface UseDevToolsTerminationProps {
  enabled?: boolean;
  area: "PUBLIC_QUIZ_FORM" | "QUIZ_ATTEMPT" | "RECALLS_FORM" | "EXAM_SUMMARY" | "USER_DASHBOARD_ATTEMPT";
  shareId?: string | null;
  quizId?: string | null;
  attemptId?: string | null;
  recallsShareId?: string | null;
  email?: string | null;
}

/**
 * Conservative check to identify if the app is running in its real production environment.
 * Prevents DevTools auto-termination during development and AI Studio Preview.
 */
function isDeployedApp(): boolean {
  try {
    const host = window.location.hostname.toLowerCase();
    const isRunApp = host.endsWith(".run.app");
    // Add custom domain if applicable: const isCustomDomain = host === "syan-recalls.com";
    const isCustomDomain = false; 

    // Preview/Local Detection
    const isIframe = window.self !== window.top;
    const isPreviewHost = host.includes("localhost") || host.includes("preview") || host.includes("127.0.0.1");
    const isStudioReferrer = document.referrer.includes("aistudio.google.com") || document.referrer.includes("studio");

    // Must be on a production-like host AND not in an iframe/preview context
    return (isRunApp || isCustomDomain) && !isIframe && !isPreviewHost && !isStudioReferrer;
  } catch (e) {
    return false; // Fail safe: disable detection if check errors
  }
}

export function useDevToolsTermination({ 
  enabled = true,
  area, 
  shareId, 
  quizId, 
  attemptId, 
  recallsShareId, 
  email 
}: UseDevToolsTerminationProps) {
  const [isTerminated, setIsTerminated] = useState(false);
  const loggedRef = useRef(false);
  const consecutiveHits = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    // Gate: ONLY run termination logic in the deployed production environment
    if (!enabled || isTerminated || !isDeployedApp()) {
      if (!isDeployedApp() && enabled) {
        console.debug("[Security] DevTools detection disabled in Preview/Local environment.");
      }
      return;
    }

    // Detect mobile to prevent false positives from mobile browser UI
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) return;

    const checkDevTools = () => {
      // Warm-up delay: ignore for first 2000ms to allow page to settle
      if (Date.now() - mountTime.current < 2000) return;

      let score = 0;

      // Signal 1: Dimension heuristic
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        score++;
      }

      // Signal 2: Console probe heuristic (Object getter)
      let consoleOpenSignal = false;
      const devtoolsProbe = new Image();
      Object.defineProperty(devtoolsProbe, 'id', {
        get: function() {
          consoleOpenSignal = true;
          return 'probe';
        }
      });
      console.log(devtoolsProbe);
      
      if (consoleOpenSignal) {
        score++;
      }

      // Signal 3: Debugger timing heuristic
      const t0 = performance.now();
      // Use a wrapped evaluation to detect pausing without breaking UI flow
      try {
        const check = new Function('debugger');
        check();
      } catch (e) {}
      const t1 = performance.now();
      if (t1 - t0 > 150) { // If paused for more than 150ms
        score++;
      }

      // Confirmation Logic: Need at least 2 signals or high confidence
      if (score >= 2) {
        consecutiveHits.current++;
      } else if (score === 1 && widthDiff > 250) { // Highly suspicious dimension
        consecutiveHits.current++;
      } else {
        consecutiveHits.current = 0;
      }

      if (consecutiveHits.current >= 2) {
        terminate();
      }
    };

    const terminate = async () => {
      if (isTerminated) return;
      setIsTerminated(true);

      if (!loggedRef.current) {
        loggedRef.current = true;
        // Non-blocking log
        logSecurityEvent({
          type: "DEVTOOLS_DETECTED",
          area,
          shareId,
          quizId,
          attemptId,
          recallsShareId,
          email,
          context: window.self !== window.top ? "iframe" : "top"
        });
      }

      // 3 second redirect after termination
      setTimeout(() => {
        window.location.replace("https://www.google.com");
      }, 3000);
    };

    const interval = setInterval(checkDevTools, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [enabled, isTerminated, area, shareId, quizId, attemptId, recallsShareId, email]);

  return isTerminated;
}
