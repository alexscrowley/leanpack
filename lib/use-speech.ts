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

function subscribeHold(cb: () => void) {
  const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [ttsOn, setTtsOn] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<(text: string) => void>(() => {});

  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(getRecognitionCtor()),
    () => false,
  );

  const canHold = useSyncExternalStore(
    subscribeHold,
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
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

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return false;
    hush();
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        onFinalRef.current(finalText.trim());
        setInterim("");
      }
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    setListening(true);
    setInterim("");
    recognition.start();
    return true;
  }, [hush]);

  useEffect(() => {
    return () => {
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
    canHold,
    listening,
    interim,
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
