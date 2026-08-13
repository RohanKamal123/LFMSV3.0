// Use environment variable in production, fallback to local
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Constant (never regenerated) QR content shown at Room 110 - the same code
// for every staff member and every visitor. A visitor scans this with their
// own camera to check in; it carries no identity itself, so staff still
// confirms who showed up by scanning that visitor's personal identity QR.
export const ROOM_110_QR_VALUE = "FINDX_ROOM110_STAFF";

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
