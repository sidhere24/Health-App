import { useEffect, useState } from 'react';
import {
  getStoredTheme,
  isDarkOs,
  resolveTheme,
  setThemeMode,
  type ResolvedTheme,
  type ThemeMode,
} from '../utils/theme';

export function useTheme(): {
  theme: ThemeMode;
  resolved: ResolvedTheme;
  setTheme: (t: ThemeMode) => void;
} {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(theme, isDarkOs()));

  useEffect(() => {
    const next = resolveTheme(theme, isDarkOs());
    setResolved(next);
    document.documentElement.classList.toggle('dark', next === 'dark');

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onOsChange = () => {
      const nextOs = resolveTheme(theme, mql.matches);
      setResolved(nextOs);
      document.documentElement.classList.toggle('dark', nextOs === 'dark');
    };
    mql.addEventListener('change', onOsChange);
    return () => mql.removeEventListener('change', onOsChange);
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    setThemeMode(t);
  };

  return { theme, resolved, setTheme };
}
