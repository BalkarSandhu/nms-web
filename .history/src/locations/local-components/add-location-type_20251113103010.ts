export async function addLocationType({ name }: { name: string }) {
  const url = `${import.meta.env.VITE_NMS_HOST}/locations/types`;

  // Helper to get a specific cookie value
  const getCookie = (cookieName: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  // Get auth token from cookie
  const token = getCookie("token"); // Change cookie name if your app uses something else

  const payload = { name };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }), // ✅ Add token header only if exists
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to add location type: ${response.statusText}`);
  }

  return await response.json();
}
