import NextAuth, { NextAuthConfig, User, Account, Profile, Session } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import { JWT } from 'next-auth/jwt'
import axios from 'axios'

const config: NextAuthConfig = {
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60
    },
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
        })
    ],
    secret: process.env.ACCOUNT_SECRET,
    callbacks: {
        async jwt({ token, user, account }): Promise<JWT> {
            if (account && user) {
                token.accessToken = account.access_token
                token.userId = user.id
            }
            return token
        },
        async session({ session, token }): Promise<Session> {
            return {
                ...session,
                accessToken: token.accessToken,
                userId: token.userId
            }
        },
        async signIn({ user, account, profile }): Promise<boolean> {
            try {
                if (!account) {
                    throw new Error('Account is null')
                }

                const token = await config.callbacks?.jwt?.({ token: {}, user, account, profile })

                if (!token || !token.accessToken) {
                    throw new Error('Failed to generate token')
                }

                const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/register-account`, {
                    userName: user.name,
                    userEmail: user.email,
                    registrationType: account.provider,
                    userSessionToken: token.accessToken
                })

                return true
            } catch (error) {
                console.error('Error during sign-in', error)
                return false
            }
        }
    }
}

export const { auth, handlers, signIn, signOut } = NextAuth(config)
