"use client"

import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Star, Save, Loader2, ArrowUp } from "lucide-react"
import { NovelMetadataEditor } from "@/components/novel-metadata-editor"
import { useLanguage } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function ReaderPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [categories, setCategories] = useState<string[]>(["Uncategorized"])
  const { toast } = useToast()
  const { language } = useLanguage()
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRestoringScrollRef = useRef(false)
  const [longPressProgress, setLongPressProgress] = useState(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const longPressStartTimeRef = useRef<number | null>(null)

  // Save scroll position to localStorage
  const saveScrollPosition = useCallback(() => {
    if (!params.id) return
    
    const storageKey = `novel-scroll-${params.id}`
    let scrollPosition = 0
    
    // Try to get scroll position from content container first
    if (contentRef.current) {
      scrollPosition = contentRef.current.scrollTop
    } else {
      // Fallback to window scroll position
      scrollPosition = window.scrollY || document.documentElement.scrollTop
    }
    
    localStorage.setItem(storageKey, scrollPosition.toString())
  }, [params.id])

  // Restore scroll position from localStorage
  const restoreScrollPosition = useCallback(() => {
    if (!params.id || isLoading) return
    
    const storageKey = `novel-scroll-${params.id}`
    const savedPosition = localStorage.getItem(storageKey)
    
    if (savedPosition) {
      isRestoringScrollRef.current = true
      const position = parseInt(savedPosition, 10)
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        // Try to restore to content container first
        if (contentRef.current) {
          contentRef.current.scrollTop = position
        } else {
          // Fallback to window scroll
          window.scrollTo(0, position)
        }
        
        // Reset flag after a short delay
        setTimeout(() => {
          isRestoringScrollRef.current = false
        }, 100)
      })
    }
  }, [params.id, isLoading])

  // Handle scroll event with debounce
  const handleScroll = useCallback(() => {
    // Don't save scroll position if we're currently restoring it
    if (isRestoringScrollRef.current) return
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Save scroll position after 500ms of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      saveScrollPosition()
    }, 500)
  }, [saveScrollPosition])

  useEffect(() => {
    if (session && params.id) {
      fetchNovelContent()
    }
  }, [session, params.id])

  // Restore scroll position when content is loaded
  useEffect(() => {
    if (!isLoading && content) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        restoreScrollPosition()
      }, 100)
    }
  }, [isLoading, content, restoreScrollPosition])

  // Set up scroll listener
  useEffect(() => {
    const contentElement = contentRef.current
    
    // Listen to both content container scroll and window scroll
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll, { passive: true })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Save scroll position before page unload
    const handleBeforeUnload = () => {
      saveScrollPosition()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Save scroll position when navigating away
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveScrollPosition()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll, saveScrollPosition])

  // Cleanup long press timers on unmount
  useEffect(() => {
    return () => {
      if (longPressIntervalRef.current) {
        clearInterval(longPressIntervalRef.current)
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  const fetchNovelContent = async () => {
    setIsLoading(true)
    try {
      // 并行执行两个请求以提高加载速度
      const [contentResponse, novelsResponse] = await Promise.all([
        fetch(`/api/novels/${params.id}`),
        fetch("/api/novels")
      ])

      // 处理内容响应
      if (!contentResponse.ok) {
        throw new Error("Failed to fetch novel content")
      }
      const contentData = await contentResponse.json()
      setContent(contentData.content || "")

      // 处理元数据响应
      if (novelsResponse.ok) {
        const novelsData = await novelsResponse.json()
        const novel = novelsData.novels?.find(
          (n: any) => n.id === params.id
        )
        if (novel) {
          setTitle(novel.name)
          setRating(novel.rating || 0)
          const novelCategories = Array.isArray(novel.category) 
            ? novel.category 
            : (novel.category ? [novel.category] : [])
          setCategories(novelCategories)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load novel content",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToTop = useCallback(() => {
    // Clear saved scroll position first
    if (params.id) {
      const storageKey = `novel-scroll-${params.id}`
      localStorage.removeItem(storageKey)
    }
    
    // Scroll both window and content container to ensure it works
    // Use immediate scroll (not smooth) for better reliability
    window.scrollTo(0, 0)
    
    // Also try to scroll content container if it exists
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
      // Also try scrollTo method
      contentRef.current.scrollTo(0, 0)
    }
    
    // Also try document.documentElement and document.body for compatibility
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
    if (document.body) {
      document.body.scrollTop = 0
    }
  }, [params.id])

  const handleLongPressEnd = useCallback(() => {
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current)
      longPressIntervalRef.current = null
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartTimeRef.current = null
    setLongPressProgress(0)
  }, [])

  // Handle scroll to top with long press
  const handleLongPressStart = useCallback(() => {
    const LONG_PRESS_DURATION = 3000 // 3 seconds
    longPressStartTimeRef.current = Date.now()
    setLongPressProgress(0)

    // Update progress every 50ms
    longPressIntervalRef.current = setInterval(() => {
      if (longPressStartTimeRef.current) {
        const elapsed = Date.now() - longPressStartTimeRef.current
        const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100)
        setLongPressProgress(progress)

        if (progress >= 100) {
          // Long press completed, scroll to top
          scrollToTop()
          handleLongPressEnd()
        }
      }
    }, 50)
  }, [scrollToTop, handleLongPressEnd])

  const handleSaveMetadata = async () => {
    try {
      const response = await fetch(`/api/novels/${params.id}/metadata`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          category: categories,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save metadata")
      }

      toast({
        title: getTranslation("save", language),
        description: getTranslation("save", language),
      })
    } catch (error) {
      toast({
        title: getTranslation("deleteError", language),
        description:
          error instanceof Error
            ? error.message
            : getTranslation("deleteError", language),
        variant: "destructive",
      })
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>{getTranslation("pleaseSignIn", language)}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-5 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 h-9"
          >
            <ArrowLeft className="h-4 w-4" />
            {getTranslation("backToLibrary", language)}
          </Button>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NovelMetadataEditor
              rating={rating}
              category={categories}
              onRatingChange={setRating}
              onCategoryChange={setCategories}
              onSave={handleSaveMetadata}
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-medium">{title || getTranslation("loading", language)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="text-center py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="absolute inset-0 h-12 w-12 animate-ping opacity-20">
                      <Loader2 className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2 animate-pulse">
                    <p className="text-base font-medium text-foreground">{getTranslation("loading", language)}</p>
                    <p className="text-sm text-muted-foreground">{getTranslation("loadingNovelContent", language)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                ref={contentRef}
                className="prose prose-sm max-w-none"
              >
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground/90">
                  {content}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Back to Top Button - Only show when content is loaded and not loading */}
      {!isLoading && content && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
            onTouchCancel={handleLongPressEnd}
            className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center group"
            aria-label="Long press to scroll to top"
          >
            {/* Progress ring */}
            {longPressProgress > 0 && (
              <svg
                className="absolute inset-0 w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="opacity-30"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - longPressProgress / 100)}`}
                  className="transition-all duration-50"
                />
              </svg>
            )}
            
            {/* Icon */}
            <ArrowUp 
              className={`h-6 w-6 transition-transform duration-200 ${
                longPressProgress > 0 ? 'scale-110' : ''
              }`}
            />
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {longPressProgress > 0 
                ? `${Math.round(longPressProgress)}%`
                : getTranslation("longPressToTop", language)
              }
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

