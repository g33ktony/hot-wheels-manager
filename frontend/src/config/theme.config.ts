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

export const getTheme = (mode: ThemeMode): ThemeColors => {
  return mode === 'dark' ? darkTheme : lightTheme
}
