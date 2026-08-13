import { useState, useEffect } from 'react';
import {
    Bell, BellOff, Clock, ArrowRight, CreditCard,
    CheckCircle2, QrCode, Package, ExternalLink,
    AlertCircle, ShieldCheck, MapPin, X, ScanLine, LayoutDashboard, Search
} from 'lucide-react';
import { Html5QrcodeScanner } from "html5-qrcode";
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, authFetch } from '../api_config';
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
    const [qrToken, setQrToken] = useState(null);

    // The handover identity QR embeds a short-lived signed token (not the
    // raw uiu_id) so a photo of it can't be reused later - refresh it well
    // before it expires while this screen is open.
    useEffect(() => {
        const fetchQrToken = async () => {
            try {
                const res = await authFetch('/api/auth/qr-token');
                if (res.ok) {
                    const data = await res.json();
                    setQrToken(data.token);
                }
            } catch (err) {
                console.error("QR token fetch failed:", err);
            }
        };
        fetchQrToken();
        const interval = setInterval(fetchQrToken, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            }, (_err) => { });

            return () => {
                scanner.clear().catch(err => console.error("Scanner clear fail", err));
            };
        }
    }, [isStaffScannerOpen, joining]);

    const joinStaffSession = async (token) => {
        setJoining(true);
        try {
            const res = await authFetch(`/api/handover-session/join?session_token=${token}`, {
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
                authFetch(`/api/claims/`)
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
        { id: 'hub', label: 'Overview', icon: LayoutDashboard },
        { id: 'claims', label: 'My Claims', icon: CheckCircle2 },
        { id: 'reports', label: 'My Reports', icon: Package },
        { id: 'timeline', label: 'Timeline', icon: Clock },
    ];

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="relative">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-primary border-r-2"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Package size={18} className="text-primary" />
                </div>
            </div>
        </div>
    );

    // claim.status/is_verified are set once at claim time and never revisited -
    // once the underlying item is actually RESOLVED (handed over, either path)
    // or ARCHIVED, this claim is done and shouldn't keep prompting for pickup.
    const hasApprovedClaims = claims.some(c =>
        (c.status === 'APPROVED' || c.is_verified) &&
        c.item?.state !== 'RESOLVED' && c.item?.state !== 'ARCHIVED'
    );
    const activeReportsNeedingDropoff = foundItems.filter(i => i.state === 'ACTIVE' || i.state === 'PENDING_HANDOVER' || i.state === 'OVERDUE_SUBMISSION');
    // Path A only makes sense once someone has actually claimed one of this
    // user's found reports (there's a claimant to scan); Path B only once
    // this user has an approved claim of their own waiting at Room 110.
    const hasPendingHandoverAsFinder = foundItems.some(i => i.state === 'PENDING_HANDOVER');
    const showHandoverCard = hasPendingHandoverAsFinder || hasApprovedClaims;

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <p className="eyebrow mb-2">Live handover stream</p>
                    <h2 className="font-display text-4xl font-bold text-ink">Student Hub</h2>
                </div>

                {hasApprovedClaims && (
                    <div className="card px-6 py-4 flex items-center gap-5">
                        <div className="relative p-1.5 bg-white border border-line rounded-lg">
                            {qrToken
                                ? <QRCodeSVG value={JSON.stringify({ token: qrToken })} size={56} />
                                : <div className="w-14 h-14 flex items-center justify-center text-ink/20"><QrCode size={24} /></div>
                            }
                        </div>
                        <div>
                            <p className="eyebrow text-accent mb-1">Claimant ID</p>
                            <p className="font-mono text-2xl font-semibold text-ink leading-none">{user.uiu_id}</p>
                            <p className="text-xs text-ink/40 font-medium mt-1">Show at Room 110 for pickup</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 border-b-2 border-line overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setSearchParams({ tab: tab.id });
                        }}
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

            <main>
                {/* HUB OVERVIEW TAB */}
                {activeTab === 'hub' && (
                    <div className="space-y-6">
                        {/* Urgent Alert */}
                        {activeReportsNeedingDropoff.length > 0 && (
                            <div className="bg-primary rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <AlertCircle size={28} className="shrink-0" />
                                    <div>
                                        <h2 className="font-display text-lg font-bold mb-0.5">Room 110 drop-off required</h2>
                                        <p className="text-white/80 text-sm">
                                            {activeReportsNeedingDropoff.length} item(s) pending drop-off &mdash; please visit security within 72 hours.
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveTab('reports')} className="bg-white text-primary font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-white/90 transition-all shrink-0">
                                    View pending items
                                </button>
                            </div>
                        )}

                        {/* Fast ID - big, first-class entry point for student ID card recovery */}
                        <Link
                            to="/fast-id"
                            className="group block bg-accent rounded-xl p-8 text-white relative overflow-hidden hover:bg-teal-700 transition-colors"
                        >
                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                                        <CreditCard size={28} />
                                    </div>
                                    <div>
                                        <p className="eyebrow text-white/60 mb-1">AI-powered recovery</p>
                                        <h2 className="font-display text-2xl font-bold mb-1">Lost or found a Student ID?</h2>
                                        <p className="text-white/70 text-sm max-w-md">Fast ID scans and matches ID cards automatically &mdash; usually faster than a regular report.</p>
                                    </div>
                                </div>
                                <span className="bg-white text-accent font-semibold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 shrink-0 group-hover:gap-3 transition-all">
                                    Open Fast ID <ArrowRight size={16} />
                                </span>
                            </div>
                        </Link>

                        <div className={`grid gap-6 ${showHandoverCard ? 'lg:grid-cols-2' : ''}`}>
                            {/* Welcome Card */}
                            <div className="bg-ink rounded-xl p-8 text-white flex flex-col justify-between">
                                <div>
                                    <p className="eyebrow text-white/40 mb-3">{user.is_first_login ? 'Welcome' : 'Welcome back'}</p>
                                    <h3 className="font-display text-3xl font-bold mb-3">{user.name.split(' ')[0]}</h3>
                                    <p className="text-white/50 text-sm max-w-sm mb-8">
                                        Check your claims or start a new report below.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link to="/found" className="btn-primary text-sm">
                                        Report found
                                    </Link>
                                    <Link to="/browse" className="bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-5 py-2.5 rounded-lg border border-white/10 transition-all">
                                        Find my lost item
                                    </Link>
                                </div>
                            </div>

                            {/* Action Scanner Card - only relevant once there's an actual
                                handover to complete (a claimant to scan, or a pickup to join) */}
                            {showHandoverCard && (
                                <div className="card p-8 flex flex-col justify-center">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-11 h-11 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0">
                                            <ScanLine size={22} />
                                        </div>
                                        <div>
                                            <h4 className="font-display text-lg font-bold text-ink">Handover scan</h4>
                                            <p className="text-ink/40 text-xs">Real camera QR scanning</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {hasPendingHandoverAsFinder && (
                                            <button
                                                onClick={() => setIsScannerOpen(true)}
                                                className="btn-ink w-full py-3 text-sm justify-between"
                                            >
                                                Hand over directly (Path A)
                                                <ArrowRight size={15} />
                                            </button>
                                        )}
                                        {hasApprovedClaims && (
                                            <button
                                                onClick={() => setIsStaffScannerOpen(true)}
                                                className="w-full py-3 px-5 text-sm font-semibold text-ink border border-line rounded-lg hover:border-ink/30 transition-all flex items-center justify-between"
                                            >
                                                Join staff pickup session (Path B)
                                                <QrCode size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MY CLAIMS TAB */}
                {activeTab === 'claims' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="font-display text-2xl font-bold text-ink">My Claims</h2>
                            <p className="eyebrow mt-1">{claims.length} tracked</p>
                        </div>

                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {claims.map((claim) => (
                                <div key={claim.id} className="card overflow-hidden flex flex-col">
                                    <div className="relative h-44 border-b border-line">
                                        <img
                                            src={claim.item?.image_url || `https://placehold.co/600x400/161311/f7f3ec?text=${claim.item?.title}`}
                                            alt={claim.item?.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <span className={`absolute top-3 left-3 text-[10px] font-semibold px-2.5 py-1 rounded border ${getStatusStyle(claim.item?.state || claim.status)}`}>
                                            {claim.item?.state || claim.status}
                                        </span>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <p className="ref-tag inline-block w-fit mb-2">CLAIM #{claim.id}</p>
                                        <h4 className="font-display text-lg font-bold text-ink mb-4">
                                            {claim.item?.title || `Item #${claim.item_id}`}
                                        </h4>

                                        <div className="flex items-center gap-4 py-3 divider-dashed border-b mb-4">
                                            <div className="text-center flex-1">
                                                <p className="text-[10px] text-ink/40 font-medium mb-0.5">Quiz score</p>
                                                <p className="text-lg font-semibold text-ink">{claim.quiz_score}/3</p>
                                            </div>
                                            <div className="w-px h-8 bg-line"></div>
                                            <div className="text-center flex-1">
                                                <p className="text-[10px] text-ink/40 font-medium mb-0.5">Verification</p>
                                                <p className={`text-lg font-semibold ${claim.is_verified ? 'text-accent' : 'text-primary'}`}>{claim.is_verified ? 'Pass' : 'Hold'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            {claim.item?.state === 'RESOLVED' ? (
                                                <div className="bg-accent/5 p-3 rounded-lg border border-accent/20 flex items-start gap-2.5">
                                                    <CheckCircle2 size={15} className="text-accent mt-0.5 shrink-0" />
                                                    <p className="text-xs text-accent/90 font-medium leading-snug">
                                                        Resolved &mdash; you&apos;ve received this item.
                                                    </p>
                                                </div>
                                            ) : (claim.status === 'APPROVED' || claim.is_verified) ? (
                                                <div className="bg-accent/5 p-3 rounded-lg border border-accent/20 flex items-start gap-2.5">
                                                    <ShieldCheck size={15} className="text-accent mt-0.5 shrink-0" />
                                                    <p className="text-xs text-accent/90 font-medium leading-snug">
                                                        {claim.item?.state === 'READY_FOR_PICKUP'
                                                            ? <>Verified &mdash; show your Hub QR at Room 110 for pickup.</>
                                                            : <>Verified &mdash; waiting on the finder to hand this over, or drop-off at Room 110.</>}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 flex items-start gap-2.5">
                                                    <Clock size={15} className="text-primary mt-0.5 shrink-0" />
                                                    <p className="text-xs text-primary/90 font-medium leading-snug">
                                                        Pending review &mdash; verification score is being audited.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {claims.length === 0 && (
                                <div className="md:col-span-3 card border-dashed py-24 flex flex-col items-center justify-center text-center">
                                    <Search size={36} className="text-ink/15 mb-4" />
                                    <h4 className="font-display text-xl font-bold text-ink/40">No active claims</h4>
                                    <p className="text-ink/40 text-sm mt-1 px-10">Start by finding your item in the browse section.</p>
                                    <Link to="/browse" className="btn-primary mt-6 text-sm">
                                        Browse items
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MY REPORTS TAB */}
                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h2 className="font-display text-2xl font-bold text-ink">Reported Items</h2>
                                <p className="eyebrow mt-1">{foundItems.length + fastIdReports.length} logs</p>
                            </div>
                            {hasPendingHandoverAsFinder && (
                                <button
                                    onClick={() => setIsScannerOpen(true)}
                                    className="btn-ink text-sm"
                                >
                                    <QrCode size={15} /> Handover scanner
                                </button>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {[...foundItems, ...fastIdReports].map((item) => (
                                <div key={item.id} className="card p-6 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded border ${getStatusStyle(item.state || item.status)}`}>
                                            {item.state || item.status}
                                        </span>
                                        <span className="ref-tag">#{item.id}</span>
                                    </div>

                                    <h4 className="font-display text-lg font-bold text-ink mb-2 truncate">
                                        {item.title || `Student ID: ${item.extracted_id || item.manual_id}`}
                                    </h4>
                                    <p className="text-ink/50 text-sm leading-relaxed mb-4 line-clamp-2">
                                        {item.description || "System log generated via automated report."}
                                    </p>

                                    {(item.state === 'ACTIVE' || item.state === 'PENDING_HANDOVER' || item.state === 'OVERDUE_SUBMISSION') && (
                                        <div className={`p-3 rounded-lg mb-4 border ${item.state === 'OVERDUE_SUBMISSION' ? 'bg-red-50 border-red-100' : 'bg-primary/5 border-primary/20'}`}>
                                            <p className={`text-xs ${item.state === 'OVERDUE_SUBMISSION' ? 'text-red-700' : 'text-primary/90'} font-medium flex items-start gap-2`}>
                                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                Action required: Room 110 handover
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-auto flex items-center justify-between pt-4 divider-dashed">
                                        <div className="flex items-center gap-2 text-ink/40">
                                            <MapPin size={14} />
                                            <p className="text-xs font-medium">UIU sector log</p>
                                        </div>
                                        <button className="w-8 h-8 text-ink/30 hover:text-primary transition-all flex items-center justify-center">
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(foundItems.length + fastIdReports.length) === 0 && (
                                <div className="md:col-span-3 card border-dashed py-24 flex flex-col items-center justify-center text-center">
                                    <Package size={36} className="text-ink/15 mb-4" />
                                    <h4 className="font-display text-xl font-bold text-ink/40">No item reports</h4>
                                    <p className="text-ink/40 text-sm mt-1">You haven&apos;t reported any items yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'timeline' && (
                    <div className="max-w-3xl mx-auto">
                        <div className="card p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="font-display text-2xl font-bold text-ink">Activity Timeline</h2>
                                {notifications.filter(n => !n.is_read).length > 0 && (
                                    <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        {notifications.filter(n => !n.is_read).length} new
                                    </span>
                                )}
                            </div>

                            <div className="space-y-6">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => markAsRead(notif.id)}
                                        className={`relative pl-10 cursor-pointer group ${notif.is_read ? 'opacity-50' : ''}`}
                                    >
                                        <div className={`absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center ${notif.type === 'SYSTEM_ALERT' ? 'bg-primary' : 'bg-accent'
                                            }`}>
                                            <Bell size={10} className="text-white" />
                                        </div>

                                        <div className="pb-6 divider-dashed group-last:border-0 group-last:pb-0">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <p className="font-mono text-[10px] text-ink/40">
                                                    {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <h4 className={`font-display text-base font-bold mb-1 ${notif.is_read ? 'text-ink/50' : 'text-ink'} group-hover:text-primary transition-colors`}>
                                                {notif.title}
                                            </h4>
                                            <p className="text-sm text-ink/50 leading-relaxed">
                                                {notif.message}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {notifications.length === 0 && (
                                    <div className="text-center py-16">
                                        <BellOff size={32} className="text-ink/15 mx-auto mb-4" />
                                        <h4 className="font-display text-lg font-bold text-ink/40">Quiet day</h4>
                                        <p className="text-ink/40 text-sm mt-1">No system pings or active alerts.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Verification Modals */}
            {isStaffScannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="card bg-white p-8 w-full max-w-xl relative">
                        <button onClick={() => setIsStaffScannerOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-ink/5 rounded-full transition-colors">
                            <X size={20} className="text-ink/40" />
                        </button>
                        <div className="mb-6">
                            <p className="eyebrow mb-1">Room 110 terminal</p>
                            <h3 className="font-display text-2xl font-bold text-ink">Pickup vault entry</h3>
                        </div>
                        <div id="staff-reader" className="overflow-hidden rounded-lg border border-line bg-paper mb-6 aspect-square"></div>
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 flex items-center gap-3">
                            <QrCode size={20} className="text-primary shrink-0" />
                            <p className="text-xs text-ink/70 font-medium leading-tight">
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
