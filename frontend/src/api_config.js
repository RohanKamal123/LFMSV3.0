// Use environment variable in production, fallback to local
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
