import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { getNovelContent, deleteNovelFromDrive } from "@/lib/google-drive"

export async function GET(
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

    const content = await getNovelContent(session.accessToken, params.id)

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Get novel content error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch novel content",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    await deleteNovelFromDrive(session.accessToken, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete novel error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete novel",
      },
      { status: 500 }
    )
  }
}

