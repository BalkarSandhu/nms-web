export async function addLocation({ name, locationType, parentLocation, area }: {
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
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to add location: ${response.statusText}`);
  }
  return await response.json();
}
