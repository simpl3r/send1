import { NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || 'vitalik'
  const apiKey = process.env.NEYNAR_SEARCH_API_KEY || 'NEYNAR_API_DOCS'

  const neynarUrl = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(
    query
  )}&limit=5`

  const resp = await fetch(neynarUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      api_key: apiKey
    }
  })

  if (resp.ok) {
    const data = await resp.json()
    return NextResponse.json(
      {
        success: true,
        query,
        apiKey: apiKey.substring(0, 8) + '...',
        neynarResponse: data,
        timestamp: new Date().toISOString()
      },
      { headers: corsHeaders }
    )
  } else {
    const errorText = await resp.text()
    return NextResponse.json(
      {
        success: false,
        error: 'Neynar API error',
        status: resp.status,
        statusText: resp.statusText,
        errorText,
        query,
        apiKey: apiKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      },
      { status: resp.status, headers: corsHeaders }
    )
  }
}