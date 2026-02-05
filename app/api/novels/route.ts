import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { listNovelsFromDrive } from "@/lib/google-drive"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in with Google." },
        { status: 401 }
      )
    }

    const novels = await listNovelsFromDrive(session.accessToken)

    const formattedNovels = novels.map((file: any) => {
      let metadata = { rating: 0, category: [] }
      try {
        if (file.description) {
          metadata = JSON.parse(file.description)
        }
      } catch {
        // Use appProperties as fallback
        if (file.appProperties) {
          const categoryFromProps = file.appProperties.category || ""
          metadata = {
            rating: parseInt(file.appProperties.rating || "0"),
            category: categoryFromProps,
          }
        }
      }

      // Normalize category: convert string to array, or keep array as is
      let category: string[] = []
      if (metadata.category) {
        if (typeof metadata.category === "string") {
          // Check if it's a comma-separated string (from old format)
          category = metadata.category.includes(",") 
            ? metadata.category.split(",").map(c => c.trim()).filter(c => c)
            : (metadata.category.trim() ? [metadata.category.trim()] : [])
        } else if (Array.isArray(metadata.category)) {
          category = metadata.category.filter(c => c && c.trim())
        }
      }

      return {
        id: file.id,
        name: file.name?.replace(/\.txt$|\.md$/i, "") || "Untitled",
        rating: metadata.rating || 0,
        category: category,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      }
    })

    return NextResponse.json({ novels: formattedNovels })
  } catch (error) {
    console.error("List novels error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch novels",
      },
      { status: 500 }
    )
  }
}

