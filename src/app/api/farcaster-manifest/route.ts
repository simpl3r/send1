import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.redirect(
    'https://api.farcaster.xyz/miniapps/hosted-manifest/0198e42f-9f8f-7389-e85a-b6adc5cec69d',
    307
  )
}

export function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}