import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, UserCircle, LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import uiuLogo from '../assets/uiu_logo.png';
import TicketModal from './TicketModal';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [ticketModalOpen, setTicketModalOpen] = useState(false);
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

        const baseItems = [{ name: 'Browse Items', path: '/browse' }];

        if (user.role === 'STUDENT') {
            return [
                { name: 'Hub Overview', path: '/dashboard' },
                ...baseItems,
                { name: 'Fast ID', path: '/fast-id' },
                { name: 'Visual Search', path: '/visual-search' },
                { name: 'Report Found', path: '/found' },
                { name: 'Report Lost', path: '/report-lost' },
                { name: 'My Claims', path: '/dashboard?tab=claims' },
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
                { name: 'Dashboard', path: '/admin' },
                { name: 'Browse Items', path: '/browse' },
                { name: 'Staff Panel', path: '/staff' },
            ];
        }

        return baseItems;
    };

    const navItems = getNavItems();

    return (
        <nav className="bg-paper/95 backdrop-blur-sm border-b-2 border-ink sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/browse" className="flex items-center gap-4 group">
                        <img src={uiuLogo} alt="UIU Logo" className="h-9 object-contain" />
                        <div className="hidden sm:block border-l-2 border-line pl-4">
                            <h1 className="text-lg font-display font-bold text-ink leading-none">Find&#8209;X</h1>
                            <p className="eyebrow">UIU Registry</p>
                        </div>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-3 py-2 text-sm font-medium transition-all rounded-md ${location.pathname === item.path ? 'text-primary bg-primary/5' : 'text-ink/60 hover:text-ink hover:bg-ink/[0.03]'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}

                        {user && (
                            <div className="flex items-center gap-3 pl-4 ml-3 border-l-2 border-line">
                                <button
                                    onClick={() => setTicketModalOpen(true)}
                                    className="p-2 text-ink/40 hover:text-accent transition-colors"
                                    title="Support"
                                >
                                    <LifeBuoy size={18} />
                                </button>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-ink leading-tight">{user.name}</p>
                                    <p className="ref-tag !text-[9px] !py-0 mt-0.5">{user.role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-ink/40 hover:text-primary transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-3">
                        {user && <span className="ref-tag">{user.role}</span>}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 text-ink border border-line rounded-md"
                        >
                            {isOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t-2 border-ink p-4 space-y-4">
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`block px-4 py-3 rounded-md text-sm font-medium ${location.pathname === item.path
                                    ? 'bg-ink text-white'
                                    : 'text-ink/70 hover:bg-ink/[0.04]'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                    <div className="pt-4 divider-dashed flex justify-between items-center text-ink">
                        <div className="flex items-center gap-2">
                            <UserCircle size={18} className="text-primary" />
                            <span className="text-sm font-semibold">{user?.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setIsOpen(false); setTicketModalOpen(true); }} className="flex items-center gap-1 text-sm font-semibold text-accent">
                                <LifeBuoy size={16} /> Support
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-1 text-sm font-semibold text-primary">
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {user && <TicketModal isOpen={ticketModalOpen} onClose={() => setTicketModalOpen(false)} user={user} />}
        </nav>
    );
};

export default Navbar;
