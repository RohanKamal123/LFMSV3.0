import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Download, Upload } from 'lucide-react';
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
                setResult({ message: "Item successfully received and registered at Room 110.", item: data.item });
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
                setResult({ message: `Successfully released item to ${sessionData.claimant.name}.`, item: data.item });
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
            <div className="max-w-4xl mx-auto py-8">
                <div className="mb-12">
                    <p className="eyebrow mb-2">Room 110 logistics terminal</p>
                    <h2 className="font-display text-4xl font-bold text-ink">Command Hub</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <button
                        onClick={() => setView('take')}
                        className="card p-8 hover:border-primary transition-all text-left"
                    >
                        <div className="bg-primary/10 text-primary p-4 rounded-lg w-fit mb-6">
                            <Download size={28} />
                        </div>
                        <h3 className="font-display text-xl font-bold text-ink mb-2">Take Item</h3>
                        <p className="text-ink/50 text-sm leading-relaxed">
                            Scanner mode: scan the finder&apos;s item QR to register intake at Room 110.
                        </p>
                    </button>

                    <button
                        onClick={startGiveSession}
                        disabled={loading}
                        className="bg-ink p-8 rounded-xl border border-ink hover:border-primary transition-all text-left disabled:opacity-50"
                    >
                        <div className="bg-primary text-white p-4 rounded-lg w-fit mb-6">
                            {loading ? <Loader2 className="animate-spin" size={28} /> : <Upload size={28} />}
                        </div>
                        <h3 className="font-display text-xl font-bold text-white mb-2">Give Item</h3>
                        <p className="text-white/50 text-sm leading-relaxed">
                            Session mode: show a QR for the claimant to scan and reveal their approved items.
                        </p>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <button onClick={reset} className="flex items-center gap-2 text-ink/40 font-semibold text-sm mb-6 hover:text-ink transition-colors">
                <ArrowLeft size={14} /> Back to terminal
            </button>

            <div className={`card p-8 border-t-4 ${view === 'take' ? 'border-t-primary' : 'border-t-accent'}`}>
                <div className="flex items-center gap-4 mb-8 pb-8 divider-dashed">
                    <div className={`p-3 rounded-lg ${view === 'take' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {view === 'take' ? <Download size={20} /> : <Upload size={20} />}
                    </div>
                    <div>
                        <h3 className="font-display text-xl font-bold text-ink">{view === 'take' ? 'Item Intake' : 'Item Release'}</h3>
                        <p className="eyebrow mt-0.5">{view === 'take' ? 'Scanning finder item' : 'Handover session active'}</p>
                    </div>
                </div>

                {!result ? (
                    <div className="space-y-6">
                        {view === 'take' && (
                            <div className="space-y-4">
                                <div id="reader" className="overflow-hidden rounded-lg border border-dashed border-line bg-paper"></div>
                                <p className="text-center eyebrow">Awaiting valid QR scan</p>
                            </div>
                        )}

                        {view === 'give' && (
                            <div className="space-y-8 text-center">
                                {!sessionData ? (
                                    <div>
                                        <div className="bg-paper p-8 rounded-lg border border-dashed border-line inline-block mb-6">
                                            <QRCodeSVG value={`FINDX_SESSION|${sessionToken}`} size={200} level="H" />
                                        </div>
                                        <h4 className="font-display text-lg font-bold text-ink">Wait for claimant</h4>
                                        <p className="text-sm text-ink/40 mt-2 max-w-xs mx-auto">
                                            Display this QR to the user. Their verified items will appear here automatically.
                                        </p>
                                        <div className="mt-6 flex items-center justify-center gap-2 text-primary">
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                                            <span className="eyebrow text-primary">Polling secure session</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-left">
                                        <div className="bg-primary/5 p-5 rounded-lg border border-primary/20 mb-6 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                                                {sessionData.claimant.name[0]}
                                            </div>
                                            <div>
                                                <p className="eyebrow text-primary mb-0.5">Connected claimant</p>
                                                <h5 className="font-display font-bold text-ink">{sessionData.claimant.name}</h5>
                                                <p className="font-mono text-xs text-ink/40">{sessionData.claimant.uiu_id}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="eyebrow">Select item to release</p>
                                            {sessionData.items.length > 0 ? (
                                                sessionData.items.map(item => (
                                                    <div key={item.id} className="card p-5">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="ref-tag">#{item.id}</span>
                                                            <p className="text-[10px] font-semibold text-accent">AUTHORIZED</p>
                                                        </div>
                                                        <h6 className="font-display font-bold text-ink mb-1.5">{item.title}</h6>
                                                        <p className="text-sm text-ink/50 line-clamp-2 mb-4">{item.public_description}</p>
                                                        <button
                                                            disabled={processing}
                                                            onClick={() => confirmRelease(item.id)}
                                                            className="btn-ink w-full py-3 text-sm disabled:opacity-50"
                                                        >
                                                            {processing ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                                                            {processing ? 'Verifying...' : 'Release item'}
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="card border-dashed p-8 text-center">
                                                    <AlertCircle className="mx-auto text-ink/20 mb-3" size={28} />
                                                    <p className="text-sm text-ink/40">No approved items found in storage queue for this user.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0" size={16} />
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-6 text-center space-y-5">
                        <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h4 className="font-display text-xl font-bold text-ink">Success</h4>
                            <p className="text-sm text-ink/50 mt-2 max-w-xs mx-auto">
                                {result.message}
                            </p>
                        </div>
                        <button
                            onClick={reset}
                            className="btn-ink px-8 py-3 text-sm"
                        >
                            Finish operation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffPanel;
