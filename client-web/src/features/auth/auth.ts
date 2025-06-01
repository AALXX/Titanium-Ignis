import NextAuth, { type NextAuthConfig, type Session } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

import type { JWT } from 'next-auth/jwt'
import axios from 'axios'

//Don't Touch this code it works somehow; I honestly don't know why 
const config: NextAuthConfig = {
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
        }),
        Credentials({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'text' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Missing email or password')
                }

                try {
                    const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/login-account`, {
                        userEmail: credentials.email,
                        password: credentials.password
                    })


                    if (response.data.error) {
                        return null
                    }

                    // Return user object with the custom accessToken
                    return {
                        id: response.data.userId || 'credentials-user',
                        name: response.data.userName,
                        email: response.data.userEmail,
                        image: `${process.env.NEXT_PUBLIC_FILE_SERVER}/accounts/${response.data.userSessionToken}?cache=none`,
                        accessToken: response.data.userSessionToken // Pass the token here
                    }
                } catch (error) {
                    console.error('Login error:', error)
                    return null
                }
            }
        })
    ],

    secret: process.env.ACCOUNT_SECRET,
    callbacks: {
        async jwt({ token, user, account }): Promise<JWT> {
            if (user) {
                // For Credentials provider, user.accessToken contains our custom token
                if (user.accessToken) {
                    token.accessToken = user.accessToken
                }
                // For OAuth providers, use account.access_token
                else if (account?.access_token) {
                    token.accessToken = account.access_token
                }

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
        async signIn({ user, account }): Promise<boolean> {
            try {
                if (!account) {
                    throw new Error('Account is null')
                }

                if (account.provider === 'google') {
                    const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/register-account-google`, {
                        userName: user.name,
                        userEmail: user.email,
                        registrationType: account.provider,
                        userSessionToken: account.access_token
                    })

                    console.log('Google registration response:', resp.data)
                }

                return true
            } catch (error) {
                console.error('Error during sign-in', error)
                return false
            }
        }
    }
}

export const { auth, handlers, signIn, signOut } = NextAuth(config)
