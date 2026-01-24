import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Database, Cpu, ShieldCheck,
    ArrowRight, Box, Share2, Layers, Key, Scan, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// --- Components ---

const SlideContainer = ({ children, isActive }) => (
    <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -100 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className="absolute inset-0 flex flex-col items-center justify-center p-8 lg:p-24"
    >
        {children}
    </motion.div>
);

const ERDNode = ({ name, fields, type = "table" }) => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-48 overflow-hidden font-mono text-[10px]">
        <div className={`px-3 py-1.5 font-bold border-b border-gray-200 uppercase tracking-tighter ${type === 'bridge' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-800'}`}>
            {name}
        </div>
        <div className="p-2 space-y-1">
            {fields.map((f, i) => (
                <div key={i} className="flex justify-between items-center gap-2">
                    <span className={f.pk ? 'text-blue-600 font-bold' : f.fk ? 'text-green-600' : 'text-gray-600'}>
                        {f.pk && '🔑 '}{f.name}
                    </span>
                    <span className="text-gray-300 text-[8px] italic">{f.type}</span>
                </div>
            ))}
        </div>
    </div>
);

const RelationLine = ({ label }) => (
    <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-[1px] bg-gray-300 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-gray-400"></div>
        </div>
        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
);

// --- Main App ---

const LFMSPortfolio = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        // Slide 0: Intro
        {
            content: (
                <div className="text-center">
                    <p className="text-orange-500 font-black uppercase tracking-[0.4em] mb-4 text-xs">University Logistics Solution</p>
                    <h1 className="text-7xl lg:text-9xl font-black text-gray-900 tracking-tighter uppercase leading-[0.8] mb-8">
                        Find-X <br /> <span className="text-gray-300">LFMS V2.0</span>
                    </h1>
                    <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        A modern, high-security Lost and Found Management System designed for institutional scale.
                    </p>
                    <div className="mt-12 flex justify-center gap-4">
                        <div className="h-1 w-12 bg-orange-500 rounded-full"></div>
                        <div className="h-1 w-4 bg-gray-200 rounded-full"></div>
                        <div className="h-1 w-4 bg-gray-200 rounded-full"></div>
                    </div>
                </div>
            )
        },
        // Slide 1: Problem
        {
            content: (
                <div className="max-w-4xl w-full">
                    <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-12">The <span className="text-orange-600">Problem</span></h2>
                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <span className="text-orange-600 font-black italic">01.</span>
                                <p className="text-gray-600 font-medium">Physical logbooks are untraceable and prone to data loss.</p>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-orange-600 font-black italic">02.</span>
                                <p className="text-gray-600 font-medium">No automated verification leads to high fraud rates in expensive item claims.</p>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-orange-600 font-black italic">03.</span>
                                <p className="text-gray-600 font-medium">Disconnected notification systems mean items stay lost for months.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 flex items-center justify-center">
                            <ShieldCheck size={80} className="text-gray-200" />
                        </div>
                    </div>
                </div>
            )
        },
        // Slide 2: Architecture
        {
            content: (
                <div className="max-w-5xl w-full">
                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-12">System Architecture</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 border border-gray-100 rounded-3xl text-center hover:bg-gray-50 transition-colors">
                            <Layers size={32} className="mx-auto mb-4 text-orange-500" />
                            <h3 className="font-black uppercase text-xs tracking-widest mb-2">Frontend</h3>
                            <p className="text-[10px] text-gray-500 font-bold">React 18 / Tailwind / Framer</p>
                        </div>
                        <div className="p-8 border border-gray-100 rounded-3xl text-center hover:bg-gray-50 transition-colors bg-white shadow-xl shadow-orange-500/5">
                            <Cpu size={32} className="mx-auto mb-4 text-orange-500" />
                            <h3 className="font-black uppercase text-xs tracking-widest mb-2">Backend Hub</h3>
                            <p className="text-[10px] text-gray-500 font-bold">FastAPI / SQLModel / Gemini AI</p>
                        </div>
                        <div className="p-8 border border-gray-100 rounded-3xl text-center hover:bg-gray-50 transition-colors">
                            <Database size={32} className="mx-auto mb-4 text-orange-500" />
                            <h3 className="font-black uppercase text-xs tracking-widest mb-2">Storage</h3>
                            <p className="text-[10px] text-gray-500 font-bold">PostgreSQL / SQLite / Blob</p>
                        </div>
                    </div>
                </div>
            )
        },
        // Slide 3: ERD Model
        {
            content: (
                <div className="w-full h-full flex flex-col items-center">
                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-12 self-start">The ERD <span className="text-orange-600 text-lg align-top ml-2">v2.0</span></h2>
                    <div className="flex-1 w-full overflow-auto p-4 flex items-center justify-center scrollbar-hide">
                        <div className="relative scale-90 lg:scale-100 flex flex-wrap gap-8 items-center justify-center max-w-4xl">
                            {/* Entity Row 1 */}
                            <div className="flex items-center gap-4">
                                <ERDNode
                                    name="User"
                                    fields={[
                                        { name: "id", type: "INT", pk: true },
                                        { name: "uiu_id", type: "STR", pk: false },
                                        { name: "role", type: "STR", pk: false },
                                        { name: "fraud_score", type: "INT", pk: false }
                                    ]}
                                />
                                <RelationLine label="1:N" />
                                <ERDNode
                                    name="Item"
                                    fields={[
                                        { name: "id", type: "INT", pk: true },
                                        { name: "finder_id", type: "INT", fk: true },
                                        { name: "state", type: "STR", pk: false },
                                        { name: "category_id", type: "INT", fk: true }
                                    ]}
                                />
                            </div>

                            {/* Entity Row 2 */}
                            <div className="flex items-center gap-4">
                                <ERDNode
                                    name="Claim"
                                    fields={[
                                        { name: "id", type: "INT", pk: true },
                                        { name: "item_id", type: "INT", fk: true },
                                        { name: "claimant_id", type: "INT", fk: true },
                                        { name: "is_verified", type: "BOOL", pk: false }
                                    ]}
                                />
                                <RelationLine label="1:1" />
                                <ERDNode
                                    name="Quiz_Log"
                                    fields={[
                                        { name: "id", type: "INT", pk: true },
                                        { name: "claim_id", type: "INT", fk: true },
                                        { name: "is_correct", type: "BOOL", pk: false }
                                    ]}
                                />
                            </div>

                            {/* Supporting Tables */}
                            <div className="flex gap-4">
                                <ERDNode name="Category" fields={[{ name: "id", type: "INT", pk: true }, { name: "name", type: "STR" }]} type="bridge" />
                                <ERDNode name="Location" fields={[{ name: "id", type: "INT", pk: true }, { name: "name", type: "STR" }]} type="bridge" />
                            </div>
                        </div>
                    </div>
                    <p className="mt-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-6 py-2 rounded-full border border-gray-100">
                        Normalized relational schema optimized for atomicity
                    </p>
                </div>
            )
        },
        // Slide 4: AI Engine
        {
            content: (
                <div className="max-w-4xl w-full grid lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-orange-500/20">
                            <Cpu className="text-white" size={24} />
                        </div>
                        <h2 className="text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-8">Intelligence <br /> Layer</h2>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="mt-1.5"><Scan size={16} className="text-orange-600" /></div>
                                <div>
                                    <h4 className="font-bold text-gray-800 uppercase text-[10px] tracking-widest">OpenCV Scan</h4>
                                    <p className="text-gray-500 text-sm">Automated ID recognition using digital image processing.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="mt-1.5"><Key size={16} className="text-orange-600" /></div>
                                <div>
                                    <h4 className="font-bold text-gray-800 uppercase text-[10px] tracking-widest">Gemini 1.5 Flash</h4>
                                    <p className="text-gray-500 text-sm">Generating semantic verification quizzes based on item metadata.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-gray-900 rounded-[3rem] p-10 font-mono text-xs text-orange-400 overflow-hidden shadow-2xl">
                        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        <p className="opacity-50 mb-2">// Initializing AI_Verificator...</p>
                        <p>item = db.query(Item).get(0x1a2)</p>
                        <p className="text-white">prompt = f"Generate 3 questions for {item.title}"</p>
                        <p>response = gemini.generate(prompt)</p>
                        <p className="text-green-400 mt-4">// Status: OK (0.4s)</p>
                    </div>
                </div>
            )
        },
        // Slide 5: Features
        {
            content: (
                <div className="max-w-4xl w-full">
                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-12">Core Capabilities</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { t: 'Fast ID Match', d: 'Automated notification to card owners.', i: Scan },
                            { t: 'Fraud Guard', d: 'AI-driven claim validation system.', i: ShieldCheck },
                            { t: 'Staff Portal', d: 'Granular terminal control at Room 110.', i: UserCheck },
                            { t: 'Audit Trail', d: 'Immutable logs for security forensics.', i: Share2 },
                        ].map((f, i) => (
                            <div key={i} className="p-8 border border-gray-100 rounded-3xl hover:border-orange-200 transition-colors group">
                                <f.i size={20} className="text-orange-600 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="font-black uppercase text-xs tracking-widest mb-1">{f.t}</h3>
                                <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        // Slide 6: Outro
        {
            content: (
                <div className="text-center">
                    <h2 className="text-6xl lg:text-8xl font-black text-gray-900 uppercase tracking-tighter mb-12">Thank You</h2>
                    <p className="text-gray-400 font-black uppercase tracking-[0.6em] mb-12">Find-X System Ready for Launch</p>
                    <Link to="/" className="inline-flex items-center gap-3 bg-gray-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl hover:shadow-orange-500/20 group">
                        Enter Production App <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            )
        }
    ];

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

    // Keyboard navigation
    useEffect(() => {
        const handleKeys = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, []);

    return (
        <div className="h-screen w-screen bg-white text-gray-900 font-inter overflow-hidden relative">
            {/* Minimal Frame */}
            <div className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <Box size={16} className="text-white" />
                    </div>
                    <span className="font-black uppercase tracking-tighter text-sm">Find-X / LFMS 2.0</span>
                </div>
                <div className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.4em]">
                    Slide {currentSlide + 1} of {slides.length}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-between items-end z-50">
                <div className="text-[10px] font-black text-gray-200 uppercase tracking-[0.8em]">
                    Institutional Deployment . 2026
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={prevSlide}
                        className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="p-4 bg-gray-900 text-white rounded-2xl border border-gray-900 hover:bg-orange-600 transition-colors shadow-lg"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Slide Viewer */}
            <div className="relative w-full h-full">
                <AnimatePresence mode="wait">
                    <SlideContainer key={currentSlide} isActive={true}>
                        {slides[currentSlide].content}
                    </SlideContainer>
                </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <div className="fixed top-0 left-0 h-1 bg-orange-600 transition-all duration-500 z-[100]" style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}></div>
        </div>
    );
};

export default LFMSPortfolio;
