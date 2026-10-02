import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export const lightTheme = {
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  cardShadow: '#000000',
  iconPrimary: '#1E293B',
  iconMuted: '#94A3B8',
  primary: '#0E7490',
  accent: '#6D28D9',
  success: '#0E7490',
  danger: '#BE185D',
  badgeInBg: '#CFFAFE',
  badgeInText: '#0E7490',
  badgeOutBg: '#FCE7F3',
  badgeOutText: '#BE185D',
};

export const darkTheme = {
  background: '#090D16',
  cardBackground: '#111827',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1F2937',
  cardShadow: '#000000',
  iconPrimary: '#F8FAFC',
  iconMuted: '#64748B',
  primary: '#06B6D4',
  accent: '#8B5CF6',
  success: '#06B6D4',
  danger: '#EC4899',
  badgeInBg: '#083344',
  badgeInText: '#67E8F9',
  badgeOutBg: '#500724',
  badgeOutText: '#F9A8D4',
};

export type ThemePalette = {
  [Color in keyof typeof lightTheme]: string;
};

const THEME_KEY = '@app_theme_mode';

type AppThemeContextValue = {
  theme: typeof lightTheme | typeof darkTheme;
  isDark: boolean;
  activeMode: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(THEME_KEY)
      .then((savedMode) => {
        if (
          isActive &&
          (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')
        ) {
          setThemeModeState(savedMode);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load theme preference', error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  }, []);

  const activeMode = themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
  const theme = activeMode === 'dark' ? darkTheme : lightTheme;

  return (
    <AppThemeContext.Provider
      value={{ theme, isDark: activeMode === 'dark', activeMode, themeMode, setThemeMode }}
    >
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return context;
}