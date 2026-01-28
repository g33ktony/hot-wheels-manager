import React, { createContext, useContext, useState, useEffect } from 'react'
import { ThemeMode, ThemeColors, getTheme } from '@/config/theme.config'

interface ThemeContextType {
  mode: ThemeMode
  colors: ThemeColors
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Load theme from localStorage on mount
    const saved = localStorage.getItem('theme-mode') as ThemeMode | null
    return saved || 'dark'
  })

  const colors = getTheme(mode)

  // Save theme preference when it changes
  useEffect(() => {
    localStorage.setItem('theme-mode', mode)
    // Also set on document root for potential CSS-based theming
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode)
  }

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to use theme context
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
