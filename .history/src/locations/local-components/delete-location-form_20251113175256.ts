// src/components/locations/delete-location.ts

export async function deleteLocation(id: number) {
  const url = `${import.meta.env.VITE_NMS_HOST}/locations/${id}`;

  const getCookie = (cookieName: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  const token = getCookie("token");

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to delete location");
  }

  return response.json();
}
