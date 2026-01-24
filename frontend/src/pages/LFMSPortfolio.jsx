import React from 'react';
import {
    ShieldCheck, QrCode, Zap, Search, Users, Database,
    Smartphone, Server, BrainCircuit, Layout, Github,
    ExternalLink, CheckCircle2, Package, Eye, ChevronRight,
    Lock, Sparkles, Activity
} from 'lucide-react';

const TechBadge = ({ label, icon: Icon }) => (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm group hover:border-orange-500/50 transition-all cursor-default">
        <Icon size={14} className="text-orange-500 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">{label}</span>
    </div>
);

const FeatureCard = ({ title, desc, icon: Icon, color }) => (
    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-[3rem] relative overflow-hidden group hover:border-orange-500/30 transition-all duration-500">
        <div className={`absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
            <Icon size={160} />
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${color} bg-opacity-10 shadow-lg`}>
            <Icon size={28} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">{title}</h3>
        <p className="text-gray-400 font-medium leading-relaxed text-sm">
            {desc}
        </p>
    </div>
);

const StatItem = ({ label, value }) => (
    <div className="text-center">
        <div className="text-4xl font-black text-white tracking-tighter mb-1">{value}</div>
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">{label}</p>
    </div>
);

const LFMSPortfolio = () => {
    return (
        <div className="min-h-screen bg-black text-gray-300 font-inter selection:bg-orange-500 selection:text-white overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
                <div className="absolute top-[30%] left-[20%] w-[1px] h-[400px] bg-gradient-to-b from-transparent via-orange-500/20 to-transparent"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-50 px-8 py-8 flex justify-between items-center bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
                        <Zap size={24} className="text-white" />
                    </div>
                    <div>
                        <span className="text-lg font-black tracking-tighter text-white uppercase">Find-X</span>
                        <div className="text-[8px] font-bold text-orange-500 uppercase tracking-widest leading-none">LFMS V2.0</div>
                    </div>
                </div>
                <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                    <a href="#features" className="hover:text-white transition-colors">Core Systems</a>
                    <a href="#tech" className="hover:text-white transition-colors">Stack</a>
                    <a href="#admin" className="hover:text-white transition-colors">Control</a>
                    <button className="bg-white text-black px-6 py-3 rounded-xl hover:bg-orange-500 hover:text-white transition-all font-black shadow-xl">
                        Launch Terminal
                    </button>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-20">
                {/* Hero section */}
                <div className="flex flex-col lg:flex-row gap-20 items-center mb-40">
                    <div className="lg:w-1/2 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full mb-8">
                            <Sparkles size={14} className="text-orange-400" />
                            <span className="text-[10px] font-black text-orange-300 uppercase tracking-[0.2em]">Next-Gen Recovery Ecosystem</span>
                        </div>
                        <h1 className="text-7xl lg:text-8xl font-black text-white tracking-tighter uppercase mb-8 leading-[0.85]">
                            Find-X <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-300">Intelligent</span> <br />
                            Recovery
                        </h1>
                        <p className="text-xl text-gray-500 font-medium max-w-xl leading-relaxed mb-10">
                            A high-security, automated logistics platform designed to bridge the gap between finders and losers through <span className="text-white">AI verification</span> and <span className="text-white">secure biometric-to-ID matching</span>.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                            <TechBadge label="React 18" icon={Layout} />
                            <TechBadge label="FastAPI" icon={Server} />
                            <TechBadge label="Gemini AI" icon={BrainCircuit} />
                            <TechBadge label="SQLModel" icon={Database} />
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative group">
                        <div className="absolute inset-0 bg-orange-500/20 blur-[80px] group-hover:bg-orange-500/30 transition-all rounded-full"></div>
                        <div className="bg-gray-900 border border-white/10 p-4 rounded-[4rem] shadow-2xl relative overflow-hidden">
                            <div className="bg-black rounded-[3rem] overflow-hidden border border-white/5 aspect-video flex items-center justify-center">
                                <Activity className="text-orange-500/20 animate-pulse" size={120} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
                                    <ShieldCheck size={48} className="text-orange-500 mb-4" />
                                    <h4 className="text-white font-black uppercase text-xl mb-2 tracking-tighter">AI Verification Engine</h4>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Status: Optimal Operational Integrity</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Core Systems Grid */}
                <section id="features" className="mb-40">
                    <div className="flex justify-between items-end mb-16">
                        <div>
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">Core Systems</h2>
                            <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Advanced logistics through automation</p>
                        </div>
                        <div className="hidden lg:flex gap-12">
                            <StatItem label="Recovery Rate" value="98%" />
                            <StatItem label="Verification time" value="<2s" />
                            <StatItem label="Active Nodes" value="11" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            title="AI Verification"
                            desc="Proprietary quiz-generation system using Google Gemini to validate ownership through semantic detail cross-referencing."
                            icon={BrainCircuit}
                            color="bg-orange-500"
                        />
                        <FeatureCard
                            title="Fast ID Match"
                            desc="OCR-driven Student ID detection system that automatically links found cards to their respective owners in real-time."
                            icon={Eye}
                            color="bg-blue-500"
                        />
                        <FeatureCard
                            title="QR Sessions"
                            desc="Secure, session-based handovers at Room 110 terminal using unique dynamic QR tokens for zero-fraud item transfer."
                            icon={QrCode}
                            color="bg-purple-500"
                        />
                        <FeatureCard
                            title="Smart Feed"
                            desc="Highly aesthetic, category-filtered marketplace layout optimized for quick item identification and visual browsing."
                            icon={Layout}
                            color="bg-teal-500"
                        />
                        <FeatureCard
                            title="Admin Hub"
                            desc="Centralized 'Command Hub' providing deep granular control over item states, audit logs, and fraud prevention."
                            icon={ShieldCheck}
                            color="bg-indigo-500"
                        />
                        <FeatureCard
                            title="Bi-Path Logistics"
                            desc="Intelligent routing supporting both direct student-to-student handover and staff-mediated security path A/B."
                            icon={Layers}
                            color="bg-yellow-500"
                        />
                    </div>
                </section>

                {/* Tech Breakdown */}
                <section id="tech" className="grid lg:grid-cols-2 gap-20 items-center mb-40">
                    <div className="order-2 lg:order-1">
                        <div className="bg-gray-950 border border-gray-800 rounded-[3rem] overflow-hidden shadow-2xl">
                            <div className="bg-gray-900/50 px-8 py-4 border-b border-gray-800 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">system_stack.json</span>
                            </div>
                            <div className="p-8 font-mono text-sm text-orange-400/80 leading-relaxed whitespace-pre overflow-x-auto">
                                {`{
  "frontend": {
    "engine": "React 18",
    "styling": "TailwindCSS + Framer Motion",
    "state": "Context API",
    "icons": "Lucide React"
  },
  "backend": {
    "framework": "FastAPI (Python)",
    "orm": "SQLModel (Pydantic + SQLAlchemy)",
    "database": "SQLite / PostgreSQL",
    "automation": "Uvicorn + APScheduler"
  },
  "ai_neural": {
    "provider": "Google Generative AI",
    "model": "Gemini 1.5 Flash",
    "tasks": ["Quiz Gen", "Ownership Verification", "OCR Extraction"]
  }
}`}
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-8 italic">The Technical <br /> Architecture</h2>
                        <p className="text-xl text-gray-500 leading-relaxed font-medium mb-10">
                            Engineered for high-throughput institutional use. Find-X leverages a decoupled architecture to ensure low latency during peak "lost event" periods.
                        </p>
                        <div className="space-y-6">
                            {[
                                { label: 'Backend Latency', value: '45ms' },
                                { label: 'AI Inference Speed', value: '1.2s' },
                                { label: 'Concurrent Session Support', value: '1,000+' },
                            ].map((stat, i) => (
                                <div key={i} className="flex justify-between items-center py-4 border-b border-white/5">
                                    <span className="text-xs font-black uppercase text-gray-400 tracking-widest">{stat.label}</span>
                                    <span className="text-lg font-black text-white">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Visual Identity Section */}
                <section className="bg-orange-600 rounded-[4rem] p-12 lg:p-24 text-center relative overflow-hidden mb-40">
                    <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                        <Activity size={300} />
                    </div>
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-5xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-8 leading-none">
                            High Aesthetics, <br /> Zero Compromise
                        </h2>
                        <p className="text-orange-100/70 text-lg font-medium mb-12">
                            A design language focused on trust and security. Using vibrant accent oranges against sleek deep blacks, we've created an interface that feels like a premium banking application for your everyday assets.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <div className="bg-black/20 backdrop-blur-md px-10 py-5 rounded-2xl border border-white/10 text-white font-black uppercase text-xs tracking-widest">
                                Premium Glassmorphism
                            </div>
                            <div className="bg-black/20 backdrop-blur-md px-10 py-5 rounded-2xl border border-white/10 text-white font-black uppercase text-xs tracking-widest">
                                60FPS Micro-Animations
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center py-20 border-t border-white/5">
                    <div className="flex justify-center gap-4 mb-10">
                        <button className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 transition-all text-white">
                            <Github size={24} />
                        </button>
                        <button className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 transition-all text-white">
                            <ExternalLink size={24} />
                        </button>
                    </div>
                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.6em] mb-4">Developed By Team Find-X</p>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest italic">"Bridging the Gap Between Lost and Found"</p>
                </footer>
            </main>
        </div>
    );
};

export default LFMSPortfolio;
