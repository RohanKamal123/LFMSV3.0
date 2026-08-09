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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">

                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
                            <QrCode size={20} />
                        </div>
                        <h3 className="font-black uppercase tracking-tighter text-xl">Verification Terminal</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-8">
                            {/* Step 1: Select Item */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">1. Select Item to Hand Over</label>
                                <select
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-900 outline-none focus:border-primary transition-all appearance-none"
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
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">2. Scan Claimant QR Code</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10">
                                        <User size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Scan QR or Enter UIU ID (e.g. 011221000)"
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-gray-900 outline-none focus:border-primary transition-all"
                                        value={scannedId}
                                        onChange={(e) => setScannedId(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2">
                                    <AlertTriangle className="text-red-500 shrink-0" size={18} />
                                    <p className="text-[11px] text-red-600 font-bold leading-tight">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleHandover}
                                disabled={loading}
                                className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                                {loading ? 'VERIFYING...' : 'CONFIRM HANDOVER'}
                            </button>
                        </div>
                    ) : (
                        <div className="py-10 text-center space-y-6 animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                                <CheckCircle2 size={48} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-gray-900">Handover Verified!</h4>
                                <p className="text-sm text-gray-500 font-medium mt-2 max-w-xs mx-auto">
                                    Item #{selectedItemId} has been successfully resolved. The owner&apos;s profile is now updated.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-gray-900 text-white font-black px-10 py-4 rounded-2xl text-xs"
                            >
                                DONE
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <p className="text-[8px] text-gray-400 font-black text-center uppercase tracking-widest"> find-x secure verification protocol v.1.0</p>
                </div>
            </div>
        </div>
    );
};

export default HandoverScanner;
