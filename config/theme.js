import { Dimensions } from 'react-native';
import { CONSTANTS } from './constants';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Base spacing unit
const BASE_SPACING = 4;

// Define theme with light mode as default
const theme = {
  // Color palette
  colors: {
    // Primary colors
    primary: '#2563EB', // Blue
    primaryDark: '#1E40AF',
    primaryLight: '#60A5FA',
    
    // Secondary colors
    secondary: '#16A34A', // Green
    secondaryDark: '#15803D',
    secondaryLight: '#4ADE80',
    
    // Accent colors
    accent: '#F97316', // Orange
    accentDark: '#C2410C',
    accentLight: '#FDBA74',
    
    // Background colors
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    
    // Text colors
    text: '#0F172A',
    textSecondary: '#475569',
    textDisabled: '#94A3B8',
    textInverse: '#FFFFFF',
    
    // Status colors
    success: '#16A34A', // Green
    error: '#DC2626', // Red
    warning: '#F59E0B', // Amber
    info: '#0EA5E9', // Sky blue
    
    // Dividers and borders
    border: '#E2E8F0',
    divider: '#E2E8F0',
    
    // Overlay and shadow
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Transparent
    transparent: 'transparent',
  },
  
  // Typography
  typography: {
    // Font family
    fontFamily: {
      regular: 'Roboto-Regular',
      medium: 'Roboto-Medium',
      bold: 'Roboto-Bold',
      light: 'Roboto-Light',
    },
    
    // Font sizes
    fontSize: {
      tiny: 10,
      small: 12,
      body: 14,
      medium: 16,
      large: 18,
      h3: 20,
      h2: 24,
      h1: 28,
      xl: 32,
      xxl: 40,
    },
    
    // Line heights
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    
    // Font weights
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },
  
  // Spacing system
  spacing: {
    // Standard spacing scale
    xxs: BASE_SPACING, // 4
    xs: BASE_SPACING * 2, // 8
    s: BASE_SPACING * 3, // 12
    m: BASE_SPACING * 4, // 16
    l: BASE_SPACING * 6, // 24
    xl: BASE_SPACING * 8, // 32
    xxl: BASE_SPACING * 12, // 48
    xxxl: BASE_SPACING * 16, // 64
    
    // Helper method to get custom spacing
    custom: (multiplier) => BASE_SPACING * multiplier,
  },
  
  // Border radius
  borderRadius: {
    none: 0,
    xs: 2,
    s: 4,
    m: 8,
    l: 12,
    xl: 16,
    xxl: 24,
    round: 9999,
  },
  
  // Shadows
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    s: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    m: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 4.65,
      elevation: 4,
    },
    l: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6.27,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 7.49,
      elevation: 9,
    },
  },
  
  // Screen breakpoints
  breakpoints: {
    smallPhone: 0,
    phone: 360,
    tablet: 480,
  },
  
  // Screen dimensions
  screen: {
    width,
    height,
    isSmallScreen: width < 360,
    isLargeScreen: width >= 480,
  },
  
  // Z-index values
  zIndex: {
    base: 1,
    card: 10,
    dialog: 20,
    navigation: 30,
    overlay: 40,
    modal: 50,
    toast: 60,
    tooltip: 70,
  },
  
  // Animation durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 450,
  },
};

// Create dark theme by modifying base theme
export const createDarkTheme = (baseTheme) => {
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      // Primary colors remain the same for brand consistency
      
      // Background colors
      background: '#0F172A',
      surface: '#1E293B',
      card: '#1E293B',
      
      // Text colors
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textDisabled: '#64748B',
      
      // Dividers and borders
      border: '#334155',
      divider: '#334155',
    },
  };
};

// Create system theme (based on device settings)
export const createSystemTheme = (baseTheme, isDark) => {
  return isDark ? createDarkTheme(baseTheme) : baseTheme;
};

export default theme;