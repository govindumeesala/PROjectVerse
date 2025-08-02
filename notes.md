What React Query is great for:
"Server state" management — anything that comes from a backend API.

Fetching projects, users, tasks, etc.

Caching responses

Background updates

Pagination & infinite scroll

Syncing with server data


# Anywhere you call protected routes, use api instead of axios:

// src/api/userApi.ts
import api from "@/lib/axios";

export const getAllUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};
