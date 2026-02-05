"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface MultiCategorySelectProps {
  selectedCategories: string[]
  onChange: (categories: string[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MultiCategorySelect({
  selectedCategories,
  onChange,
  disabled = false,
  placeholder = "Type categories and press Enter",
  className = "",
}: MultiCategorySelectProps) {
  const [categoryInput, setCategoryInput] = useState("")

  const handleAddCategory = (category: string) => {
    const trimmedCategory = category.trim()
    if (trimmedCategory && !selectedCategories.includes(trimmedCategory)) {
      onChange([...selectedCategories, trimmedCategory])
    }
  }

  const handleRemoveCategory = (categoryToRemove: string) => {
    onChange(selectedCategories.filter((cat) => cat !== categoryToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && categoryInput.trim()) {
      e.preventDefault()
      // Support comma-separated input
      const inputValue = categoryInput.trim()
      if (inputValue.includes(",")) {
        // Split by comma and add each category
        const categories = inputValue
          .split(",")
          .map((cat) => cat.trim())
          .filter((cat) => cat && !selectedCategories.includes(cat))
        if (categories.length > 0) {
          onChange([...selectedCategories, ...categories])
        }
      } else {
        // Single category
        handleAddCategory(inputValue)
      }
      setCategoryInput("")
    } else if (e.key === "Backspace" && categoryInput === "" && selectedCategories.length > 0) {
      // Remove last category when backspace is pressed on empty input
      handleRemoveCategory(selectedCategories[selectedCategories.length - 1])
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Input
        type="text"
        value={categoryInput}
        onChange={(e) => setCategoryInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9"
      />
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((cat) => (
            <div
              key={cat}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent text-accent-foreground rounded-md text-sm"
            >
              <span>{cat}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="hover:bg-accent-foreground/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${cat}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

