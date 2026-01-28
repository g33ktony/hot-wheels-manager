/**
 * Theme Configuration
 * Centralized color palette for dark and light modes
 * Easy to modify global colors from a single place
 */

export type ThemeMode = 'dark' | 'light'

export interface ThemeColors {
  // Backgrounds
  bg: {
    primary: string
    secondary: string
    tertiary: string
    card: string
    hover: string
    input: string
    modal: string
  }
  // Text colors (RGB values for use in style props)
  text: {
    primary: string
    secondary: string
    tertiary: string
    muted: string
    danger: string
    success: string
    warning: string
    info: string
  }
  // Borders (RGB values for use in style props)
  border: {
    primary: string
    secondary: string
    input: string
    hover: string
  }
  // Specific UI elements (RGB values for use in style props)
  ui: {
    emeraldAccent: string
    blueAccent: string
    redAccent: string
    greenAccent: string
    orangeAccent: string
    purpleAccent: string
    shadowCard: string
  }
  // CSS variables for use in styles
  cssVars: {
    textPrimary: string
    textSecondary: string
    textTertiary: string
    textMuted: string
    textDanger: string
    textSuccess: string
    borderPrimary: string
    borderSecondary: string
    accentEmerald: string
  }
}

export interface CustomThemeConfig {
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textMuted: string
  textDanger: string
  textSuccess: string
  textWarning: string
  textInfo: string
  borderPrimary: string
  borderSecondary: string
  borderInput: string
  accentEmerald: string
  accentBlue: string
  accentRed: string
  accentGreen: string
  accentOrange: string
  accentPurple: string
}

export const darkTheme: ThemeColors = {
  bg: {
    primary: 'bg-slate-900',
    secondary: 'bg-slate-800',
    tertiary: 'bg-slate-700',
    card: 'bg-slate-800',
    hover: 'hover:bg-slate-700',
    input: 'bg-slate-700',
    modal: 'bg-slate-800',
  },
  text: {
    primary: 'rgb(255, 255, 255)',
    secondary: 'rgb(203, 213, 225)',
    tertiary: 'rgb(148, 163, 184)',
    muted: 'rgb(100, 116, 139)',
    danger: 'rgb(239, 68, 68)',
    success: 'rgb(52, 211, 153)',
    warning: 'rgb(250, 204, 21)',
    info: 'rgb(96, 165, 250)',
  },
  border: {
    primary: 'rgb(51, 65, 85)',
    secondary: 'rgb(71, 85, 105)',
    input: 'rgb(71, 85, 105)',
    hover: 'rgb(51, 65, 85)',
  },
  ui: {
    emeraldAccent: 'rgb(52, 211, 153)',
    blueAccent: 'rgb(59, 130, 246)',
    redAccent: 'rgb(239, 68, 68)',
    greenAccent: 'rgb(52, 211, 153)',
    orangeAccent: 'rgb(251, 146, 60)',
    purpleAccent: 'rgb(168, 85, 247)',
    shadowCard: 'shadow-lg',
  },
  cssVars: {
    textPrimary: 'white',
    textSecondary: 'rgb(203, 213, 225)',
    textTertiary: 'rgb(148, 163, 184)',
    textMuted: 'rgb(100, 116, 139)',
    textDanger: 'rgb(239, 68, 68)',
    textSuccess: 'rgb(52, 211, 153)',
    borderPrimary: 'rgb(51, 65, 85)',
    borderSecondary: 'rgb(71, 85, 105)',
    accentEmerald: 'rgb(52, 211, 153)',
  }
}

export const lightTheme: ThemeColors = {
  bg: {
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    tertiary: 'bg-gray-100',
    card: 'bg-white',
    hover: 'hover:bg-gray-100',
    input: 'bg-white',
    modal: 'bg-white',
  },
  text: {
    primary: 'rgb(17, 24, 39)',
    secondary: 'rgb(55, 65, 81)',
    tertiary: 'rgb(75, 85, 99)',
    muted: 'rgb(107, 114, 128)',
    danger: 'rgb(220, 38, 38)',
    success: 'rgb(34, 197, 94)',
    warning: 'rgb(234, 179, 8)',
    info: 'rgb(37, 99, 235)',
  },
  border: {
    primary: 'rgb(229, 231, 235)',
    secondary: 'rgb(209, 213, 219)',
    input: 'rgb(209, 213, 219)',
    hover: 'rgb(189, 195, 204)',
  },
  ui: {
    emeraldAccent: 'rgb(34, 197, 94)',
    blueAccent: 'rgb(37, 99, 235)',
    redAccent: 'rgb(220, 38, 38)',
    greenAccent: 'rgb(34, 197, 94)',
    orangeAccent: 'rgb(234, 88, 12)',
    purpleAccent: 'rgb(147, 51, 234)',
    shadowCard: 'shadow-md',
  },
  cssVars: {
    textPrimary: 'rgb(17, 24, 39)',
    textSecondary: 'rgb(55, 65, 81)',
    textTertiary: 'rgb(75, 85, 99)',
    textMuted: 'rgb(107, 114, 128)',
    textDanger: 'rgb(220, 38, 38)',
    textSuccess: 'rgb(34, 197, 94)',
    borderPrimary: 'rgb(229, 231, 235)',
    borderSecondary: 'rgb(209, 213, 219)',
    accentEmerald: 'rgb(34, 197, 94)',
  }
}

export const defaultCustomTheme: CustomThemeConfig = {
  textPrimary: 'rgb(255, 255, 255)',
  textSecondary: 'rgb(203, 213, 225)',
  textTertiary: 'rgb(148, 163, 184)',
  textMuted: 'rgb(100, 116, 139)',
  textDanger: 'rgb(239, 68, 68)',
  textSuccess: 'rgb(52, 211, 153)',
  textWarning: 'rgb(250, 204, 21)',
  textInfo: 'rgb(96, 165, 250)',
  borderPrimary: 'rgb(51, 65, 85)',
  borderSecondary: 'rgb(71, 85, 105)',
  borderInput: 'rgb(71, 85, 105)',
  accentEmerald: 'rgb(52, 211, 153)',
  accentBlue: 'rgb(59, 130, 246)',
  accentRed: 'rgb(239, 68, 68)',
  accentGreen: 'rgb(52, 211, 153)',
  accentOrange: 'rgb(251, 146, 60)',
  accentPurple: 'rgb(168, 85, 247)',
}

export const getTheme = (mode: ThemeMode): ThemeColors => {
  return mode === 'dark' ? darkTheme : lightTheme
}

export const buildCustomTheme = (mode: ThemeMode, custom: CustomThemeConfig): ThemeColors => {
  const baseTheme = getTheme(mode)
  
  return {
    ...baseTheme,
    text: {
      primary: custom.textPrimary,
      secondary: custom.textSecondary,
      tertiary: custom.textTertiary,
      muted: custom.textMuted,
      danger: custom.textDanger,
      success: custom.textSuccess,
      warning: custom.textWarning,
      info: custom.textInfo,
    },
    border: {
      primary: custom.borderPrimary,
      secondary: custom.borderSecondary,
      input: custom.borderInput,
      hover: custom.borderPrimary,
    },
    ui: {
      emeraldAccent: custom.accentEmerald,
      blueAccent: custom.accentBlue,
      redAccent: custom.accentRed,
      greenAccent: custom.accentGreen,
      orangeAccent: custom.accentOrange,
      purpleAccent: custom.accentPurple,
      shadowCard: baseTheme.ui.shadowCard,
    },
    cssVars: {
      textPrimary: custom.textPrimary,
      textSecondary: custom.textSecondary,
      textTertiary: custom.textTertiary,
      textMuted: custom.textMuted,
      textDanger: custom.textDanger,
      textSuccess: custom.textSuccess,
      borderPrimary: custom.borderPrimary,
      borderSecondary: custom.borderSecondary,
      accentEmerald: custom.accentEmerald,
    }
  }
}

