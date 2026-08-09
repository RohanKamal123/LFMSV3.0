import { useState, useEffect } from 'react';
import { MapPin, Info, Calendar, Tag, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';

const ReportLost = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        category_id: '',
        location_id: '',
        date: '',
        time: '',
        description: ''
    });
    const [images, setImages] = useState([]);

    useEffect(() => {
        // Fetch Dynamic Data
        fetch(`${API_BASE_URL}/api/browse/categories`).then(res => res.json()).then(setCategories);
        fetch(`${API_BASE_URL}/api/browse/locations`).then(res => res.json()).then(setLocations);

        // Auto-fill Date/Time
        const now = new Date();
        setFormData(prev => ({
            ...prev,
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0].substring(0, 5)
        }));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const lostItemPayload = {
            title: formData.title,
            description: formData.description,
            status: "ACTIVE",
            category_id: parseInt(formData.category_id),
            location_id: parseInt(formData.location_id),
            reporter_id: user?.id || null,
            lost_at: new Date(`${formData.date}T${formData.time}`).toISOString(),
            image_urls: images
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/lost-items/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lostItemPayload)
            });

            if (res.ok) {
                alert("Lost Item Reported Successfully!");
                navigate('/browse');
            } else {
                const err = await res.json();
                alert("Error: " + JSON.stringify(err));
            }
        } catch (error) {
            console.error("Submit Error", error);
            alert("Failed to submit report.");
        }
    };

    return (
        <div className="max-w-xl mx-auto pb-20">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">Report Lost Item</h2>
                <p className="text-gray-500 text-sm">List an item you&apos;ve misplaced so we can help you find it.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Basic Info */}
                <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Item Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Black Wallet"
                            className="input-field"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-3 text-gray-400" size={16} />
                                <select
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleChange}
                                    className="input-field pl-10"
                                    required
                                >
                                    <option value="">Select...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Location Lost <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                                <select
                                    name="location_id"
                                    value={formData.location_id}
                                    onChange={handleChange}
                                    className="input-field pl-10"
                                    required
                                >
                                    <option value="">Select...</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date Lost</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Time</label>
                            <input
                                type="time"
                                name="time"
                                value={formData.time}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>
                    </div>
                </section>

                {/* Section 2: Description & Images */}
                <section className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Detailed Description</label>
                            <div className="group relative">
                                <Info size={14} className="text-primary cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-dark text-white text-[10px] p-3 rounded-2xl hidden group-hover:block z-10 shadow-xl line-clamp-2">
                                    Include any unique marks, scratches, or identifying features only the owner would know.
                                </div>
                            </div>
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            placeholder="Describe the item in detail..."
                            className="input-field resize-none bg-gray-50 border-transparent focus:bg-white focus:border-primary transition-all rounded-2xl p-4 font-medium text-sm"
                            required
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-3">Upload Evidence (Images)</label>
                        <div className="grid grid-cols-4 gap-4">
                            {images.map((url, i) => (
                                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                                    <img src={`${API_BASE_URL}${url}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-black text-[10px] uppercase"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <label className="aspect-square rounded-2xl border-4 border-dashed border-gray-100 hover:border-primary/30 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/5 group">
                                <Plus size={24} className="text-gray-300 group-hover:text-primary transition-colors" />
                                <span className="text-[8px] font-black text-gray-400 mt-2 uppercase">Add Image</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const body = new FormData();
                                            body.append('file', file);
                                            const res = await fetch(`${API_BASE_URL}/api/upload/`, {
                                                method: 'POST',
                                                body
                                            });
                                            const data = await res.json();
                                            setImages(prev => [...prev, data.url]);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </section>

                <button type="submit" className="w-full btn-primary text-lg">
                    Submit Lost Report
                </button>

            </form>
        </div>
    );
};

export default ReportLost;
