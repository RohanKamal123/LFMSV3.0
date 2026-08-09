import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../api_config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    // Validate user exists in backend
                    const res = await fetch(`${API_BASE_URL}/api/auth/me/${userData.id}`);
                    if (res.ok) {
                        const validatedUser = await res.json();
                        setUser(validatedUser);
                        localStorage.setItem('user', JSON.stringify(validatedUser));
                    } else {
                        // Invalid session - clear it
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                } catch (error) {
                    // On error, keep stored user but don't validate
                    setUser(JSON.parse(storedUser));
                }
            }
            setLoading(false);
        };
        validateSession();
    }, []);

    const login = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
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
