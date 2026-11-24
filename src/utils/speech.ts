export interface VoiceSession {
  /** Called with interim text and whether the phrase is final. */
  onTranscript: (text: string, done: boolean) => void;
  /** Stop listening and close the session. */
  stop: () => void;
}

type SpeechCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult?: (e: {
    results: Array<{ [index: number]: { transcript: string; isFinal: boolean } }>;
  }) => void;
  onend?: () => void;
  start(): void;
  stop(): void;
};

function getSpeechCtor(): SpeechCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechAvailability = 'available' | 'unavailable';

export function getSpeechAvailability(): SpeechAvailability {
  return getSpeechCtor() ? 'available' : 'unavailable';
}

/**
 * Start a voice session (Chrome/Edge only). Returns null when the browser
 * doesn't support Web Speech API.
 */
export function startVoiceSession(onTranscript: (text: string, done: boolean) => void): VoiceSession | null {
  const SpeechCtor = getSpeechCtor();
  if (!SpeechCtor) return null;
  const rec = new SpeechCtor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    const results = e.results ?? [];
    const last = results[results.length - 1];
    const finalText = last?.[0]?.transcript ?? '';
    const isFinal = last?.[0]?.isFinal ?? true;
    onTranscript(finalText, isFinal);
  };
  rec.onend = () => onTranscript('', true);
  rec.start();
  return {
    onTranscript,
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
