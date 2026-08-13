import { useState, useEffect, useCallback } from 'react';
import {
    Search, Filter, MapPin, ArrowRight, UserCheck, X, Mail, Phone,
    ShieldCheck, Clock, Archive, Edit3, Trash2, CheckCircle2, Package
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, authFetch } from '../api_config';

const STATE_FILTERS = [
    { value: '', label: 'Active (default)' },
    { value: 'PENDING_HANDOVER', label: 'Pending handover' },
    { value: 'READY_FOR_PICKUP', label: 'Ready for pickup' },
    { value: 'OVERDUE_SUBMISSION', label: 'Overdue' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const STATE_BADGE_STYLES = {
    ACTIVE: 'bg-ink text-white',
    PENDING_HANDOVER: 'bg-primary text-white',
    OVERDUE_SUBMISSION: 'bg-red-600 text-white',
    READY_FOR_PICKUP: 'bg-indigo-600 text-white',
    RESOLVED: 'bg-accent text-white',
    ARCHIVED: 'bg-gray-400 text-white',
    RECOVERED: 'bg-accent text-white',
};

// Where an item physically sits right now, derived from its state - not a
// separate field the backend tracks, just a human-readable gloss on the
// state machine documented in CLAUDE.md.
const CUSTODY_LABEL = {
    FOUND: {
        ACTIVE: 'With the finder · browsable',
        PENDING_HANDOVER: 'With the finder · awaiting drop-off',
        OVERDUE_SUBMISSION: 'With the finder · drop-off overdue',
        READY_FOR_PICKUP: 'At Room 110 (Staff Office)',
        RESOLVED: 'Returned to owner',
        ARCHIVED: 'Archived',
    },
    LOST: {
        ACTIVE: 'Still missing',
        RECOVERED: 'Recovered by owner',
        ARCHIVED: 'Archived',
    },
};

const ITEM_STATE_OPTIONS = ['ACTIVE', 'PENDING_HANDOVER', 'READY_FOR_PICKUP', 'RESOLVED', 'ARCHIVED'];

const BrowseItems = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';
    const isAdmin = user?.role === 'ADMIN';

    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    // Pre-filled from the URL so links from elsewhere (e.g. admin dashboard
    // stat tiles) land here already filtered, not just on the unfiltered feed.
    const [filters, setFilters] = useState({
        category_id: searchParams.get('category_id') || '',
        location_id: searchParams.get('location_id') || '',
        search: '',
        state: searchParams.get('state') || '',
    });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null); // { type, id } of open detail modal

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/browse/categories`).then(res => res.json()).then(setCategories);
        fetch(`${API_BASE_URL}/api/browse/locations`).then(res => res.json()).then(setLocations);
    }, []);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.location_id) params.append('location_id', filters.location_id);
        if (filters.search) params.append('search', filters.search);
        if (filters.state) params.append('state', filters.state);

        try {
            const res = await fetch(`${API_BASE_URL}/api/browse/?${params.toString()}`);
            const data = await res.json();
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                <div>
                    <p className="eyebrow mb-2">{items.length} {filters.state ? STATE_FILTERS.find(s => s.value === filters.state)?.label.toLowerCase() : 'open'} {items.length === 1 ? 'entry' : 'entries'}</p>
                    <h2 className="font-display text-4xl font-bold text-ink">Item Registry</h2>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Search by name..."
                        className="input-field pl-11"
                    />
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-10 pb-6 divider-dashed">
                <select
                    name="category_id"
                    value={filters.category_id}
                    onChange={handleFilterChange}
                    className="appearance-none bg-white border border-line px-4 py-2 rounded-lg text-sm font-medium text-ink/70 focus:border-ink/30 outline-none cursor-pointer"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select
                    name="location_id"
                    value={filters.location_id}
                    onChange={handleFilterChange}
                    className="appearance-none bg-white border border-line px-4 py-2 rounded-lg text-sm font-medium text-ink/70 focus:border-ink/30 outline-none cursor-pointer"
                >
                    <option value="">All Locations</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>

                <select
                    name="state"
                    value={filters.state}
                    onChange={handleFilterChange}
                    className="appearance-none bg-white border border-line px-4 py-2 rounded-lg text-sm font-medium text-ink/70 focus:border-ink/30 outline-none cursor-pointer"
                >
                    {STATE_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>

                {Object.values(filters).some(v => v !== '') && (
                    <button
                        onClick={() => setFilters({ category_id: '', location_id: '', search: '', state: '' })}
                        className="px-4 py-2 text-sm font-medium text-ink/40 hover:text-primary transition-all"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-line h-80 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="card border-dashed p-20 text-center">
                    <Filter className="mx-auto mb-6 text-ink/15" size={48} />
                    <h3 className="font-display text-xl font-bold text-ink/40">No matching entries</h3>
                    <p className="text-ink/40 font-medium mt-1">Try broadening your search or checking another location.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <ItemCard
                            key={`${item.type}-${item.id}`}
                            item={item}
                            locations={locations}
                            user={user}
                            isAdmin={isAdmin}
                            onOpen={() => setSelected({ type: item.type, id: item.id })}
                            onClaim={() => navigate(`/claim?itemId=${item.id}`)}
                        />
                    ))}
                </div>
            )}

            {selected && (
                <ItemDetailModal
                    type={selected.type}
                    id={selected.id}
                    user={user}
                    isStaffOrAdmin={isStaffOrAdmin}
                    isAdmin={isAdmin}
                    locations={locations}
                    categories={categories}
                    onClose={() => setSelected(null)}
                    onChanged={fetchItems}
                    onClaim={() => { setSelected(null); navigate(`/claim?itemId=${selected.id}`); }}
                />
            )}
        </div>
    );
};

const ItemCard = ({ item, locations, user, isAdmin, onOpen, onClaim }) => {
    const isOwnFoundReport = item.type === 'FOUND' && item.finder_id && item.finder_id === user?.id;
    const badgeStyle = STATE_BADGE_STYLES[item.state] || 'bg-ink text-white';

    return (
        <div
            onClick={onOpen}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
            className="card overflow-hidden group flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
            <div className="relative h-52 overflow-hidden border-b border-line">
                <img
                    src={item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`) : `https://placehold.co/600x400/161311/f7f3ec?text=${item.title}`}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded text-[10px] font-mono font-semibold ${item.type === 'LOST' ? 'bg-primary text-white' : 'bg-ink text-white'}`}>
                    {item.type}
                </div>
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded text-[10px] font-mono font-semibold ${badgeStyle}`}>
                    {item.state}
                </div>
                {isAdmin && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpen(); }}
                        title="Manage item"
                        className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-ink/60 hover:text-primary hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Edit3 size={14} />
                    </button>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="font-display text-lg font-bold text-ink leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
                    <span className="ref-tag shrink-0">#{item.id}</span>
                </div>

                <div className="flex items-center gap-1.5 text-ink/40 mb-3">
                    <MapPin size={12} />
                    <span className="text-xs font-medium">
                        {locations.find(l => l.id === item.location_id)?.name || 'Location unknown'}
                    </span>
                </div>

                <p className="text-sm text-ink/60 line-clamp-2 leading-relaxed mb-5 flex-1">
                    {item.description}
                </p>

                <div className="flex justify-between items-center pt-4 divider-dashed">
                    {item.type === 'FOUND' ? (
                        isOwnFoundReport ? (
                            <span className="text-sm font-semibold text-ink/30 flex items-center gap-1.5">
                                <UserCheck size={14} /> Your report
                            </span>
                        ) : item.state === 'ACTIVE' ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onClaim(); }}
                                className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5"
                            >
                                Claim item <ArrowRight size={14} />
                            </button>
                        ) : (
                            <span className="text-xs font-semibold text-ink/30">View details</span>
                        )
                    ) : (
                        <span className="text-sm font-semibold text-primary flex items-center gap-1 group/btn">
                            Contact reporter <ArrowRight size={12} />
                        </span>
                    )}
                    <span className="font-mono text-[10px] text-ink/30">
                        {new Date(item.date).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

const ItemDetailModal = ({ type, id, user, isStaffOrAdmin, isAdmin, locations, categories, onClose, onChanged, onClaim }) => {
    const [item, setItem] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [showContact, setShowContact] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [itemRes, logsRes] = await Promise.all([
            authFetch(`/api/browse/detail/${type}/${id}`),
            fetch(`${API_BASE_URL}/api/browse/logs/${type}/${id}`),
        ]);
        if (itemRes.ok) setItem(await itemRes.json());
        if (logsRes.ok) setLogs(await logsRes.json());
        setLoading(false);
    }, [type, id]);

    useEffect(() => { load(); }, [load]);

    if (loading || !item) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-10 text-ink/40 font-semibold">Loading item...</div>
            </div>
        );
    }

    const state = item.state;
    const title = item.title;
    const publicDesc = item.public_description;
    const privateDesc = item.private_description;
    const contactEmail = item.contact_email;
    const contactPhone = item.contact_phone;
    const isOwnReport = type === 'FOUND' && item.finder_id === user?.id;
    const custodyLabel = CUSTODY_LABEL[type]?.[state] || state;
    const primaryImg = item.images?.find(i => i.is_primary)?.url || item.images?.[0]?.url;
    const locationName = locations.find(l => l.id === item.location_id)?.name || 'Unknown';
    const categoryName = categories.find(c => c.id === item.category_id)?.name || 'Unknown';

    const startEdit = () => {
        setForm({
            title: item.title,
            state: type === 'FOUND' ? item.state : undefined,
            category_id: item.category_id,
            location_id: item.location_id,
        });
        setEditing(true);
    };

    const saveEdit = async () => {
        const endpoint = type === 'FOUND' ? `/api/admin/items/${id}` : `/api/lost-items/${id}`;
        const res = type === 'FOUND'
            ? await authFetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            : null; // lost-item admin edit not wired server-side yet
        if (res && res.ok) {
            setEditing(false);
            await load();
            onChanged();
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
        const res = await authFetch(`/api/admin/items/${id}`, { method: 'DELETE' });
        if (res.ok) { onClose(); onChanged(); }
    };

    const handleArchive = async () => {
        const res = await authFetch(`/api/items/${id}/archive?actor_id=${user.id}`, { method: 'PUT' });
        if (res.ok) { await load(); onChanged(); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className="card bg-white w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-line flex justify-between items-start bg-ink text-white shrink-0">
                    <div>
                        <p className="eyebrow text-white/40 mb-1">{type} · #{id}</p>
                        <h3 className="font-display font-bold text-xl">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <div className="flex gap-4">
                        {primaryImg && (
                            <img
                                src={primaryImg.startsWith('http') ? primaryImg : `${API_BASE_URL}${primaryImg}`}
                                alt={title}
                                className="w-32 h-32 object-cover rounded-lg border border-line shrink-0"
                            />
                        )}
                        <div className="flex-1 space-y-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATE_BADGE_STYLES[state] || 'bg-ink text-white'}`}>
                                {state}
                            </span>
                            <div className="flex items-center gap-1.5 text-ink/60 text-sm">
                                <MapPin size={13} /> {locationName} <span className="text-ink/30">·</span> {categoryName}
                            </div>
                            <div className="flex items-center gap-1.5 text-ink/60 text-sm">
                                <Package size={13} /> Currently: <span className="font-semibold text-ink">{custodyLabel}</span>
                            </div>
                        </div>
                    </div>

                    {editing ? (
                        <div className="space-y-3 bg-paper p-5 rounded-lg border-2 border-primary">
                            <div>
                                <label className="eyebrow block mb-1.5">Title</label>
                                <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            {type === 'FOUND' && (
                                <div>
                                    <label className="eyebrow block mb-1.5">State</label>
                                    <select className="input-field" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
                                        {ITEM_STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={saveEdit} className="btn-primary !py-2 flex-1 flex items-center justify-center gap-1.5"><CheckCircle2 size={15} /> Save</button>
                                <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 text-ink/50 rounded-lg text-sm font-semibold">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <p className="eyebrow mb-2">Public description</p>
                                <p className="text-sm text-ink/70 leading-relaxed">{publicDesc}</p>
                            </div>

                            {isStaffOrAdmin && privateDesc && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                    <p className="eyebrow text-primary mb-2 flex items-center gap-1.5"><ShieldCheck size={12} /> Private description (staff/admin only)</p>
                                    <p className="text-sm text-ink/70 leading-relaxed italic">{privateDesc}</p>
                                </div>
                            )}
                        </>
                    )}

                    <div>
                        <p className="eyebrow mb-3 flex items-center gap-1.5"><Clock size={12} /> Timeline</p>
                        {logs.length === 0 ? (
                            <p className="text-sm text-ink/30">No logged events yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {logs.map((l, i) => (
                                    <div key={i} className="flex gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0"></div>
                                        <div>
                                            <p className="font-semibold text-ink">{l.action_type.replace(/_/g, ' ')}</p>
                                            <p className="text-ink/50 text-xs">{l.details}</p>
                                            <p className="text-ink/30 text-[10px] font-mono mt-0.5">{new Date(l.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {showContact && (contactEmail || contactPhone) && (
                        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-2">
                            {contactEmail && <p className="text-sm text-ink/70 flex items-center gap-2"><Mail size={14} className="text-accent" /> {contactEmail}</p>}
                            {contactPhone && <p className="text-sm text-ink/70 flex items-center gap-2"><Phone size={14} className="text-accent" /> {contactPhone}</p>}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-line shrink-0 flex flex-wrap items-center justify-between gap-3 bg-paper/50">
                    <div className="flex gap-2 flex-wrap">
                        {!isOwnReport && (contactEmail || contactPhone) && (
                            <button onClick={() => setShowContact(v => !v)} className="btn-accent !py-2 !px-4 text-sm flex items-center gap-1.5">
                                <Mail size={14} /> Contact {type === 'FOUND' ? 'finder' : 'reporter'}
                            </button>
                        )}
                        {type === 'FOUND' && !isOwnReport && state === 'ACTIVE' && (
                            <button onClick={onClaim} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
                                Claim item <ArrowRight size={14} />
                            </button>
                        )}
                    </div>

                    {isAdmin && !editing && (
                        <div className="flex gap-2">
                            {type === 'FOUND' && state === 'RESOLVED' && (
                                <button onClick={handleArchive} title="Archive" className="p-2 bg-ink/[0.04] text-ink/50 rounded-lg hover:bg-ink hover:text-white transition-all">
                                    <Archive size={16} />
                                </button>
                            )}
                            {type === 'FOUND' && (
                                <button onClick={startEdit} title="Edit" className="p-2 bg-ink/[0.04] text-ink/50 rounded-lg hover:bg-primary hover:text-white transition-all">
                                    <Edit3 size={16} />
                                </button>
                            )}
                            {type === 'FOUND' && (
                                <button onClick={handleDelete} title="Delete" className="p-2 bg-ink/[0.04] text-ink/50 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrowseItems;
