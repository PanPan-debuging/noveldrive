# NovelDrive Project Structure

## Overview
This document outlines the complete project structure for NovelDrive, a web application that scrapes novels from URLs and saves them to Google Drive.

## Directory Structure

```
noveldrive/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/   # NextAuth.js configuration
│   │   │       └── route.ts
│   │   ├── scrape/              # Novel scraping endpoint
│   │   │   └── route.ts
│   │   └── novels/              # Novel management endpoints
│   │       ├── route.ts         # List all novels
│   │       └── [id]/
│   │           ├── route.ts     # Get novel content
│   │           └── metadata/
│   │               └── route.ts # Update novel metadata
│   ├── reader/                  # Reader interface
│   │   └── [id]/
│   │       └── page.tsx         # Reader page component
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Main dashboard/home page
│   ├── providers.tsx            # Session provider wrapper
│   └── globals.css              # Global styles with pastel theme
│
├── components/                   # React components
│   ├── ui/                      # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── toaster.tsx
│   ├── novel-library.tsx        # Library listing component
│   ├── novel-scraper.tsx        # URL scraper input component
│   └── novel-metadata-editor.tsx # Metadata editor component
│
├── lib/                          # Utility libraries
│   ├── google-drive.ts          # Google Drive API functions
│   ├── scraper.ts               # Web scraping logic
│   └── utils.ts                 # General utilities (cn function)
│
├── hooks/                        # Custom React hooks
│   └── use-toast.ts             # Toast notification hook
│
├── types/                        # TypeScript type definitions
│   └── next-auth.d.ts           # NextAuth type extensions
│
├── .env.example                  # Environment variables template
├── .gitignore                   # Git ignore rules
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── README.md                   # Project documentation
└── PROJECT_STRUCTURE.md        # This file
```

## Key Files Explained

### Authentication (`app/api/auth/[...nextauth]/route.ts`)
- Configures NextAuth.js with Google Provider
- Requests Google Drive API scope (`drive.file`)
- Stores access token in session for API calls

### Scraping (`app/api/scrape/route.ts`)
- Accepts URL, category, and rating
- Calls scraper utility to extract content
- Uploads to Google Drive via Drive API

### Google Drive Integration (`lib/google-drive.ts`)
- `getOrCreateLibraryFolder()`: Ensures "NovelDrive_Library" folder exists
- `uploadNovelToDrive()`: Saves novel with metadata
- `listNovelsFromDrive()`: Retrieves all novels from folder
- `getNovelContent()`: Fetches novel text content
- `updateNovelMetadata()`: Updates rating and category

### Web Scraping (`lib/scraper.ts`)
- Uses Cheerio to parse HTML
- Removes ads, navigation, and other non-content elements
- Extracts title and main text content
- Handles various website structures

### Frontend Components
- **NovelScraper**: Input form for URL scraping
- **NovelLibrary**: Grid display with filtering and sorting
- **NovelMetadataEditor**: Edit rating and category
- **Reader Page**: Full-screen reading interface

## Data Flow

1. **Scraping Flow**:
   User enters URL → API scrapes content → Uploads to Drive → Returns file ID

2. **Library Flow**:
   User views dashboard → API lists Drive files → Display in grid → Filter/sort

3. **Reading Flow**:
   User clicks novel → API fetches content → Display in reader → Update metadata

## Environment Variables

Required in `.env.local`:
- `NEXTAUTH_URL`: Application URL (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET`: Random secret for session encryption
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret

## Styling

- Uses Tailwind CSS with custom pastel color palette
- Shadcn UI components for consistent design
- Mobile-responsive with Tailwind breakpoints
- Soft gradient backgrounds (purple → pink → blue)

## API Endpoints

- `POST /api/scrape` - Scrape and save novel
- `GET /api/novels` - List all novels
- `GET /api/novels/[id]` - Get novel content
- `PATCH /api/novels/[id]/metadata` - Update metadata

