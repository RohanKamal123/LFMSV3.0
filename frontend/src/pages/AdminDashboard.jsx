import { useState, useEffect } from 'react';
import {
    BarChart3, Users, Archive, AlertTriangle, ShieldCheck,
    Edit3, Trash2, X, CheckCircle2,
    Database, Layers, Eye, UserCheck, Tags,
    Clock, Terminal, Package, LifeBuoy, Send, Bot, Flag
} from 'lucide-react';
import {
    XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer, BarChart, Bar, AreaChart, Area, Legend
} from 'recharts';
import { API_BASE_URL, authFetch } from '../api_config';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('analytics');
    const [stats, setStats] = useState(null);
    const [items, setItems] = useState([]);
    const [fastIdItems, setFastIdItems] = useState([]);
    const [loginLogs, setLoginLogs] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [claims, setClaims] = useState([]);
    const [claimReviews, setClaimReviews] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAllData();
        const timer = setInterval(fetchAllData, 10000);
        return () => clearInterval(timer);
    }, []);

    const fetchAllData = async () => {
        try {
            const [statsRes, itemsRes, fidRes, logsRes, ticketsRes, claimsRes, reviewsRes] = await Promise.all([
                authFetch(`/api/admin-stats/summary-stats`),
                authFetch(`/api/admin/items`),
                fetch(`${API_BASE_URL}/api/fast-id/all-items`),
                authFetch(`/api/admin-stats/login-logs`),
                fetch(`${API_BASE_URL}/api/tickets/`),
                authFetch(`/api/admin/claims`),
                authFetch(`/api/claims/reviews`)
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (itemsRes.ok) setItems(await itemsRes.json());
            if (fidRes.ok) setFastIdItems(await fidRes.json());
            if (logsRes.ok) setLoginLogs(await logsRes.json());
            if (ticketsRes.ok) setTickets(await ticketsRes.json());
            if (claimsRes.ok) setClaims(await claimsRes.json());
            if (reviewsRes.ok) setClaimReviews(await reviewsRes.json());
        } catch (err) {
            console.error("Dashboard sync error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleManualRefresh = () => {
        setRefreshing(true);
        fetchAllData();
    };

    if (loading && !stats) return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-700">
            <div className="relative mb-8">
                <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-primary border-r-4 opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Terminal size={48} className="text-primary animate-pulse" />
                </div>
            </div>
            <h2 className="font-display text-xl font-bold text-ink mb-2">Syncing HQ</h2>
            <p className="eyebrow">Accessing secure admin tunnels...</p>
        </div>
    );

    const tabs = [
        { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'System Metrics' },
        { id: 'logs', label: 'Log Monitoring', icon: UserCheck, desc: 'Audit Explorer' },
        { id: 'items', label: 'Items CRUD', icon: Archive, desc: 'Asset Registry' },
        { id: 'inventory_110', label: '110 Inventory', icon: Database, desc: 'Office Storage' },
        { id: 'fast_id', label: 'ID Card CRUD', icon: Users, desc: 'FastID Control' },
        { id: 'flow', label: 'Flow CRUD', icon: Layers, desc: 'Lifecycle Injection' },
        { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy, desc: 'Help Desk' },
        { id: 'claims', label: 'Claims Review', icon: Bot, desc: 'Agentic Second Opinion' },
    ];

    return (
        <div className="flex flex-col min-h-[85vh] gap-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <p className="eyebrow mb-2">System control</p>
                    <h2 className="font-display text-4xl font-bold text-ink mb-3">Admin Hub</h2>
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={handleManualRefresh}>
                        <div className={`w-2 h-2 rounded-full bg-accent ${refreshing ? 'animate-ping' : ''}`}></div>
                        <span className="eyebrow text-accent">Network live</span>
                    </div>
                </div>

                <div className="card px-6 py-4 flex items-center gap-5">
                    <div>
                        <p className="eyebrow text-primary mb-1">Office status</p>
                        <p className="font-display text-2xl font-bold text-ink leading-none">{stats?.room_110_count || 0} items</p>
                        <p className="text-xs text-ink/40 mt-1">Stored in Room 110</p>
                    </div>
                    <Database size={32} className="text-primary/30" />
                </div>
            </div>

            {/* Horizontal Navigation */}
            <div className="flex gap-1 border-b-2 border-line overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-0.5 transition-all ${activeTab === tab.id
                            ? 'border-ink text-ink'
                            : 'border-transparent text-ink/40 hover:text-ink/70'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <main className="animate-in slide-in-from-bottom-12 duration-700">
                {activeTab === 'analytics' && <AnalyticsPanel stats={stats} />}
                {activeTab === 'logs' && <LogsPanel logs={loginLogs} />}
                {activeTab === 'items' && <ItemsCrudPanel items={items} refresh={fetchAllData} userId={user?.id} />}
                {activeTab === 'inventory_110' && <Room110Panel items={items} />}
                {activeTab === 'fast_id' && <FastIdCrudPanel items={fastIdItems} refresh={fetchAllData} />}
                {activeTab === 'flow' && <FlowOverridePanel items={items} refresh={fetchAllData} userId={user?.id} />}
                {activeTab === 'tickets' && <TicketsPanel tickets={tickets} refresh={fetchAllData} userId={user?.id} />}
                {activeTab === 'claims' && <ClaimsReviewPanel claims={claims} reviews={claimReviews} refresh={fetchAllData} userId={user?.id} />}
            </main>
        </div>
    );
};

/* --- PANELS --- */

const SectionHeader = ({ eyebrow, title }) => (
    <div className="mb-5">
        <p className="eyebrow mb-1">{eyebrow}</p>
        <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
    </div>
);

const AnalyticsPanel = ({ stats }) => {
    if (!stats) return null;

    const cards = [
        { label: "Active", sub: "browsable right now", value: stats.summary.ACTIVE || 0, color: "text-blue-600", bg: "bg-blue-50", icon: Database },
        { label: "Pending pickup", sub: "waiting at Room 110", value: stats.summary.READY_FOR_PICKUP || 0, color: "text-primary", bg: "bg-primary/10", icon: Package },
        { label: "Resolved", sub: "handed back, all time", value: stats.summary.RESOLVED || 0, color: "text-accent", bg: "bg-accent/10", icon: CheckCircle2 },
        { label: "Overdue", sub: "past the 72h drop-off window", value: stats.summary.OVERDUE_SUBMISSION || 0, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
    ];

    const claimTotal = stats.claim_stats?.total || 0;
    const claimSegments = [
        { label: "Approved", value: stats.claim_stats?.approved || 0, color: "bg-accent", text: "text-accent" },
        { label: "Pending review", value: stats.claim_stats?.pending || 0, color: "bg-primary", text: "text-primary" },
        { label: "Rejected", value: stats.claim_stats?.rejected || 0, color: "bg-red-500", text: "text-red-600" },
    ];

    return (
        <div className="space-y-10">
            {/* Right now */}
            <div>
                <SectionHeader eyebrow="Live" title="Right now" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((card, i) => (
                        <div key={i} className="card p-6">
                            <div className={`${card.bg} ${card.color} w-11 h-11 rounded-lg flex items-center justify-center mb-4`}>
                                <card.icon size={20} />
                            </div>
                            <h4 className="font-display text-3xl font-bold text-ink leading-none mb-1.5">{card.value}</h4>
                            <p className="text-sm font-semibold text-ink/70">{card.label}</p>
                            <p className="text-xs text-ink/40 mt-0.5">{card.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* This week trend - previously computed server-side but never rendered */}
            <div className="card p-8">
                <SectionHeader eyebrow="Last 7 days" title="Found vs. resolved" />
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.timeline}>
                            <defs>
                                <linearGradient id="foundGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#CC5500" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#CC5500" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#008080" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E4DCCB" />
                            <XAxis dataKey="date" fontSize={11} axisLine={false} tickLine={false} />
                            <YAxis fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E4DCCB' }} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Area type="monotone" dataKey="found" name="Found" stroke="#CC5500" fill="url(#foundGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#008080" fill="url(#resolvedGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* By category / by location - category_counts was also computed but unused */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="card p-8">
                    <SectionHeader eyebrow="Breakdown" title="By category" />
                    <div className="space-y-4">
                        {(stats.category_counts || []).length === 0 && <p className="text-sm text-ink/30">No items yet</p>}
                        {(stats.category_counts || []).map((cat, i) => {
                            const max = Math.max(...(stats.category_counts || []).map(c => c.count), 1);
                            return (
                                <div key={i}>
                                    <div className="flex justify-between text-xs font-medium text-ink/60 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Tags size={11} /> {cat.name}</span>
                                        <span className="font-mono text-ink">{cat.count}</span>
                                    </div>
                                    <div className="w-full bg-paper h-2 rounded-full overflow-hidden">
                                        <div className="bg-accent h-full rounded-full" style={{ width: `${(cat.count / max) * 100}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-ink p-8 rounded-xl text-white">
                    <p className="eyebrow text-white/40 mb-1">Breakdown</p>
                    <h3 className="font-display text-xl font-bold mb-5">By location</h3>
                    <div className="space-y-5 max-h-[260px] overflow-y-auto pr-2">
                        {(stats.location_counts || []).length === 0 && <p className="text-sm text-white/30">No items yet</p>}
                        {(stats.location_counts || []).map((loc, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs text-white/50 mb-2">
                                    <span>{loc.name}</span>
                                    <span className="text-white font-mono">{loc.count}</span>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full rounded-full"
                                        style={{ width: `${Math.min((loc.count / (stats.summary.ACTIVE || 1)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Claim verification health - the old panel only showed a lone success % buried
                inside the location card; this makes the actual approve/pending/reject split visible. */}
            <div className="card p-8">
                <SectionHeader eyebrow={`${claimTotal} total claims`} title="Claim verification health" />
                {claimTotal === 0 ? (
                    <p className="text-sm text-ink/30">No claims filed yet</p>
                ) : (
                    <>
                        <div className="w-full h-3 rounded-full overflow-hidden flex mb-5 border border-line">
                            {claimSegments.map((seg, i) => (
                                seg.value > 0 && (
                                    <div key={i} className={seg.color} style={{ width: `${(seg.value / claimTotal) * 100}%` }}></div>
                                )
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {claimSegments.map((seg, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <div className={`w-2 h-2 rounded-full ${seg.color}`}></div>
                                    <div>
                                        <p className={`font-display text-lg font-bold ${seg.text}`}>{seg.value}</p>
                                        <p className="text-xs text-ink/40">{seg.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Operations */}
            <div>
                <SectionHeader eyebrow="Team & system" title="Operations" />
                <div className="grid lg:grid-cols-3 gap-6 mb-6">
                    <div className="card p-6">
                        <h4 className="text-xs font-semibold text-ink/40 mb-3 flex items-center gap-2">
                            <Clock size={14} className="text-primary" /> Avg. time to resolve
                        </h4>
                        <p className="font-display text-3xl font-bold text-ink">
                            {stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours}h` : '—'}
                        </p>
                        <p className="text-xs text-ink/40 mt-1">From report to handover</p>
                    </div>

                    <div className="card p-6">
                        <h4 className="text-xs font-semibold text-ink/40 mb-3 flex items-center gap-2">
                            <UserCheck size={14} className="text-accent" /> Staff throughput
                        </h4>
                        <div className="space-y-1.5">
                            {(stats.staff_throughput || []).length === 0 && <p className="text-sm text-ink/30">No handovers yet</p>}
                            {(stats.staff_throughput || []).map((s, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-ink/70">{s.name}</span>
                                    <span className="text-accent font-mono">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card p-6">
                        <h4 className="text-xs font-semibold text-ink/40 mb-3 flex items-center gap-2">
                            <LifeBuoy size={14} className="text-primary" /> Ticket resolution
                        </h4>
                        <p className="font-display text-3xl font-bold text-ink">{stats.ticket_stats?.resolution_rate ?? 100}%</p>
                        <p className="text-xs text-ink/40 mt-1">{stats.ticket_stats?.resolved ?? 0} / {stats.ticket_stats?.total ?? 0} resolved</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="card p-8">
                        <SectionHeader eyebrow="Business hours" title="Peak intake hours" />
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.hourly_stats}>
                                    <Bar dataKey="count" fill="#CC5500" radius={[6, 6, 0, 0]} />
                                    <XAxis dataKey="hour" fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '10px', border: '1px solid #E4DCCB' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card p-8">
                        <SectionHeader eyebrow="Community" title="Top reporters" />
                        <div className="space-y-2">
                            {(stats.user_activity || []).length === 0 && <p className="text-sm text-ink/30">No reports yet</p>}
                            {(stats.user_activity || []).map((u, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-paper rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                                        <span className="text-sm font-medium text-ink/70">{u.name}</span>
                                    </div>
                                    <span className="text-sm font-mono text-accent">{u.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Room110Panel = ({ items }) => {
    // Filter items where location_id belongs to Room 110 (usually name like "Office" or "110")
    // For now, we simulate filter by checking title or location name
    const roomItems = items.filter(i => i.location_id === 3); // Annex/Office simulation

    return (
        <div className="space-y-10">
            <div className="bg-indigo-600 p-12 rounded-xl text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-5xl font-display font-bold">110 Inventory</h2>
                        <p className="text-indigo-200 font-bold text-sm uppercase tracking-[0.2em] mt-2">Physical Asset Vault</p>
                    </div>
                    <Database size={80} className="opacity-20 translate-x-10 translate-y-10" />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-line shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-line">
                            <th className="px-10 py-6 text-[10px] font-semibold text-ink/40">Asset</th>
                            <th className="px-10 py-6 text-[10px] font-semibold text-ink/40">Security State</th>
                            <th className="px-10 py-6 text-[10px] font-semibold text-ink/40">Date Logged</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {roomItems.map(item => (
                            <tr key={item.id} className="group hover:bg-paper transition-colors">
                                <td className="px-10 py-8">
                                    <div className="font-black text-ink">{item.title}</div>
                                    <div className="text-[10px] text-ink/40 font-bold mt-1 uppercase">LOC_ID: {item.location_id}</div>
                                </td>
                                <td className="px-10 py-8">
                                    <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-semibold border border-indigo-100">{item.state}</span>
                                </td>
                                <td className="px-10 py-8 text-[10px] font-black text-ink/25 uppercase">
                                    {new Date(item.found_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {roomItems.length === 0 && <tr><td colSpan="3" className="p-20 text-center text-ink/25 font-semibold">No assets physically held in Room 110</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const LogsPanel = ({ logs }) => {
    return (
        <div className="bg-white rounded-xl border border-line shadow-2xl overflow-hidden animate-in fade-in duration-500">
            <div className="p-10 border-b border-line flex justify-between items-center bg-paper/50">
                <div>
                    <h3 className="text-3xl font-black text-ink">Login Monitor</h3>
                    <p className="text-[10px] font-bold text-ink/40 mt-1">Real-time session authorization tracking</p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-line shadow-sm">
                    <Clock size={16} className="text-primary" />
                    <span className="text-xs font-semibold text-ink">Live Node Active</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-line">
                            <th className="px-6 py-6 font-semibold text-[10px] text-ink/40">User ID</th>
                            <th className="px-6 py-6 font-semibold text-[10px] text-ink/40">UIU ID</th>
                            <th className="px-6 py-6 font-semibold text-[10px] text-ink/40">Login Time</th>
                            <th className="px-6 py-6 font-semibold text-[10px] text-ink/40">User</th>
                            <th className="px-6 py-6 font-semibold text-[10px] text-ink/40">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-paper/50 transition-colors group">
                                <td className="px-6 py-6">
                                    <span className="bg-ink/[0.04] px-3 py-1.5 rounded-lg text-xs font-black text-ink/60">#{log.user_id || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-6">
                                    <span className="font-bold text-ink text-sm">{log.uiu_id || 'Unknown'}</span>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-ink/[0.04] rounded-lg text-ink/40"><Clock size={16} /></div>
                                        <div>
                                            <div className="font-bold text-ink text-sm">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                            <div className="text-[10px] text-ink/40 font-bold uppercase">{new Date(log.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm
                                            ${log.role === 'ADMIN' ? 'bg-indigo-600 text-white shadow-indigo-500/20' :
                                                log.role === 'STAFF' ? 'bg-primary text-white shadow-primary/20' :
                                                    'bg-teal-500 text-white shadow-accent/20'}
                                        `}>
                                            {log.role?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-black text-ink">{log.user_name}</div>
                                            <div className="text-[10px] font-bold text-ink/40">{log.role}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-2 text-xs font-bold text-ink/50 bg-paper px-4 py-3 rounded-2xl border border-line max-w-xs truncate">
                                        <ShieldCheck size={14} className="text-green-500 shrink-0" />
                                        <span className="truncate">{log.details}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && <div className="p-32 text-center text-ink/25 font-semibold tracking-[0.5em] opacity-40">No session logs detected</div>}
            </div>
        </div>
    );
};

const ItemsCrudPanel = ({ items, refresh }) => {
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    const handleUpdate = async (id) => {
        const res = await authFetch(`/api/admin/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) { setEditing(null); refresh(); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Permanently erase this asset?")) return;
        const res = await authFetch(`/api/admin/items/${id}`, { method: 'DELETE' });
        if (res.ok) refresh();
    };

    return (
        <div className="bg-white rounded-xl border border-line shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-line flex justify-between items-center bg-ink text-white">
                <div>
                    <h3 className="text-3xl font-display font-bold">Global Asset Registry</h3>
                    <p className="text-[10px] font-bold text-orange-400 mt-1">Central CRUD Oversight</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-line">
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40">Object Definition</th>
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40">Status Node</th>
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40 text-right">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-paper transition-colors">
                                <td className="px-10 py-8">
                                    {editing === item.id ? (
                                        <div className="space-y-3">
                                            <input
                                                className="w-full bg-white border-2 border-primary rounded-xl px-4 py-3 font-bold text-sm outline-none shadow-sm focus:shadow-orange-500/10"
                                                value={form.title}
                                                onChange={e => setForm({ ...form, title: e.target.value })}
                                                placeholder="Title"
                                            />
                                            <select
                                                className="w-full bg-white border-2 border-primary rounded-xl px-4 py-3 font-bold text-sm outline-none shadow-sm"
                                                value={form.state}
                                                onChange={e => setForm({ ...form, state: e.target.value })}
                                            >
                                                {['ACTIVE', 'PENDING_HANDOVER', 'READY_FOR_PICKUP', 'RESOLVED', 'ARCHIVED'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="font-black text-ink text-lg">{item.title}</div>
                                            <div className="text-[10px] text-ink/40 font-bold uppercase mt-1">REF_ID: #{item.id}</div>
                                        </>
                                    )}
                                </td>
                                <td className="px-10 py-8">
                                    {editing === item.id ? (
                                        <span className="text-[10px] font-black text-primary animate-pulse uppercase tracking-[0.2em]">Editing Session...</span>
                                    ) : (
                                        <span className={`px-4 py-2 rounded-full text-[10px] font-semibold border-2
                                            ${item.state === 'ACTIVE' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                                                item.state === 'RESOLVED' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    'bg-orange-50 text-orange-600 border-orange-100'}
                                        `}>
                                            {item.state}
                                        </span>
                                    )}
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <div className="flex justify-end gap-3">
                                        {editing === item.id ? (
                                            <>
                                                <button onClick={() => handleUpdate(item.id)} className="p-3 bg-green-500 text-white rounded-2xl shadow-lg shadow-accent/20 hover:scale-110 transition-transform"><CheckCircle2 size={18} /></button>
                                                <button onClick={() => setEditing(null)} className="p-3 bg-gray-200 text-ink/40 rounded-2xl hover:bg-gray-300 transition-colors"><X size={18} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditing(item.id); setForm({ title: item.title, state: item.state }); }} className="p-3 bg-ink/[0.04] text-ink/40 rounded-2xl hover:bg-primary hover:text-white transition-all hover:scale-110"><Edit3 size={18} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-3 bg-ink/[0.04] text-ink/40 rounded-2xl hover:bg-red-500 hover:text-white transition-all hover:scale-110"><Trash2 size={18} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FastIdCrudPanel = ({ items, refresh }) => {
    const [editing, setEditing] = useState(null);
    const [val, setVal] = useState('');
    const [preview, setPreview] = useState(null);

    const handleUpdate = async (id) => {
        const fd = new FormData(); fd.append('id_number', val);
        const res = await fetch(`${API_BASE_URL}/api/fast-id/items/${id}`, { method: 'PUT', body: fd });
        if (res.ok) { setEditing(null); refresh(); }
    };

    return (
        <div className="bg-white rounded-xl border border-line shadow-2xl overflow-hidden relative">
            <div className="p-10 border-b border-line bg-indigo-600 text-white flex justify-between items-center">
                <div>
                    <h3 className="text-3xl font-display font-bold">ID Verification Registry</h3>
                    <p className="text-[10px] font-bold text-indigo-400 mt-1">Manual Intelligence Overrides</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-line">
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40">Card Preview</th>
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40">Lifecycle State (5-Stage Flow)</th>
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40">Extracted ID</th>
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40 text-right">Ops</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map(r => {
                            // Calculate current stage (1-5)
                            let stage = 1; // Reported
                            if (r.id) stage = 2; // Pre-processing
                            if (r.extracted_id || r.manual_id) stage = 3; // Extraction
                            if (r.status === 'MATCHED') stage = 4; // Matching
                            if (r.status === 'RESOLVED') stage = 5; // Resolved

                            return (
                                <tr key={r.id} className="hover:bg-paper transition-colors group">
                                    <td className="px-10 py-6">
                                        {r.image_url ? (
                                            <div className="relative group/eye w-28 h-16 bg-paper rounded-xl overflow-hidden border-2 border-line cursor-pointer shadow-sm hover:border-indigo-400 transition-all" onClick={() => setPreview(`${API_BASE_URL}${r.image_url}`)}>
                                                <img src={`${API_BASE_URL}${r.image_url}`} className="w-full h-full object-contain group-hover/eye:scale-110 transition-transform p-1" />
                                                <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover/eye:opacity-100 transition-opacity flex items-center justify-center"><Eye size={18} className="text-white drop-shadow-md" /></div>
                                            </div>
                                        ) : <span className="text-[10px] font-black text-ink/25 uppercase italic">No Visual</span>}
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <div key={s} className="flex items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${s <= stage ? 'bg-indigo-600 text-white shadow-lg' : 'bg-ink/[0.04] text-ink/25'}`}>
                                                        {s}
                                                    </div>
                                                    {s < 5 && <div className={`w-4 h-1 rounded-full mx-1 ${s < stage ? 'bg-indigo-600' : 'bg-ink/[0.04]'}`}></div>}
                                                </div>
                                            ))}
                                            <div className="ml-4">
                                                <span className="text-[8px] font-semibold text-ink/40 tracking-widest">
                                                    {stage === 1 && 'Reported'}
                                                    {stage === 2 && 'Pre-processing'}
                                                    {stage === 3 && 'Extraction'}
                                                    {stage === 4 && 'Match Confirmed'}
                                                    {stage === 5 && 'Vault Resolved'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        {editing === r.id ? (
                                            <div className="flex gap-2">
                                                <input className="bg-white border-2 border-primary rounded-xl px-4 py-3 font-bold text-sm outline-none shadow-xl" value={val} onChange={e => setVal(e.target.value)} autoFocus />
                                                <button onClick={() => handleUpdate(r.id)} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20"><CheckCircle2 size={18} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <div className={`text-xl font-display font-bold ${!r.extracted_id && !r.manual_id ? 'text-red-500 animate-pulse' : 'text-ink'}`}>
                                                    {r.extracted_id || r.manual_id || 'Extraction Failed'}
                                                </div>
                                                <button onClick={() => { setEditing(r.id); setVal(r.extracted_id || r.manual_id || ''); }} className="p-2 text-ink/25 hover:text-primary transition-opacity opacity-0 group-hover:opacity-100"><Edit3 size={16} /></button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <button onClick={async () => { if (confirm("Purge ID record?")) { await fetch(`${API_BASE_URL}/api/fast-id/items/${r.id}`, { method: 'DELETE' }); refresh(); } }} className="p-3 bg-ink/[0.04] text-ink/40 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Preview Modal */}
            {preview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setPreview(null)}>
                    <div className="relative max-w-5xl w-full flex flex-col items-center animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="absolute -top-12 right-0 flex gap-4">
                            <a
                                href={preview}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-md border border-white/10"
                            >
                                <Eye size={14} /> Open Original
                            </a>
                            <button
                                onClick={() => setPreview(null)}
                                className="bg-white/10 hover:bg-primary text-white p-2 rounded-full transition-all backdrop-blur-md border border-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-2xl border-8 border-white/10 overflow-hidden">
                            <img
                                src={preview}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                                alt="ID Card Full Preview"
                            />
                        </div>
                        <div className="mt-6 text-center">
                            <p className="text-white/40 text-[10px] font-semibold">Secure Verification Mode</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FlowOverridePanel = ({ items, refresh }) => {
    const override = async (id, state) => {
        const res = await authFetch(`/api/admin/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
        });
        if (res.ok) refresh();
    };

    return (
        <div className="bg-white rounded-xl border border-line shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-line flex justify-between items-center bg-red-600 text-white">
                <div>
                    <h3 className="text-3xl font-display font-bold">Lifecycle Network Overrides</h3>
                    <p className="text-[10px] font-bold text-red-200 mt-1">Direct State Injection System</p>
                </div>
                <div className="px-6 py-2 bg-white/20 rounded-full text-[10px] font-semibold border border-white/20">Danger Zone Access</div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-line">
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40">Inventory Segment</th>
                            <th className="px-10 py-6 font-semibold text-[10px] text-ink/40">Direct Vector Injection</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-paper/50 transition-colors">
                                <td className="px-10 py-8">
                                    <div className="font-black text-ink text-lg">{item.title}</div>
                                    <div className="inline-block px-3 py-1 bg-ink/[0.04] rounded-lg text-[10px] font-black text-ink/40 mt-2 uppercase">CURRENT: {item.state}</div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex gap-2 flex-wrap">
                                        {['ACTIVE', 'PENDING_HANDOVER', 'READY_FOR_PICKUP', 'RESOLVED', 'ARCHIVED'].map(s => (
                                            <button key={s} onClick={() => override(item.id, s)} className={`px-4 py-2 rounded-xl text-[9px] font-semibold border-2 transition-all ${item.state === s ? 'bg-ink text-white border-black shadow-xl' : 'bg-white text-ink/40 border-line hover:border-red-500 hover:text-red-500 hover:shadow-lg'}`}>{s}</button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const TicketsPanel = ({ tickets, refresh, userId }) => {
    const [replying, setReplying] = useState(null);
    const [response, setResponse] = useState('');
    const [status, setStatus] = useState('IN_PROGRESS');

    const handleRespond = async (id) => {
        const res = await fetch(`${API_BASE_URL}/api/tickets/${id}/respond`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: userId, staff_response: response, status })
        });
        if (res.ok) { setReplying(null); setResponse(''); refresh(); }
    };

    return (
        <div className="bg-white rounded-xl border border-line shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-line flex justify-between items-center bg-teal-600 text-white">
                <div>
                    <h3 className="text-3xl font-display font-bold">Support Help Desk</h3>
                    <p className="text-[10px] font-bold text-teal-200 mt-1">Student &amp; Staff Tickets</p>
                </div>
                <div className="px-6 py-2 bg-white/20 rounded-full text-[10px] font-semibold border border-white/20">
                    {tickets.filter(t => t.status === 'OPEN').length} Open
                </div>
            </div>
            <div className="divide-y divide-gray-50">
                {tickets.map(t => (
                    <div key={t.id} className="p-10 hover:bg-paper/50 transition-colors">
                        <div className="flex justify-between items-start gap-6 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-ink/[0.04] rounded-lg text-[9px] font-black text-ink/50">{t.category}</span>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-semibold
                                        ${t.status === 'OPEN' ? 'bg-orange-50 text-orange-600' :
                                            t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600' :
                                                t.status === 'RESOLVED' ? 'bg-green-50 text-green-600' : 'bg-ink/[0.04] text-ink/50'}`}>
                                        {t.status}
                                    </span>
                                </div>
                                <h4 className="font-black text-ink text-lg">{t.subject}</h4>
                                <p className="text-sm text-ink/50 font-medium mt-1 max-w-2xl">{t.description}</p>
                            </div>
                            <div className="text-[10px] font-black text-ink/25 uppercase whitespace-nowrap">
                                #{t.id} &middot; {new Date(t.created_at).toLocaleDateString()}
                            </div>
                        </div>

                        {t.staff_response && (
                            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-4 flex gap-3">
                                <LifeBuoy size={16} className="text-teal-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-teal-700 font-bold">{t.staff_response}</p>
                            </div>
                        )}

                        {replying === t.id ? (
                            <div className="space-y-3 bg-paper p-6 rounded-2xl border-2 border-line">
                                <textarea
                                    className="w-full bg-white border-2 border-line rounded-xl p-4 text-sm font-medium outline-none focus:border-primary"
                                    rows={3}
                                    placeholder="Write a response..."
                                    value={response}
                                    onChange={e => setResponse(e.target.value)}
                                />
                                <div className="flex justify-between items-center gap-3">
                                    <select
                                        className="bg-white border-2 border-line rounded-xl px-4 py-2 text-xs font-semibold outline-none"
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                    >
                                        {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <button onClick={() => setReplying(null)} className="px-4 py-2 bg-gray-200 text-ink/50 rounded-xl text-xs font-semibold">Cancel</button>
                                        <button onClick={() => handleRespond(t.id)} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2"><Send size={14} /> Send</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => { setReplying(t.id); setResponse(t.staff_response || ''); setStatus(t.status === 'OPEN' ? 'IN_PROGRESS' : t.status); }}
                                className="text-xs font-black text-teal-600"
                            >
                                Respond &rarr;
                            </button>
                        )}
                    </div>
                ))}
                {tickets.length === 0 && <div className="p-32 text-center text-ink/25 font-semibold tracking-[0.5em] opacity-40">No tickets</div>}
            </div>
        </div>
    );
};

const RECOMMENDATION_STYLES = {
    APPROVE: 'bg-green-50 text-green-600 border-green-100',
    REJECT: 'bg-red-50 text-red-600 border-red-100',
    NEEDS_HUMAN_REVIEW: 'bg-orange-50 text-orange-600 border-orange-100',
};

const ClaimsReviewPanel = ({ claims, reviews, refresh }) => {
    const setStatus = async (claimId, status) => {
        const res = await authFetch(`/api/admin/claims/${claimId}?status=${status}`, { method: 'PUT' });
        if (res.ok) refresh();
    };

    return (
        <div className="bg-white rounded-xl border border-line shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-line flex justify-between items-center bg-indigo-600 text-white">
                <div>
                    <h3 className="text-3xl font-display font-bold flex items-center gap-3">
                        <Bot size={28} /> Agentic Claim Review
                    </h3>
                    <p className="text-[10px] font-bold text-indigo-200 mt-1">
                        AI second opinion &middot; does not auto-decide claims, staff has final say
                    </p>
                </div>
            </div>
            <div className="divide-y divide-gray-50">
                {claims.map(c => {
                    const review = reviews[c.id];
                    return (
                        <div key={c.id} className="p-10 hover:bg-paper/50 transition-colors">
                            <div className="flex justify-between items-start gap-6 mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-ink/[0.04] rounded-lg text-[9px] font-black text-ink/50">Claim #{c.id}</span>
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-semibold ${c.status === 'APPROVED' ? 'bg-green-50 text-green-600' : c.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {c.status}
                                        </span>
                                        <span className="text-[10px] font-black text-ink/40 uppercase">Quiz {c.quiz_score}/3</span>
                                    </div>
                                    <p className="text-sm text-ink/50 font-medium max-w-2xl italic">&quot;{c.owner_private_info}&quot;</p>
                                </div>
                            </div>

                            {review ? (
                                <div className={`rounded-2xl p-5 border-2 ${RECOMMENDATION_STYLES[review.recommendation] || RECOMMENDATION_STYLES.NEEDS_HUMAN_REVIEW}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot size={16} />
                                        <span className="text-xs font-semibold">{review.recommendation}</span>
                                        <span className="text-[10px] font-bold opacity-70">({Math.round(review.confidence * 100)}% confidence)</span>
                                    </div>
                                    <p className="text-sm font-bold mb-2">{review.reasoning}</p>
                                    {review.flags?.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {review.flags.map((f, i) => (
                                                <span key={i} className="flex items-center gap-1 px-2 py-1 bg-white/60 rounded-lg text-[9px] font-semibold">
                                                    <Flag size={10} /> {f}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-ink/25 font-semibold">No agent review available</p>
                            )}

                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setStatus(c.id, 'APPROVED')} className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold">Approve</button>
                                <button onClick={() => setStatus(c.id, 'REJECTED')} className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-semibold">Reject</button>
                            </div>
                        </div>
                    );
                })}
                {claims.length === 0 && <div className="p-32 text-center text-ink/25 font-semibold tracking-[0.5em] opacity-40">No claims</div>}
            </div>
        </div>
    );
};

export default AdminDashboard;
