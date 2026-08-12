import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Package, ShieldCheck } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, authFetch } from '../api_config';

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
    const [attemptId, setAttemptId] = useState(null);

    useEffect(() => {
        if (itemId) {
            fetch(`${API_BASE_URL}/api/items/${itemId}`)
                .then(res => res.json())
                .then(setItem)
                .catch(console.error);
        }
    }, [itemId]);

    const handleStartVerification = async () => {
        if (!ownershipInfo.trim()) {
            alert("Please describe how you know this item is yours before starting verification.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/generate/${itemId}`, {
                method: 'POST'
            });
            const data = await res.json();
            setQuizData(data.questions || []);
            setAttemptId(data.attempt_id);
            // Each generated quiz has fresh questions/options/attempt_id - clear
            // any answers left over from a prior (e.g. failed) attempt so stale
            // selections can't be submitted against the new answer key.
            setAnswers({});
            setVerificationResult(null);
            setStep(2);
        } catch (err) {
            console.error(err);
            alert("Security System Error: AI Module Unresponsive");
        } finally {
            setLoading(false);
        }
    };

    const [verificationResult, setVerificationResult] = useState(null);
    const [qrToken, setQrToken] = useState(null);

    const handleSubmitAnswers = async () => {
        if (Object.keys(answers).length < quizData.length) {
            alert("Please answer all questions before finalizing.");
            return;
        }
        setLoading(true);
        try {
            const quizAnswers = quizData.map((q, idx) => ({
                question: q.question,
                answer: answers[idx] || ''
            }));

            const payload = {
                item_id: parseInt(itemId),
                owner_private_info: ownershipInfo,
                attempt_id: attemptId,
                quiz_answers: quizAnswers
            };

            const res = await authFetch(`/api/claims/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setVerificationResult(data);
                setStep(3);
                if (data.is_verified) {
                    const qrRes = await authFetch('/api/auth/qr-token');
                    if (qrRes.ok) setQrToken((await qrRes.json()).token);
                }
            } else if (res.status === 409) {
                // Answers may have been correct, but someone else claimed the
                // item first, or it's no longer available - not the same as
                // a failed quiz, so don't show the generic rejection screen.
                alert(data.detail || "This item is no longer available to claim.");
                navigate('/browse');
            } else {
                alert(data.detail || "Failed to submit claim. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Network Error: Could not connect to verification server.");
        } finally {
            setLoading(false);
        }
    };

    if (!itemId) return (
        <div className="text-center py-20">
            <Package size={48} className="mx-auto mb-4 text-ink/15" />
            <h2 className="font-display text-xl font-bold text-ink mb-3">No item selected</h2>
            <p className="text-ink/50 mb-6">Please select an item from the feed to start a claim.</p>
            <button onClick={() => navigate('/browse')} className="btn-primary">Go to registry</button>
        </div>
    );

    if (item && item.finder_id && item.finder_id === user?.id) return (
        <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto mb-4 text-primary/40" />
            <h2 className="font-display text-xl font-bold text-ink mb-3">This is your own report</h2>
            <p className="text-ink/50 mb-6">You reported this item as found, so you can&apos;t file a claim on it yourself.</p>
            <button onClick={() => navigate('/browse')} className="btn-primary">Go to registry</button>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto pb-20">
            <div className="mb-8">
                <p className="eyebrow text-primary mb-2">Verification protocol active</p>
                <h2 className="font-display text-3xl font-bold text-ink">Ownership Audit</h2>
            </div>

            {step === 1 && (
                <div className="card p-8">
                    <div className="flex items-center gap-4 mb-6 pb-6 divider-dashed">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="font-display font-bold text-ink leading-none mb-1.5">{item?.title}</h3>
                            <p className="ref-tag">REF #{itemId}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-paper p-6 rounded-lg border border-line text-center">
                            <ShieldCheck className="mx-auto mb-3 text-primary" size={36} />
                            <h4 className="font-display font-bold text-ink mb-2">Security Verification</h4>
                            <p className="text-ink/50 text-sm">To claim this item, you must answer a series of questions generated by our AI based on the item&apos;s private details.</p>
                        </div>

                        <div>
                            <label className="eyebrow block mb-3">Describe how you know this is yours</label>
                            <textarea
                                value={ownershipInfo}
                                onChange={(e) => setOwnershipInfo(e.target.value)}
                                rows={3}
                                placeholder="e.g. hidden marks, contents, exact circumstances of losing it..."
                                className="input-field resize-none"
                            />
                        </div>

                        <button
                            onClick={handleStartVerification}
                            disabled={loading}
                            className="btn-primary w-full py-3.5"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Start verification <ArrowRight size={16} /></>}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="bg-ink p-6 rounded-xl text-white">
                        <p className="eyebrow text-white/40 mb-2">AI challenge</p>
                        <h3 className="font-display text-xl font-bold mb-1">Ownership Quiz</h3>
                        <p className="text-white/50 text-sm">Verify your identity by answering these generated questions.</p>
                    </div>

                    <div className="space-y-3">
                        {quizData.map((q, idx) => (
                            <div key={idx} className="card p-5">
                                <div className="flex gap-3 mb-3">
                                    <span className="ref-tag shrink-0">Q{idx + 1}</span>
                                    <p className="font-semibold text-ink text-sm pt-0.5">{q.question}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {(q.options || ['A', 'B', 'C', 'D']).map((opt, oIdx) => (
                                        <button
                                            key={oIdx}
                                            onClick={() => setAnswers({ ...answers, [idx]: opt })}
                                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${answers[idx] === opt
                                                ? 'border-accent bg-accent/5 text-accent'
                                                : 'border-line bg-white text-ink/70 hover:border-ink/20'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSubmitAnswers}
                        disabled={loading}
                        className="btn-accent w-full py-3.5"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Finalize verification"}
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="text-center">
                    {verificationResult?.is_verified ? (
                        <div className="card p-10 border-t-4 border-t-accent">
                            <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto mb-4">
                                <CheckCircle size={28} />
                            </div>

                            <h2 className="font-display text-2xl font-bold text-ink mb-1">Validated</h2>
                            <p className="ref-tag inline-block mb-8">FX&#8209;AX&#8209;{verificationResult.id}</p>

                            <div className="bg-white p-5 rounded-lg border border-line inline-block mb-8">
                                {qrToken
                                    ? <QRCodeSVG value={JSON.stringify({ token: qrToken })} size={180} />
                                    : <div className="w-[180px] h-[180px] flex items-center justify-center text-ink/20"><Loader2 className="animate-spin" size={32} /></div>
                                }
                            </div>

                            <div className="bg-ink p-6 rounded-lg text-left text-white mb-6">
                                <div className="grid grid-cols-2 gap-3 text-xs font-medium text-white/40 mb-3">
                                    <div>ID Reference</div>
                                    <div className="text-right text-white font-mono">#{itemId}</div>
                                    <div>Handoff Point</div>
                                    <div className="text-right text-white font-mono">SEC BOX 01</div>
                                    <div>Verification Score</div>
                                    <div className="text-right text-white font-mono">{verificationResult.quiz_score} / {quizData.length}</div>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent w-full"></div>
                                </div>
                            </div>

                            <button onClick={() => navigate('/dashboard?tab=claims')} className="btn-primary w-full py-3">
                                Return to claims
                            </button>
                        </div>
                    ) : (
                        <div className="card p-10 border-t-4 border-t-primary">
                            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                                <AlertCircle size={28} />
                            </div>

                            <h2 className="font-display text-2xl font-bold text-ink mb-1">Rejected</h2>
                            <p className="eyebrow mb-8">Security check failed</p>

                            <div className="bg-primary/5 p-6 rounded-lg text-left text-ink/70 mb-6 border border-primary/20">
                                <p className="text-sm mb-2">The provided answers do not match our secure records for this item.</p>
                                <p className="ref-tag">Security score: {verificationResult?.quiz_score || 0}</p>
                            </div>

                            <button onClick={() => setStep(1)} className="btn-primary w-full py-3">
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClaimFlow;
