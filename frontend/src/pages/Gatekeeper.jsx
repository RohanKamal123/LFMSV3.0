import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserCheck, ShieldAlert, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';
import uiuLogo from '../assets/uiu_logo.png';

const ROLES = [
    { id: 'STUDENT', label: 'Student', icon: GraduationCap },
    { id: 'STAFF', label: 'Staff', icon: UserCheck },
    { id: 'ADMIN', label: 'Admin', icon: ShieldAlert },
];

const Gatekeeper = () => {
    const [uiuId, setUiuId] = useState('');
    const [role, setRole] = useState('STUDENT');
    const [contact, setContact] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'STUDENT') navigate('/dashboard');
            else if (user.role === 'STAFF') navigate('/staff');
            else if (user.role === 'ADMIN') navigate('/admin');
        }
    }, [user, navigate]);

    const handleEnter = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = `${API_BASE_URL}/api/auth/login?uiu_id=${uiuId}&role=${role}&contact=${encodeURIComponent(contact)}`;
            const res = await fetch(url, { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                login(data.user);
                if (data.user.role === 'STUDENT') navigate('/dashboard');
                else if (data.user.role === 'STAFF') navigate('/staff');
                else if (data.user.role === 'ADMIN') navigate('/admin');
            } else {
                alert("Login Failed: " + (data.detail || "Invalid credentials"));
            }
        } catch (error) {
            alert("System Error: Check Backend Connection");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-paper">
            {/* Left: identity panel */}
            <div className="hidden lg:flex lg:w-5/12 bg-ink text-white flex-col justify-between p-14 relative overflow-hidden">
                <div className="absolute inset-0 bg-dot-grid opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)' }}></div>

                <div className="relative z-10 flex items-center gap-3">
                    <img src={uiuLogo} alt="UIU" className="h-9 object-contain bg-white rounded p-1" />
                    <span className="eyebrow text-white/50">United International University</span>
                </div>

                <div className="relative z-10">
                    <p className="eyebrow text-primary mb-4">Case Registry &middot; Est. 2026</p>
                    <h1 className="font-display text-5xl font-bold leading-[1.05] mb-6">
                        Every lost item<br />has a paper trail.
                    </h1>
                    <p className="text-white/50 max-w-sm leading-relaxed">
                        Find-X logs, verifies, and hands back what UIU loses &mdash; with a quiz-verified
                        chain of custody for every claim, not just a lost &amp; found box.
                    </p>
                </div>

                <div className="relative z-10 flex gap-8 font-mono text-xs text-white/40">
                    <div>
                        <p className="text-white text-lg font-semibold">Path A</p>
                        <p>Direct handover</p>
                    </div>
                    <div>
                        <p className="text-white text-lg font-semibold">Path B</p>
                        <p>Staff-mediated</p>
                    </div>
                    <div>
                        <p className="text-white text-lg font-semibold">AI</p>
                        <p>Quiz verified</p>
                    </div>
                </div>
            </div>

            {/* Right: intake form */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <img src={uiuLogo} alt="UIU" className="h-10 object-contain" />
                        <div>
                            <h1 className="font-display text-xl font-bold text-ink leading-none">Find&#8209;X</h1>
                            <p className="eyebrow">UIU Registry</p>
                        </div>
                    </div>

                    <div className="card p-8">
                        <p className="eyebrow mb-1">Registry Access</p>
                        <h2 className="font-display text-2xl font-bold text-ink mb-8">Sign in to continue</h2>

                        <form onSubmit={handleEnter} className="space-y-6">
                            <div>
                                <label className="eyebrow block mb-3">Role</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ROLES.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setRole(r.id)}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all ${role === r.id
                                                ? 'border-ink bg-ink text-white'
                                                : 'border-line text-ink/40 hover:border-ink/30'
                                                }`}
                                        >
                                            <r.icon size={18} />
                                            <span className="text-[10px] font-semibold">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="eyebrow block mb-2">Institutional ID</label>
                                <input
                                    type="text"
                                    value={uiuId}
                                    onChange={(e) => setUiuId(e.target.value)}
                                    placeholder="011XXXXXXXX"
                                    className="input-field font-mono text-lg tracking-wide"
                                    required
                                />
                            </div>

                            <div>
                                <label className="eyebrow block mb-2">Contact</label>
                                <input
                                    type="text"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    placeholder="Email or phone number"
                                    className="input-field"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-ink w-full py-3.5 group"
                            >
                                {loading ? 'Connecting...' : <>Enter Registry <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>

                            <div className="divider-dashed pt-5 flex items-center justify-between">
                                <p className="font-mono text-[10px] text-ink/30">FX&#8209;LOGIN&#8209;01</p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/portfolio')}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-orange-700 transition-colors"
                                >
                                    Project presentation <ArrowRight size={12} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Gatekeeper;
