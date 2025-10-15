import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const response = await fetch(``)
    if (!response.ok) {
      throw new Error('Failed to fetch device info')
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching device info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch device info' },
      { status: 500 }
    )
  }
}