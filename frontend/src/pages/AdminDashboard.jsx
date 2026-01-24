import { useState, useEffect } from 'react';
import {
    BarChart3, Users, Archive, AlertTriangle, ShieldCheck,
    Activity, RefreshCw, Edit3, Trash2, X, CheckCircle2,
    QrCode, Search, TrendingUp, Database, Layers, Eye, UserCheck,
    Clock, Terminal, Package
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { API_BASE_URL } from '../api_config';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('analytics');
    const [stats, setStats] = useState(null);
    const [items, setItems] = useState([]);
    const [fastIdItems, setFastIdItems] = useState([]);
    const [loginLogs, setLoginLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAllData();
        const timer = setInterval(fetchAllData, 10000); // Poll every 10s
        return () => clearInterval(timer);
    }, []);

    const fetchAllData = async () => {
        try {
            const [statsRes, itemsRes, fidRes, logsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/admin-stats/summary-stats`),
                fetch(`${API_BASE_URL}/api/admin/items`),
                fetch(`${API_BASE_URL}/api/fast-id/all-items`),
                fetch(`${API_BASE_URL}/api/admin-stats/login-logs`)
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (itemsRes.ok) setItems(await itemsRes.json());
            if (fidRes.ok) setFastIdItems(await fidRes.json());
            if (logsRes.ok) setLoginLogs(await logsRes.json());
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
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-[0.3em] mb-2 font-inter">HQ Syncing</h2>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Bridging secure administrative tunnels...</p>
        </div>
    );

    const tabs = [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'logs', label: 'Monitor', icon: UserCheck },
        { id: 'items', label: 'Items CRUD', icon: Archive },
        { id: 'fast_id', label: 'ID Registry', icon: Users },
        { id: 'flow', label: 'Flow CRUD', icon: Layers },
    ];

    return (
        <div className="pb-20 font-inter animate-in fade-in duration-500">
            {/* Command Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
                <div>
                    <h2 className="text-6xl font-black text-gray-900 tracking-tighter uppercase leading-none">Command Hub</h2>
                </div>

                <div className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-[2rem] shadow-inner border border-gray-200/50">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-white text-primary shadow-xl scale-105'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                    <button
                        onClick={handleManualRefresh}
                        className={`p-3 rounded-full text-gray-400 hover:bg-white hover:text-primary transition-all ${refreshing ? 'animate-spin text-primary' : ''}`}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Current View */}
            <div className="animate-in slide-in-from-bottom-8 duration-700">
                {activeTab === 'analytics' && <AnalyticsPanel stats={stats} />}
                {activeTab === 'logs' && <LogsPanel logs={loginLogs} />}
                {activeTab === 'items' && <ItemsCrudPanel items={items} refresh={fetchAllData} userId={user?.id} />}
                {activeTab === 'fast_id' && <FastIdCrudPanel items={fastIdItems} refresh={fetchAllData} />}
                {activeTab === 'flow' && <FlowOverridePanel items={items} refresh={fetchAllData} userId={user?.id} />}
            </div>
        </div>
    );
};

/* --- PANELS --- */

const AnalyticsPanel = ({ stats }) => {
    if (!stats) return null;

    const cards = [
        { label: "Active Items", value: stats.summary.ACTIVE || 0, color: "text-blue-600", bg: "bg-blue-50", icon: Database },
        { label: "Pending Pickup", value: stats.summary.READY_FOR_PICKUP || 0, color: "text-orange-600", bg: "bg-orange-50", icon: Package },
        { label: "Resolved Total", value: stats.summary.RESOLVED || 0, color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
        { label: "Late Assets", value: stats.summary.OVERDUE_SUBMISSION || 0, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
    ];

    return (
        <div className="space-y-10">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl relative overflow-hidden group">
                        <div className={`${card.bg} ${card.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                            <card.icon size={28} />
                        </div>
                        <h4 className="text-5xl font-black text-gray-900 leading-none mb-1">{card.value}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{card.label}</p>
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                            <card.icon size={100} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance Chart */}
            <div className="grid lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[4rem] border border-gray-100 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">System Intelligence</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Last 7 Cycles Activity</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-orange-500/20"></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Found</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-400 shadow-lg shadow-teal-500/20"></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resolved</span></div>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.timeline}>
                                <defs>
                                    <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                <YAxis stroke="#94A3B8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }}
                                    itemStyle={{ fontWeight: 'black', fontSize: '10px', textTransform: 'uppercase' }}
                                />
                                <Area type="monotone" dataKey="found" stroke="#FF6B00" strokeWidth={5} fillOpacity={1} fill="url(#primaryGrad)" />
                                <Area type="monotone" dataKey="resolved" stroke="#2DD4BF" strokeWidth={5} fillOpacity={1} fill="url(#tealGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gray-900 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 flex items-center gap-3">
                            <ShieldCheck className="text-orange-500" size={28} />
                            Logistics Yield
                        </h3>
                        <div className="space-y-8">
                            {['Sector A', 'Sector B', 'Sector C'].map((sector, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                        <span>{sector} Integrity</span>
                                        <span className="text-white">{90 - (i * 10)}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="bg-orange-500 h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${90 - (i * 10)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-8 border-t border-white/5 mt-10">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">System Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                                    <span className="text-lg font-black uppercase tracking-widest">Optimized</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute right-[-20%] bottom-[-20%] w-80 h-80 bg-orange-600/10 rounded-full blur-[100px]"></div>
                </div>
            </div>
        </div>
    );
};

const LogsPanel = ({ logs }) => {
    return (
        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in duration-500">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Login Monitor</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time session authorization tracking</p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Clock size={16} className="text-primary" />
                    <span className="text-xs font-black uppercase text-gray-900">Live Node Active</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-gray-50">
                            <th className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">User ID</th>
                            <th className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">UIU ID</th>
                            <th className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Login Time</th>
                            <th className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">User</th>
                            <th className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-inter">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-6">
                                    <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-black text-gray-600">#{log.user_id || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-6">
                                    <span className="font-bold text-gray-900 text-sm">{log.uiu_id || 'Unknown'}</span>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-400"><Clock size={16} /></div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-sm">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{new Date(log.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm
                                            ${log.role === 'ADMIN' ? 'bg-indigo-600 text-white shadow-indigo-500/20' :
                                                log.role === 'STAFF' ? 'bg-primary text-white shadow-orange-500/20' :
                                                    'bg-teal-500 text-white shadow-teal-500/20'}
                                        `}>
                                            {log.role?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 uppercase tracking-tight">{log.user_name}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{log.role}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 max-w-xs truncate">
                                        <ShieldCheck size={14} className="text-green-500 shrink-0" />
                                        <span className="truncate">{log.details}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && <div className="p-32 text-center text-gray-300 font-black uppercase tracking-[0.5em] opacity-40">No session logs detected</div>}
            </div>
        </div>
    );
};

const ItemsCrudPanel = ({ items, refresh, userId }) => {
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    const handleUpdate = async (id) => {
        const res = await fetch(`${API_BASE_URL}/api/admin/items/${id}?admin_id=${userId || 1}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) { setEditing(null); refresh(); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Permanently erase this asset?")) return;
        const res = await fetch(`${API_BASE_URL}/api/admin/items/${id}?admin_id=${userId || 1}`, { method: 'DELETE' });
        if (res.ok) refresh();
    };

    return (
        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-900 text-white">
                <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Global Asset Registry</h3>
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1">Central CRUD Oversight</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-gray-50">
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Object Definition</th>
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Status Node</th>
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400 text-right">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-10 py-8">
                                    {editing === item.id ? (
                                        <input className="w-full bg-white border-2 border-primary rounded-xl px-4 py-3 font-bold text-sm outline-none" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    ) : (
                                        <>
                                            <div className="font-black text-gray-900 uppercase tracking-tight text-lg">{item.title}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">REF_ID: #{item.id}</div>
                                        </>
                                    )}
                                </td>
                                <td className="px-10 py-8">
                                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2
                                        ${item.state === 'ACTIVE' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                                            item.state === 'RESOLVED' ? 'bg-green-50 text-green-600 border-green-100' :
                                                'bg-orange-50 text-orange-600 border-orange-100'}
                                    `}>
                                        {item.state}
                                    </span>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <div className="flex justify-end gap-3">
                                        {editing === item.id ? (
                                            <>
                                                <button onClick={() => handleUpdate(item.id)} className="p-3 bg-green-500 text-white rounded-2xl shadow-lg shadow-green-500/20"><CheckCircle2 size={18} /></button>
                                                <button onClick={() => setEditing(null)} className="p-3 bg-gray-200 text-gray-500 rounded-2xl"><X size={18} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditing(item.id); setForm(item); }} className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-primary hover:text-white transition-all"><Edit3 size={18} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
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
        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-2xl overflow-hidden relative">
            <div className="p-10 border-b border-gray-50 bg-indigo-600 text-white flex justify-between items-center">
                <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">ID Verification Registry</h3>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Manual Intelligence Overrides</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-gray-50">
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Card Preview</th>
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Extracted ID</th>
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400 text-right">Ops</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-10 py-6">
                                    {r.image_url ? (
                                        <div className="relative group/eye w-28 h-16 bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-100 cursor-pointer shadow-sm hover:border-indigo-400 transition-all" onClick={() => setPreview(`${API_BASE_URL}${r.image_url}`)}>
                                            <img src={`${API_BASE_URL}${r.image_url}`} className="w-full h-full object-contain group-hover/eye:scale-110 transition-transform p-1" />
                                            <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover/eye:opacity-100 transition-opacity flex items-center justify-center"><Eye size={18} className="text-white drop-shadow-md" /></div>
                                        </div>
                                    ) : <span className="text-[10px] font-black text-gray-300 uppercase italic">No Visual</span>}
                                </td>
                                <td className="px-10 py-6">
                                    {editing === r.id ? (
                                        <div className="flex gap-2">
                                            <input className="bg-white border-2 border-primary rounded-xl px-4 py-3 font-bold text-sm outline-none shadow-xl" value={val} onChange={e => setVal(e.target.value)} autoFocus />
                                            <button onClick={() => handleUpdate(r.id)} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-orange-500/20"><CheckCircle2 size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className={`text-xl font-black uppercase tracking-tight ${!r.extracted_id && !r.manual_id ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>
                                                {r.extracted_id || r.manual_id || 'Extraction Failed'}
                                            </div>
                                            <button onClick={() => { setEditing(r.id); setVal(r.extracted_id || r.manual_id || ''); }} className="p-2 text-gray-300 hover:text-primary transition-opacity opacity-0 group-hover:opacity-100"><Edit3 size={16} /></button>
                                        </div>
                                    )}
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <button onClick={async () => { if (confirm("Purge ID record?")) { await fetch(`${API_BASE_URL}/api/fast-id/items/${r.id}`, { method: 'DELETE' }); refresh(); } }} className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
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
                        <div className="bg-white p-2 rounded-[2rem] shadow-2xl border-8 border-white/10 overflow-hidden">
                            <img
                                src={preview}
                                className="max-w-full max-h-[80vh] object-contain rounded-[1.5rem]"
                                alt="ID Card Full Preview"
                            />
                        </div>
                        <div className="mt-6 text-center">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Secure Verification Mode</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FlowOverridePanel = ({ items, refresh, userId }) => {
    const override = async (id, state) => {
        const res = await fetch(`${API_BASE_URL}/api/admin/items/${id}?admin_id=${userId || 1}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
        });
        if (res.ok) refresh();
    };

    return (
        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-red-600 text-white">
                <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Lifecycle Network Overrides</h3>
                    <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mt-1">Direct State Injection System</p>
                </div>
                <div className="px-6 py-2 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Danger Zone Access</div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b-2 border-gray-50">
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Inventory Segment</th>
                            <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Direct Vector Injection</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-10 py-8">
                                    <div className="font-black text-gray-900 uppercase tracking-tight text-lg">{item.title}</div>
                                    <div className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-400 mt-2 uppercase">CURRENT: {item.state}</div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex gap-2 flex-wrap">
                                        {['ACTIVE', 'PENDING_HANDOVER', 'READY_FOR_PICKUP', 'RESOLVED', 'ARCHIVED'].map(s => (
                                            <button key={s} onClick={() => override(item.id, s)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${item.state === s ? 'bg-gray-900 text-white border-black shadow-xl' : 'bg-white text-gray-400 border-gray-100 hover:border-red-500 hover:text-red-500 hover:shadow-lg'}`}>{s}</button>
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

export default AdminDashboard;
