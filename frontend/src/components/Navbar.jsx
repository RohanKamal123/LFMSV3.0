import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import uiuLogo from '../assets/uiu_logo.png';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Role-based Navigation Logic
    const getNavItems = () => {
        if (!user) return [];

        const baseItems = [{ name: 'Browse Feed', path: '/browse' }];

        if (user.role === 'STUDENT') {
            return [
                { name: 'Dashboard', path: '/dashboard' },
                ...baseItems,
                { name: 'Fast ID', path: '/fast-id' },
                { name: 'Report Found', path: '/found' },
                { name: 'Report Lost', path: '/report-lost' },
                { name: 'Claim Item', path: '/claim' },
            ];
        }

        if (user.role === 'STAFF') {
            return [
                ...baseItems,
                { name: 'Staff Panel', path: '/staff' },
            ];
        }

        if (user.role === 'ADMIN') {
            return [
                ...baseItems,
                { name: 'Dashboard', path: '/admin' },
                { name: 'Staff Panel', path: '/staff' },
            ];
        }

        return baseItems;
    };

    const navItems = getNavItems();

    return (
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50 font-inter">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/browse" className="flex items-center gap-4 group">
                        <img src={uiuLogo} alt="UIU Logo" className="h-10 object-contain group-hover:scale-105 transition-transform" />
                        <div className="hidden sm:block border-l-2 border-gray-100 pl-4">
                            <h1 className="text-xl font-black text-gray-900 leading-none">Find-X</h1>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">UIU System</p>
                        </div>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`text-sm font-bold tracking-tight transition-all hover:text-primary ${location.pathname === item.path ? 'text-primary' : 'text-gray-500'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}

                        {user && (
                            <div className="flex items-center gap-4 pl-4 border-l ml-4 uppercase">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-900">{user.name}</p>
                                    <p className="text-[8px] font-bold text-primary">{user.role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        {user && <span className="text-[10px] font-black text-primary border border-primary/20 px-2 py-1 rounded">{user.role}</span>}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 text-gray-600 hover:text-primary focus:outline-none bg-gray-50 rounded-lg"
                        >
                            {isOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t p-4 space-y-4 shadow-xl">
                    <div className="space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`block px-4 py-3 rounded-xl text-md font-bold ${location.pathname === item.path
                                    ? 'bg-primary text-white shadow-lg shadow-orange-500/30'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                    <div className="pt-4 border-t flex justify-between items-center text-gray-900">
                        <div className="flex items-center gap-2">
                            <UserCircle size={20} className="text-primary" />
                            <span className="text-sm font-bold">{user?.name}</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-1 text-sm font-bold text-red-500">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
