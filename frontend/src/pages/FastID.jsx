import { CreditCard, Search, ArrowRight, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';
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

    useEffect(() => {
        if (activeTab === 'registry') {
            fetchRegistry();
        }
    }, [activeTab]);

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
    const [foundLocation, setFoundLocation] = useState('');
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
        formData.append('location_id', ''); // Optional
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
        <div className="max-w-4xl mx-auto px-4 py-8 font-inter">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-orange-100 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                    <CreditCard size={18} />
                    Fast ID Initiative
                </div>
                <h1 className="text-4xl font-black text-gray-900 mb-2">Student ID Help Center</h1>
                <p className="text-gray-500 max-w-lg mx-auto font-medium">
                    Our AI-powered system helps students recover lost ID cards instantly.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border mb-8 max-w-md mx-auto">
                <button
                    onClick={() => { setActiveTab('found'); setResult(null); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'found' ? 'bg-primary text-white shadow-lg shadow-orange-500/30' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    I Found an ID
                </button>
                <button
                    onClick={() => { setActiveTab('lost'); setResult(null); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'lost' ? 'bg-primary text-white shadow-lg shadow-orange-500/30' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    I Lost my ID
                </button>
                <button
                    onClick={() => { setActiveTab('registry'); setResult(null); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'registry' ? 'bg-primary text-white shadow-lg shadow-orange-500/30' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    Search Registry
                </button>
            </div>

            {/* Content Area */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                    {activeTab === 'found' ? (
                        <form onSubmit={handleReportFound} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Capture ID Card</label>
                                <CameraUpload onImageCapture={(file) => setFoundImageData(file)} />
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                    AI will automatically read the student ID number from the photo.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Where did you find it?</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Cafe, Library 3rd Floor"
                                    className="input-field"
                                    value={foundLocation}
                                    onChange={(e) => setFoundLocation(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-accent py-4"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                                {loading ? 'Scanning ID...' : 'Scan & Report Found ID'}
                            </button>
                        </form>
                    ) : activeTab === 'lost' ? (
                        <form onSubmit={handleReportLost} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Student ID Number</label>
                                <input
                                    type="text"
                                    placeholder="Enter your 9-10 digit ID"
                                    className="input-field text-lg font-bold tracking-widest text-center py-4"
                                    value={lostIDNumber}
                                    onChange={(e) => setLostIDNumber(e.target.value)}
                                    maxLength={10}
                                />
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                    Format: 123 456 789
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Message to Finder (Optional)</label>
                                <textarea
                                    placeholder="Add any details or contact preferences..."
                                    className="input-field h-32"
                                    value={lostDescription}
                                    onChange={(e) => setLostDescription(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-4"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                                {loading ? 'Processing...' : 'Register Lost Report'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search ID numbers..."
                                    className="input-field pl-12"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {registry.filter(i => i.id_number.includes(searchQuery)).length === 0 ? (
                                    <div className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest">No matching IDs found</div>
                                ) : (
                                    registry.filter(i => i.id_number.includes(searchQuery)).map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100 hover:border-primary/20 transition-all group">
                                            <div>
                                                <p className="text-xl font-black text-gray-900 tracking-widest">{item.id_number}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Reported: {new Date(item.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border
                                                ${item.type === 'FOUND' ? 'bg-orange-100 text-primary border-orange-200' : 'bg-blue-100 text-blue-600 border-blue-200'}
                                            `}>
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
                        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex gap-4">
                            <div className="bg-red-100 text-red-600 p-2 rounded-full h-fit">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-900">Process Error</h3>
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {result ? (
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-green-100 text-green-600 p-2 rounded-full">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h2 className="text-2xl font-black">Reported Successfully</h2>
                            </div>

                            {activeTab === 'found' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-dashed">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">AI Extracted ID</p>
                                        <p className="text-3xl font-black text-gray-900">
                                            {result.extracted_id || "Unreadable"}
                                        </p>
                                        {!result.success && (
                                            <p className="text-xs text-orange-600 font-medium mt-2">
                                                AI couldn't extract ID part cleanly. Admin will verify.
                                            </p>
                                        )}
                                    </div>

                                    {result.match_found ? (
                                        <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl">
                                            <h3 className="font-black text-primary flex items-center gap-2 mb-2">
                                                🎉 WE FOUND THE OWNER!
                                            </h3>
                                            <p className="text-sm font-medium text-gray-700">
                                                A student already reported this ID as lost. We've notified them and the admin to arrange a return.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-6 rounded-2xl">
                                            <h3 className="font-bold text-gray-900 mb-2">What happens next?</h3>
                                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                                The report is now active. If the student reports it lost later, we'll match it instantly and notify both of you.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'lost' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-dashed">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Registered ID</p>
                                        <p className="text-3xl font-black text-gray-900">{lostIDNumber}</p>
                                    </div>

                                    {result.match_found ? (
                                        <div className="bg-teal-50 border border-teal-200 p-6 rounded-2xl">
                                            <h3 className="font-black text-teal-700 flex items-center gap-2 mb-2">
                                                ✨ YOUR ID IS SAFE!
                                            </h3>
                                            <p className="text-sm font-medium text-gray-700">
                                                Someone already found and reported your ID card! Check your dashboard for details.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                                            <h3 className="font-bold text-blue-900 mb-2">Auto-Search Active</h3>
                                            <p className="text-sm text-blue-700 font-medium leading-relaxed">
                                                We are monitoring all incoming found ID reports. You will receive a notification as soon as a match is found.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-50 border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center opacity-50">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                <Search size={24} className="text-gray-400" />
                            </div>
                            <h3 className="font-bold text-gray-400">Status Awaiting Report</h3>
                            <p className="text-xs text-gray-400 max-w-[200px] mt-2">
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
