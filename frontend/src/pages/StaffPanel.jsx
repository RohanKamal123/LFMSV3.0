import { useState, useEffect } from 'react';
import { QrCode, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Download, Upload, ScanLine } from 'lucide-react';
import { Html5QrcodeScanner } from "html5-qrcode";
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL } from '../api_config';
import { useAuth } from '../context/AuthContext';

const StaffPanel = () => {
    const { user } = useAuth();
    const [view, setView] = useState('hub'); // hub, take, give
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [sessionToken, setSessionToken] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // --- SESSION POLLING (GIVE FLOW) ---
    useEffect(() => {
        let pollTimer;
        if (view === 'give' && sessionToken && !sessionData && !result) {
            pollTimer = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/handover-session/${sessionToken}/status`);
                    const data = await res.json();
                    if (data.status === 'joined') {
                        setSessionData(data);
                        clearInterval(pollTimer);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000);
        }
        return () => clearInterval(pollTimer);
    }, [view, sessionToken, sessionData, result]);

    // --- QR SCANNER (TAKE FLOW) ---
    useEffect(() => {
        if (view === 'take' && !result && !processing) {
            const scanner = new Html5QrcodeScanner("reader", {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            });

            scanner.render(async (decodedText) => {
                try {
                    // Expecting item_id in decodedText
                    const itemId = parseInt(decodedText);
                    if (isNaN(itemId)) throw new Error("Invalid Item ID format");

                    scanner.clear();
                    handleTakeHandover(itemId);
                } catch (err) {
                    setError("Invalid QR: " + err.message);
                }
            }, (_warn) => {
                // Silently ignore scan errors
            });

            return () => {
                scanner.clear().catch(err => console.error("Scanner clear fail", err));
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, result, processing]);

    const startGiveSession = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/handover-session/start?staff_id=${user.id}`, { method: 'POST' });
            const data = await res.json();
            setSessionToken(data.session_token);
            setView('give');
        } catch (err) {
            setError("Failed to initialize session");
        } finally {
            setLoading(false);
        }
    };

    const handleTakeHandover = async (itemId) => {
        setProcessing(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/handover/take-by-qr?item_id=${itemId}&staff_id=${user.id}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ message: "Asset successfully received and registered at Room 110.", item: data.item });
            } else {
                setError(data.detail || "Intake registration failed.");
            }
        } catch (err) {
            setError("API Error. Check connection.");
        } finally {
            setProcessing(false);
        }
    };

    const confirmRelease = async (itemId) => {
        setProcessing(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/handover/staff-scan-claimer?item_id=${itemId}&claimant_uiu_id=${sessionData.claimant.uiu_id}&staff_id=${user.id}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ message: `Successfully released asset to ${sessionData.claimant.name}.`, item: data.item });
            } else {
                setError(data.detail || "Release verification failed.");
            }
        } catch (err) {
            setError("API Error. Check connection.");
        } finally {
            setProcessing(false);
        }
    };

    const reset = () => {
        setView('hub');
        setResult(null);
        setError(null);
        setSessionToken(null);
        setSessionData(null);
    };

    if (view === 'hub') {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 font-inter animate-in fade-in duration-500">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-4">Command Hub</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm italic">Room 110 Logistics Terminal</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <button
                        onClick={() => setView('take')}
                        className="group bg-white p-10 rounded-[3rem] border-4 border-gray-50 shadow-2xl hover:border-primary transition-all text-left relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="bg-primary/10 text-primary p-5 rounded-3xl w-fit mb-8 group-hover:scale-110 transition-transform">
                                <Download size={40} />
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Take Item</h3>
                            <p className="text-gray-400 font-medium leading-relaxed">
                                Scanner mode: Scan finder&apos;s asset QR to register intake at Room 110.
                            </p>
                        </div>
                        <div className="absolute right-[-10%] bottom-[-10%] opacity-5 text-gray-400 group-hover:scale-125 transition-transform duration-700">
                            <ScanLine size={200} />
                        </div>
                    </button>

                    <button
                        onClick={startGiveSession}
                        disabled={loading}
                        className="group bg-gray-900 p-10 rounded-[3rem] shadow-2xl border-4 border-transparent hover:border-orange-500 transition-all text-left relative overflow-hidden disabled:opacity-50"
                    >
                        <div className="relative z-10 text-white">
                            <div className="bg-orange-500 text-white p-5 rounded-3xl w-fit mb-8 group-hover:scale-110 transition-transform shadow-xl shadow-orange-500/20">
                                {loading ? <Loader2 className="animate-spin" size={40} /> : <Upload size={40} />}
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Give Item</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                Session mode: Show QR for claimant to scan and reveal their approved assets.
                            </p>
                        </div>
                        <div className="absolute right-[-10%] bottom-[-10%] opacity-10 text-white group-hover:scale-125 transition-transform duration-700">
                            <QrCode size={200} />
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <button onClick={reset} className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest mb-8 hover:text-gray-900 transition-colors">
                <ArrowLeft size={14} /> Back to Terminal
            </button>

            <div className={`bg-white rounded-[3rem] p-10 shadow-2xl border-2 ${view === 'take' ? 'border-primary/20' : 'border-orange-500/20'} relative overflow-hidden`}>
                <div className="flex items-center gap-4 mb-10">
                    <div className={`p-4 rounded-2xl ${view === 'take' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500'}`}>
                        {view === 'take' ? <Download size={24} /> : <Upload size={24} />}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{view === 'take' ? 'Asset Intake' : 'Asset Release'}</h3>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{view === 'take' ? 'Scanning Finder Asset' : 'Handover Session Active'}</p>
                    </div>
                </div>

                {!result ? (
                    <div className="space-y-8">
                        {view === 'take' && (
                            <div className="space-y-6">
                                <div id="reader" className="overflow-hidden rounded-3xl border-4 border-dashed border-gray-100 bg-gray-50"></div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Valid QR Scan...</p>
                                </div>
                            </div>
                        )}

                        {view === 'give' && (
                            <div className="space-y-10 text-center">
                                {!sessionData ? (
                                    <div className="animate-in fade-in zoom-in duration-700">
                                        <div className="bg-gray-50 p-10 rounded-[2rem] border-2 border-dashed border-gray-200 inline-block mb-6 shadow-inner">
                                            <QRCodeSVG value={`FINDX_SESSION|${sessionToken}`} size={200} level="H" />
                                        </div>
                                        <h4 className="text-xl font-black text-gray-900 uppercase">Wait for Claimant</h4>
                                        <p className="text-sm text-gray-400 font-medium mt-2 max-w-xs mx-auto">
                                            Display this QR to the user. Their verified assets will appear here automatically.
                                        </p>
                                        <div className="mt-8 flex items-center justify-center gap-2 text-primary animate-pulse">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Polling Secure Session...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-left animate-in slide-in-from-right-10 duration-500">
                                        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 mb-8 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black">
                                                {sessionData.claimant.name[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-orange-600 uppercase">Connected Claimant</p>
                                                <h5 className="text-lg font-black text-gray-900">{sessionData.claimant.name}</h5>
                                                <p className="text-[10px] font-bold text-gray-400">{sessionData.claimant.uiu_id}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Item to Release</p>
                                            {sessionData.items.length > 0 ? (
                                                sessionData.items.map(item => (
                                                    <div key={item.id} className="bg-white border-2 border-gray-100 p-6 rounded-[2rem] hover:border-orange-500 transition-all group shadow-sm">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="bg-orange-500/10 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black">#{item.id}</div>
                                                            <p className="text-[10px] font-bold text-gray-300">AUTHORIZED</p>
                                                        </div>
                                                        <h6 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{item.title}</h6>
                                                        <p className="text-sm text-gray-400 line-clamp-2 mb-6">{item.public_description}</p>
                                                        <button
                                                            disabled={processing}
                                                            onClick={() => confirmRelease(item.id)}
                                                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                                        >
                                                            {processing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                                            {processing ? 'VERIFYING...' : 'RELEASE ASSET'}
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-10 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                                    <AlertCircle className="mx-auto text-gray-300 mb-4" size={32} />
                                                    <p className="text-sm font-bold text-gray-400 uppercase">No approved items found in storage queue for this user.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0" size={18} />
                                <p className="text-[11px] text-red-600 font-bold leading-tight">{error}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-10 text-center space-y-6 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                            <CheckCircle2 size={48} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-gray-900">Success</h4>
                            <p className="text-sm text-gray-500 font-medium mt-2 max-w-xs mx-auto">
                                {result.message}
                            </p>
                        </div>
                        <button
                            onClick={reset}
                            className="bg-gray-900 text-white font-black px-10 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-black transition-all"
                        >
                            FINISH OPERATION
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffPanel;
