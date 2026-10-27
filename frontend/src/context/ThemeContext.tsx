import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { hexToHslChannels } from '../lib/utils/contrast';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePreset {
  id: string;
  name: string;
  brandPrimary: string;
  brandHover: string;
  brandAccent: string;
  description: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'caresure',
    name: 'CareSure Blue (PRD Default)',
    brandPrimary: '#8FA9FF',
    brandHover: '#6F8BF0',
    brandAccent: '#38BDF8',
    description: 'Clean medical SaaS brand color with dark ink contrast',
  },
  {
    id: 'navy',
    name: 'Deep Medical Navy',
    brandPrimary: '#3B82F6',
    brandHover: '#2563EB',
    brandAccent: '#60A5FA',
    description: 'Classic clinical executive dashboard palette',
  },
  {
    id: 'emerald',
    name: 'Emerald Integrity',
    brandPrimary: '#10B981',
    brandHover: '#059669',
    brandAccent: '#34D399',
    description: 'Revenue assurance and financial health focus',
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    brandPrimary: '#8B5CF6',
    brandHover: '#7C3AED',
    brandAccent: '#A78BFA',
    description: 'Modern administrative intelligence aesthetic',
  },
];

export interface CustomColors {
  brandPrimary?: string;
  brandAccent?: string;
  bgApp?: string;
  bgSurface?: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  activePresetId: string;
  customColors: CustomColors;
  setMode: (mode: ThemeMode) => void;
  setPreset: (presetId: string) => void;
  setCustomColor: (key: keyof CustomColors, hex: string) => void;
  resetTheme: () => void;
  chartColors: {
    green: string;
    amber: string;
    red: string;
    blue: string;
    grid: string;
    primary: string;
  };
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('caresure_theme_mode') as ThemeMode) || 'light';
  });

  const [activePresetId, setActivePresetId] = useState<string>(() => {
    return localStorage.getItem('caresure_theme_preset') || 'caresure';
  });

  const [customColors, setCustomColorsState] = useState<CustomColors>(() => {
    try {
      const saved = localStorage.getItem('caresure_custom_theme');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Calculate if dark mode is effective
  const [systemIsDark, setSystemIsDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemIsDark);

  // Apply attributes and CSS variables
  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply preset or custom brand
    if (activePresetId === 'custom') {
      if (customColors.brandPrimary) {
        root.style.setProperty('--brand-primary', hexToHslChannels(customColors.brandPrimary));
      }
      if (customColors.brandAccent) {
        root.style.setProperty('--brand-accent', hexToHslChannels(customColors.brandAccent));
      }
      if (customColors.bgApp) {
        root.style.setProperty('--bg-app', hexToHslChannels(customColors.bgApp));
      }
      if (customColors.bgSurface) {
        root.style.setProperty('--bg-surface', hexToHslChannels(customColors.bgSurface));
      }
    } else {
      const preset = THEME_PRESETS.find((p) => p.id === activePresetId) || THEME_PRESETS[0];
      root.style.setProperty('--brand-primary', hexToHslChannels(preset.brandPrimary));
      root.style.setProperty('--brand-hover', hexToHslChannels(preset.brandHover));
      root.style.setProperty('--brand-accent', hexToHslChannels(preset.brandAccent));
      root.style.removeProperty('--bg-app');
      root.style.removeProperty('--bg-surface');
    }

    localStorage.setItem('caresure_theme_mode', mode);
    localStorage.setItem('caresure_theme_preset', activePresetId);
    localStorage.setItem('caresure_custom_theme', JSON.stringify(customColors));
  }, [mode, isDark, activePresetId, customColors]);

  const setMode = (newMode: ThemeMode) => setModeState(newMode);

  const setPreset = (presetId: string) => {
    setActivePresetId(presetId);
  };

  const setCustomColor = (key: keyof CustomColors, hex: string) => {
    setActivePresetId('custom');
    setCustomColorsState((prev) => ({ ...prev, [key]: hex }));
  };

  const resetTheme = () => {
    setActivePresetId('caresure');
    setCustomColorsState({});
    setModeState('light');
    const root = document.documentElement;
    root.style.removeProperty('--brand-primary');
    root.style.removeProperty('--brand-hover');
    root.style.removeProperty('--brand-accent');
    root.style.removeProperty('--bg-app');
    root.style.removeProperty('--bg-surface');
  };

  const chartColors = useMemo(() => {
    return {
      green: isDark ? '#10B981' : '#40C4A0',
      amber: isDark ? '#F59E0B' : '#F0B44D',
      red: isDark ? '#EF4444' : '#E97777',
      blue: isDark ? '#3B82F6' : '#2563EB',
      grid: isDark ? '#1E293B' : '#E2E8F0',
      primary: activePresetId === 'custom' && customColors.brandPrimary
        ? customColors.brandPrimary
        : (THEME_PRESETS.find((p) => p.id === activePresetId)?.brandPrimary || '#8FA9FF'),
    };
  }, [isDark, activePresetId, customColors]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        activePresetId,
        customColors,
        setMode,
        setPreset,
        setCustomColor,
        resetTheme,
        chartColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
