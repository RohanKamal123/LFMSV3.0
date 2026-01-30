import { useState, useEffect } from 'react';
import {
    Bell, BellOff, MessageSquare, Clock, ArrowRight, User,
    CheckCircle2, CreditCard, QrCode, Package, ExternalLink,
    AlertCircle, Archive, ShieldCheck, MapPin, X, ScanLine, LayoutDashboard, Search
} from 'lucide-react';
import { Html5QrcodeScanner } from "html5-qrcode";
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';
import { Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import HandoverScanner from '../components/HandoverScanner';

const Dashboard = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'hub');
    const [notifications, setNotifications] = useState([]);
    const [foundItems, setFoundItems] = useState([]);
    const [fastIdReports, setFastIdReports] = useState([]);
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isStaffScannerOpen, setIsStaffScannerOpen] = useState(false);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // Staff QR Scanner logic
    useEffect(() => {
        if (isStaffScannerOpen && !joining) {
            const scanner = new Html5QrcodeScanner("staff-reader", {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            });

            scanner.render(async (decodedText) => {
                if (decodedText.startsWith("FINDX_SESSION|")) {
                    const token = decodedText.split("|")[1];
                    scanner.clear();
                    joinStaffSession(token);
                }
            }, (err) => { });

            return () => {
                scanner.clear().catch(err => console.error("Scanner clear fail", err));
            };
        }
    }, [isStaffScannerOpen, joining]);

    const joinStaffSession = async (token) => {
        setJoining(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/handover-session/join?session_token=${token}&claimant_id=${user.id}`, {
                method: 'POST'
            });
            if (res.ok) {
                alert("Connected to Room 110! Your approved items are now visible to the staff.");
                setIsStaffScannerOpen(false);
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to join session");
            }
        } catch (err) {
            alert("Network Error: Could not reach terminal");
        } finally {
            setJoining(false);
        }
    };

    const fetchData = async () => {
        try {
            const [notifRes, fastIdRes, foundItemsRes, claimsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/fast-id/notifications/${user.id}`),
                fetch(`${API_BASE_URL}/api/fast-id/my-reports/${user.id}`),
                fetch(`${API_BASE_URL}/api/items/?finder_id=${user.id}`),
                fetch(`${API_BASE_URL}/api/claims/?claimant_id=${user.id}`)
            ]);

            if (notifRes.ok) setNotifications(await notifRes.json());
            if (fastIdRes.ok) setFastIdReports(await fastIdRes.json());
            if (foundItemsRes.ok) setFoundItems(await foundItemsRes.json());
            if (claimsRes.ok) setClaims(await claimsRes.json());
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/api/fast-id/notifications/${id}/read`, { method: 'PUT' });
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusStyle = (state) => {
        switch (state) {
            case 'ACTIVE': return 'bg-teal-50 text-teal-600 border-teal-100';
            case 'PENDING_HANDOVER': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'OVERDUE_SUBMISSION': return 'bg-red-50 text-red-600 border-red-100 animate-pulse';
            case 'READY_FOR_PICKUP': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'RESOLVED': return 'bg-green-50 text-green-600 border-green-100';
            case 'ARCHIVED': return 'bg-gray-100 text-gray-500 border-gray-200';
            default: return 'bg-gray-50 text-gray-400 border-gray-100';
        }
    };

    const tabs = [
        { id: 'hub', label: 'Hub Home', icon: LayoutDashboard, desc: 'Overview & QR' },
        { id: 'claims', label: 'My Claims', icon: CheckCircle2, desc: 'Active Requests' },
        { id: 'reports', label: 'My Reports', icon: Package, desc: 'Found Item Logs' },
        { id: 'timeline', label: 'Timeline', icon: Clock, desc: 'Recent Activity' },
    ];

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-primary border-r-2"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Package size={20} className="text-primary animate-pulse" />
                </div>
            </div>
        </div>
    );

    const hasApprovedClaims = claims.some(c => c.status === 'APPROVED' || c.is_verified);
    const activeReportsNeedingDropoff = foundItems.filter(i => i.state === 'ACTIVE' || i.state === 'PENDING_HANDOVER' || i.state === 'OVERDUE_SUBMISSION');

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 font-inter flex flex-col gap-10 animate-in fade-in duration-500">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div>
                    <h2 className="text-6xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-4">Student Hub</h2>
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={fetchData}>
                        <div className={`w-3 h-3 rounded-full bg-orange-500 animate-pulse`}></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Handover Stream</span>
                    </div>
                </div>

                {hasApprovedClaims && (
                    <div className="p-6 bg-green-500/10 rounded-[2.5rem] border border-green-500/20 flex items-center gap-6">
                        <div className="relative p-2 bg-white rounded-2xl shadow-sm border border-green-100">
                            <QRCodeSVG value={JSON.stringify({ uiu_id: user.uiu_id, name: user.name })} size={60} />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 p-1 rounded-lg text-white">
                                <QrCode size={12} />
                            </div>
                        </div>
                        <div>
                            <div className="text-green-600 font-black text-[9px] uppercase tracking-widest mb-1">Claimant ID</div>
                            <div className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">{user.uiu_id}</div>
                            <p className="text-[8px] text-gray-500 font-bold uppercase mt-1">Show at Room 110 for pickup</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Horizontal Navigation */}
            <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-xl p-2 rounded-[3rem] border border-gray-100 shadow-xl overflow-x-auto no-scrollbar">
                <nav className="flex items-center gap-2 min-w-max">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSearchParams({ tab: tab.id });
                            }}
                            className={`flex items-center gap-4 px-8 py-5 rounded-[2.5rem] transition-all group ${activeTab === tab.id
                                ? 'bg-gray-900 text-white shadow-2xl shadow-gray-900/40 scale-105'
                                : 'text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-primary' : 'bg-gray-100 text-gray-400 group-hover:text-primary transition-colors'}`}>
                                <tab.icon size={18} />
                            </div>
                            <div className="text-left">
                                <div className="text-[12px] font-black uppercase tracking-tight">{tab.label}</div>
                                <div className={`text-[8px] font-bold uppercase tracking-widest ${activeTab === tab.id ? 'text-gray-400' : 'text-gray-300'}`}>{tab.desc}</div>
                            </div>
                        </button>
                    ))}
                </nav>
            </div>

            <main className="animate-in slide-in-from-bottom-12 duration-700">
                {/* HUB OVERVIEW TAB */}
                {activeTab === 'hub' && (
                    <div className="space-y-10">
                        {/* Urgent Alert */}
                        {activeReportsNeedingDropoff.length > 0 && (
                            <div className="bg-red-600 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md animate-pulse">
                                            <AlertCircle size={32} />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Room 110 Required</h2>
                                            <p className="text-red-100 font-medium max-w-xl text-sm leading-relaxed">
                                                You have **{activeReportsNeedingDropoff.length}** item(s) pending drop-off. Please visit security within 72 hours.
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveTab('reports')} className="bg-white text-red-600 font-black text-xs px-10 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all uppercase tracking-widest">
                                        View Pending Items
                                    </button>
                                </div>
                                <div className="absolute right-[-5%] bottom-[-20%] opacity-10 rotate-12">
                                    <Package size={200} />
                                </div>
                            </div>
                        )}

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Welcome Card */}
                            <div className="bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                                <div className="relative z-10">
                                    <h3 className="text-4xl font-black mb-4 tracking-tighter">Welcome Back, <br /><span className="text-primary">{user.name.split(' ')[0]}</span></h3>
                                    <p className="text-gray-400 text-sm font-medium max-w-sm mb-8">
                                        Your sector activity is high today. Check your claims or start a new report below.
                                    </p>
                                </div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <Link to="/found" className="bg-primary text-white font-black text-xs px-8 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20">
                                        REPORT FOUND
                                    </Link>
                                    <Link to="/browse" className="bg-white/10 hover:bg-white/20 text-white font-black text-xs px-8 py-4 rounded-2xl border border-white/10 transition-all">
                                        FIND MY LOST ITEM
                                    </Link>
                                </div>
                                <div className="absolute right-[-10%] top-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000"></div>
                            </div>

                            {/* Action Scanner Card */}
                            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl flex flex-col items-center justify-center text-center group">
                                <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform shadow-lg shadow-orange-500/10">
                                    <ScanLine size={40} />
                                </div>
                                <h4 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Handover Scan</h4>
                                <p className="text-gray-500 text-sm font-medium mb-8 max-w-xs">
                                    Ready to drop off an item or verify someone else's? Use the universal scanner.
                                </p>
                                <button
                                    onClick={() => setIsScannerOpen(true)}
                                    className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl"
                                >
                                    Launch QR Scanner
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MY CLAIMS TAB */}
                {activeTab === 'claims' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">My Active Claims</h2>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Tracking {claims.length} claim requests</p>
                            </div>
                            <div className="bg-green-500/10 text-green-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                                Verified Status: Online
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {claims.map((claim) => (
                                <div key={claim.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group overflow-hidden flex flex-col">
                                    <div className="relative h-56 group-hover:h-64 transition-all duration-700">
                                        <img
                                            src={claim.item?.image_url || `https://placehold.co/600x400/teal/white?text=${claim.item?.title}`}
                                            alt={claim.item?.title}
                                            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                                        />
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter border-2 bg-white/90 backdrop-blur-sm ${getStatusStyle(claim.item?.state || claim.status)}`}>
                                                {claim.item?.state || claim.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-8 flex-1 flex flex-col">
                                        <div className="mb-6">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">CLAIM #{claim.id}</p>
                                            <h4 className="text-2xl font-black text-gray-900 uppercase leading-none mb-4 group-hover:text-primary transition-colors">
                                                {claim.item?.title || `Security Item #ID${claim.item_id}`}
                                            </h4>

                                            <div className="flex items-center gap-4 py-4 border-y border-gray-50 mb-4">
                                                <div className="text-center flex-1">
                                                    <div className="text-[8px] text-gray-400 font-bold uppercase mb-0.5">Quiz Score</div>
                                                    <div className="text-lg font-black text-gray-900">{claim.quiz_score}/3</div>
                                                </div>
                                                <div className="w-px h-8 bg-gray-100"></div>
                                                <div className="text-center flex-1">
                                                    <div className="text-[8px] text-gray-400 font-bold uppercase mb-0.5">Verification</div>
                                                    <div className="text-lg font-black text-green-500">{claim.is_verified ? 'PASS' : 'HOLD'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto space-y-4">
                                            {(claim.status === 'APPROVED' || claim.is_verified) ? (
                                                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-start gap-3">
                                                    <ShieldCheck size={16} className="text-green-600 mt-0.5" />
                                                    <p className="text-[10px] text-green-700 font-bold leading-tight uppercase tracking-tight">
                                                        Verification Successful: Show your Hub QR at Room 110 for pickup.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-start gap-3">
                                                    <Clock size={16} className="text-orange-600 mt-0.5" />
                                                    <p className="text-[10px] text-orange-700 font-bold leading-tight uppercase tracking-tight">
                                                        Claim Pending Review: Our team is auditing your verification score.
                                                    </p>
                                                </div>
                                            )}

                                            <button className="w-full py-4 rounded-2xl border-2 border-gray-900 text-gray-900 font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all">
                                                View Claim Audit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {claims.length === 0 && (
                                <div className="md:col-span-3 py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                                    <div className="p-6 bg-white rounded-full shadow-sm mb-6">
                                        <Search size={40} className="text-gray-200" />
                                    </div>
                                    <h4 className="text-2xl font-black text-gray-300 uppercase tracking-tighter">No Active Claims</h4>
                                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 px-10">Start by finding your item in the browse section.</p>
                                    <Link to="/browse" className="mt-8 bg-primary text-white font-black text-xs px-10 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                                        BROWSE ITEMS
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MY REPORTS TAB */}
                {activeTab === 'reports' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Reported Assets</h2>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Managing {foundItems.length + fastIdReports.length} logs</p>
                            </div>
                            <button
                                onClick={() => setIsScannerOpen(true)}
                                className="bg-gray-900 text-white font-black text-[10px] px-8 py-3 rounded-2xl shadow-xl uppercase tracking-widest hover:bg-primary transition-colors flex items-center gap-2"
                            >
                                <QrCode size={16} /> Handover Scanner
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {[...foundItems, ...fastIdReports].map((item) => (
                                <div key={item.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={`text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-tighter border-2 ${getStatusStyle(item.state || item.status)}`}>
                                            {item.state || item.status}
                                        </span>
                                        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">ID: #{item.id}</p>
                                    </div>

                                    <h4 className="text-xl font-black text-gray-900 mb-2 truncate group-hover:text-primary transition-colors uppercase tracking-tight">
                                        {item.title || `Student ID: ${item.extracted_id || item.manual_id}`}
                                    </h4>
                                    <p className="text-gray-500 text-[10px] font-medium leading-relaxed mb-6 line-clamp-2">
                                        {item.description || "System log generated via automated sector report."}
                                    </p>

                                    {(item.state === 'ACTIVE' || item.state === 'PENDING_HANDOVER' || item.state === 'OVERDUE_SUBMISSION') && (
                                        <div className={`p-5 rounded-2xl mb-6 border-2 ${item.state === 'OVERDUE_SUBMISSION' ? 'bg-red-50 border-red-100 animate-pulse' : 'bg-orange-50 border-orange-100'}`}>
                                            <p className={`text-[10px] ${item.state === 'OVERDUE_SUBMISSION' ? 'text-red-700' : 'text-orange-700'} font-black leading-tight flex items-start gap-2 uppercase tracking-tight`}>
                                                <AlertCircle size={14} className="shrink-0" />
                                                Action Required: Room 110 Handover
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
                                                <MapPin size={16} />
                                            </div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">UIU Sector Log</p>
                                        </div>
                                        <button className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl hover:bg-primary hover:text-white transition-all flex items-center justify-center">
                                            <ExternalLink size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(foundItems.length + fastIdReports.length) === 0 && (
                                <div className="md:col-span-3 py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                                    <Package size={40} className="text-gray-200 mb-4" />
                                    <h4 className="text-2xl font-black text-gray-300 uppercase tracking-tighter">No Item Reports</h4>
                                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">You haven't found any items yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'timeline' && (
                    <div className="max-w-4xl mx-auto py-10">
                        <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl overflow-hidden relative">
                            <div className="flex items-center justify-between mb-12">
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Activity Stream</h2>
                                {notifications.filter(n => !n.is_read).length > 0 && (
                                    <span className="bg-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg">
                                        {notifications.filter(n => !n.is_read).length} NEW
                                    </span>
                                )}
                            </div>

                            <div className="space-y-12 relative z-10">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => markAsRead(notif.id)}
                                        className={`relative pl-12 transition-all transition-all duration-500 cursor-pointer group ${notif.is_read ? 'opacity-40 grayscale' : ''}`}
                                    >
                                        {/* Timeline Connector */}
                                        <div className="absolute left-[13px] top-8 bottom-[-48px] w-0.5 bg-gray-100 last:hidden"></div>

                                        {/* Activity Icon */}
                                        <div className={`absolute left-0 top-1 w-7 h-7 rounded-full border-4 border-white shadow-xl flex items-center justify-center group-hover:scale-125 transition-transform ${notif.type === 'SYSTEM_ALERT' ? 'bg-red-500' : 'bg-primary'
                                            }`}>
                                            <Bell size={12} className="text-white" />
                                        </div>

                                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-transparent group-hover:border-primary/20 group-hover:bg-white transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                                    {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <div className="text-[8px] font-black text-gray-300 uppercase letter-spacing-[0.2em]">Live Notification</div>
                                            </div>
                                            <h4 className={`text-xl font-black mb-2 transition-colors uppercase tracking-tight ${notif.is_read ? 'text-gray-500' : 'text-gray-900'} group-hover:text-primary`}>
                                                {notif.title}
                                            </h4>
                                            <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-2xl">
                                                {notif.message}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {notifications.length === 0 && (
                                    <div className="text-center py-20">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <BellOff size={32} className="text-gray-200" />
                                        </div>
                                        <h4 className="text-2xl font-black text-gray-300 uppercase tracking-tighter">Quiet Day</h4>
                                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">No system pings or active alerts.</p>
                                    </div>
                                )}
                            </div>

                            {/* Background decoration */}
                            <div className="absolute right-[-10%] top-[-5%] w-96 h-96 bg-gray-50 rounded-full blur-[100px] -z-10"></div>
                        </div>
                    </div>
                )}
            </main>

            {/* Verification Modals */}
            {isStaffScannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[4rem] p-12 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-500 relative">
                        <button onClick={() => setIsStaffScannerOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-400" />
                        </button>
                        <div className="text-center mb-8">
                            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Pickup Vault Entry</h3>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Scanning Room 110 Terminal QR</p>
                        </div>
                        <div id="staff-reader" className="overflow-hidden rounded-[3rem] border-8 border-gray-50 bg-gray-50 mb-8 aspect-square"></div>
                        <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                                <QrCode size={24} />
                            </div>
                            <p className="text-[11px] text-orange-800 font-bold uppercase leading-tight tracking-tight">
                                Aim your camera at the screen shown by the security officer to complete the handover.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <HandoverScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                user={user}
                items={[...foundItems, ...fastIdReports]}
                onHandoverSuccess={fetchData}
            />
        </div>
    );
};

export default Dashboard;
