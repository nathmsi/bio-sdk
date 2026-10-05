import { useCallback, useRef, useState } from 'react';
import { init, stop, type BioSDKInstance } from '@bio-sdk/sdk';

export function useSdk(endpoint: string) {
  const [running, setRunning] = useState(false);
  const sdkRef = useRef<BioSDKInstance | null>(null);

  const start = useCallback(() => {
    if (running) return;
    try {
      sdkRef.current = init({ endpoint, batchSize: 20, flushIntervalMs: 3000, debug: true });
      setRunning(true);
    } catch (e) {
      console.error('[BioSDK] init failed', e);
    }
  }, [endpoint, running]);

  const pause = useCallback(() => {
    stop();
    sdkRef.current = null;
    setRunning(false);
  }, []);

  return { running, start, pause };
}
