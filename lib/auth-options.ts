import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Refresh token if it's about to expire (within 5 minutes)
      if (
        token.expiresAt &&
        Date.now() >= (token.expiresAt as number) * 1000 - 5 * 60 * 1000
      ) {
        if (token.refreshToken) {
          try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: token.refreshToken as string,
                grant_type: "refresh_token",
              }),
            })

            const data = await response.json()
            if (response.ok && data.access_token) {
              token.accessToken = data.access_token
              token.expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600)
            }
          } catch (error) {
            console.error("Token refresh error:", error)
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        session.expiresAt = token.expiresAt as number
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
}


