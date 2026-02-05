"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Star, Filter, ArrowUpDown, Trash2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"

interface Novel {
  id: string
  name: string
  rating: number
  category: string | string[]
  createdTime: string
  modifiedTime: string
}

export function NovelLibrary() {
  const [novels, setNovels] = useState<Novel[]>([])
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"rating" | "date">("date")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { language } = useLanguage()

  useEffect(() => {
    fetchNovels()
  }, [])

  useEffect(() => {
    let filtered = [...novels]

    if (selectedCategory !== "all") {
      filtered = filtered.filter((novel) => {
        const novelCategories = Array.isArray(novel.category) 
          ? novel.category 
          : [novel.category]
        return novelCategories.includes(selectedCategory)
      })
    }

    if (sortBy === "rating") {
      filtered.sort((a, b) => b.rating - a.rating)
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      )
    }

    setFilteredNovels(filtered)
  }, [novels, selectedCategory, sortBy])

  const fetchNovels = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/novels")
      if (!response.ok) {
        throw new Error("Failed to fetch novels")
      }
      const data = await response.json()
      setNovels(data.novels || [])
    } catch (error) {
      toast({
        title: getTranslation("deleteError", language),
        description:
          error instanceof Error ? error.message : getTranslation("deleteError", language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNovel = async (novelId: string, novelName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm(getTranslation("deleteConfirm", language, { name: novelName }))) {
      return
    }

    try {
      const response = await fetch(`/api/novels/${novelId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete novel")
      }

      toast({
        title: getTranslation("deleteSuccess", language),
        description: getTranslation("deleteSuccess", language),
      })

      // 刷新小说列表
      fetchNovels()
    } catch (error) {
      toast({
        title: getTranslation("deleteError", language),
        description:
          error instanceof Error ? error.message : getTranslation("deleteError", language),
        variant: "destructive",
      })
    }
  }

  const categories = Array.from(
    new Set(
      novels.flatMap((n) => {
        return Array.isArray(n.category) ? n.category : [n.category]
      })
    )
  ).sort()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">{getTranslation("loadingLibrary", language)}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-4 w-4 text-foreground/60" />
            {getTranslation("yourLibrary", language)}
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {filteredNovels.length} {filteredNovels.length === 1 ? getTranslation("novel", language) : getTranslation("novels", language)} {getTranslation("novelsInCollection", language)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {getTranslation("filterByCategory", language)}
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getTranslation("allCategories", language)}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {getTranslation("sortBy", language)}
              </label>
              <Select
                value={sortBy}
                onValueChange={(value: "rating" | "date") => setSortBy(value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">{getTranslation("recentlyModified", language)}</SelectItem>
                  <SelectItem value="rating">{getTranslation("rating", language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredNovels.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-base">{getTranslation("noNovelsFound", language)}</p>
              <p className="text-sm mt-1.5">
                {selectedCategory !== "all"
                  ? getTranslation("tryDifferentCategory", language)
                  : getTranslation("startScraping", language)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNovels.map((novel) => (
                <Link key={novel.id} href={`/reader/${novel.id}`}>
                  <Card className="hover:border-foreground/20 transition-all cursor-pointer h-full relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive z-10 transition-opacity"
                      onClick={(e) => handleDeleteNovel(novel.id, novel.name, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-2 pr-8 font-medium">
                        {novel.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {(() => {
                          const categories = Array.isArray(novel.category) 
                            ? novel.category 
                            : (novel.category ? [novel.category] : [])
                          return categories.length > 0 
                            ? categories.join(", ") 
                            : "No categories"
                        })()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm">
                          {novel.rating > 0
                            ? `${novel.rating}/5`
                            : getTranslation("noRating", language)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2.5">
                        {getTranslation("modified", language)}:{" "}
                        {new Date(novel.modifiedTime).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

