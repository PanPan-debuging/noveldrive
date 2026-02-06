"use client"

import { SessionProvider } from "next-auth/react"
import { LanguageProvider } from "@/contexts/language-context"
import { ThemeProvider } from "@/contexts/theme-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  )
}

