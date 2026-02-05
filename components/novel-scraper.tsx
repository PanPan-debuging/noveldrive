"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"
import { MultiCategorySelect } from "@/components/multi-category-select"

export function NovelScraper() {
  const [url, setUrl] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [rating, setRating] = useState("0")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { language } = useLanguage()

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({
        title: getTranslation("scrapeError", language),
        description: getTranslation("enterNovelUrl", language),
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          category: categories,
          rating: parseInt(rating),
        }),
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error(
          `Server error (${response.status}). The server may be experiencing issues. Please try again later.`
        )
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to scrape novel (${response.status})`)
      }

      toast({
        title: getTranslation("scrapeSuccess", language),
        description: `"${data.title}" ${getTranslation("scrapeSuccess", language)}`,
      })

      setUrl("")
      setCategories([])
      setRating("0")
      
      // Refresh the page to update the library
      window.location.reload()
    } catch (error) {
      let errorMessage = getTranslation("scrapeError", language)
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }
      
      toast({
        title: getTranslation("scrapeError", language),
        description: errorMessage,
        variant: "destructive",
        duration: 5000, // Show for 5 seconds
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-4 w-4 text-foreground/60" />
          {getTranslation("scrapeNovel", language)}
        </CardTitle>
        <CardDescription className="text-sm mt-1">
          {getTranslation("tagline", language)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">{getTranslation("enterNovelUrl", language)}</label>
          <Input
            type="url"
            placeholder="https://example.com/novel/chapter-1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleScrape()
              }
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{getTranslation("selectCategory", language)}</label>
            <MultiCategorySelect
              selectedCategories={categories}
              onChange={setCategories}
              disabled={isLoading}
              placeholder="Type categories and press Enter"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{getTranslation("selectRating", language)}</label>
            <Select value={rating} onValueChange={setRating} disabled={isLoading}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <SelectItem key={r} value={r.toString()}>
                    {r === 0 ? getTranslation("noRating", language) : "⭐".repeat(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={handleScrape}
          disabled={isLoading || !url.trim()}
          className="w-full mt-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {getTranslation("scraping", language)}
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {getTranslation("scrape", language)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

