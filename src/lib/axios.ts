// src/lib/axios.ts
import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import { refreshAccessToken } from "@/api/authApi";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // Send cookies (refresh token)
});

// --- Interceptor to add token to protected routes ---
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  const isProtected = config.url?.startsWith("/my");

  if (token && isProtected) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// --- Refresh token logic for 401 responses ---
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers["Authorization"] = "Bearer " + token;
              resolve(api(originalRequest));
            },
            reject: (err: any) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await refreshAccessToken();
        const token = data.accessToken;

        useAuthStore.getState().setAccessToken(token);
        processQueue(null, token);

        originalRequest.headers["Authorization"] = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().setAccessToken(null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
