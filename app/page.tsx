"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Plus, LogOut, BookMarked } from "lucide-react"
import Link from "next/link"
import { NovelLibrary } from "@/components/novel-library"
import { NovelScraper } from "@/components/novel-scraper"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"

export default function Home() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/50 shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-6">
              <BookOpen className="h-12 w-12 text-foreground/70" />
            </div>
            <CardTitle className="text-3xl font-medium">{getTranslation("novelDrive", language)}</CardTitle>
            <CardDescription className="text-base mt-3 text-muted-foreground">
              {getTranslation("tagline", language)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <LanguageSwitcher />
            <Button
              onClick={() => signIn("google")}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              size="lg"
            >
              {getTranslation("signIn", language)}
            </Button>
          </CardContent>
        </Card>
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
        <NovelScraper />
        <div className="mt-6">
          <NovelLibrary />
        </div>
      </main>
    </div>
  )
}

