import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
    const cookieStore = cookies()

    cookieStore.delete('userPrivateToken')
    cookieStore.delete('userPublicToken')

    return NextResponse.json({ success: true })
}
