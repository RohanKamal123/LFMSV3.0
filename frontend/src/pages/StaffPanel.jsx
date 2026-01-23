import { useState, useEffect } from 'react';
import { Scan, QrCode, Tag, Package, CheckCircle2, RotateCcw } from 'lucide-react';

const StaffPanel = () => {
    const [mode, setMode] = useState('scan');
    const [recoveryType, setRecoveryType] = useState('direct');
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPendingItems();
    }, []);

    const fetchPendingItems = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/items/');
            const allItems = await res.json();
            const filteredItems = allItems.filter(i => i.state === 'PENDING_HANDOVER' || i.state === 'READY_FOR_PICKUP');

            // Enrich items with claim data
            const enrichedItems = await Promise.all(filteredItems.map(async (item) => {
                const claimRes = await fetch(`http://127.0.0.1:8000/api/claims/item/${item.id}`);
                const claims = await claimRes.json();
                return { ...item, claims };
            }));

            setItems(enrichedItems);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessItem = (item) => {
        setSelectedItem(item);
        setMode('process');
    };

    const handleHandover = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/items/${selectedItem.id}/state?state=RESOLVED`, {
                method: 'PUT'
            });
            if (res.ok) {
                setMode('success');
                fetchPendingItems();
            }
        } catch (err) {
            alert("Handover failed");
        }
    };

    const reset = () => {
        setMode('scan');
        setSelectedItem(null);
    };

    return (
        <div className="max-w-2xl mx-auto pb-20 font-inter">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Staff Operations</h2>
                <p className="text-gray-500 font-medium">Room 110 Management Console</p>
            </div>

            {mode === 'scan' && (
                <div className="space-y-6">
                    <div className="bg-primary/5 border-2 border-primary/10 p-6 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-primary font-black uppercase text-xs tracking-widest mb-1">Queue Status</p>
                            <h3 className="text-2xl font-black text-gray-900">{items.length} Pending Actions</h3>
                        </div>
                        <button onClick={fetchPendingItems} className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
                            <RotateCcw size={20} className="text-primary" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {loading ? (
                            <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest">Hydrating System...</div>
                        ) : items.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center text-gray-400">
                                <Package size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">ALL CLEAR IN ROOM 110</p>
                            </div>
                        ) : items.map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-2xl border-2 border-gray-50 flex items-center justify-between hover:border-primary/50 transition-all group shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 uppercase tracking-tight">{item.title}</h4>
                                        <div className="flex gap-2 items-center">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.state === 'READY_FOR_PICKUP' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {item.state}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-bold">#{item.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleProcessItem(item)}
                                    className="px-6 py-2 bg-dark text-white rounded-xl font-bold text-sm hover:bg-primary transition-all shadow-lg shadow-black/10"
                                >
                                    PROCESS
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6">
                        <button className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary transition-all">
                            <Scan size={32} className="text-primary mb-2" />
                            <span className="text-xs font-black uppercase text-gray-900">Scan QR</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary transition-all">
                            <Tag size={32} className="text-primary mb-2" />
                            <span className="text-xs font-black uppercase text-gray-900">Tag ID</span>
                        </button>
                    </div>
                </div>
            )}

            {mode === 'process' && selectedItem && (
                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-300">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package size={40} />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 uppercase">{selectedItem.title}</h3>
                        <p className="text-gray-400 font-mono tracking-widest text-sm">ID: {selectedItem.id}</p>
                    </div>

                    <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                            <span className="text-xs font-black uppercase text-gray-400">Current Status</span>
                            <span className="text-sm font-black text-primary">{selectedItem.state}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                            <span className="text-xs font-black uppercase text-gray-400">Claimant ID</span>
                            <span className="text-sm font-black text-gray-900">{selectedItem.claims?.[0]?.claimant_id || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-gray-400">Verification</span>
                            <span className="text-sm font-black text-green-600 flex items-center gap-1">
                                <CheckCircle2 size={16} /> PASSED AI QUIZ
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={handleHandover}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
                        >
                            CONFIRM HANDOVER
                        </button>
                        <button
                            onClick={reset}
                            className="w-full text-gray-400 font-bold py-2 hover:text-gray-900 transition-colors uppercase text-xs tracking-widest"
                        >
                            Cancel Operation
                        </button>
                    </div>
                </div>
            )}

            {mode === 'success' && (
                <div className="text-center py-16 bg-white rounded-3xl shadow-2xl border border-green-50 animate-in slide-in-from-bottom duration-500">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full text-green-500 mb-6 shadow-inner">
                        <CheckCircle2 size={56} />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-2">RESOLVED</h2>
                    <p className="text-gray-500 font-medium mb-10">Inventory cleared. State updated to RESOLVED.</p>
                    <button onClick={reset} className="px-10 py-4 bg-dark text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl">SCAN NEXT</button>
                </div>
            )}
        </div>
    );
};

export default StaffPanel;
