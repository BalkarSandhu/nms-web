export async function addDeviceType({ name }: { name: string }) {
  const url = `${import.meta.env.VITE_NMS_HOST}/devices/types`;

  
  const getCookie = (cookieName: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  
  const token = getCookie("token"); 

  const payload = { name };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }), 
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to add location type: ${response.statusText}`);
  }

  return await response.json();
}
