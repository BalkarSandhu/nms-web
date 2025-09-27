import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('http://192.168.29.213:8000/api/v1/devices/statistics', {
      headers: {
        'Content-Type': 'application/json',
        
      },
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}