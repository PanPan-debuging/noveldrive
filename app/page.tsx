"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { BookOpen, LogOut } from "lucide-react"
import { NovelLibrary } from "@/components/novel-library"
import { NovelScraper } from "@/components/novel-scraper"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useLanguage } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"

export default function Home() {
  const { data: session, status } = useSession()
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleScrapeSuccess = () => {
    // Trigger library refresh by updating the trigger value
    setRefreshTrigger(prev => prev + 1)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl" suppressHydrationWarning>
          {mounted ? getTranslation("loading", language) : "載入中..."}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-50 p-4">
        <div className="w-full max-w-md relative border border-black rounded-xl bg-white p-6 md:p-8">
          {/* Language Switcher & Theme Switcher - Top Left */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          
          {/* Main Content - Centered */}
          <div className="flex flex-col items-center justify-center space-y-5 pt-10 pb-4">
            {/* Book Icon */}
            <div className="flex justify-center mt-2">
              <BookOpen className="h-14 w-14 md:h-16 md:w-16 text-foreground stroke-[1.5]" />
            </div>
            
            {/* App Name */}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {getTranslation("novelDrive", language)}
            </h1>
            
            {/* Tagline */}
            <p className="text-sm md:text-base text-foreground/70 text-center max-w-sm px-4">
              {getTranslation("tagline", language)}
            </p>
            
            {/* Sign In Button - Bottom */}
            <div className="w-full pt-6 pb-2 px-4">
            <Button
              onClick={() => signIn("google")}
                className="w-full bg-foreground text-background hover:bg-foreground/90 h-11 md:h-12 text-base font-medium rounded-lg"
              size="lg"
            >
              {getTranslation("signIn", language)}
            </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-foreground/70" />
            <h1 className="text-2xl font-medium text-foreground">{getTranslation("novelDrive", language)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {session.user?.email}
            </span>
            <Button variant="ghost" onClick={() => signOut()} className="h-9">
              <LogOut className="h-4 w-4 mr-2" />
              {getTranslation("signOut", language)}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <NovelScraper onScrapeSuccess={handleScrapeSuccess} />
        <div className="mt-6">
          <NovelLibrary refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  )
}

