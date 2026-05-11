import { useState, useEffect, useCallback, useRef } from 'react';

type StorageGetter<T> = () => Promise<T>;
type StorageSetter<T> = (value: T) => Promise<void>;

const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage;

export function useChromeStorage<T>(
  key: string,
  getter: StorageGetter<T>,
  setter: StorageSetter<T>,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const selfUpdate = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!hasChromeStorage) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getter().then((stored) => {
      if (!cancelled) {
        setValue(stored);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [getter]);

  // chrome.storage.onChanged 리스너: 다른 페이지(background, options)에서의 변경 감지
  useEffect(() => {
    if (!hasChromeStorage) return;
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName === 'local' && changes[key]) {
        if (selfUpdate.current) {
          selfUpdate.current = false;
          return;
        }
        setValue(changes[key].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key]);

  const update = useCallback(
    async (newValue: T | ((prev: T) => T)) => {
      const resolved =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(valueRef.current)
          : newValue;
      setValue(resolved);
      valueRef.current = resolved;
      if (hasChromeStorage) {
        selfUpdate.current = true;
        await setter(resolved);
      }
    },
    [setter],
  );

  return [value, update, loading];
}
