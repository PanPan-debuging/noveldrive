"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme, Theme } from "@/contexts/theme-context"
import { useLanguage } from "@/contexts/language-context"
import { Palette } from "lucide-react"

const themeLabels: Record<Theme, string> = {
  "classic-paper": "經典紙張",
  "modern-night": "現代夜晚",
  "solarized-forest": "太陽能森林",
  "nordic-winter": "北歐冬季",
  "sunset-glow": "日落光芒",
}

const themeLabelsEn: Record<Theme, string> = {
  "classic-paper": "Classic Paper",
  "modern-night": "Modern Night",
  "solarized-forest": "Solarized Forest",
  "nordic-winter": "Nordic Winter",
  "sunset-glow": "Sunset Glow",
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { language } = useLanguage()

  const labels = language === "zh-TW" ? themeLabels : themeLabelsEn

  return (
    <div className="flex items-center gap-1.5">
      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={theme} onValueChange={(value: Theme) => setTheme(value)}>
        <SelectTrigger className="w-[140px] h-9 border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="classic-paper">{labels["classic-paper"]}</SelectItem>
          <SelectItem value="modern-night">{labels["modern-night"]}</SelectItem>
          <SelectItem value="solarized-forest">{labels["solarized-forest"]}</SelectItem>
          <SelectItem value="nordic-winter">{labels["nordic-winter"]}</SelectItem>
          <SelectItem value="sunset-glow">{labels["sunset-glow"]}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

