export async function addLocation({
  area,
  lat,
  lng,
  locationType,
  name,
  project,
  statusI,
  statusReason,
  workerId,

  
}: {
  name: string;
  locationType: string;
  parentLocation?: string;
  area: string;
  lat:number;
  lng:number;
  project:string
  statusI:string
  statusReason:string
  workerId:string

}) {
  const url = `${import.meta.env.VITE_NMS_HOST}/locations`;
  const payload = {
    name,
    locationType,
    area,
    lat,
    lng,
    project,
    statusI,
    statusReason,
    workerId
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
export async function getLocationTypes(): Promise<{ id: number; name: string }[]> {
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

  // return both id and name
  return locationTypeOptions.map((item: any) => ({
    id: item.id,
    name: item.name,
  }));
}


function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}
