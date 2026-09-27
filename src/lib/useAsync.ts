import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './apiClient';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-runs the fetch — the web equivalent of every screen's pull-to-refresh. */
  reload: () => void;
}

/**
 * Runs an async fetch and tracks loading/error state for it.
 *
 * Results from a superseded run are discarded, so switching filters quickly
 * cannot leave the screen showing the response to an older query.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Kept in a ref so a caller passing an inline arrow does not restart the
  // fetch on every render — `deps` alone decides when to re-run.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);

    fnRef
      .current()
      .then(result => {
        if (runId.current !== id) return;
        setData(result);
      })
      .catch(err => {
        if (runId.current !== id) return;
        setError(errorMessage(err));
      })
      .finally(() => {
        if (runId.current !== id) return;
        setLoading(false);
      });
    // `deps` is the caller's dependency list by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);

  return { data, loading, error, reload };
}
