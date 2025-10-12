import { useEffect, useMemo, useState } from 'react';
import { createAppTheme } from '../theme/index';

const KEY = 'bc:color-mode';

export function useColorMode() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => { localStorage.setItem(KEY, mode); }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const toggle = () => setMode(m => (m === 'light' ? 'dark' : 'light'));

  return { mode, theme, toggle, setMode };
}
