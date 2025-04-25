import React, { createContext, useState, useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mmkvStorage } from '../database/cache/mmkvStorage';

// Define the light theme
const lightTheme = {
  // Color palette as defined in the project document
  colors: {
    primary: '#2563EB', // Blue
    secondary: '#16A34A', // Green
    accent: '#F97316', // Orange
    background: '#F8FAFC', // Light Gray
    surface: '#FFFFFF',
    text: '#0F172A', // Dark Blue/Gray
    textSecondary: '#64748B',
    error: '#DC2626', // Red
    success: '#16A34A', // Green
    warning: '#F59E0B', // Amber
    info: '#0EA5E9',
    border: '#E2E8F0',
    disabled: '#CBD5E1',
    card: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Spacing system with base unit of 4px
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  // Typography settings
  typography: {
    fontFamily: {
      regular: 'Roboto-Regular',
      medium: 'Roboto-Medium',
      bold: 'Roboto-Bold',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 30,
    },
    lineHeight: {
      xs: 16,
      sm: 20,
      base: 24,
      lg: 28,
      xl: 30,
      xxl: 36,
      xxxl: 40,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },
  
  // Border radius
  borderRadius: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    circle: 9999,
  },
  
  // Elevation/shadows
  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
  
  // Animation timing
  animation: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};

// Define the dark theme by overriding colors
const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: '#3B82F6', // Lighter Blue
    secondary: '#22C55E', // Lighter Green
    accent: '#FB923C', // Lighter Orange
    background: '#0F172A', // Dark Blue/Gray
    surface: '#1E293B',
    text: '#F8FAFC', // Light Gray
    textSecondary: '#94A3B8',
    border: '#334155',
    disabled: '#475569',
    card: '#1E293B',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

// Create the context
export const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  themeMode: 'system', // 'light', 'dark', or 'system'
  setThemeMode: () => {},
});

// Create the provider component
export const ThemeProvider = ({ children }) => {
  // Get system color scheme
  const systemColorScheme = useColorScheme();
  
  // Initialize state
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  const [isLoading, setIsLoading] = useState(true);
  
  // Calculate the current theme based on mode and system preference
  const isDark = 
    themeMode === 'system' 
      ? systemColorScheme === 'dark' 
      : themeMode === 'dark';
  
  const currentTheme = isDark ? darkTheme : lightTheme;

  // Load theme preference from storage on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // Try MMKV first
        let storedThemeMode = mmkvStorage.getString('app.themeMode');
        
        // Fall back to AsyncStorage
        if (!storedThemeMode) {
          storedThemeMode = await AsyncStorage.getItem('app.themeMode');
        }
        
        if (storedThemeMode) {
          setThemeMode(storedThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  // Listen for system appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only update if we're in 'system' mode
      if (themeMode === 'system') {
        // We don't need to update state here since the isDark calculation
        // already uses systemColorScheme which will trigger a re-render
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  // Save theme preference whenever it changes
  useEffect(() => {
    if (isLoading) return;
    
    const saveThemePreference = async () => {
      try {
        // Save to MMKV for quick access
        mmkvStorage.set('app.themeMode', themeMode);
        
        // Save to AsyncStorage for persistence
        await AsyncStorage.setItem('app.themeMode', themeMode);
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    };

    saveThemePreference();
  }, [themeMode, isLoading]);

  // Handler to update theme mode
  const handleSetThemeMode = (mode) => {
    if (['light', 'dark', 'system'].includes(mode)) {
      setThemeMode(mode);
    }
  };

  // Create context value
  const contextValue = {
    theme: currentTheme,
    isDark,
    themeMode,
    setThemeMode: handleSetThemeMode,
  };

  // If still loading, you could return a placeholder or the default theme
  if (isLoading) {
    return (
      <ThemeContext.Provider value={{ ...contextValue, theme: lightTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;