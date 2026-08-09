import { useState } from 'react';
import { QrCode, X, CheckCircle2, AlertTriangle, Loader2, ShieldCheck, User } from 'lucide-react';
import { API_BASE_URL } from '../api_config';

const HandoverScanner = ({ isOpen, onClose, onHandoverSuccess, user, items }) => {
    const [scannedId, setScannedId] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleHandover = async () => {
        if (!scannedId || !selectedItemId) {
            setError("Please select an item and enter/scan the claimant's ID.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/handover/founder-scan-claimer?item_id=${selectedItemId}&claimant_uiu_id=${scannedId}&finder_id=${user.id}`, {
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

                            {/* Step 2: "Scanning" Simulation */}
                            <div>
                                <label className="eyebrow block mb-2">2. Scan claimant QR code</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Scan QR or enter UIU ID"
                                        className="input-field pl-11 font-mono"
                                        value={scannedId}
                                        onChange={(e) => setScannedId(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                                </div>
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
