import * as cheerio from "cheerio"
import { Converter } from "opencc-js"

export interface ScrapedNovel {
  title: string
  content: string
}

// Initialize OpenCC converter for Simplified to Traditional Chinese
const converter = Converter({ from: "cn", to: "tw" })

/**
 * Detects if text is primarily Simplified Chinese
 * Returns true if the text contains more Simplified Chinese characters than Traditional
 */
function isSimplifiedChinese(text: string): boolean {
  // Common Simplified Chinese characters that differ from Traditional
  const simplifiedChars = /[简体中文常见字符：这那个为会时说可以]/g
  // Common Traditional Chinese characters
  const traditionalChars = /[繁體中文常見字符：這那個為會時說可以]/g
  
  const simplifiedCount = (text.match(simplifiedChars) || []).length
  const traditionalCount = (text.match(traditionalChars) || []).length
  
  // If we have more simplified than traditional, likely simplified
  if (simplifiedCount > traditionalCount) {
    return true
  }
  
  // Check for specific simplified-only characters
  const simplifiedOnly = /[简体]/g
  if (simplifiedOnly.test(text)) {
    return true
  }
  
  // Check for specific traditional-only characters
  const traditionalOnly = /[繁體]/g
  if (traditionalOnly.test(text)) {
    return false
  }
  
  // If no clear indicator, check common simplified patterns
  // Simplified: 这、那、为、会、说、时、个
  // Traditional: 這、那、為、會、說、時、個
  const simplifiedPattern = /[这为会说时个]/g
  const traditionalPattern = /[這為會說時個]/g
  
  const simplifiedMatches = (text.match(simplifiedPattern) || []).length
  const traditionalMatches = (text.match(traditionalPattern) || []).length
  
  return simplifiedMatches > traditionalMatches
}

/**
 * Converts Simplified Chinese to Traditional Chinese
 */
function convertToTraditional(text: string): string {
  try {
    return converter(text)
  } catch (error) {
    console.error("[SCRAPER] Error converting to Traditional Chinese:", error)
    return text // Return original if conversion fails
  }
}

export async function scrapeNovel(url: string): Promise<ScrapedNovel> {
  try {
    console.log("[SCRAPER] Starting to fetch URL:", url)
    
    // Add timeout to fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log("[SCRAPER] Request timeout triggered")
      controller.abort()
    }, 30000) // 30 second timeout

    let response: Response
    try {
      console.log("[SCRAPER] Making fetch request...")
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      console.log("[SCRAPER] Fetch response received. Status:", response.status, response.statusText)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error("[SCRAPER] Fetch error:", fetchError)
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error("Request timed out. The website took too long to respond.")
      }
      if (fetchError instanceof TypeError && fetchError.message.includes("fetch")) {
        throw new Error(
          "Network error. Please check your internet connection and ensure the URL is accessible."
        )
      }
      throw new Error(
        `Failed to fetch URL: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`
      )
    }

    if (!response.ok) {
      console.error("[SCRAPER] Response not OK:", response.status, response.statusText)
      throw new Error(
        `Failed to fetch URL (${response.status} ${response.statusText}). The website may be blocking requests or the page may not exist.`
      )
    }

    console.log("[SCRAPER] Reading response text...")
    const html = await response.text()
    console.log("[SCRAPER] HTML received. Length:", html.length)
    
    if (!html || html.length < 100) {
      console.error("[SCRAPER] HTML too short or empty")
      throw new Error("The website returned empty or invalid content.")
    }

    console.log("[SCRAPER] Parsing HTML with Cheerio...")
    const $ = cheerio.load(html)

    // Remove script and style elements
    $("script, style, nav, header, footer, aside, .ad, .advertisement, .ads").remove()

    // Try to find the title
    let title =
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "Untitled Novel"

    // Try to find main content
    // Common selectors for novel content
    const contentSelectors = [
      "#content",
      ".content",
      "#chapter-content",
      ".chapter-content",
      "#novel-content",
      ".novel-content",
      "article",
      "main",
      ".post-content",
      "#post-content",
    ]

    // Helper function to extract text while preserving paragraph structure
    const extractTextWithParagraphs = (element: cheerio.Cheerio): string => {
      // Clone to avoid modifying the original
      const cloned = element.clone()
      
      // Insert newlines before block elements to preserve paragraph structure
      cloned.find("p, div, h1, h2, h3, h4, h5, h6").each((_, el) => {
        $(el).before("\n\n")
      })
      
      // Replace <br> tags with newlines
      cloned.find("br").each((_, el) => {
        $(el).replaceWith("\n")
      })
      
      // Get the text content
      let text = cloned.text()
      
      return text
    }

    let content = ""
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        content = extractTextWithParagraphs(element.clone())
        if (content.trim().length > 100) {
          break
        }
      }
    }

    // Fallback: get body text if no specific content found
    if (!content || content.trim().length < 100) {
      $("script, style, nav, header, footer, aside, .ad, .advertisement").remove()
      content = extractTextWithParagraphs($("body").clone())
    }

    // Clean up content while preserving paragraph structure
    // First, normalize different line break formats to \n
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    
    // Clean up spaces/tabs within lines (but preserve newlines)
    // Process line by line to preserve structure
    const lines = content.split("\n")
    const processedLines = lines.map(line => line.replace(/[ \t]+/g, " ").trim())
    
    // Rejoin: empty lines indicate paragraph breaks, so convert to double newlines
    // Non-empty consecutive lines should be joined with single newline
    let result = ""
    let prevWasEmpty = false
    
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i]
      const isEmpty = line.length === 0
      
      if (isEmpty) {
        // Empty line = potential paragraph break
        if (!prevWasEmpty && result) {
          result += "\n\n"
        }
        prevWasEmpty = true
      } else {
        // Non-empty line
        if (result && !prevWasEmpty) {
          // Previous line was also non-empty, add single newline
          result += "\n"
        }
        result += line
        prevWasEmpty = false
      }
    }
    
    // Normalize multiple consecutive newlines to double newlines (max 2)
    result = result.replace(/\n{3,}/g, "\n\n")
    
    // Final trim
    content = result.trim()

    console.log("[SCRAPER] Content extracted. Length:", content.length, "Title:", title)

    if (!content || content.length < 50) {
      console.error("[SCRAPER] Content too short:", content.length)
      throw new Error(
        "Could not extract meaningful content from the URL. The page structure may not be supported, or the content may be loaded dynamically via JavaScript."
      )
    }

    // Check if content is Simplified Chinese and convert to Traditional
    const isSimplified = isSimplifiedChinese(content)
    if (isSimplified) {
      console.log("[SCRAPER] Detected Simplified Chinese, converting to Traditional...")
      content = convertToTraditional(content)
      title = convertToTraditional(title)
      console.log("[SCRAPER] Conversion to Traditional Chinese completed")
    } else {
      console.log("[SCRAPER] Content is not Simplified Chinese, skipping conversion")
    }

    console.log("[SCRAPER] Scraping successful!")
    return {
      title: title.replace(/\.txt$|\.md$/i, ""),
      content,
    }
  } catch (error) {
    console.error("[SCRAPER] Error in scrapeNovel:", error)
    if (error instanceof Error) {
      // Re-throw with the original error message
      throw error
    }
    throw new Error("Failed to scrape novel from URL. Please try again or use a different URL.")
  }
}

