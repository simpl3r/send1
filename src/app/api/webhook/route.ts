import { NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { untrustedData, trustedData } = await req.json().catch(() => ({}))

  const frameUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return NextResponse.json({ type: 'frame', frameUrl }, { headers: corsHeaders })
}

export function GET() {
  return NextResponse.json({ ok: true }, { headers: corsHeaders })
}