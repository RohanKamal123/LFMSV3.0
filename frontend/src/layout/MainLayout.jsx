import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const MainLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Outlet />
            </main>
            <footer className="bg-dark text-white py-6 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm opacity-70 font-black uppercase tracking-widest">Powered By Find-X</p>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
