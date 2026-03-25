import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:3001'

async function proxyRequest(request: NextRequest, params: { proxy: string[] }) {
  const path = params.proxy.join('/')
  const url = `${RELAY_URL}/v1/${path}`

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const headers = new Headers(request.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  headers.delete('cookie')
  headers.delete('host')

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: request.method !== 'GET' ? await request.text() : undefined,
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}
