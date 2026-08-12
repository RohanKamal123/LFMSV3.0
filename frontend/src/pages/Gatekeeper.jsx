import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';
import uiuLogo from '../assets/uiu_logo.png';

const Gatekeeper = () => {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [uiuId, setUiuId] = useState('');
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body = mode === 'login'
                ? { uiu_id: uiuId, password }
                : { uiu_id: uiuId, name, contact, password };

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (res.ok) {
                login(data.token, data.user);
                if (data.user.role === 'STUDENT') navigate('/dashboard');
                else if (data.user.role === 'STAFF') navigate('/staff');
                else if (data.user.role === 'ADMIN') navigate('/admin');
            } else {
                alert((mode === 'login' ? "Sign-in failed: " : "Registration failed: ") + (data.detail || "Please try again."));
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
                        <h2 className="font-display text-2xl font-bold text-ink mb-6">
                            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
                        </h2>

                        <div className="flex gap-2 mb-6 p-1 bg-paper border border-line rounded-lg">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${mode === 'login' ? 'bg-ink text-white' : 'text-ink/50'}`}
                            >
                                Sign in
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('register')}
                                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${mode === 'register' ? 'bg-ink text-white' : 'text-ink/50'}`}
                            >
                                New here? Register
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
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

                            {mode === 'register' && (
                                <>
                                    <div>
                                        <label className="eyebrow block mb-2">Full name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your full name"
                                            className="input-field"
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
                                </>
                            )}

                            <div>
                                <label className="eyebrow block mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" size={16} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                                        className="input-field pl-11"
                                        minLength={mode === 'register' ? 8 : undefined}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-ink w-full py-3.5 group"
                            >
                                {loading ? 'Connecting...' : <>{mode === 'login' ? 'Enter Registry' : 'Create account'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
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
