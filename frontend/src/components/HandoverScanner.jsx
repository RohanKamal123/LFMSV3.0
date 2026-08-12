import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, X, CheckCircle2, AlertTriangle, Loader2, ShieldCheck, User, Keyboard, ScanLine } from 'lucide-react';
import { authFetch } from '../api_config';

// JWTs are base64, not encrypted - this only reads the payload for a
// friendly display label. It proves nothing; the backend independently
// verifies the token's signature and expiry before trusting it.
const peekUiuIdFromToken = (token) => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.uiu_id || 'Unknown';
    } catch (_e) {
        return 'Unknown';
    }
};

const HandoverScanner = ({ isOpen, onClose, onHandoverSuccess, items }) => {
    const [scannedId, setScannedId] = useState(''); // manual-entry UIU ID
    const [scannedToken, setScannedToken] = useState(''); // signed token from a QR scan
    const [selectedItemId, setSelectedItemId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('camera'); // 'camera' or 'manual'
    const [scanConfirmed, setScanConfirmed] = useState(false);

    // Real camera-based QR scan of the claimant's Hub QR (JSON: {token})
    useEffect(() => {
        if (isOpen && mode === 'camera' && !result && !scanConfirmed) {
            const scanner = new Html5QrcodeScanner("handover-reader", {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            });

            scanner.render((decodedText) => {
                try {
                    const parsed = JSON.parse(decodedText);
                    if (parsed.token) {
                        setScannedToken(parsed.token);
                        setScanConfirmed(true);
                        scanner.clear().catch(() => { });
                        return;
                    }
                } catch (_e) {
                    // Not JSON/no token - fall through, treated as an invalid scan below.
                }
                setError("That QR isn't a valid Find-X handover code. Ask the claimant to reopen their Hub.");
            }, (_warn) => {
                // Silently ignore scan-frame misses
            });

            return () => {
                scanner.clear().catch(() => { });
            };
        }
    }, [isOpen, mode, result, scanConfirmed]);

    if (!isOpen) return null;

    const handleHandover = async () => {
        if ((!scannedToken && !scannedId) || !selectedItemId) {
            setError("Please select an item and scan or enter the claimant's ID.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const params = new URLSearchParams({ item_id: selectedItemId });
            if (scannedToken) params.set('claimant_token', scannedToken);
            else params.set('claimant_uiu_id', scannedId);

            const res = await authFetch(`/api/handover/founder-scan-claimer?${params.toString()}`, {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok) {
                setResult(data);
                if (onHandoverSuccess) onHandoverSuccess(data.item);
            } else {
                setError(data.detail || "Verification failed. Please check the ID.");
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetScan = () => {
        setScannedId('');
        setScannedToken('');
        setScanConfirmed(false);
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="card bg-white w-full max-w-lg overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-line flex justify-between items-center bg-ink text-white">
                    <div className="flex items-center gap-3">
                        <QrCode size={20} className="text-primary" />
                        <h3 className="font-display font-bold text-lg">Verification Terminal</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {!result ? (
                        <div className="space-y-6">
                            {/* Step 1: Select Item */}
                            <div>
                                <label className="eyebrow block mb-2">1. Select item to hand over</label>
                                <select
                                    className="input-field"
                                    value={selectedItemId}
                                    onChange={(e) => setSelectedItemId(e.target.value)}
                                >
                                    <option value="">Select an active report...</option>
                                    {items.filter(i => i.state !== 'RESOLVED').map(item => (
                                        <option key={item.id} value={item.id}>
                                            #{item.id} - {item.title || `Student ID: ${item.extracted_id || item.manual_id}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Real QR scan or manual entry */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="eyebrow">2. Scan claimant&apos;s Hub QR</label>
                                    <button
                                        type="button"
                                        onClick={() => { setMode(mode === 'camera' ? 'manual' : 'camera'); resetScan(); }}
                                        className="text-xs font-semibold text-accent flex items-center gap-1"
                                    >
                                        {mode === 'camera' ? <><Keyboard size={13} /> Enter manually</> : <><ScanLine size={13} /> Use camera</>}
                                    </button>
                                </div>

                                {mode === 'camera' ? (
                                    scanConfirmed ? (
                                        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 size={18} className="text-accent" />
                                                <div>
                                                    <p className="text-xs text-ink/40">Scanned UIU ID</p>
                                                    <p className="font-mono font-semibold text-ink">{peekUiuIdFromToken(scannedToken)}</p>
                                                </div>
                                            </div>
                                            <button onClick={resetScan} className="text-xs font-semibold text-primary">Rescan</button>
                                        </div>
                                    ) : (
                                        <div id="handover-reader" className="overflow-hidden rounded-lg border border-dashed border-line bg-paper"></div>
                                    )
                                ) : (
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Enter UIU ID"
                                            className="input-field pl-11 font-mono"
                                            value={scannedId}
                                            onChange={(e) => setScannedId(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 shrink-0" size={16} />
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleHandover}
                                disabled={loading}
                                className="btn-primary w-full py-3.5 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
                                {loading ? 'Verifying...' : 'Confirm handover'}
                            </button>
                        </div>
                    ) : (
                        <div className="py-6 text-center space-y-5">
                            <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={32} />
                            </div>
                            <div>
                                <h4 className="font-display text-xl font-bold text-ink">Handover verified</h4>
                                <p className="text-sm text-ink/50 mt-2 max-w-xs mx-auto">
                                    Item #{selectedItemId} has been successfully resolved. The owner&apos;s profile is now updated.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="btn-ink px-8 py-3 text-sm"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-3 bg-paper border-t border-line">
                    <p className="font-mono text-[10px] text-ink/30 text-center">find-x secure verification protocol v.1.0</p>
                </div>
            </div>
        </div>
    );
};

export default HandoverScanner;
