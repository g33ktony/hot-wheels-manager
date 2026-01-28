import React, { createContext, useContext, useState, useEffect } from 'react'
import { ThemeMode, ThemeColors, getTheme, CustomThemeConfig, buildCustomTheme, defaultCustomTheme } from '@/config/theme.config'

interface ThemeContextType {
  mode: ThemeMode
  colors: ThemeColors
  customTheme: CustomThemeConfig
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
  updateCustomTheme: (custom: CustomThemeConfig) => void
  resetToDefault: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode | null
    return saved || 'dark'
  })

  const [customTheme, setCustomTheme] = useState<CustomThemeConfig>(() => {
    const saved = localStorage.getItem('theme-custom')
    return saved ? JSON.parse(saved) : defaultCustomTheme
  })

  // Build colors from custom theme if available
  const colors = customTheme && Object.values(customTheme).some(v => v !== undefined)
    ? buildCustomTheme(mode, customTheme)
    : getTheme(mode)

  // Save theme preference when it changes
  useEffect(() => {
    localStorage.setItem('theme-mode', mode)
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  // Save custom theme when it changes
  useEffect(() => {
    localStorage.setItem('theme-custom', JSON.stringify(customTheme))
  }, [customTheme])

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode)
  }

  const updateCustomTheme = (custom: CustomThemeConfig) => {
    setCustomTheme(custom)
  }

  const resetToDefault = () => {
    setCustomTheme(defaultCustomTheme)
  }

  return (
    <ThemeContext.Provider value={{ mode, colors, customTheme, toggleTheme, setTheme, updateCustomTheme, resetToDefault }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
