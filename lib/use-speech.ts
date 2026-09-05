"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

function getRecognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined") return undefined;
  const voices = window.speechSynthesis.getVoices();
  const prefer = voices.find((v) => /en-GB/i.test(v.lang) && /google/i.test(v.name));
  if (prefer) return prefer;
  return (
    voices.find((v) => /en-GB/i.test(v.lang)) ??
    voices.find((v) => /en-US/i.test(v.lang) && /natural|premium|enhanced/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang))
  );
}

function permissionMessage(code: string): string | null {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "Microphone is blocked. Allow access in the browser, then tap again.";
  }
  if (code === "audio-capture") return "No microphone found.";
  if (code === "network") return "Speech service is unavailable. Type instead, or try again.";
  return null;
}

async function primeMicrophone(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) track.stop();
}

function joinHeard(finals: string, interim: string): string {
  return [finals, interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ttsOn, setTtsOn] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<(text: string) => void>(() => {});
  const wantListenRef = useRef(false);
  const committedRef = useRef("");
  const finalsRef = useRef("");
  const interimRef = useRef("");
  const submittedRef = useRef(false);
  const startingRef = useRef(false);

  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(getRecognitionCtor()),
    () => false,
  );

  const speak = useCallback(
    (text: string) => {
      if (!ttsOn || typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = pickVoice() ?? null;
      utterance.rate = 0.96;
      utterance.pitch = 0.95;
      utterance.lang = "en-GB";
      window.speechSynthesis.speak(utterance);
    },
    [ttsOn],
  );

  const hush = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
  }, []);

  const finalize = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const text = joinHeard(joinHeard(committedRef.current, finalsRef.current), interimRef.current);
    committedRef.current = "";
    finalsRef.current = "";
    interimRef.current = "";
    setInterim("");
    setListening(false);
    if (text) onFinalRef.current(text);
  }, []);

  const attachHandlers = useCallback(
    (recognition: SpeechRecognitionLike) => {
      recognition.onresult = (event) => {
        let finals = "";
        let live = "";
        for (let i = 0; i < event.results.length; i += 1) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) finals += `${piece} `;
          else live += piece;
        }
        finalsRef.current = finals.replace(/\s+/g, " ").trim();
        interimRef.current = live.replace(/\s+/g, " ").trim();
        setInterim(joinHeard(joinHeard(committedRef.current, finalsRef.current), interimRef.current));
      };

      recognition.onerror = (event) => {
        if (event.error === "aborted") return;
        if (event.error === "no-speech") return;
        const message = permissionMessage(event.error);
        if (message) {
          wantListenRef.current = false;
          setError(message);
          setListening(false);
          setInterim("");
        }
      };

      recognition.onend = () => {
        if (wantListenRef.current) {
          committedRef.current = joinHeard(committedRef.current, finalsRef.current);
          finalsRef.current = "";
          try {
            recognition.start();
          } catch {
            wantListenRef.current = false;
            finalize();
          }
          return;
        }
        finalize();
      };
    },
    [finalize],
  );

  const beginRecognition = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return false;
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore a dead session
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    attachHandlers(recognition);
    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, [attachHandlers]);

  const stop = useCallback(() => {
    wantListenRef.current = false;
    startingRef.current = false;
    const recognition = recognitionRef.current;
    if (!recognition) {
      finalize();
      return;
    }
    try {
      recognition.stop();
    } catch {
      finalize();
    }
  }, [finalize]);

  const start = useCallback(async () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || startingRef.current) return false;
    startingRef.current = true;
    hush();
    setError(null);
    submittedRef.current = false;
    committedRef.current = "";
    finalsRef.current = "";
    interimRef.current = "";
    setInterim("");
    wantListenRef.current = true;
    setListening(true);

    try {
      await primeMicrophone();
    } catch (err) {
      const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
      wantListenRef.current = false;
      startingRef.current = false;
      setListening(false);
      if (name === "NotAllowedError" || name === "NotFoundError" || name === "SecurityError") {
        setError(
          name === "NotFoundError"
            ? "No microphone found."
            : "Microphone is blocked. Allow access in the browser, then tap again.",
        );
      } else {
        setError("Couldn’t open the microphone. Type instead, or try again.");
      }
      return false;
    }

    if (!wantListenRef.current) {
      startingRef.current = false;
      return false;
    }

    try {
      beginRecognition();
      startingRef.current = false;
      return true;
    } catch {
      startingRef.current = false;
      wantListenRef.current = false;
      setListening(false);
      setError("Couldn’t start listening. Type instead, or try again.");
      return false;
    }
  }, [beginRecognition, hush]);

  useEffect(() => {
    return () => {
      wantListenRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    supported,
    listening,
    interim,
    error,
    ttsOn,
    setTtsOn,
    start,
    stop,
    speak,
    hush,
    setOnFinal: (fn: (text: string) => void) => {
      onFinalRef.current = fn;
    },
  };
}
