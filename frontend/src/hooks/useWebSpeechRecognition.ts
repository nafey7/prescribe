import { useCallback, useEffect, useRef, useState } from "react";

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Microphone permission denied. Allow microphone access to use voice input.";
    case "no-speech":
      return "No speech detected. Try again.";
    case "audio-capture":
      return "No microphone found or it could not be opened.";
    case "network":
      return "Voice input couldn’t reach your browser’s speech service. Try another network, turn off VPN, or type your message.";
    case "aborted":
      return "";
    default:
      return code ? `Voice input error: ${code}` : "Voice input failed.";
  }
}

const NETWORK_RETRY_MS = 450;

export function useWebSpeechRecognition(onText: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const baseRef = useRef("");
  const ignoreResultsRef = useRef(false);
  const onTextRef = useRef(onText);
  const lastGetBaseRef = useRef<() => string>(() => "");
  /** After one automatic retry, another `network` error should surface to the user. */
  const networkRetryUsedRef = useRef(false);
  const networkRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  onTextRef.current = onText;

  const supported = getSpeechRecognitionCtor() !== null;

  const stop = useCallback(() => {
    if (networkRetryTimerRef.current) {
      clearTimeout(networkRetryTimerRef.current);
      networkRetryTimerRef.current = null;
    }
    ignoreResultsRef.current = true;
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (r) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
    setIsListening(false);
  }, []);

  const beginRecognition = useCallback(
    (getBaseText: () => string, isAutoRetry: boolean) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return;

      lastGetBaseRef.current = getBaseText;
      if (!isAutoRetry) {
        networkRetryUsedRef.current = false;
      }

      baseRef.current = getBaseText();
      finalTranscriptRef.current = "";

      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (ignoreResultsRef.current) return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript ?? "";
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += piece;
          } else {
            interim += piece;
          }
        }
        const prefix = baseRef.current;
        const gap = prefix.length > 0 && !/\s$/.test(prefix) ? " " : "";
        onTextRef.current(`${prefix}${gap}${finalTranscriptRef.current}${interim}`);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted") return;

        if (event.error === "network" && !networkRetryUsedRef.current) {
          networkRetryUsedRef.current = true;
          recognitionRef.current = null;
          setIsListening(false);
          networkRetryTimerRef.current = setTimeout(() => {
            networkRetryTimerRef.current = null;
            if (ignoreResultsRef.current) return;
            beginRecognition(lastGetBaseRef.current, true);
          }, NETWORK_RETRY_MS);
          return;
        }

        const msg = speechErrorMessage(event.error);
        if (msg) setError(msg);
        ignoreResultsRef.current = true;
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setIsListening(false);
      };

      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setError("Could not start voice input.");
        recognitionRef.current = null;
        setIsListening(false);
      }
    },
    []
  );

  const start = useCallback(
    (getBaseText: () => string) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return;

      stop();
      ignoreResultsRef.current = false;
      setError(null);
      beginRecognition(getBaseText, false);
    },
    [stop, beginRecognition]
  );

  useEffect(() => {
    return () => {
      if (networkRetryTimerRef.current) {
        clearTimeout(networkRetryTimerRef.current);
      }
      ignoreResultsRef.current = true;
      const r = recognitionRef.current;
      recognitionRef.current = null;
      if (r) {
        try {
          r.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { isListening, error, supported, start, stop, clearError: () => setError(null) };
}
