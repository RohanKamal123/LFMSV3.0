// Use environment variable in production, fallback to local
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// fetch() wrapper that attaches the signed-in user's JWT as a Bearer token.
// Use this instead of raw fetch() for any endpoint that requires
// authentication - the token is never something callers need to read or
// pass around manually.
export const authFetch = (path, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
};
