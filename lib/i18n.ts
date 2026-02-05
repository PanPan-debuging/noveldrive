export type Language = "zh-TW" | "en"

export const translations = {
  "zh-TW": {
    // Navigation
    signIn: "使用 Google 登入",
    signOut: "登出",
    language: "語言",
    
    // Home page
    novelDrive: "NovelDrive",
    tagline: "直接將小說抓取並儲存到您的 Google Drive",
    yourLibrary: "您的圖書館",
    novelsInCollection: "在您的收藏中",
    novel: "小說",
    novels: "小說",
    
    // Novel Library
    loadingLibrary: "正在載入您的圖書館...",
    filterByCategory: "依分類篩選",
    allCategories: "所有分類",
    sortBy: "排序方式",
    recentlyModified: "最近修改",
    rating: "評分",
    noNovelsFound: "找不到小說。",
    tryDifferentCategory: "請嘗試選擇不同的分類。",
    startScraping: "開始抓取您的第一本小說！",
    noRating: "無評分",
    modified: "修改時間",
    deleteConfirm: "確定要刪除《{name}》嗎？此操作無法撤銷。",
    deleteSuccess: "小說已刪除",
    deleteError: "刪除小說失敗",
    
    // Novel Scraper
    scrapeNovel: "抓取小說",
    enterNovelUrl: "輸入小說網址",
    selectCategory: "選擇分類",
    selectRating: "選擇評分（可選）",
    scrape: "抓取",
    scraping: "正在抓取...",
    scrapeSuccess: "小說已成功抓取並儲存！",
    scrapeError: "抓取失敗",
    
    // Reader page
    backToLibrary: "返回圖書館",
    loadingNovelContent: "正在載入小說內容...",
    pleaseSignIn: "請登入以閱讀小說",
    loading: "載入中...",
    save: "儲存",
    longPressToTop: "長按 3 秒回到頂部",
    
    // Metadata Editor
    editMetadata: "編輯資訊",
    category: "分類",
    rating: "評分",
    
    // Categories
    fantasy: "奇幻",
    romance: "浪漫",
    sciFi: "科幻",
    mystery: "懸疑",
    horror: "恐怖",
    adventure: "冒險",
    drama: "戲劇",
    comedy: "喜劇",
    uncategorized: "未分類",
  },
  en: {
    // Navigation
    signIn: "Sign in with Google",
    signOut: "Sign Out",
    language: "Language",
    
    // Home page
    novelDrive: "NovelDrive",
    tagline: "Scrape and save novels directly to your Google Drive",
    yourLibrary: "Your Library",
    novelsInCollection: "in your collection",
    novel: "novel",
    novels: "novels",
    
    // Novel Library
    loadingLibrary: "Loading your library...",
    filterByCategory: "Filter by Category",
    allCategories: "All Categories",
    sortBy: "Sort by",
    recentlyModified: "Recently Modified",
    rating: "Rating",
    noNovelsFound: "No novels found.",
    tryDifferentCategory: "Try selecting a different category.",
    startScraping: "Start by scraping your first novel!",
    noRating: "No rating",
    modified: "Modified",
    deleteConfirm: "Are you sure you want to delete 《{name}》? This action cannot be undone.",
    deleteSuccess: "Novel deleted successfully",
    deleteError: "Failed to delete novel",
    
    // Novel Scraper
    scrapeNovel: "Scrape Novel",
    enterNovelUrl: "Enter novel URL",
    selectCategory: "Select Category",
    selectRating: "Select Rating (Optional)",
    scrape: "Scrape",
    scraping: "Scraping...",
    scrapeSuccess: "Novel scraped and saved successfully!",
    scrapeError: "Failed to scrape novel",
    
    // Reader page
    backToLibrary: "Back to Library",
    loadingNovelContent: "Loading novel content...",
    pleaseSignIn: "Please sign in to read novels",
    loading: "Loading...",
    save: "Save",
    longPressToTop: "Long press 3s to scroll to top",
    
    // Metadata Editor
    editMetadata: "Edit Metadata",
    category: "Category",
    rating: "Rating",
    
    // Categories
    fantasy: "Fantasy",
    romance: "Romance",
    sciFi: "Sci-Fi",
    mystery: "Mystery",
    horror: "Horror",
    adventure: "Adventure",
    drama: "Drama",
    comedy: "Comedy",
    uncategorized: "Uncategorized",
  },
} as const

export function getTranslation(key: string, lang: Language, params?: Record<string, string>): string {
  const translation = translations[lang][key as keyof typeof translations[typeof lang]]
  if (!translation) {
    // Fallback to English if translation not found
    const fallback = translations.en[key as keyof typeof translations.en]
    if (!fallback) return key
    return fallback
  }
  
  // Replace parameters
  if (params) {
    return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] || match
    })
  }
  
  return translation
}

