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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent p-2 rounded-xl text-white shadow-lg shadow-accent/20">
                            <LifeBuoy size={20} />
                        </div>
                        <h3 className="font-black uppercase tracking-tighter text-xl">Support</h3>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setTab('new')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${tab === 'new' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                    >
                        New Ticket
                    </button>
                    <button
                        onClick={() => setTab('mine')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${tab === 'mine' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                    >
                        My Tickets
                    </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto">
                    {tab === 'new' && (
                        success ? (
                            <div className="py-6 text-center space-y-4 animate-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900">Ticket Submitted</h4>
                                <p className="text-sm text-gray-500 font-medium">Staff will review it and respond soon. Check "My Tickets" for updates.</p>
                                <button onClick={() => setSuccess(false)} className="text-xs font-black text-primary uppercase tracking-widest">Submit Another</button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Brief summary of the issue"
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-900 outline-none focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-900 outline-none focus:border-primary transition-all appearance-none"
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Describe what happened..."
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium text-gray-900 outline-none focus:border-primary transition-all resize-none"
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                                        <AlertTriangle className="text-red-500 shrink-0" size={18} />
                                        <p className="text-[11px] text-red-600 font-bold leading-tight">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'SUBMIT TICKET'}
                                </button>
                            </div>
                        )
                    )}

                    {tab === 'mine' && (
                        <div className="space-y-3">
                            {myTickets.length === 0 && (
                                <p className="text-center text-sm text-gray-400 font-medium py-10">No tickets yet.</p>
                            )}
                            {myTickets.map(t => (
                                <div key={t.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                        <p className="font-black text-gray-900 text-sm">{t.subject}</p>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 ${STATUS_STYLES[t.status] || STATUS_STYLES.OPEN}`}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium mb-2">{t.description}</p>
                                    {t.staff_response && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-start gap-2">
                                            <LifeBuoy size={14} className="text-accent shrink-0 mt-0.5" />
                                            <p className="text-xs text-gray-700 font-bold">{t.staff_response}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-bold">
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
