import { useEffect, useRef, useState } from 'react';
import type { BioPayload } from '@bio-sdk/protocol';

export interface SseBatchEvent {
  type: 'batch';
  payload: BioPayload;
  score: {
    score: number;
    label: string;
    factors: Array<{ name: string; value: number; weight: number; description: string }>;
  };
}

export function useSse(url: string) {
  const [events, setEvents] = useState<SseBatchEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data as string) as SseBatchEvent;
        setEvents(prev => [data, ...prev].slice(0, 100));
      } catch { /* ignore malformed */ }
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [url]);

  return { events, connected };
}
