import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('')

  const cookieStore = await cookies()
  cookieStore.set('csrf_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 3600, // 1 hour
  })

  return NextResponse.json({ csrfToken: token })
}
