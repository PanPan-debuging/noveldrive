import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { updateNovelMetadata } from "@/lib/google-drive"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in with Google." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { rating, category } = body

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

    await updateNovelMetadata(session.accessToken, params.id, {
      rating: rating !== undefined ? parseInt(rating) : undefined,
      category: normalizedCategory,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update metadata error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update novel metadata",
      },
      { status: 500 }
    )
  }
}

