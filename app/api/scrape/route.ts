import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { scrapeNovel } from "@/lib/scraper"
import { uploadNovelToDrive } from "@/lib/google-drive"

// Ensure this runs on Node.js runtime (not Edge)
export const runtime = "nodejs"
export const maxDuration = 300 // 300 seconds (5 minutes) max duration for large page scraping

export async function POST(request: NextRequest) {
  let requestedPageCount = 0 // Store pageCount for error messages
  try {
    console.log("[SCRAPE] Starting scrape request...")
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      console.error("[SCRAPE] No session or access token")
      return NextResponse.json(
        { error: "Unauthorized. Please sign in with Google." },
        { status: 401 }
      )
    }

    console.log("[SCRAPE] Session found, parsing body...")
    const body = await request.json()
    const { url, category, rating, pageCount } = body
    requestedPageCount = pageCount && typeof pageCount === "number" ? pageCount : 0
    
    // Normalize category to array format
    let normalizedCategory: string[] = []
    if (Array.isArray(category)) {
      normalizedCategory = category.filter(c => c && c.trim())
    } else if (typeof category === "string" && category.trim()) {
      normalizedCategory = category.includes(",") 
        ? category.split(",").map(c => c.trim()).filter(c => c)
        : [category.trim()]
    }
    // Allow empty array - no default category

    console.log("[SCRAPE] URL received:", url)

    if (!url || typeof url !== "string") {
      console.error("[SCRAPE] Invalid URL:", url)
      return NextResponse.json(
        { error: "Valid URL is required" },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (urlError) {
      console.error("[SCRAPE] URL validation failed:", urlError)
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      )
    }

    console.log("[SCRAPE] Starting to scrape novel from URL...")
    // Parse pageCount if provided
    const maxPages = pageCount && typeof pageCount === "number" && pageCount > 0 
      ? Math.min(pageCount, 500) // Cap at 500 pages for safety
      : undefined
    if (maxPages) {
      console.log(`[SCRAPE] Will scrape up to ${maxPages} pages`)
    }
    // Scrape the novel
    const scraped = await scrapeNovel(url, maxPages)
    console.log("[SCRAPE] Novel scraped successfully. Title:", scraped.title, "Content length:", scraped.content.length)

    console.log("[SCRAPE] Uploading to Google Drive...")
    // Upload to Google Drive
    let fileId: string
    try {
      fileId = await uploadNovelToDrive(
        session.accessToken,
        scraped.title,
        scraped.content,
        {
          category: normalizedCategory,
          rating: rating || 0,
        }
      )
      console.log("[SCRAPE] Upload successful. File ID:", fileId)
    } catch (driveError: any) {
      console.error("[SCRAPE] Google Drive error:", driveError)
      // Re-throw with more context
      if (driveError.message?.includes("Insufficient Permission") || driveError.message?.includes("403")) {
        throw new Error(
          "Google Drive permission denied. Please sign out and sign in again, making sure to grant access to Google Drive when prompted."
        )
      }
      throw driveError
    }

    return NextResponse.json({
      success: true,
      fileId,
      title: scraped.title,
    })
  } catch (error) {
    console.error("[SCRAPE] Error occurred:", error)
    console.error("[SCRAPE] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[SCRAPE] Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("[SCRAPE] Error message:", error instanceof Error ? error.message : String(error))
    
    // Provide more specific error messages
    let errorMessage = "Failed to scrape and save novel"
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Handle specific error types
      if (error.message.includes("timeout") || error.message.includes("timed out") || error.message.includes("Function execution exceeded")) {
        const timeoutHint = requestedPageCount > 10 
          ? "爬取大量頁數需要更長時間。如果使用 Vercel Free Tier，API route 最多只有 10 秒 timeout。建議：1) 先試下爬取較少頁數（10-20 頁）測試功能，2) 或者升級到 Vercel Pro plan 來支援更長 timeout。"
          : "The request timed out. Please try again or check if the URL is accessible."
        errorMessage = `Request timed out. ${timeoutHint}`
      } else if (error.message.includes("Network error") || error.message.includes("fetch")) {
        const networkHint = requestedPageCount > 10
          ? "Network error. 如果爬取大量頁數，可能是 timeout 問題。建議先試下爬取較少頁數測試。"
          : "Network error. Please check your connection and try again."
        errorMessage = networkHint
      } else if (error.message.includes("Unauthorized") || error.message.includes("401")) {
        errorMessage = "Authentication error. Please sign in again."
      } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
        errorMessage = "Access forbidden. The website may be blocking automated requests."
      } else if (error.message.includes("404") || error.message.includes("Not Found")) {
        errorMessage = "Page not found. Please check the URL and try again."
      } else if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
        errorMessage = "DNS error. The website domain could not be found. Please check the URL."
      } else if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "Connection refused. The website may be down or blocking requests."
      } else if (error.message.includes("ETIMEDOUT") || error.message.includes("timeout")) {
        errorMessage = "Connection timeout. The website took too long to respond."
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

