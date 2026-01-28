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
  // Text colors
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
  // Borders
  border: {
    primary: string
    secondary: string
    input: string
    hover: string
  }
  // Specific UI elements
  ui: {
    emeraldAccent: string
    blueAccent: string
    redAccent: string
    greenAccent: string
    orangeAccent: string
    purpleAccent: string
    shadowCard: string
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
    primary: 'text-white',
    secondary: 'text-slate-300',
    tertiary: 'text-slate-400',
    muted: 'text-slate-500',
    danger: 'text-red-500',
    success: 'text-emerald-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  },
  border: {
    primary: 'border-slate-700',
    secondary: 'border-slate-600',
    input: 'border-slate-600',
    hover: 'hover:border-slate-500',
  },
  ui: {
    emeraldAccent: 'text-emerald-400',
    blueAccent: 'text-blue-500',
    redAccent: 'text-red-500',
    greenAccent: 'text-emerald-400',
    orangeAccent: 'text-orange-400',
    purpleAccent: 'text-purple-400',
    shadowCard: 'shadow-lg',
  },
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
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    tertiary: 'text-gray-600',
    muted: 'text-gray-500',
    danger: 'text-red-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  },
  border: {
    primary: 'border-gray-200',
    secondary: 'border-gray-300',
    input: 'border-gray-300',
    hover: 'hover:border-gray-400',
  },
  ui: {
    emeraldAccent: 'text-emerald-600',
    blueAccent: 'text-blue-600',
    redAccent: 'text-red-600',
    greenAccent: 'text-green-600',
    orangeAccent: 'text-orange-600',
    purpleAccent: 'text-purple-600',
    shadowCard: 'shadow-md',
  },
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
      primary: `text-[${custom.textPrimary}]`,
      secondary: `text-[${custom.textSecondary}]`,
      tertiary: `text-[${custom.textTertiary}]`,
      muted: `text-[${custom.textMuted}]`,
      danger: `text-[${custom.textDanger}]`,
      success: `text-[${custom.textSuccess}]`,
      warning: `text-[${custom.textWarning}]`,
      info: `text-[${custom.textInfo}]`,
    },
    border: {
      primary: `border-[${custom.borderPrimary}]`,
      secondary: `border-[${custom.borderSecondary}]`,
      input: `border-[${custom.borderInput}]`,
      hover: `hover:border-[${custom.borderPrimary}]`,
    },
    ui: {
      emeraldAccent: `text-[${custom.accentEmerald}]`,
      blueAccent: `text-[${custom.accentBlue}]`,
      redAccent: `text-[${custom.accentRed}]`,
      greenAccent: `text-[${custom.accentGreen}]`,
      orangeAccent: `text-[${custom.accentOrange}]`,
      purpleAccent: `text-[${custom.accentPurple}]`,
      shadowCard: baseTheme.ui.shadowCard,
    },
  }
}

