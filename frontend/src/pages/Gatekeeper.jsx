import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserCheck, ShieldAlert, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';
import uiuLogo from '../assets/uiu_logo.png';

const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let particles = [];
        const particleCount = 225;
        const mouse = { x: null, y: null, radius: 150 };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        window.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 30) + 1;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
            }

            draw() {
                ctx.fillStyle = '#FF8C00';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }

            update() {
                // Natural floating motion
                this.x += this.vx;
                this.y += this.vy;

                // Wrap around edges
                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;

                // Mouse interaction
                if (mouse.x != null && mouse.y != null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouse.radius) {
                        const force = (mouse.radius - distance) / mouse.radius;
                        const directionX = dx / distance;
                        const directionY = dy / distance;
                        const pull = force * 0.5;

                        this.x += directionX * pull;
                        this.y += directionY * pull;
                    }
                }
            }
        }

        const init = () => {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

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
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50/30 flex items-center justify-center p-4 font-inter relative overflow-hidden text-gray-900">
            <ParticleBackground />

            <div className="bg-white/80 backdrop-blur-md rounded-[3rem] shadow-2xl p-12 w-full max-w-lg text-center border border-gray-100 relative z-10 animate-in fade-in zoom-in duration-700">
                <div className="w-full flex flex-col items-center justify-center mx-auto mb-10">
                    <img src={uiuLogo} alt="United International University" className="h-20 object-contain mb-4 animate-in slide-in-from-top duration-1000" />
                    <div className="h-px w-12 bg-orange-500/30 mb-4"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Authentication Portal</p>
                </div>

                <div className="mb-10">
                    <p className="text-xl font-black text-gray-900 tracking-tight leading-none italic uppercase">
                        "Lost it at UIU, Find it in FindX"
                    </p>
                </div>

                <form onSubmit={handleEnter} className="space-y-8">
                    <div className="text-left">
                        <label className="block text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em] text-center">Identity Role Selection</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'STUDENT', label: 'Student', icon: GraduationCap },
                                { id: 'STAFF', label: 'Staff', icon: UserCheck },
                                { id: 'ADMIN', label: 'Admin', icon: ShieldAlert },
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRole(r.id)}
                                    className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${role === r.id
                                        ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'border-gray-50 bg-gray-50 text-gray-300 hover:border-gray-100'
                                        }`}
                                >
                                    <r.icon size={24} className="mb-2" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-left space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Institutional ID</label>
                            <input
                                type="text"
                                value={uiuId}
                                onChange={(e) => setUiuId(e.target.value)}
                                placeholder="011XXXXXXXX"
                                className="w-full px-6 py-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-xl font-black text-center tracking-widest placeholder:text-gray-200"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Contact Verification</label>
                            <input
                                type="text"
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                placeholder="Email or Phone Number"
                                className="w-full px-6 py-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-gray-200 text-center"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-black/10 disabled:opacity-50 group"
                    >
                        {loading ? 'CONNECTING...' : <>LET'S GO <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
                    </button>

                    <div className="pt-8 border-t border-gray-50">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.3em]">
                            Find-X : A end to end LFMS software
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Gatekeeper;
