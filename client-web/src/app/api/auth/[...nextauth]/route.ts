import NextAuth, { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import axios from 'axios'
import { cookies } from 'next/headers'

export const authOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt'
    },
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
        })
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async signIn({ user }) {
            try {
                const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/register-account`, {
                    userName: user?.name,
                    userEmail: user?.email,
                    registrationType: 'google'
                })

                // Set cookies using the cookies() function from next/headers
                cookies().set('userPrivateToken', resp.data.userPrivateToken, {
                    maxAge: 60 * 60 * 24, // 24 hours
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                })
                cookies().set('userPublicToken', resp.data.userPublicToken, {
                    maxAge: 60 * 60 * 24, // 24 hours
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                })

                return true
            } catch (error) {
                console.error('Error during sign-in: ', error)
                return false // Sign-in failed
            }
        }
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
