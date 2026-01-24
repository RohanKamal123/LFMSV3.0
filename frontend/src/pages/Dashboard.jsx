import { useState, useEffect } from 'react';
import {
    Bell, BellOff, MessageSquare, Clock, ArrowRight, User,
    CheckCircle2, CreditCard, QrCode, Package, ExternalLink,
    AlertCircle, Archive, ShieldCheck, MapPin, X, ScanLine
} from 'lucide-react';
import { Html5QrcodeScanner } from "html5-qrcode";
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import HandoverScanner from '../components/HandoverScanner';

const Dashboard = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [foundItems, setFoundItems] = useState([]);
    const [fastIdReports, setFastIdReports] = useState([]);
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isStaffScannerOpen, setIsStaffScannerOpen] = useState(false);
    const [joining, setJoining] = useState(false);

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
        <div className="max-w-7xl mx-auto px-4 py-8 font-inter animate-in fade-in duration-500">
            {/* Room 110 Urgent Reminder */}
            {activeReportsNeedingDropoff.length > 0 && (
                <div className="mb-8 bg-red-600 rounded-[2rem] p-6 text-white shadow-xl shadow-red-500/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertCircle size={24} className="text-red-200" />
                            <h2 className="text-2xl font-black uppercase tracking-tighter">URGENT: Room 110 Return Required</h2>
                        </div>
                        <p className="text-red-100 font-medium max-w-2xl">
                            You have **{activeReportsNeedingDropoff.length}** item(s) that need to be returned to Room 110 within 3 days.
                            Failing to do so will mark them as Overdue Submission.
                        </p>
                    </div>
                    <Link to="/found" className="relative z-10 bg-white text-red-600 font-black text-xs px-8 py-3 rounded-xl hover:scale-105 transition-all shadow-lg whitespace-nowrap">
                        VIEW REPORTS
                    </Link>
                    <div className="absolute right-[-5%] bottom-[-20%] opacity-10">
                        <Package size={140} />
                    </div>
                </div>
            )}

            {/* Upper Section: Welcome & Personal QR */}
            <div className={`grid lg:grid-cols-12 gap-8 mb-12`}>
                <div className={`${hasApprovedClaims ? 'lg:col-span-8' : 'lg:col-span-12'} bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group`}>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 mb-6 group-hover:bg-primary/20 transition-all">
                                <ShieldCheck size={14} className="text-primary" />
                                Verified Student Profile
                            </div>
                            <h1 className="text-5xl font-black mb-4 tracking-tighter">Handover Hub</h1>
                            <p className="text-gray-400 font-medium max-w-md leading-relaxed">
                                Manage your reported items and active claims. {hasApprovedClaims ? 'Your Claimant QR is active for verification.' : 'Submit a claim to activate your handover QR.'}
                            </p>
                        </div>

                        <div className="mt-10 flex items-center gap-4">
                            <Link to="/found" className="bg-primary text-white font-black text-xs px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2">
                                REPORT NEW <ArrowRight size={16} />
                            </Link>
                            <Link to="/browse" className="bg-white/5 hover:bg-white/10 text-white font-black text-xs px-8 py-4 rounded-2xl border border-white/10 transition-all">
                                EXPLORE FEED
                            </Link>
                        </div>
                    </div>

                    {/* Background Graphic */}
                    <div className="absolute right-[-20%] top-[-20%] w-[60%] h-[140%] bg-primary ring-[60px] ring-primary/5 rounded-full blur-[100px] opacity-10"></div>
                </div>

                {hasApprovedClaims && (
                    <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 border-2 border-gray-50 shadow-xl flex flex-col items-center justify-center text-center group animate-in slide-in-from-right-10 duration-700">
                        <div className="relative p-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 group-hover:border-primary/30 transition-all mb-4">
                            <QRCodeSVG value={JSON.stringify({ uiu_id: user.uiu_id, name: user.name })} size={140} />
                            <div className="absolute -bottom-3 -right-3 bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform">
                                <QrCode size={20} />
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Claimant Verification QR</p>
                            <h3 className="text-lg font-black text-gray-900">{user.uiu_id}</h3>
                        </div>
                        <button
                            onClick={() => setIsStaffScannerOpen(true)}
                            className="w-full bg-orange-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                        >
                            <ScanLine size={16} /> Scan Staff QR
                        </button>
                    </div>
                )}
            </div>

            {/* Staff QR Scanner Modal */}
            {isStaffScannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Pickup Verification</h3>
                            <button onClick={() => setIsStaffScannerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                        <div id="staff-reader" className="overflow-hidden rounded-3xl border-4 border-dashed border-gray-100 bg-gray-50 mb-6"></div>
                        <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Scan the QR shown at Room 110 terminal
                        </p>
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-12 gap-10">
                {/* Main Content: Reports & Claims */}
                <div className="lg:col-span-8 space-y-12">

                    {/* My Found Items Section */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                <Package size={24} className="text-primary" />
                                My Reported Items
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsScannerOpen(true)}
                                    className="bg-gray-100 text-gray-600 font-bold text-[10px] px-4 py-2 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
                                >
                                    <QrCode size={14} /> SCAN FOR HANDOVER
                                </button>
                                <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                    {foundItems.length + fastIdReports.length} TOTAL
                                </span>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {[...foundItems, ...fastIdReports].map((item) => (
                                <div key={item.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border ${getStatusStyle(item.state || item.status)}`}>
                                            {item.state || item.status}
                                        </span>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">#{item.id}</p>
                                    </div>
                                    <h4 className="text-md font-black text-gray-900 mb-2 truncate group-hover:text-primary transition-colors">
                                        {item.title || `Student ID: ${item.extracted_id || item.manual_id}`}
                                    </h4>

                                    {(item.state === 'ACTIVE' || item.state === 'PENDING_HANDOVER' || item.state === 'OVERDUE_SUBMISSION') && (
                                        <div className={`p-4 rounded-2xl mb-4 border ${item.state === 'OVERDUE_SUBMISSION' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                                            <p className={`text-[10px] ${item.state === 'OVERDUE_SUBMISSION' ? 'text-red-700' : 'text-orange-700'} font-black leading-tight flex items-start gap-2`}>
                                                <AlertCircle size={14} className="shrink-0" />
                                                REQUIRED: Return to **ROOM 110** immediately to avoid penalties.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-gray-50 p-2 rounded-xl text-gray-400">
                                                <MapPin size={14} />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">University Sector Log</p>
                                        </div>
                                        <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-primary hover:text-white transition-all">
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {(foundItems.length + fastIdReports.length) === 0 && (
                                <div className="sm:col-span-2 py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
                                    <Package size={40} className="text-gray-200 mb-4" />
                                    <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No active reports found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* My Claims Section */}
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-6">
                            <CheckCircle2 size={24} className="text-green-500" />
                            My Active Claims
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {claims.map((claim) => (
                                <div key={claim.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-green-50 shadow-md flex flex-col group relative overflow-hidden">
                                    <div className="relative h-40 rounded-2xl overflow-hidden mb-5">
                                        <img
                                            src={claim.item?.image_url || `https://placehold.co/600x400/teal/white?text=${claim.item?.title}`}
                                            alt={claim.item?.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute top-3 right-3 bg-green-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg">
                                            {claim.item?.state || 'VERIFIED'}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="font-black text-gray-900 group-hover:text-green-600 transition-colors uppercase tracking-tight text-lg mb-1">{claim.item?.title || `Item #${claim.item_id}`}</h4>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-green-100 p-1.5 rounded-lg text-green-600">
                                                <ShieldCheck size={14} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Score: {claim.quiz_score}/3 • Status: {claim.status}</p>
                                        </div>

                                        <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50 mt-auto">
                                            <p className="text-[10px] text-green-800 font-bold italic leading-relaxed">
                                                "Approved: Show your hub QR code at Room 110 or to the finder to retrieve."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {claims.length === 0 && (
                                <div className="sm:col-span-2 py-10 text-center">
                                    <p className="text-sm font-bold text-gray-300 uppercase tracking-[0.2em] italic">No active item claims found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Notifications */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gray-50 rounded-[2.5rem] p-8 min-h-[500px]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Bell size={18} className="text-primary" />
                                Timeline
                            </h2>
                            {notifications.filter(n => !n.is_read).length > 0 && (
                                <span className="bg-primary text-white text-[8px] font-black px-2 py-1 rounded-lg">
                                    {notifications.filter(n => !n.is_read).length} NEW
                                </span>
                            )}
                        </div>

                        <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => markAsRead(notif.id)}
                                    className={`relative pl-8 pb-8 last:pb-0 group/notif ${notif.is_read ? 'opacity-40' : ''}`}
                                >
                                    {/* Timeline Line */}
                                    <div className="absolute left-[7px] top-6 bottom-0 w-[2px] bg-gray-200 last:hidden"></div>

                                    {/* Timeline Dot */}
                                    <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-4 border-gray-50 shadow-sm transition-all ${notif.type === 'SYSTEM_ALERT' ? 'bg-red-500' : 'bg-primary'
                                        }`}></div>

                                    <div className="cursor-pointer">
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
                                            {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </p>
                                        <h4 className={`text-xs font-black mb-1 group-hover/notif:text-primary transition-colors ${notif.is_read ? 'text-gray-500' : 'text-gray-900'
                                            }`}>
                                            {notif.title}
                                        </h4>
                                        <p className="text-[10px] font-medium text-gray-500 leading-relaxed">
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {notifications.length === 0 && (
                                <div className="text-center py-20">
                                    <BellOff size={24} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Handover Scanner Modal */}
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
