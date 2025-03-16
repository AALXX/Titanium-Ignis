import { auth } from '@/features/auth/auth'

const checkAccountStatus = async () => {
    try {
        const session = await auth()

        if (session && session.user) {
            // User is logged in
            return {
                isLoggedIn: true,
                user: session.user,
                // Include any other session information you need
                accessToken: session.accessToken
            }
        } else {
            // User is not logged in
            return { isLoggedIn: false }
        }
    } catch (error) {
        console.error('Error checking account status:', error)
        return { isLoggedIn: false, error: 'Failed to check account status' }
    }
}

export { checkAccountStatus }
