import axios from "axios";

const API_URL = "https://localhost:3000";

// Autentikacija ide ISKLJUČIVO preko HttpOnly cookie-ja (withCredentials).
// Token se NE čuva u localStorage (zaštita od XSS-a).
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Auto-refresh na 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        return api(originalRequest);
      } catch (refreshError) {
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
