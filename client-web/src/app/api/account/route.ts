import { NextResponse } from 'next/server'
import { auth } from '@/features/auth/auth'
import axios from 'axios'

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ name: '', authenticated: false }, { status: 200 })
        }

        const resp = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/get-account-data/${session.accessToken}`)

        if (resp.data.error) {

            // erase token
            session.accessToken = ''

            return NextResponse.json({ name: '', authenticated: false }, { status: 200 })
        }

        let image = `${process.env.NEXT_PUBLIC_FILE_SERVER}/accounts/no_auth?cache=none`
        // if (resp.data.accountType === 'github') {

        // }

        

        switch (resp.data.accountType) {
            case 'platform':
                image = `${process.env.NEXT_PUBLIC_FILE_SERVER}/accounts/${session.accessToken}?cache=none`
                break
            case 'google':
                image = `${session.user?.image}`
                break
            default:
                image = `${process.env.NEXT_PUBLIC_FILE_SERVER}/accounts/no_auth?cache=none`
                break
        }

        return NextResponse.json({
            name: resp.data.username,
            accountType: resp.data.accountType,
            authenticated: true,
            image: image
        })
    } catch (error) {
        console.error('Account API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
