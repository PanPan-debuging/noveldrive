# NovelDrive

A web application that scrapes online novels from URLs and saves them directly to your personal Google Drive.

## Features

- 🔐 Google Authentication with Drive API access
- 📚 Scrape novels from any URL
- 💾 Automatic saving to Google Drive in "NovelDrive_Library" folder
- ⭐ Rate and categorize your novels
- 📖 Clean reading interface
- 🎨 Beautiful pastel UI with Shadcn components
- 📱 Mobile-responsive design

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **Authentication**: NextAuth.js with Google Provider
- **Scraping**: Cheerio for HTML parsing
- **Storage**: Google Drive API

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Drive API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy your Client ID and Client Secret

3. **Configure environment variables**:
   - Copy `.env.example` to `.env.local`
   - Fill in your Google OAuth credentials:
     ```
     NEXTAUTH_URL=http://localhost:3000
     NEXTAUTH_SECRET=generate-a-random-secret-here
     GOOGLE_CLIENT_ID=your-google-client-id
     GOOGLE_CLIENT_SECRET=your-google-client-secret
     ```
   - Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32`

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth configuration
│   │   ├── scrape/route.ts              # Scrape novel endpoint
│   │   └── novels/                      # Novel management endpoints
│   ├── reader/[id]/page.tsx            # Reader interface
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Main dashboard
│   └── globals.css                      # Global styles
├── components/
│   ├── ui/                              # Shadcn UI components
│   ├── novel-library.tsx               # Library listing component
│   ├── novel-scraper.tsx               # Scraper input component
│   └── novel-metadata-editor.tsx       # Metadata editor component
├── lib/
│   ├── google-drive.ts                 # Google Drive API utilities
│   ├── scraper.ts                      # Web scraping logic
│   └── utils.ts                        # Utility functions
└── types/
    └── next-auth.d.ts                  # NextAuth type definitions
```

## Usage

1. **Sign in**: Click "Sign in with Google" and authorize the app to access your Google Drive
2. **Scrape a novel**: Enter a URL, select a category and rating, then click "Scrape & Save"
3. **View your library**: Browse all your saved novels, filter by category, and sort by rating
4. **Read novels**: Click on any novel card to open the reader interface
5. **Update metadata**: Change the category and rating of novels from the reader page

## Troubleshooting

### "Insufficient Permission" Error

If you see an "Insufficient Permission" error when trying to scrape novels:

1. **Sign out and sign back in**: 
   - Click "Sign out" in the app
   - Sign in again with Google
   - **Important**: When Google asks for permissions, make sure to click "Allow" for Google Drive access

2. **Check Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API" and make sure it's **enabled**
   - Go to "APIs & Services" > "Credentials"
   - Check that your OAuth 2.0 Client ID has the correct authorized redirect URIs

3. **Verify OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Make sure the app is published or you're added as a test user
   - For testing, add your email as a test user

4. **Clear browser cache and cookies** for the app domain, then sign in again

## Notes

- The app creates a folder called "NovelDrive_Library" in your Google Drive
- Novel metadata (rating and category) is stored in Google Drive's appProperties
- The scraper attempts to extract main content by removing ads, navigation, and other non-content elements
- Some websites may have anti-scraping measures that prevent content extraction

## License

MIT

