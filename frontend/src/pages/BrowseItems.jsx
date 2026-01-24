import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Tag, Calendar, User, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api_config';

const BrowseItems = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [filters, setFilters] = useState({ category_id: '', location_id: '', search: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Hydrate Categories & Locations
        fetch(`${API_BASE_URL}/api/browse/categories`).then(res => res.json()).then(setCategories);
        fetch(`${API_BASE_URL}/api/browse/locations`).then(res => res.json()).then(setLocations);
    }, []);

    useEffect(() => {
        fetchItems();
    }, [filters]);

    const fetchItems = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.location_id) params.append('location_id', filters.location_id);
        if (filters.search) params.append('search', filters.search);

        try {
            const res = await fetch(`${API_BASE_URL}/api/browse/?${params.toString()}`);
            const data = await res.json();
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="pb-20 font-inter">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Cantonment Feed</h2>
                    <p className="text-gray-500 font-medium italic">Scanning all university sectors for reported assets.</p>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Search asset name..."
                        className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-primary focus:ring-0 outline-none transition-all shadow-sm font-bold text-gray-700 placeholder:text-gray-300"
                    />
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-3 mb-10">
                <div className="relative">
                    <select
                        name="category_id"
                        value={filters.category_id}
                        onChange={handleFilterChange}
                        className="appearance-none bg-white border-2 border-gray-100 px-6 py-3 pr-10 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-600 focus:border-primary outline-none cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="relative">
                    <select
                        name="location_id"
                        value={filters.location_id}
                        onChange={handleFilterChange}
                        className="appearance-none bg-white border-2 border-gray-100 px-6 py-3 pr-10 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-600 focus:border-primary outline-none cursor-pointer"
                    >
                        <option value="">All Locations</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>

                {Object.values(filters).some(v => v !== '') && (
                    <button
                        onClick={() => setFilters({ category_id: '', location_id: '', search: '' })}
                        className="px-6 py-3 bg-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-gray-50 h-96 rounded-3xl animate-pulse"></div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-[3rem] p-20 text-center animate-in fade-in duration-500">
                    <Filter className="mx-auto mb-6 text-gray-200" size={64} />
                    <h3 className="text-2xl font-black text-gray-300 uppercase tracking-widest">No matching assets found</h3>
                    <p className="text-gray-400 font-medium">Try broadening your search or checking another sector.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {items.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="bg-white rounded-[2.5rem] p-3 shadow-xl shadow-gray-200/40 border border-gray-50 hover:shadow-2xl transition-all duration-500 group">
                            <div className="relative h-64 rounded-[2rem] overflow-hidden mb-6">
                                <img
                                    src={item.image_url || `https://placehold.co/600x400/${item.type === 'LOST' ? 'red' : 'orange'}/white?text=${item.title}`}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-[10px] font-black tracking-widest shadow-xl ${item.type === 'LOST' ? 'bg-red-500 text-white' : 'bg-white/95 text-primary'
                                    }`}>
                                    {item.type} {item.state}
                                </div>
                            </div>

                            <div className="px-5 pb-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <MapPin size={12} className="text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {locations.find(l => l.id === item.location_id)?.name || 'Sector Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-xl text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                        <Eye size={18} />
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed mb-6">
                                    {item.description}
                                </p>

                                <div className="flex justify-between items-center pt-5 border-t border-gray-50">
                                    {item.type === 'FOUND' ? (
                                        <button
                                            onClick={() => navigate(`/claim?itemId=${item.id}`)}
                                            className="text-xs font-black text-primary hover:text-orange-700 uppercase tracking-widest flex items-center gap-1 group/btn"
                                        >
                                            Claim Asset <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => {
                                                    const info = `Email: ${item.contact_email}\nPhone: ${item.contact_phone || 'N/A'}`;
                                                    alert(info);
                                                }}
                                                className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1"
                                            >
                                                Contact Reporter <ArrowRight size={10} />
                                            </button>
                                        </div>
                                    )}
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                        {new Date(item.date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BrowseItems;
