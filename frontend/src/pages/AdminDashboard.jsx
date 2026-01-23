import { useState, useEffect } from 'react';
import { BarChart3, Users, Archive, AlertTriangle, ShieldCheck, Activity, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/items/');
            const data = await res.json();
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (itemId) => {
        if (!confirm("Are you sure you want to archive this item?")) return;
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/items/${itemId}/archive`, { method: 'PUT' });
            if (res.ok) fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const stats = [
        { label: "Active Items", value: items.filter(i => i.state === 'ACTIVE').length, icon: Activity, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Claims Ready", value: items.filter(i => i.state === 'READY_FOR_PICKUP').length, icon: Users, color: "text-orange-600", bg: "bg-orange-100" },
        { label: "Resolved", value: items.filter(i => i.state === 'RESOLVED').length, icon: Archive, color: "text-green-600", bg: "bg-green-100" },
        { label: "Archived", value: items.filter(i => i.state === 'ARCHIVED').length, icon: ShieldCheck, color: "text-gray-600", bg: "bg-gray-100" },
    ];

    if (loading && items.length === 0) return <div className="p-20 text-center font-black animate-pulse text-primary uppercase tracking-[0.3em]">Booting Oversight Module...</div>;

    return (
        <div className="space-y-8 pb-20 font-inter animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">System Oversight</h2>
                    <p className="text-gray-500 font-bold italic text-sm">Real-time Central Command</p>
                </div>
                <button
                    onClick={fetchData}
                    className="group flex items-center gap-2 bg-dark text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-black/10"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                    Live Sync
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-gray-50 flex items-center gap-5 hover:border-primary/30 transition-all group overflow-hidden relative">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-150 transition-transform duration-700">
                                <Icon size={120} />
                            </div>
                            <div className={`${stat.bg} p-4 rounded-2xl ${stat.color} relative z-10 group-hover:rotate-6 transition-transform`}>
                                <Icon size={28} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-4xl font-black text-gray-900 leading-none mb-1">{stat.value}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global Inventory Table */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl">Global Asset Registry</h3>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Database Connected</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b-2 border-gray-50">
                            <tr>
                                <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-gray-400">Reference</th>
                                <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-gray-400">Asset Title</th>
                                <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-gray-400">Network State</th>
                                <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-gray-400">Discovery Node</th>
                                <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-gray-400 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-gray-300 font-bold uppercase tracking-widest">No assets logged in current session</td>
                                </tr>
                            ) : items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="font-mono text-xs font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-lg">#{item.id}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-black text-gray-900 uppercase tracking-tight">{item.title}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">Found: {new Date(item.found_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest
                                            ${item.state === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : ''}
                                            ${item.state === 'READY_FOR_PICKUP' ? 'bg-orange-50 text-orange-600 border border-orange-100' : ''}
                                            ${item.state === 'RESOLVED' ? 'bg-green-50 text-green-600 border border-green-100' : ''}
                                            ${item.state === 'ARCHIVED' ? 'bg-gray-100 text-gray-500 border border-gray-200' : ''}
                                        `}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.state === 'ACTIVE' ? 'bg-blue-500' :
                                                item.state === 'RESOLVED' ? 'bg-green-500' :
                                                    item.state === 'ARCHIVED' ? 'bg-gray-400' : 'bg-orange-500'
                                                }`}></div>
                                            {item.state}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Sector {item.location_id || 'X'}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {item.state === 'RESOLVED' && (
                                                <button
                                                    onClick={() => handleArchive(item.id)}
                                                    className="text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 px-4 py-2 rounded-xl transition-all shadow-lg shadow-orange-500/20"
                                                >
                                                    Archive
                                                </button>
                                            )}
                                            <button className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-dark hover:text-white px-4 py-2 rounded-xl transition-all">
                                                Audit Logs
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
