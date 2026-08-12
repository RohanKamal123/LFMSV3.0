import { createContext, useContext, useState, useEffect } from 'react';
import { authFetch } from '../api_config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Re-validate against the backend on every load - a token
                    // surviving in localStorage doesn't mean it's still valid
                    // (expired, or the account no longer exists).
                    const res = await authFetch('/api/auth/me');
                    if (res.ok) {
                        const validatedUser = await res.json();
                        setUser(validatedUser);
                        localStorage.setItem('user', JSON.stringify(validatedUser));
                    } else {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                } catch (error) {
                    // Network error - fall back to the last known user rather
                    // than forcing a logout, but keep the token as-is.
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) setUser(JSON.parse(storedUser));
                }
            }
            setLoading(false);
        };
        validateSession();
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
