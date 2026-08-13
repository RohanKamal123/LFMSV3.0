import { useState } from 'react';
import { Camera, Sparkles, ArrowRight, AlertCircle, Loader2, ImageOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CameraUpload from '../components/CameraUpload';
import { API_BASE_URL } from '../api_config';

const VisualSearch = () => {
    const navigate = useNavigate();
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const handleSearch = async () => {
        if (!imageFile) {
            setError("Please attach a photo of your lost item first.");
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const body = new FormData();
            body.append('file', imageFile);
            const res = await fetch(`${API_BASE_URL}/api/visual-search/`, { method: 'POST', body });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
            } else {
                setError(data.detail || "Visual search failed. Please try again.");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="mb-8">
                <p className="eyebrow text-primary mb-2 flex items-center gap-1.5"><Sparkles size={12} /> AI-powered recovery</p>
                <h2 className="font-display text-4xl font-bold text-ink">Visual Search</h2>
                <p className="text-ink/50 mt-2 max-w-xl">
                    Upload a photo of what you lost - AI compares it against every found item&apos;s photo and
                    surfaces the most likely matches, ranked by visual similarity.
                </p>
            </div>

            <div className="card p-8 mb-8">
                <label className="eyebrow block mb-3">Photo of your lost item</label>
                <div className="max-w-sm">
                    <CameraUpload onImageCapture={(file) => { setImageFile(file); setResult(null); }} />
                </div>

                {error && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3 mt-5">
                        <AlertCircle className="text-red-500 shrink-0" size={16} />
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                )}

                <button
                    onClick={handleSearch}
                    disabled={loading || !imageFile}
                    className="btn-primary mt-6 py-3.5 px-8 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                    {loading ? 'Searching...' : 'Find matches'}
                </button>
            </div>

            {result && (
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="font-display text-xl font-bold text-ink">
                                {result.matches.length} {result.matches.length === 1 ? 'match' : 'matches'} found
                            </h3>
                            <p className="text-ink/40 text-xs mt-1">
                                {result.mode === 'ai'
                                    ? 'AI-powered visual comparison'
                                    : 'Basic image comparison (AI unavailable right now)'}
                            </p>
                        </div>
                    </div>

                    {result.matches.length === 0 ? (
                        <div className="card border-dashed p-16 text-center">
                            <ImageOff className="mx-auto mb-4 text-ink/15" size={40} />
                            <h4 className="font-display text-lg font-bold text-ink/40">No visual matches yet</h4>
                            <p className="text-ink/40 text-sm mt-1 max-w-sm mx-auto">
                                Nothing in the active found-item registry looks like this. Try Browse Items, or check back later.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {result.matches.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/claim?itemId=${item.id}`)}
                                    role="button"
                                    tabIndex={0}
                                    className="card overflow-hidden group flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <div className="relative h-44 overflow-hidden border-b border-line">
                                        <img
                                            src={item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`) : `https://placehold.co/600x400/161311/f7f3ec?text=${item.title}`}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded text-[10px] font-mono font-semibold bg-accent text-white">
                                            {item.similarity}% match
                                        </div>
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <h4 className="font-display text-base font-bold text-ink mb-2 truncate">{item.title}</h4>
                                        <p className="text-sm text-ink/60 line-clamp-2 leading-relaxed mb-4 flex-1">{item.description}</p>
                                        <span className="text-sm font-semibold text-primary flex items-center gap-1">
                                            Start claim <ArrowRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VisualSearch;
