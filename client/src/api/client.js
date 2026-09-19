import axios from "axios";

// In development the API is a separate process on port 5000, and we use the
// page's hostname so a phone on the same wifi reaches the laptop, not itself.
// In production Express serves this bundle, so the API is the same origin.
const baseURL = import.meta.env.DEV
  ? `http://${window.location.hostname}:5000/api`
  : "/api";

const api = axios.create({ baseURL });

// Attach the JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token expires, send the user back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
