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
  const url = `${import.meta.env.VITE_NMS_HOST}/locations`;
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

  const locationTypeOptions = await response.json();

  
  return locationTypeOptions.map((item: any) => item.name);
}


function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}
