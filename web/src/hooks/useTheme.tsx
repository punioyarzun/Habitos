import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'bitacora:theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Al iniciar sesión, si el perfil ya tiene una preferencia guardada, úsala.
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('theme')
      .eq('user_id', user.id)
      .maybeSingle()
      .then((result: { data: { theme?: Theme } | null }) => {
        if (result.data?.theme === 'light' || result.data?.theme === 'dark') setThemeState(result.data.theme);
      });
  }, [user]);

  function setTheme(t: Theme) {
    setThemeState(t);
    if (user) {
      supabase.from('profiles').update({ theme: t }).eq('user_id', user.id).then(() => {});
    }
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
