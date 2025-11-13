// src/components/devices/edit-device-form.ts

export async function editDevice({ id }: { id: number }) {
  const url = `${import.meta.env.VITE_NMS_HOST}/devices/${id}`;

  const getCookie = (cookieName: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  };

  const token = getCookie("token");

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to edit device: ${response.statusText}`);
  }

  return await response.json();
}
