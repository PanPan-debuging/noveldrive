import { google } from "googleapis"

export interface NovelMetadata {
  rating?: number
  category?: string | string[]
}

export async function getOrCreateLibraryFolder(accessToken: string): Promise<string> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: "v3", auth })

    // Search for existing folder
    const response = await drive.files.list({
      q: "name='NovelDrive_Library' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name)",
    })

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!
    }

    // Create folder if it doesn't exist
    const folderResponse = await drive.files.create({
      requestBody: {
        name: "NovelDrive_Library",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    })

    return folderResponse.data.id!
  } catch (error: any) {
    console.error("[GOOGLE_DRIVE] Error in getOrCreateLibraryFolder:", error)
    if (error.code === 403 || error.message?.includes("Insufficient Permission")) {
      throw new Error(
        "Insufficient permissions. Please sign out and sign in again to grant Google Drive access. Make sure you approve all requested permissions."
      )
    }
    if (error.code === 401 || error.message?.includes("Invalid Credentials")) {
      throw new Error(
        "Authentication expired. Please sign out and sign in again."
      )
    }
    throw new Error(
      `Failed to access Google Drive: ${error.message || "Unknown error"}`
    )
  }
}

export async function uploadNovelToDrive(
  accessToken: string,
  title: string,
  content: string,
  metadata: NovelMetadata
): Promise<string> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: "v3", auth })

    const folderId = await getOrCreateLibraryFolder(accessToken)

    const categoryValue = Array.isArray(metadata.category) 
      ? (metadata.category.length > 0 ? metadata.category.join(",") : "")
      : (metadata.category || "")
    
    const fileMetadata = {
      name: `${title}.txt`,
      parents: [folderId],
      description: JSON.stringify(metadata),
      appProperties: {
        rating: metadata.rating?.toString() || "0",
        category: categoryValue,
      },
    }

    const media = {
      mimeType: "text/plain",
      body: content,
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name",
    })

    return response.data.id!
  } catch (error: any) {
    console.error("[GOOGLE_DRIVE] Error in uploadNovelToDrive:", error)
    if (error.code === 403 || error.message?.includes("Insufficient Permission")) {
      throw new Error(
        "Insufficient permissions to upload to Google Drive. Please sign out and sign in again, and make sure you grant all requested permissions."
      )
    }
    if (error.code === 401 || error.message?.includes("Invalid Credentials")) {
      throw new Error(
        "Authentication expired. Please sign out and sign in again."
      )
    }
    throw new Error(
      `Failed to upload to Google Drive: ${error.message || "Unknown error"}`
    )
  }
}

export async function listNovelsFromDrive(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const drive = google.drive({ version: "v3", auth })

  const folderId = await getOrCreateLibraryFolder(accessToken)

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, description, appProperties, createdTime, modifiedTime)",
    orderBy: "modifiedTime desc",
  })

  return response.data.files || []
}

export async function getNovelContent(accessToken: string, fileId: string): Promise<string> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const drive = google.drive({ version: "v3", auth })

  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    {
      responseType: "stream",
    }
  )

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    response.data.on("data", (chunk: Buffer) => chunks.push(chunk))
    response.data.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
    response.data.on("error", reject)
  })
}

export async function updateNovelMetadata(
  accessToken: string,
  fileId: string,
  metadata: NovelMetadata
): Promise<void> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const drive = google.drive({ version: "v3", auth })

  const categoryValue = Array.isArray(metadata.category) 
    ? (metadata.category.length > 0 ? metadata.category.join(",") : "")
    : (metadata.category || "")
  
  await drive.files.update({
    fileId,
    requestBody: {
      description: JSON.stringify(metadata),
      appProperties: {
        rating: metadata.rating?.toString() || "0",
        category: categoryValue,
      },
    },
  })
}

export async function updateNovelContent(
  accessToken: string,
  fileId: string,
  content: string
): Promise<void> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: "v3", auth })

    await drive.files.update({
      fileId,
      media: {
        mimeType: "text/plain",
        body: content,
      },
    })
  } catch (error: any) {
    console.error("[GOOGLE_DRIVE] Error in updateNovelContent:", error)
    if (error.code === 403 || error.message?.includes("Insufficient Permission")) {
      throw new Error(
        "Insufficient permissions to update novel content. Please sign out and sign in again, and make sure you grant all requested permissions."
      )
    }
    if (error.code === 401 || error.message?.includes("Invalid Credentials")) {
      throw new Error(
        "Authentication expired. Please sign out and sign in again."
      )
    }
    throw new Error(
      `Failed to update novel content: ${error.message || "Unknown error"}`
    )
  }
}

export async function deleteNovelFromDrive(
  accessToken: string,
  fileId: string
): Promise<void> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: "v3", auth })

    await drive.files.delete({
      fileId,
    })
  } catch (error: any) {
    console.error("[GOOGLE_DRIVE] Error in deleteNovelFromDrive:", error)
    if (error.code === 403 || error.message?.includes("Insufficient Permission")) {
      throw new Error(
        "Insufficient permissions to delete from Google Drive. Please sign out and sign in again, and make sure you grant all requested permissions."
      )
    }
    if (error.code === 401 || error.message?.includes("Invalid Credentials")) {
      throw new Error(
        "Authentication expired. Please sign out and sign in again."
      )
    }
    throw new Error(
      `Failed to delete from Google Drive: ${error.message || "Unknown error"}`
    )
  }
}

