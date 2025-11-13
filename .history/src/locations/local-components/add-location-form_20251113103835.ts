export async function addLocation({
  name,
  locationType,
  parentLocation,
  area,
}: {
  name: string;
  locationType: string;
  parentLocation?: string;
  area: string;
}) {
  const url = `${import.meta.env.VITE_NMS_HOST}/devices`;
  const payload = {
    name,
    locationType,
    parentLocation,
    area,
  };

  const token = getCookie("token");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to add location: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * ✅ Function to fetch location type options from backend
 */
export async function getLocationTypes(): Promise<string[]> {
  const url = `${import.meta.env.VITE_NMS_HOST}/locations/types`;

  const token = getCookie("token");

  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch location types: ${response.statusText}`);
  }

  const data = await response.json();

  // assuming API returns: [{ name: "Factory" }, { name: "Warehouse" }]
  return data.map((item: any) => item.name);
}

/**
 * 🔹 Helper to read token from cookies
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}
