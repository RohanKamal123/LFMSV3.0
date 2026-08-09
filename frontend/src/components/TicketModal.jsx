import { useState, useEffect } from 'react';
import { LifeBuoy, X, AlertTriangle, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { API_BASE_URL } from '../api_config';

const CATEGORIES = [
    { value: 'ITEM_ISSUE', label: 'Item Issue' },
    { value: 'ACCOUNT', label: 'Account' },
    { value: 'BUG', label: 'Bug Report' },
    { value: 'OTHER', label: 'Other' },
];

const STATUS_STYLES = {
    OPEN: 'bg-orange-50 text-orange-600 border-orange-100',
    IN_PROGRESS: 'bg-blue-50 text-blue-600 border-blue-100',
    RESOLVED: 'bg-green-50 text-green-600 border-green-100',
    CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const TicketModal = ({ isOpen, onClose, user }) => {
    const [tab, setTab] = useState('new');
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('OTHER');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [myTickets, setMyTickets] = useState([]);

    const loadMyTickets = () => {
        fetch(`${API_BASE_URL}/api/tickets/mine/${user.id}`)
            .then(res => res.json())
            .then(setMyTickets)
            .catch(() => setMyTickets([]));
    };

    useEffect(() => {
        if (isOpen && tab === 'mine') loadMyTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, tab]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!subject.trim() || !description.trim()) {
            setError('Please fill in a subject and description.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tickets/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    subject,
                    category,
                    description,
                }),
            });
            if (res.ok) {
                setSuccess(true);
                setSubject('');
                setDescription('');
                setCategory('OTHER');
            } else {
                const data = await res.json();
                setError(data.detail || 'Failed to submit ticket.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSuccess(false);
        setError(null);
        setTab('new');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="card bg-white w-full max-w-lg overflow-hidden">
                <div className="p-6 border-b border-line flex justify-between items-center bg-ink text-white">
                    <div className="flex items-center gap-3">
                        <LifeBuoy size={20} className="text-accent" />
                        <h3 className="font-display font-bold text-lg">Support</h3>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex border-b-2 border-line">
                    <button
                        onClick={() => setTab('new')}
                        className={`flex-1 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${tab === 'new' ? 'text-ink border-ink' : 'text-ink/40 border-transparent'}`}
                    >
                        New ticket
                    </button>
                    <button
                        onClick={() => setTab('mine')}
                        className={`flex-1 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${tab === 'mine' ? 'text-ink border-ink' : 'text-ink/40 border-transparent'}`}
                    >
                        My tickets
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {tab === 'new' && (
                        success ? (
                            <div className="py-6 text-center space-y-4">
                                <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h4 className="font-display text-lg font-bold text-ink">Ticket submitted</h4>
                                <p className="text-sm text-ink/50">Staff will review it and respond soon. Check &quot;My Tickets&quot; for updates.</p>
                                <button onClick={() => setSuccess(false)} className="text-sm font-semibold text-primary">Submit another</button>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div>
                                    <label className="eyebrow block mb-2">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Brief summary of the issue"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="eyebrow block mb-2">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="input-field"
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="eyebrow block mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Describe what happened..."
                                        className="input-field resize-none"
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                                        <AlertTriangle className="text-red-500 shrink-0" size={16} />
                                        <p className="text-sm text-red-600 font-medium">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="btn-primary w-full py-3.5"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Submit ticket'}
                                </button>
                            </div>
                        )
                    )}

                    {tab === 'mine' && (
                        <div className="space-y-3">
                            {myTickets.length === 0 && (
                                <p className="text-center text-sm text-ink/40 py-10">No tickets yet.</p>
                            )}
                            {myTickets.map(t => (
                                <div key={t.id} className="bg-paper rounded-lg p-4 border border-line">
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                        <p className="font-semibold text-ink text-sm">{t.subject}</p>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLES[t.status] || STATUS_STYLES.OPEN}`}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-ink/50 mb-2">{t.description}</p>
                                    {t.staff_response && (
                                        <div className="mt-3 pt-3 divider-dashed flex items-start gap-2">
                                            <LifeBuoy size={14} className="text-accent shrink-0 mt-0.5" />
                                            <p className="text-xs text-ink/70 font-medium">{t.staff_response}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-2 font-mono text-[10px] text-ink/30">
                                        <Clock size={10} />
                                        {new Date(t.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
