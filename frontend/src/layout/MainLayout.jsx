import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const MainLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-paper bg-dot-grid bg-dot-grid">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Outlet />
            </main>
            <footer className="bg-ink text-white py-6 mt-auto border-t-4 border-primary">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <p className="eyebrow text-white/40">Find-X &middot; UIU Lost &amp; Found Registry</p>
                    <p className="font-mono text-[10px] text-white/30">est. 2026</p>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
