import { getAuthToken } from "./auth";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(options.headers || {}),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || "Request failed";
    throw new Error(message);
  }

  return data;
}

export { API_BASE_URL };
