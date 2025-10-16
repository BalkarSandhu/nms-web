import { NextResponse } from 'next/server';

// This is a map of location IDs to their names
const locationMapping: Record<string, string> = {
  "0": "ABC",
  "2": "East Wing",
  "3": "Bastacolla Area Checkpost",
  "4": "Bastacolla Area Checkpost 1",
  "5": "Lodna Area Checkpost 1",
};

export async function GET() {
  try {
    return NextResponse.json(locationMapping);
  } catch (error) {
    console.error('Error fetching location mapping:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location mapping' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { locationId, name } = body;
    
    if (!locationId || !name) {
      return NextResponse.json(
        { error: 'Location ID and name are required' },
        { status: 400 }
      );
    }

    // Update the mapping
    locationMapping[locationId] = name;
    
    return NextResponse.json({ success: true, locationMapping });
  } catch (error) {
    console.error('Error updating location mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update location mapping' },
      { status: 500 }
    );
  }
}