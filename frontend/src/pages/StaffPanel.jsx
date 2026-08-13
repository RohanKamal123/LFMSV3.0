import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, ListChecks, QrCode, PackageCheck, FilePlus, Hash, Search, RefreshCw, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { authFetch, API_BASE_URL, ROOM_110_QR_VALUE } from '../api_config';
import CameraUpload from '../components/CameraUpload';

const ItemThumb = ({ item }) => (
    item.image_url
        ? <img src={`${API_BASE_URL}${item.image_url}`} alt={item.title} className="w-14 h-14 object-cover rounded-lg border border-line shrink-0" />
        : <div className="w-14 h-14 rounded-lg border border-line bg-paper flex items-center justify-center text-ink/20 shrink-0"><QrCode size={18} /></div>
);

const StaffPanel = () => {
    const [view, setView] = useState('hub'); // hub, checkin-qr, queue, quick-report, search-serial
    const [processingId, setProcessingId] = useState(null);
    const [actionError, setActionError] = useState(null);

    // --- Pending queue (no scanning - just what's already sitting at
    // Room 110, pulled straight from item/claim state) ---
    const [queueData, setQueueData] = useState(null); // { dropoffs, pickups }
    const [queueLoading, setQueueLoading] = useState(false);
    const [queueError, setQueueError] = useState(null);

    // --- Quick report (non-user dropoff) ---
    const [qrTitle, setQrTitle] = useState('');
    const [qrDetail, setQrDetail] = useState('');
    const [qrImage, setQrImage] = useState(null);
    const [qrSubmitting, setQrSubmitting] = useState(false);
    const [qrError, setQrError] = useState(null);
    const [qrResult, setQrResult] = useState(null);

    // --- Search by serial (non-user pickup) ---
    const [serialInput, setSerialInput] = useState('');
    const [serialItem, setSerialItem] = useState(null);
    const [serialLoading, setSerialLoading] = useState(false);
    const [serialError, setSerialError] = useState(null);
    const [releasing, setReleasing] = useState(false);
    const [releaseDone, setReleaseDone] = useState(false);

    const loadQueue = useCallback(async () => {
        setQueueLoading(true);
        setQueueError(null);
        try {
            const res = await authFetch('/api/handover/queue');
            const data = await res.json();
            if (res.ok) {
                setQueueData(data);
            } else {
                setQueueError(data.detail || "Couldn't load the queue.");
            }
        } catch (err) {
            setQueueError("API Error. Check connection.");
        } finally {
            setQueueLoading(false);
        }
    }, []);

    useEffect(() => {
        if (view === 'queue') loadQueue();
    }, [view, loadQueue]);

    const confirmDropoff = async (itemId) => {
        setProcessingId(itemId);
        setActionError(null);
        try {
            const res = await authFetch(`/api/handover/staff-scan-tag?item_id=${itemId}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setQueueData(q => ({ ...q, dropoffs: q.dropoffs.filter(i => i.id !== itemId) }));
            } else {
                setActionError(data.detail || "Drop-off confirmation failed.");
            }
        } catch (err) {
            setActionError("API Error. Check connection.");
        } finally {
            setProcessingId(null);
        }
    };

    const confirmPickup = async (item) => {
        setProcessingId(item.id);
        setActionError(null);
        try {
            const res = await authFetch(`/api/handover/staff-scan-claimer?item_id=${item.id}&claimant_uiu_id=${item.person.uiu_id}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setQueueData(q => ({ ...q, pickups: q.pickups.filter(i => i.id !== item.id) }));
            } else {
                setActionError(data.detail || "Release verification failed.");
            }
        } catch (err) {
            setActionError("API Error. Check connection.");
        } finally {
            setProcessingId(null);
        }
    };

    const reset = () => {
        setView('hub');
        setQueueData(null);
        setQueueError(null);
        setActionError(null);
        setQrTitle(''); setQrDetail(''); setQrImage(null); setQrError(null); setQrResult(null);
        setSerialInput(''); setSerialItem(null); setSerialError(null); setReleaseDone(false);
    };

    const submitQuickReport = async () => {
        if (!qrTitle.trim() || !qrDetail.trim()) {
            setQrError("Title and a hidden identifying detail are both required.");
            return;
        }
        setQrSubmitting(true);
        setQrError(null);
        try {
            let image_url = null;
            if (qrImage) {
                const body = new FormData();
                body.append('file', qrImage);
                const uploadRes = await fetch(`${API_BASE_URL}/api/upload/`, { method: 'POST', body });
                const uploadJson = await uploadRes.json();
                if (uploadRes.ok) image_url = uploadJson.url;
            }

            const res = await authFetch('/api/handover/staff-quick-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: qrTitle, private_description: qrDetail, image_url }),
            });
            const data = await res.json();
            if (res.ok) {
                setQrResult(data);
            } else {
                setQrError(data.detail || "Failed to log item.");
            }
        } catch (err) {
            setQrError("API Error. Check connection.");
        } finally {
            setQrSubmitting(false);
        }
    };

    const lookupSerial = async () => {
        const id = parseInt(serialInput, 10);
        if (isNaN(id)) {
            setSerialError("Enter a numeric serial number.");
            return;
        }
        setSerialLoading(true);
        setSerialError(null);
        setSerialItem(null);
        try {
            const res = await authFetch(`/api/handover/serial/${id}`);
            const data = await res.json();
            if (res.ok) {
                setSerialItem(data);
            } else {
                setSerialError(data.detail || "No item with that serial number.");
            }
        } catch (err) {
            setSerialError("API Error. Check connection.");
        } finally {
            setSerialLoading(false);
        }
    };

    const releaseBySerial = async () => {
        setReleasing(true);
        setSerialError(null);
        try {
            const res = await authFetch(`/api/handover/manual-release?item_id=${serialItem.id}&note=${encodeURIComponent('walk-in, verified in person')}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setReleaseDone(true);
            } else {
                setSerialError(data.detail || "Release failed.");
            }
        } catch (err) {
            setSerialError("API Error. Check connection.");
        } finally {
            setReleasing(false);
        }
    };

    if (view === 'hub') {
        return (
            <div className="max-w-4xl mx-auto py-8">
                <div className="mb-12">
                    <p className="eyebrow mb-2">Room 110 logistics terminal</p>
                    <h2 className="font-display text-4xl font-bold text-ink">Command Hub</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <button
                        onClick={() => setView('checkin-qr')}
                        className="bg-ink p-8 rounded-xl border border-ink hover:border-primary transition-all text-left"
                    >
                        <div className="bg-primary text-white p-4 rounded-lg w-fit mb-6">
                            <QrCode size={28} />
                        </div>
                        <h3 className="font-display text-xl font-bold text-white mb-2">Show Check-in QR</h3>
                        <p className="text-white/50 text-sm leading-relaxed">
                            Display the fixed Room 110 QR for visitors to scan with their own camera.
                        </p>
                    </button>

                    <button
                        onClick={() => setView('queue')}
                        className="card p-8 hover:border-primary transition-all text-left"
                    >
                        <div className="bg-primary/10 text-primary p-4 rounded-lg w-fit mb-6">
                            <ListChecks size={28} />
                        </div>
                        <h3 className="font-display text-xl font-bold text-ink mb-2">Pending Queue</h3>
                        <p className="text-ink/50 text-sm leading-relaxed">
                            Everyone waiting on a drop-off or pickup, live - no scanning needed on your end.
                        </p>
                    </button>
                </div>

                <p className="eyebrow mb-3">Walk-ins without a Find-X account</p>
                <div className="grid md:grid-cols-2 gap-6">
                    <button
                        onClick={() => setView('quick-report')}
                        className="card p-8 hover:border-primary transition-all text-left"
                    >
                        <div className="bg-accent/10 text-accent p-4 rounded-lg w-fit mb-6">
                            <FilePlus size={28} />
                        </div>
                        <h3 className="font-display text-xl font-bold text-ink mb-2">Log a Walk-in Drop-off</h3>
                        <p className="text-ink/50 text-sm leading-relaxed">
                            Report a found item from scratch on someone&apos;s behalf - photo, title, one hidden detail.
                        </p>
                    </button>

                    <button
                        onClick={() => setView('search-serial')}
                        className="card p-8 hover:border-primary transition-all text-left"
                    >
                        <div className="bg-accent/10 text-accent p-4 rounded-lg w-fit mb-6">
                            <Hash size={28} />
                        </div>
                        <h3 className="font-display text-xl font-bold text-ink mb-2">Release by Serial Number</h3>
                        <p className="text-ink/50 text-sm leading-relaxed">
                            Look an item up by its serial number and mark it picked up for a walk-in claimant.
                        </p>
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'checkin-qr') {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <button onClick={reset} className="flex items-center gap-2 text-ink/40 font-semibold text-sm mb-6 hover:text-ink transition-colors">
                    <ArrowLeft size={14} /> Back to terminal
                </button>

                <div className="card p-8 border-t-4 border-t-primary text-center">
                    <p className="eyebrow mb-1">Room 110 check-in</p>
                    <h3 className="font-display text-2xl font-bold text-ink mb-6">Scan to check in</h3>
                    <div className="bg-paper p-8 rounded-lg border border-dashed border-line inline-block mb-6">
                        <QRCodeSVG value={ROOM_110_QR_VALUE} size={220} level="H" />
                    </div>
                    <p className="text-sm text-ink/50 max-w-xs mx-auto">
                        This code never changes - visitors scan it with their own phone to check in. Staff don&apos;t scan anything - just work the Pending Queue as people show up.
                    </p>
                </div>
            </div>
        );
    }

    if (view === 'quick-report') {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <button onClick={reset} className="flex items-center gap-2 text-ink/40 font-semibold text-sm mb-6 hover:text-ink transition-colors">
                    <ArrowLeft size={14} /> Back to terminal
                </button>

                <div className="card p-8 border-t-4 border-t-accent">
                    <div className="flex items-center gap-4 mb-8 pb-8 divider-dashed">
                        <div className="p-3 rounded-lg bg-accent/10 text-accent">
                            <FilePlus size={20} />
                        </div>
                        <div>
                            <h3 className="font-display text-xl font-bold text-ink">Log a Walk-in Drop-off</h3>
                            <p className="eyebrow mt-0.5">No Find-X account needed</p>
                        </div>
                    </div>

                    {!qrResult ? (
                        <div className="space-y-5">
                            <CameraUpload onImageCapture={(file) => setQrImage(file)} />
                            <div>
                                <label className="eyebrow block mb-2">Title</label>
                                <input
                                    type="text"
                                    value={qrTitle}
                                    onChange={(e) => setQrTitle(e.target.value)}
                                    placeholder="e.g. Blue Water Bottle"
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="eyebrow block mb-2">Hidden identifying detail</label>
                                <textarea
                                    value={qrDetail}
                                    onChange={(e) => setQrDetail(e.target.value)}
                                    rows={3}
                                    placeholder="One detail only the real owner would know, used to verify their claim later..."
                                    className="input-field resize-none"
                                />
                            </div>
                            {qrError && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                                    <AlertCircle className="text-red-500 shrink-0" size={16} />
                                    <p className="text-sm text-red-600 font-medium">{qrError}</p>
                                </div>
                            )}
                            <button
                                onClick={submitQuickReport}
                                disabled={qrSubmitting}
                                className="btn-primary w-full py-3.5 disabled:opacity-50"
                            >
                                {qrSubmitting ? <Loader2 className="animate-spin" /> : 'Log item'}
                            </button>
                        </div>
                    ) : (
                        <div className="py-6 text-center space-y-5">
                            <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={32} />
                            </div>
                            <div>
                                <h4 className="font-display text-xl font-bold text-ink">Item logged</h4>
                                <p className="text-sm text-ink/50 mt-2">Serial No. <span className="font-mono font-semibold text-ink">#{qrResult.serial}</span> &mdash; now browsable and claimable online.</p>
                            </div>
                            <button onClick={reset} className="btn-ink px-8 py-3 text-sm">Done</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'search-serial') {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <button onClick={reset} className="flex items-center gap-2 text-ink/40 font-semibold text-sm mb-6 hover:text-ink transition-colors">
                    <ArrowLeft size={14} /> Back to terminal
                </button>

                <div className="card p-8 border-t-4 border-t-accent">
                    <div className="flex items-center gap-4 mb-8 pb-8 divider-dashed">
                        <div className="p-3 rounded-lg bg-accent/10 text-accent">
                            <Hash size={20} />
                        </div>
                        <div>
                            <h3 className="font-display text-xl font-bold text-ink">Release by Serial Number</h3>
                            <p className="eyebrow mt-0.5">No Find-X account needed</p>
                        </div>
                    </div>

                    {!releaseDone ? (
                        <div className="space-y-5">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" size={16} />
                                    <input
                                        type="number"
                                        value={serialInput}
                                        onChange={(e) => setSerialInput(e.target.value)}
                                        placeholder="Serial number"
                                        className="input-field pl-11 font-mono"
                                    />
                                </div>
                                <button onClick={lookupSerial} disabled={serialLoading} className="btn-ink px-5 disabled:opacity-50">
                                    {serialLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                </button>
                            </div>

                            {serialError && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                                    <AlertCircle className="text-red-500 shrink-0" size={16} />
                                    <p className="text-sm text-red-600 font-medium">{serialError}</p>
                                </div>
                            )}

                            {serialItem && (
                                <div className="card p-5">
                                    <div className="flex items-center gap-4 mb-4">
                                        <ItemThumb item={serialItem} />
                                        <div>
                                            <p className="ref-tag mb-1">Serial No. #{serialItem.serial}</p>
                                            <h6 className="font-display font-bold text-ink">{serialItem.title}</h6>
                                            <p className="text-xs text-ink/40">{serialItem.state}</p>
                                        </div>
                                    </div>
                                    <button
                                        disabled={releasing}
                                        onClick={releaseBySerial}
                                        className="btn-accent w-full py-3 text-sm disabled:opacity-50"
                                    >
                                        {releasing ? <Loader2 className="animate-spin" size={15} /> : <PackageCheck size={15} />}
                                        {releasing ? 'Releasing...' : 'Mark as picked up'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-6 text-center space-y-5">
                            <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={32} />
                            </div>
                            <div>
                                <h4 className="font-display text-xl font-bold text-ink">Marked as picked up</h4>
                                <p className="text-sm text-ink/50 mt-2">Serial No. <span className="font-mono font-semibold text-ink">#{serialItem.serial}</span> is now resolved in inventory.</p>
                            </div>
                            <button onClick={reset} className="btn-ink px-8 py-3 text-sm">Done</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // view === 'queue'
    return (
        <div className="max-w-2xl mx-auto py-8">
            <button onClick={reset} className="flex items-center gap-2 text-ink/40 font-semibold text-sm mb-6 hover:text-ink transition-colors">
                <ArrowLeft size={14} /> Back to terminal
            </button>

            <div className="card p-8 border-t-4 border-t-primary">
                <div className="flex items-center justify-between gap-4 mb-8 pb-8 divider-dashed">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary">
                            <ListChecks size={20} />
                        </div>
                        <div>
                            <h3 className="font-display text-xl font-bold text-ink">Pending Queue</h3>
                            <p className="eyebrow mt-0.5">No scanning needed</p>
                        </div>
                    </div>
                    <button onClick={loadQueue} disabled={queueLoading} className="p-2 text-ink/40 hover:text-primary transition-colors disabled:opacity-50">
                        {queueLoading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                    </button>
                </div>

                {queueLoading && !queueData ? (
                    <div className="py-16 text-center">
                        <Loader2 className="animate-spin mx-auto text-primary mb-3" size={28} />
                        <p className="eyebrow">Loading queue...</p>
                    </div>
                ) : queueError ? (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                        <AlertCircle className="text-red-500 shrink-0" size={16} />
                        <p className="text-sm text-red-600 font-medium">{queueError}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {queueData?.dropoffs.length > 0 && (
                            <div className="space-y-3">
                                <p className="eyebrow">Drop-offs pending intake ({queueData.dropoffs.length})</p>
                                {queueData.dropoffs.map(item => (
                                    <div key={item.id} className="card p-5">
                                        <div className="flex items-center gap-4 mb-4">
                                            <ItemThumb item={item} />
                                            <div className="flex-1">
                                                <p className="ref-tag mb-1">Serial No. #{item.serial}</p>
                                                <h6 className="font-display font-bold text-ink">{item.title}</h6>
                                                {item.person && (
                                                    <p className="text-xs text-ink/50 flex items-center gap-1 mt-0.5">
                                                        <User size={11} /> {item.person.name} &middot; {item.person.uiu_id}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            disabled={processingId === item.id}
                                            onClick={() => confirmDropoff(item.id)}
                                            className="btn-ink w-full py-3 text-sm disabled:opacity-50"
                                        >
                                            {processingId === item.id ? <Loader2 className="animate-spin" size={15} /> : <PackageCheck size={15} />}
                                            {processingId === item.id ? 'Confirming...' : 'Confirm drop-off'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {queueData?.pickups.length > 0 && (
                            <div className="space-y-3">
                                <p className="eyebrow">Pickups ready for release ({queueData.pickups.length})</p>
                                {queueData.pickups.map(item => (
                                    <div key={item.id} className="card p-5">
                                        <div className="flex items-center gap-4 mb-4">
                                            <ItemThumb item={item} />
                                            <div className="flex-1">
                                                <p className="ref-tag mb-1">Serial No. #{item.serial}</p>
                                                <h6 className="font-display font-bold text-ink">{item.title}</h6>
                                                {item.person && (
                                                    <p className="text-xs text-ink/50 flex items-center gap-1 mt-0.5">
                                                        <User size={11} /> {item.person.name} &middot; {item.person.uiu_id}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            disabled={processingId === item.id || !item.person}
                                            onClick={() => confirmPickup(item)}
                                            className="btn-accent w-full py-3 text-sm disabled:opacity-50"
                                        >
                                            {processingId === item.id ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                                            {processingId === item.id ? 'Verifying...' : 'Release item'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {queueData && queueData.dropoffs.length === 0 && queueData.pickups.length === 0 && (
                            <div className="card border-dashed p-8 text-center">
                                <AlertCircle className="mx-auto text-ink/20 mb-3" size={28} />
                                <p className="text-sm text-ink/40">Nothing pending at Room 110 right now.</p>
                            </div>
                        )}

                        {actionError && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0" size={16} />
                                <p className="text-sm text-red-600 font-medium">{actionError}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffPanel;
