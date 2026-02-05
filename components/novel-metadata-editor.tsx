"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getTranslation } from "@/lib/i18n"
import { MultiCategorySelect } from "@/components/multi-category-select"

interface NovelMetadataEditorProps {
  rating: number
  category: string | string[]
  onRatingChange: (rating: number) => void
  onCategoryChange: (category: string[]) => void
  onSave: () => void
}

export function NovelMetadataEditor({
  rating,
  category,
  onRatingChange,
  onCategoryChange,
  onSave,
}: NovelMetadataEditorProps) {
  const [categories, setCategories] = useState<string[]>([])
  const { language } = useLanguage()

  useEffect(() => {
    // Normalize category to array
    if (Array.isArray(category)) {
      setCategories(category)
    } else if (typeof category === "string") {
      setCategories(category ? [category] : [])
    } else {
      setCategories([])
    }
  }, [category])

  const handleCategoriesChange = (newCategories: string[]) => {
    setCategories(newCategories)
    onCategoryChange(newCategories)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-[200px]">
          <MultiCategorySelect
            selectedCategories={categories}
            onChange={handleCategoriesChange}
            placeholder="Type categories and press Enter"
          />
        </div>
        <Select
          value={rating.toString()}
          onValueChange={(value) => onRatingChange(parseInt(value))}
        >
          <SelectTrigger className="w-[130px]">
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
        <Button onClick={onSave} size="sm" className="h-9">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {getTranslation("save", language)}
        </Button>
      </div>
    </div>
  )
}

