// src/components/locations/edit-location-form.ts

export async function editLocation({
  id,
  field,
  data,
}: {
  id: number;
  field: string;
  data: string;
}) {
  const url = `${import.meta.env.VITE_NMS_HOST}/locations/${id}`;

  const getCookie = (cookieName: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  const token = getCookie("authToken");

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      field,
      data,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to update location");
  }

  return response.json();
}
