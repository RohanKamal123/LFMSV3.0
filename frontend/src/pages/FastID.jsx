import { CreditCard, Search, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CameraUpload from '../components/CameraUpload';
import { API_BASE_URL } from '../api_config';

const FastID = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('found'); // 'found' or 'lost'
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [registry, setRegistry] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        if (activeTab === 'registry') {
            fetchRegistry();
        }
    }, [activeTab]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/browse/locations`).then(res => res.json()).then(setLocations).catch(() => setLocations([]));
    }, []);

    const fetchRegistry = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/fast-id/public-registry`);
            const data = await res.json();
            setRegistry(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Form states
    const [foundImageData, setFoundImageData] = useState(null);
    const [foundLocationId, setFoundLocationId] = useState('');
    const [foundDescription, setFoundDescription] = useState('');

    const [lostIDNumber, setLostIDNumber] = useState('');
    const [lostDescription, setLostDescription] = useState('');

    const handleReportFound = async (e) => {
        e.preventDefault();
        if (!foundImageData) {
            setError("Please capture or upload an ID card photo.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', foundImageData);
        formData.append('reporter_id', user.id);
        if (foundLocationId) formData.append('location_id', foundLocationId);
        formData.append('description', foundDescription);

        try {
            const response = await fetch(`${API_BASE_URL}/api/fast-id/report-found`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                setResult({
                    type: 'found',
                    extracted_id: data.extraction.id_number,
                    match_found: data.match_found,
                    success: data.extraction.success
                });
            } else {
                setError(data.detail || "Failed to process ID card.");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleReportLost = async (e) => {
        e.preventDefault();
        if (!lostIDNumber || lostIDNumber.length < 9) {
            setError("Please enter a valid 9-10 digit ID number.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('manual_id', lostIDNumber);
        formData.append('reporter_id', user.id);
        formData.append('description', lostDescription);

        try {
            const response = await fetch(`${API_BASE_URL}/api/fast-id/report-lost`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                setResult({
                    type: 'lost',
                    id_number: lostIDNumber,
                    match_found: data.match_found
                });
            } else {
                setError(data.detail || "Failed to report lost ID.");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <p className="eyebrow text-primary mb-3 inline-flex items-center gap-1.5"><CreditCard size={13} /> Fast ID Initiative</p>
                <h1 className="font-display text-3xl font-bold text-ink mb-2">Student ID Help Center</h1>
                <p className="text-ink/50 max-w-lg mx-auto">
                    An AI-powered system to recover lost ID cards instantly.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-line mb-8 max-w-md mx-auto">
                <button
                    onClick={() => { setActiveTab('found'); setResult(null); setError(null); }}
                    className={`flex-1 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all ${activeTab === 'found' ? 'border-ink text-ink' : 'border-transparent text-ink/40'}`}
                >
                    I found an ID
                </button>
                <button
                    onClick={() => { setActiveTab('lost'); setResult(null); setError(null); }}
                    className={`flex-1 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all ${activeTab === 'lost' ? 'border-ink text-ink' : 'border-transparent text-ink/40'}`}
                >
                    I lost my ID
                </button>
                <button
                    onClick={() => { setActiveTab('registry'); setResult(null); setError(null); }}
                    className={`flex-1 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all ${activeTab === 'registry' ? 'border-ink text-ink' : 'border-transparent text-ink/40'}`}
                >
                    Search registry
                </button>
            </div>

            {/* Content Area */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Form Section */}
                <div className="card p-8">
                    {activeTab === 'found' ? (
                        <form onSubmit={handleReportFound} className="space-y-5">
                            <div>
                                <label className="eyebrow block mb-3">Capture ID card</label>
                                <CameraUpload onImageCapture={(file) => setFoundImageData(file)} />
                                <p className="text-xs text-ink/40 mt-2">
                                    AI will automatically read the student ID number from the photo.
                                </p>
                            </div>

                            <div>
                                <label className="eyebrow block mb-2">Where did you find it?</label>
                                <select
                                    className="input-field"
                                    value={foundLocationId}
                                    onChange={(e) => setFoundLocationId(e.target.value)}
                                >
                                    <option value="">Select a location...</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="eyebrow block mb-2">Notes (optional)</label>
                                <textarea
                                    placeholder="Any additional details..."
                                    className="input-field"
                                    rows={2}
                                    value={foundDescription}
                                    onChange={(e) => setFoundDescription(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-accent w-full py-3.5"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Search size={16} />}
                                {loading ? 'Scanning ID...' : 'Scan & report found ID'}
                            </button>
                        </form>
                    ) : activeTab === 'lost' ? (
                        <form onSubmit={handleReportLost} className="space-y-5">
                            <div>
                                <label className="eyebrow block mb-2">Student ID number</label>
                                <input
                                    type="text"
                                    placeholder="Enter your 9-10 digit ID"
                                    className="input-field font-mono text-lg text-center"
                                    value={lostIDNumber}
                                    onChange={(e) => setLostIDNumber(e.target.value)}
                                    maxLength={10}
                                />
                                <p className="text-xs text-ink/40 mt-2">
                                    Format: 123456789
                                </p>
                            </div>

                            <div>
                                <label className="eyebrow block mb-2">Message to finder (optional)</label>
                                <textarea
                                    placeholder="Add any details or contact preferences..."
                                    className="input-field h-28"
                                    value={lostDescription}
                                    onChange={(e) => setLostDescription(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3.5"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={16} />}
                                {loading ? 'Processing...' : 'Register lost report'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-5">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search ID numbers..."
                                    className="input-field pl-11"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                {registry.filter(i => i.id_number.includes(searchQuery)).length === 0 ? (
                                    <div className="py-12 text-center text-ink/30 font-medium">No matching IDs found</div>
                                ) : (
                                    registry.filter(i => i.id_number.includes(searchQuery)).map((item, idx) => (
                                        <div key={idx} className="bg-paper p-4 rounded-lg flex justify-between items-center border border-line">
                                            <div>
                                                <p className="font-mono text-lg font-semibold text-ink">{item.id_number}</p>
                                                <p className="text-xs text-ink/40 mt-0.5">Reported {new Date(item.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded ${item.type === 'FOUND' ? 'bg-ink text-white' : 'bg-primary text-white'}`}>
                                                {item.type}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Status/Result Section */}
                <div className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-100 p-5 rounded-lg flex gap-3">
                            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-red-900 text-sm">Process error</h3>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {result ? (
                        <div className="card p-8">
                            <div className="flex items-center gap-3 mb-6 pb-6 divider-dashed">
                                <CheckCircle2 size={22} className="text-accent" />
                                <h2 className="font-display text-xl font-bold text-ink">Reported successfully</h2>
                            </div>

                            {activeTab === 'found' && (
                                <div className="space-y-4">
                                    <div className="bg-paper p-5 rounded-lg border border-dashed border-line">
                                        <p className="eyebrow mb-1">AI extracted ID</p>
                                        <p className="font-mono text-2xl font-semibold text-ink">
                                            {result.extracted_id || "Unreadable"}
                                        </p>
                                        {!result.success && (
                                            <p className="text-xs text-primary font-medium mt-2">
                                                AI couldn&apos;t extract ID cleanly &mdash; admin will verify.
                                            </p>
                                        )}
                                    </div>

                                    {result.match_found ? (
                                        <div className="bg-primary/5 border border-primary/20 p-5 rounded-lg">
                                            <h3 className="font-display font-bold text-primary mb-1.5">Owner found</h3>
                                            <p className="text-sm text-ink/60">
                                                A student already reported this ID as lost. We&apos;ve notified them and the admin to arrange a return.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-paper p-5 rounded-lg">
                                            <h3 className="font-semibold text-ink mb-1.5 text-sm">What happens next?</h3>
                                            <p className="text-sm text-ink/50 leading-relaxed">
                                                The report is now active. If the student reports it lost later, we&apos;ll match it instantly and notify both of you.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'lost' && (
                                <div className="space-y-4">
                                    <div className="bg-paper p-5 rounded-lg border border-dashed border-line">
                                        <p className="eyebrow mb-1">Registered ID</p>
                                        <p className="font-mono text-2xl font-semibold text-ink">{lostIDNumber}</p>
                                    </div>

                                    {result.match_found ? (
                                        <div className="bg-accent/5 border border-accent/20 p-5 rounded-lg">
                                            <h3 className="font-display font-bold text-accent mb-1.5">Your ID is safe</h3>
                                            <p className="text-sm text-ink/60">
                                                Someone already found and reported your ID card. Check your dashboard for details.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-paper p-5 rounded-lg">
                                            <h3 className="font-semibold text-ink mb-1.5 text-sm">Auto-search active</h3>
                                            <p className="text-sm text-ink/50 leading-relaxed">
                                                We are monitoring all incoming found ID reports and will notify you the moment a match is found.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card border-dashed p-12 flex flex-col items-center justify-center text-center">
                            <Search size={24} className="text-ink/15 mb-4" />
                            <h3 className="font-semibold text-ink/40 text-sm">Status awaiting report</h3>
                            <p className="text-xs text-ink/30 max-w-[200px] mt-2">
                                Your report status and match results will appear here after submission.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FastID;
