import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Package, ShieldCheck, HelpCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ClaimFlow = () => {
    const [searchParams] = useSearchParams();
    const itemId = searchParams.get('itemId');
    const navigate = useNavigate();
    const { user } = useAuth();

    const [item, setItem] = useState(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [ownershipInfo, setOwnershipInfo] = useState('');
    const [quizData, setQuizData] = useState([]);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        if (itemId) {
            fetch(`http://127.0.0.1:8000/api/items/${itemId}`)
                .then(res => res.json())
                .then(setItem)
                .catch(console.error);
        }
    }, [itemId]);

    const handleStartVerification = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/quiz/generate/${itemId}`, {
                method: 'POST'
            });
            const data = await res.json();
            setQuizData(data.questions || []);
            setStep(2);
        } catch (err) {
            console.error(err);
            alert("Security System Error: AI Module Unresponsive");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAnswers = async () => {
        setLoading(true);
        try {
            const quizAnswers = quizData.map((q, idx) => ({
                question: q.question,
                answer: answers[idx] || '',
                is_correct: true // Mocked for now
            }));

            const payload = {
                item_id: parseInt(itemId),
                claimant_id: user.id,
                owner_private_info: ownershipInfo,
                quiz_answers: quizAnswers
            };

            const res = await fetch(`http://127.0.0.1:8000/api/claims/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setStep(3);
            } else {
                alert("Failed to submit claim. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Network Error: Could not connect to verification server.");
        } finally {
            setLoading(false);
        }
    };

    if (!itemId) return (
        <div className="text-center py-20 font-inter">
            <Package size={64} className="mx-auto mb-4 text-gray-200" />
            <h2 className="text-2xl font-black text-gray-900 border-b-2 border-primary inline-block mb-4">NO ITEM SELECTED</h2>
            <p className="text-gray-500 mb-8">Please select an item from the feed to start a claim.</p>
            <button onClick={() => navigate('/browse')} className="btn-primary">Go to Feed</button>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto pb-20 font-inter">
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Ownership Audit</h2>
                <p className="text-orange-500 font-bold text-xs uppercase tracking-[0.3em]">Verification Protocol Active</p>
            </div>

            {step === 1 && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom duration-500">
                    <div className="flex items-center gap-4 mb-8 bg-gray-50 p-4 rounded-3xl">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
                            <Package size={32} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 uppercase leading-none mb-1">{item?.title}</h3>
                            <p className="text-[10px] font-bold text-gray-400">REFERENCE ID: #{itemId}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-orange-50/50 p-6 rounded-3xl border-2 border-orange-100/50">
                            <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3">Owner Confidential Statement</label>
                            <textarea
                                value={ownershipInfo}
                                onChange={(e) => setOwnershipInfo(e.target.value)}
                                className="w-full bg-white border-2 border-orange-100 rounded-2xl p-5 text-sm font-medium focus:border-primary focus:ring-0 outline-none h-40 resize-none transition-all"
                                placeholder="Describe hidden marks, internal contents, or unique identification features..."
                            ></textarea>
                        </div>

                        <button
                            onClick={handleStartVerification}
                            disabled={!ownershipInfo || loading}
                            className="w-full bg-primary text-white py-5 rounded-3xl font-black text-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 disabled:grayscale"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>INITIATE AI AUDIT <ArrowRight size={20} /></>}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="bg-dark p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                        <ShieldCheck className="absolute -right-6 -bottom-6 text-white/5" size={160} />
                        <h3 className="text-2xl font-black uppercase mb-2 flex items-center gap-2">
                            AI Challenge
                        </h3>
                        <p className="text-gray-400 text-sm font-medium">Verify your identity by answering these generated queries.</p>
                    </div>

                    <div className="space-y-4">
                        {(quizData.length > 0 ? quizData : Array(3).fill({ question: "What is a unique detail?" })).map((q, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border-2 border-gray-50 hover:border-accent/30 transition-all">
                                <div className="flex gap-4 mb-4">
                                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent font-black">
                                        Q{idx + 1}
                                    </div>
                                    <p className="font-black text-gray-900 uppercase tracking-tight pt-2">{q.question}</p>
                                </div>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white p-4 rounded-2xl outline-none transition-all font-bold text-gray-700"
                                    placeholder="Confirm answer..."
                                    onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSubmitAnswers}
                        disabled={loading}
                        className="w-full bg-accent text-white py-5 rounded-3xl font-black text-xl hover:bg-teal-700 transition-all shadow-xl shadow-teal-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "FINALIZE VERIFICATION"}
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="text-center animate-in zoom-in duration-700">
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-green-400 relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-green-400 rounded-full flex items-center justify-center text-white shadow-xl">
                            <CheckCircle size={48} />
                        </div>

                        <h2 className="text-4xl font-black text-gray-900 mb-2 mt-4 uppercase">VALIDATED</h2>
                        <p className="text-gray-500 font-bold mb-10 uppercase tracking-widest text-xs">Security Check Signature: #FINDX-AX-882</p>

                        <div className="bg-white p-6 rounded-[2rem] shadow-inner border inline-block mb-10 bg-gray-50">
                            <QRCodeSVG value={`CLAIM-${itemId}-${item?.title}`} size={200} />
                        </div>

                        <div className="bg-gray-900 p-8 rounded-3xl text-left text-white mb-8">
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                                <div>ID Reference</div>
                                <div className="text-right text-white">#{itemId}</div>
                                <div>Handoff Point</div>
                                <div className="text-right text-white">ROOM 110</div>
                                <div>Expirations</div>
                                <div className="text-right text-white">24 HOURS</div>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-green-400 w-full animate-pulse"></div>
                            </div>
                        </div>

                        <button onClick={() => navigate('/browse')} className="btn-primary w-full py-4 text-lg">
                            Return to Feed
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimFlow;
