"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type Theme = 
  | "classic-paper" 
  | "modern-night" 
  | "solarized-forest" 
  | "nordic-winter" 
  | "sunset-glow"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("nordic-winter")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme
      if (saved && [
        "classic-paper",
        "modern-night",
        "solarized-forest",
        "nordic-winter",
        "sunset-glow"
      ].includes(saved)) {
        setThemeState(saved)
        document.documentElement.setAttribute("data-theme", saved)
      } else {
        document.documentElement.setAttribute("data-theme", "nordic-winter")
      }
    }
  }, [])

  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("theme", theme)
      document.documentElement.setAttribute("data-theme", theme)
    }
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

