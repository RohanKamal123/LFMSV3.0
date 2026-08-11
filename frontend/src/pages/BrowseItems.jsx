import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ArrowRight, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';

const BrowseItems = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                <div>
                    <p className="eyebrow mb-2">{items.length} open {items.length === 1 ? 'entry' : 'entries'}</p>
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

                {Object.values(filters).some(v => v !== '') && (
                    <button
                        onClick={() => setFilters({ category_id: '', location_id: '', search: '' })}
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
                        <div key={`${item.type}-${item.id}`} className="card overflow-hidden group flex flex-col">
                            <div className="relative h-52 overflow-hidden border-b border-line">
                                <img
                                    src={item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`) : `https://placehold.co/600x400/161311/f7f3ec?text=${item.title}`}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded text-[10px] font-mono font-semibold ${item.type === 'LOST' ? 'bg-primary text-white' : 'bg-ink text-white'
                                    }`}>
                                    {item.type} &middot; {item.state}
                                </div>
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
                                        item.finder_id && item.finder_id === user?.id ? (
                                            <span className="text-sm font-semibold text-ink/30 flex items-center gap-1.5">
                                                <UserCheck size={14} /> Your report
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => navigate(`/claim?itemId=${item.id}`)}
                                                className="text-sm font-semibold text-primary hover:text-orange-700 flex items-center gap-1 group/btn"
                                            >
                                                Claim item <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const info = `Email: ${item.contact_email}\nPhone: ${item.contact_phone || 'N/A'}`;
                                                alert(info);
                                            }}
                                            className="text-sm font-semibold text-primary hover:text-orange-700 flex items-center gap-1"
                                        >
                                            Contact reporter <ArrowRight size={12} />
                                        </button>
                                    )}
                                    <span className="font-mono text-[10px] text-ink/30">
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
