import * as React from "react";

export type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
};

export const Toast: React.FC<ToastProps> = ({ message, type = "info" }) => {
  if (!message) return null;
  let bg = "bg-blue-500";
  if (type === "error") bg = "bg-red-500";
  if (type === "success") bg = "bg-green-500";

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded text-white shadow-lg z-50 ${bg}`}
      role="alert"
    >
      {message}
    </div>
  );
};
