import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, UserCheck, ShieldAlert, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Gatekeeper = () => {
    const [uiuId, setUiuId] = useState('');
    const [role, setRole] = useState('STUDENT');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            if (user.role === 'STUDENT') navigate('/browse');
            else if (user.role === 'STAFF') navigate('/staff');
            else if (user.role === 'ADMIN') navigate('/admin');
        }
    }, [user, navigate]);

    const handleEnter = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/auth/login?uiu_id=${uiuId}&role=${role}`, {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok) {
                login(data.user);
                // Navigation is handled by useEffect
            } else {
                alert("Login Failed: " + data.detail);
            }
        } catch (error) {
            console.error(error);
            alert("System Error: Check Backend Connection");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center border-t-8 border-primary">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={48} className="text-primary" />
                </div>

                <h1 className="text-4xl font-black text-gray-900 mb-2">Find-X Portal</h1>
                <p className="text-gray-500 mb-8 font-medium italic">"Lost at UIU? We'll find it."</p>

                <form onSubmit={handleEnter} className="space-y-6">
                    <div className="text-left">
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">I am entering as...</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'STUDENT', label: 'Student', icon: GraduationCap },
                                { id: 'STAFF', label: 'Staff', icon: UserCheck },
                                { id: 'ADMIN', label: 'Admin', icon: ShieldAlert },
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRole(r.id)}
                                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${role === r.id
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-100 bg-gray-50 text-gray-400 grayscale hover:grayscale-0'
                                        }`}
                                >
                                    <r.icon size={20} className="mb-1" />
                                    <span className="text-[10px] font-bold">{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-left">
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">UIU ID / Staff ID</label>
                        <input
                            type="text"
                            value={uiuId}
                            onChange={(e) => setUiuId(e.target.value)}
                            placeholder="011XXXXXX"
                            className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 focus:border-primary focus:ring-0 outline-none transition-all text-xl font-mono text-center tracking-widest placeholder:text-gray-200"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-4 rounded-xl font-black text-xl hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/30"
                    >
                        {loading ? 'SYNCING...' : <>GO TO DASHBOARD <ArrowRight size={24} /></>}
                    </button>

                    <div className="pt-6 border-t border-gray-50">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">
                            UIU DATA SCIENCE CLUB SECURITY SYSTEM
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Gatekeeper;
