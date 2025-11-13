export async function addLocationType({ name }: {
  name: string;
}) {
  const url = `${import.meta.env.VITE_NMS_HOST}/locations/types`;
  
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };
  const payload = {
    name
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to add location type: ${response.statusText}`);
  }
  return await response.json();
}
