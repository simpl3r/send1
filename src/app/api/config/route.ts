import { NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET() {
  const notificationApiKey = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS'
  const searchApiKey = process.env.NEYNAR_SEARCH_API_KEY || 'NEYNAR_API_DOCS'

  const body = {
    NEYNAR_API_KEY: notificationApiKey,
    NEYNAR_SEARCH_API_KEY: searchApiKey,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }

  return NextResponse.json(body, { headers: corsHeaders })
}