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

/**
 * Helper function to extract text while preserving paragraph structure
 */
function extractTextWithParagraphs($: ReturnType<typeof cheerio.load>, element: cheerio.Cheerio): string {
  // Clone to avoid modifying the original
  const cloned = element.clone()
  
  // Replace <br> tags with newlines first
  cloned.find("br").replaceWith("\n")
  
  // Get the text content - cheerio will naturally preserve some structure
  let text = cloned.text()
  
  // Add extra newlines between block elements by processing the text
  // This is simpler and more reliable than manipulating DOM
  text = text.replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
  
  return text
}

/**
 * Cleans up content while preserving paragraph structure
 */
function cleanContent(content: string): string {
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
  return result.trim()
}

/**
 * Fetches HTML from a URL
 */
async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log("[SCRAPER] Request timeout triggered")
    controller.abort()
  }, 30000) // 30 second timeout

  let response: Response
  try {
    console.log("[SCRAPER] Making fetch request to:", url)
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

  return html
}

/**
 * Extracts content and title from a single page
 */
function extractPageContent($: ReturnType<typeof cheerio.load>): { title: string; content: string } {
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

  let content = ""
  for (const selector of contentSelectors) {
    const element = $(selector).first()
    if (element.length > 0) {
      content = extractTextWithParagraphs($, element.clone())
      if (content.trim().length > 100) {
        break
      }
    }
  }

  // Fallback: get body text if no specific content found
  if (!content || content.trim().length < 100) {
    $("script, style, nav, header, footer, aside, .ad, .advertisement").remove()
    content = extractTextWithParagraphs($, $("body").clone())
  }

  // Clean up content
  content = cleanContent(content)

  return { title, content }
}

/**
 * Finds the "next page" link from the HTML
 * Returns the absolute URL of the next page, or null if not found
 */
function findNextPageLink($: ReturnType<typeof cheerio.load>, currentUrl: string): string | null {
  // Common selectors for "next page" links
  // Try various patterns that Chinese novel sites commonly use
  const nextPageSelectors = [
    // Direct text matches
    'a:contains("下一页")',
    'a:contains("下一頁")',
    'a:contains("Next")',
    'a:contains("next")',
    // Class/ID patterns
    '.next',
    '#next',
    '.next-page',
    '#next-page',
    '.nextPage',
    '#nextPage',
    'a.next',
    'a[class*="next"]',
    'a[id*="next"]',
    // Common pagination patterns
    '.pagination a:last-child',
    '.page-nav a:last-child',
    '.chapter-nav a:last-child',
  ]

  for (const selector of nextPageSelectors) {
    try {
      const nextLink = $(selector).first()
      if (nextLink.length > 0) {
        const href = nextLink.attr("href")
        if (href) {
          // Convert relative URL to absolute URL
          try {
            const absoluteUrl = new URL(href, currentUrl).href
            console.log("[SCRAPER] Found next page link:", absoluteUrl)
            return absoluteUrl
          } catch (urlError) {
            console.log("[SCRAPER] Invalid next page URL:", href)
            continue
          }
        }
      }
    } catch (error) {
      // Some selectors might not be valid, continue to next
      continue
    }
  }

  // Also try to find links with page numbers (e.g., page 2, page 3)
  // This is a fallback for sites that use numbered pagination
  const allLinks = $("a")
  const currentPageNum = extractPageNumber(currentUrl)
  
  if (currentPageNum !== null) {
    const nextPageNum = currentPageNum + 1
    let foundLink: string | null = null
    allLinks.each((_, el) => {
      if (foundLink) return // Already found, skip
      const href = $(el).attr("href")
      if (href) {
        try {
          const linkUrl = new URL(href, currentUrl).href
          const linkPageNum = extractPageNumber(linkUrl)
          if (linkPageNum === nextPageNum) {
            console.log("[SCRAPER] Found next page link by page number:", linkUrl)
            foundLink = linkUrl
            return false // Break the loop
          }
        } catch {
          // Invalid URL, skip
        }
      }
    })
    if (foundLink) {
      return foundLink
    }
    
    // If no link found but we have a page number, try to construct next page URL
    try {
      const nextUrl = constructNextPageUrl(currentUrl, currentPageNum, nextPageNum)
      if (nextUrl) {
        console.log("[SCRAPER] Constructed next page URL:", nextUrl)
        return nextUrl
      }
    } catch (error) {
      console.log("[SCRAPER] Failed to construct next page URL:", error)
    }
  } else {
    // If no page number in current URL, try to construct page 2 URL
    try {
      const nextUrl = constructNextPageUrl(currentUrl, 1, 2)
      if (nextUrl) {
        console.log("[SCRAPER] Constructed page 2 URL:", nextUrl)
        return nextUrl
      }
    } catch (error) {
      console.log("[SCRAPER] Failed to construct page 2 URL:", error)
    }
  }

  return null
}

/**
 * Constructs next page URL based on common URL patterns
 */
function constructNextPageUrl(currentUrl: string, currentPage: number, nextPage: number): string | null {
  try {
    const url = new URL(currentUrl)
    
    // Pattern 1: ?chapterNumber=0 -> ?chapterNumber=1
    if (url.searchParams.has("chapterNumber")) {
      url.searchParams.set("chapterNumber", nextPage.toString())
      return url.href
    }
    
    // Pattern 2: ?page=1 -> ?page=2
    if (url.searchParams.has("page")) {
      url.searchParams.set("page", nextPage.toString())
      return url.href
    }
    
    // Pattern 3: /page/1 -> /page/2
    const pathMatch = url.pathname.match(/\/page[\/_-](\d+)/i)
    if (pathMatch) {
      url.pathname = url.pathname.replace(/\/page[\/_-]\d+/i, `/page/${nextPage}`)
      return url.href
    }
    
    // Pattern 4: /1.html -> /2.html
    const htmlMatch = url.pathname.match(/(\d+)\.html?$/i)
    if (htmlMatch) {
      url.pathname = url.pathname.replace(/\d+\.html?$/i, `${nextPage}.html`)
      return url.href
    }
    
    // Pattern 5: _1.html -> _2.html
    const underscoreMatch = url.pathname.match(/_(\d+)\.html?$/i)
    if (underscoreMatch) {
      url.pathname = url.pathname.replace(/_\d+\.html?$/i, `_${nextPage}.html`)
      return url.href
    }
    
    // Pattern 6: Add ?page=2 if no page parameter exists
    if (currentPage === 1 && !url.searchParams.has("page") && !url.searchParams.has("chapterNumber")) {
      url.searchParams.set("page", nextPage.toString())
      return url.href
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Extracts page number from URL (e.g., page=2, page/2, _2.html, chapterNumber=0)
 */
function extractPageNumber(url: string): number | null {
  const patterns = [
    /[?&]chapterNumber[=_](\d+)/i,
    /[?&]page[=_](\d+)/i,
    /\/page[\/_-](\d+)/i,
    /[_-](\d+)\.html?$/i,
    /\/p(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return null
}

/**
 * Checks if two URLs are likely from the same chapter
 * This helps prevent jumping to a different chapter
 */
function isSameChapter(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1)
    const u2 = new URL(url2)

    // Same domain - required
    if (u1.hostname !== u2.hostname) {
      return false
    }

    // If only difference is page parameter, definitely same chapter
    const path1 = u1.pathname
    const path2 = u2.pathname
    if (path1 === path2) {
      // Same path, check if only page parameter differs
      const page1 = u1.searchParams.get("page")
      const page2 = u2.searchParams.get("page")
      if (page1 !== page2 && (page1 || page2)) {
        // Only page parameter differs, same chapter
        return true
      }
      // Same URL (shouldn't happen but be safe)
      return true
    }

    // Extract chapter identifiers from paths
    // Common patterns: /chapter/1, /ch/1, /chapter1, etc.
    const chapterPattern1 = path1.match(/(?:chapter|ch)[\/_-]?(\d+)/i)
    const chapterPattern2 = path2.match(/(?:chapter|ch)[\/_-]?(\d+)/i)

    if (chapterPattern1 && chapterPattern2) {
      // If both have chapter numbers, they must match
      return chapterPattern1[1] === chapterPattern2[1]
    }

    // If one has chapter number and other doesn't, check if paths are similar
    if ((chapterPattern1 && !chapterPattern2) || (!chapterPattern1 && chapterPattern2)) {
      // Be more lenient - if paths are very similar, allow it
      const basePath1 = path1.replace(/[_-]?\d+\.html?$/i, "").replace(/[?&]page=\d+/i, "")
      const basePath2 = path2.replace(/[_-]?\d+\.html?$/i, "").replace(/[?&]page=\d+/i, "")
      if (basePath1 === basePath2) {
        return true // Same base path, likely same chapter
      }
      return false
    }

    // If no chapter pattern, check if paths are similar
    // Remove page numbers and compare base paths
    const basePath1 = path1.replace(/[_-]?\d+\.html?$/i, "").replace(/[?&]page=\d+/i, "")
    const basePath2 = path2.replace(/[_-]?\d+\.html?$/i, "").replace(/[?&]page=\d+/i, "")

    // If base paths match exactly, same chapter
    if (basePath1 === basePath2) {
      return true
    }

    // If base paths are very different, likely different chapters
    const path1Parts = basePath1.split("/").filter(Boolean)
    const path2Parts = basePath2.split("/").filter(Boolean)
    
    // If path lengths differ significantly, likely different chapters
    if (Math.abs(path1Parts.length - path2Parts.length) > 1) {
      return false
    }

    // Check if most parts match
    const matchingParts = path1Parts.filter((part, i) => 
      path2Parts[i] && (part === path2Parts[i] || part.match(/\d+/) && path2Parts[i].match(/\d+/))
    )
    
    // If less than 50% match, likely different chapters
    if (matchingParts.length < Math.min(path1Parts.length, path2Parts.length) * 0.5) {
      return false
    }

    // Default: assume same chapter if URLs are similar
    return true
  } catch (error) {
    // If URL parsing fails, log but be more lenient
    console.log("[SCRAPER] URL parsing failed in isSameChapter:", error)
    // If both URLs are from same domain (simple check), allow it
    try {
      return new URL(url1).hostname === new URL(url2).hostname
    } catch {
      return false
    }
  }
}

/**
 * Sleep/delay function to avoid being blocked
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function scrapeNovel(url: string, maxPages?: number): Promise<ScrapedNovel> {
  try {
    console.log("[SCRAPER] Starting to scrape novel from URL:", url)
    
    // If maxPages is not provided or is 0, only scrape the first page
    if (!maxPages || maxPages <= 0) {
      console.log("[SCRAPER] Single page mode - scraping only the first page")
      const html = await fetchHtml(url)
      const $ = cheerio.load(html)
      const pageData = extractPageContent($)
      
      if (!pageData.content || pageData.content.length < 50) {
        throw new Error(
          "Could not extract meaningful content from the URL. The page structure may not be supported, or the content may be loaded dynamically via JavaScript."
        )
      }
      
      // Check if content is Simplified Chinese and convert to Traditional
      const isSimplified = isSimplifiedChinese(pageData.content)
      let finalContent = pageData.content
      let finalTitle = pageData.title
      
      if (isSimplified) {
        console.log("[SCRAPER] Detected Simplified Chinese, converting to Traditional...")
        finalContent = convertToTraditional(pageData.content)
        finalTitle = convertToTraditional(pageData.title)
        console.log("[SCRAPER] Conversion to Traditional Chinese completed")
      }
      
      return {
        title: finalTitle.replace(/\.txt$|\.md$/i, ""),
        content: finalContent,
      }
    }
    
    // Multi-page mode
    console.log(`[SCRAPER] Multi-page mode - will scrape up to ${maxPages} pages`)
    let currentUrl: string | null = url
    let fullContent = ""
    let title = ""
    let visitedUrls = new Set<string>() // Prevent infinite loops
    let pageCount = 0
    const baseUrl = url

    // Loop through pages until maxPages is reached or no more "next page" links are found
    while (currentUrl && !visitedUrls.has(currentUrl) && pageCount < maxPages) {
      pageCount++
      visitedUrls.add(currentUrl)
      
      console.log(`[SCRAPER] Scraping page ${pageCount}: ${currentUrl}`)

      try {
        // Fetch HTML
        const html = await fetchHtml(currentUrl)
        
        // Parse with Cheerio
        const $ = cheerio.load(html)
        
        // Extract content from current page
        const pageData = extractPageContent($)
        
        // Use title from first page only
        if (!title && pageData.title) {
          title = pageData.title
        }
        
        // Append content (add separator between pages)
        if (pageData.content && pageData.content.trim().length > 50) {
          if (fullContent) {
            fullContent += "\n\n---\n\n" // Page separator
          }
          fullContent += pageData.content
          console.log(`[SCRAPER] Page ${pageCount} content extracted. Length: ${pageData.content.length}`)
        } else {
          console.log(`[SCRAPER] Page ${pageCount} content too short, skipping`)
        }

        // Find next page link
        let nextPageUrl = findNextPageLink($, currentUrl)
        let isConstructedUrl = false
        
        // If no link found, try to construct next page URL
        if (!nextPageUrl && pageCount < maxPages) {
          const currentPageNum = extractPageNumber(currentUrl)
          if (currentPageNum !== null) {
            const nextPageNum = currentPageNum + 1
            nextPageUrl = constructNextPageUrl(currentUrl, currentPageNum, nextPageNum)
            if (nextPageUrl) {
              isConstructedUrl = true
              console.log("[SCRAPER] Constructed next page URL as fallback:", nextPageUrl)
            }
          } else if (pageCount === 1) {
            // If first page and no page number, try to construct page 2
            nextPageUrl = constructNextPageUrl(currentUrl, 1, 2)
            if (nextPageUrl) {
              isConstructedUrl = true
              console.log("[SCRAPER] Constructed page 2 URL as fallback:", nextPageUrl)
            }
          }
        }
        
        // For constructed URLs, be more lenient with chapter checking
        const shouldContinue = nextPageUrl && (
          isConstructedUrl || isSameChapter(baseUrl, nextPageUrl)
        )
        
        if (shouldContinue) {
          // Check if we've already visited this URL
          if (visitedUrls.has(nextPageUrl)) {
            console.log("[SCRAPER] Next page URL already visited, stopping")
            currentUrl = null
          } else {
            currentUrl = nextPageUrl
            // Add delay between requests to avoid being blocked
            await delay(1000) // 1 second delay
          }
        } else {
          if (nextPageUrl && !isConstructedUrl) {
            console.log("[SCRAPER] Next page link found but appears to be a different chapter, stopping")
          } else if (!nextPageUrl) {
            console.log("[SCRAPER] No next page link found and cannot construct next URL, stopping")
          }
          currentUrl = null
        }
      } catch (pageError) {
        console.error(`[SCRAPER] Error scraping page ${pageCount}:`, pageError)
        // If we have some content, continue with what we have
        if (fullContent && fullContent.length > 100) {
          console.log("[SCRAPER] Continuing with partial content...")
          break
        }
        // Otherwise, throw the error
        throw pageError
      }
    }

    if (pageCount >= maxPages) {
      console.log(`[SCRAPER] Reached maximum page limit (${maxPages}), stopping`)
    }

    console.log(`[SCRAPER] Finished scraping. Total pages: ${pageCount}, Total content length: ${fullContent.length}`)

    if (!fullContent || fullContent.length < 50) {
      console.error("[SCRAPER] Content too short:", fullContent.length)
      throw new Error(
        "Could not extract meaningful content from the URL. The page structure may not be supported, or the content may be loaded dynamically via JavaScript."
      )
    }

    // Check if content is Simplified Chinese and convert to Traditional
    const isSimplified = isSimplifiedChinese(fullContent)
    if (isSimplified) {
      console.log("[SCRAPER] Detected Simplified Chinese, converting to Traditional...")
      fullContent = convertToTraditional(fullContent)
      title = convertToTraditional(title)
      console.log("[SCRAPER] Conversion to Traditional Chinese completed")
    } else {
      console.log("[SCRAPER] Content is not Simplified Chinese, skipping conversion")
    }

    console.log("[SCRAPER] Scraping successful!")
    return {
      title: title.replace(/\.txt$|\.md$/i, ""),
      content: fullContent,
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

