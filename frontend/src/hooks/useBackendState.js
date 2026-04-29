import { useEffect, useRef, useState } from 'react';
import { storeAPI } from '../services/api';

export function useBackendState(key, initialValue) {
  const initialValueRef = useRef(initialValue);
  const [state, setState] = useState(initialValueRef.current);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const result = await storeAPI.get(key);

        if (!ignore && result.data !== null && typeof result.data !== 'undefined') {
          setState(result.data);
        }

        if (!ignore && (result.data === null || typeof result.data === 'undefined')) {
          await storeAPI.save(key, initialValueRef.current, null, `${key} initial data seeded`);
        }
      } catch (error) {
        console.error(`Backend load failed for ${key}:`, error.message);
      } finally {
        loadedRef.current = true;
        if (!ignore) setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [key]);

  useEffect(() => {
    if (!loadedRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      storeAPI.save(key, state).catch((error) => {
        console.error(`Backend save failed for ${key}:`, error.message);
      });
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [key, state]);

  return [state, setState, loading];
}