import { useState, useEffect } from 'react';
import CameraUpload from '../components/CameraUpload';
import { MapPin, Info, Calendar, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api_config';

const FoundItemForm = () => {
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
        finderName: user?.name || 'Anonymous',
        finderId: user?.uiu_id || '00000',
        publicDescription: '',
        privateDescription: '',
        image: null
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                finderName: user.name,
                finderId: user.uiu_id
            }));
        }
    }, [user]);

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

    const handleImageCapture = (file, _previewUrl) => {
        setFormData(prev => ({ ...prev, image: file }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Upload Image First
        let imageUrl = "";
        if (formData.image) {
            const imgData = new FormData();
            imgData.append('file', formData.image);
            try {
                const uploadRes = await fetch(`${API_BASE_URL}/api/upload/`, { method: 'POST', body: imgData });
                const uploadJson = await uploadRes.json();
                imageUrl = uploadJson.url;
            } catch (err) {
                console.error("Upload failed", err);
            }
        }

        // 2. Submit Item
        const itemPayload = {
            title: formData.title,
            state: "ACTIVE",
            category_id: parseInt(formData.category_id),
            location_id: parseInt(formData.location_id),
            public_description: formData.publicDescription,
            private_description: formData.privateDescription,
            finder_id: user?.id || null,
            image_url: imageUrl
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/items/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemPayload)
            });

            if (res.ok) {
                alert("SUCCESS! Item Reported. IMPORTANT: Please give the item to Room 110 within 3 days.");
                navigate('/dashboard'); // Navigate to personal dashboard
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
            <div className="mb-8">
                <p className="eyebrow mb-2">New report</p>
                <h2 className="font-display text-3xl font-bold text-ink">Report Found Item</h2>
                <p className="text-ink/50 text-sm mt-1">Help return lost items to their owners.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Section 1: Image */}
                <section className="card p-6">
                    <label className="eyebrow block mb-3">Item photo</label>
                    <CameraUpload onImageCapture={handleImageCapture} />
                </section>

                {/* Section 2: Basic Info */}
                <section className="card p-6 space-y-4">
                    <div>
                        <label className="eyebrow block mb-2">Item title <span className="text-primary">*</span></label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Blue Water Bottle"
                            className="input-field"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="eyebrow block mb-2">Category <span className="text-primary">*</span></label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-3 text-ink/30" size={16} />
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
                            <label className="eyebrow block mb-2">Location <span className="text-primary">*</span></label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-ink/30" size={16} />
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
                            <label className="eyebrow block mb-2">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-ink/30" size={16} />
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
                            <label className="eyebrow block mb-2">Time</label>
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

                {/* Section 3: Descriptions */}
                <section className="card p-6 space-y-4">
                    <div>
                        <label className="eyebrow block mb-2">Public description</label>
                        <textarea
                            name="publicDescription"
                            value={formData.publicDescription}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Visible to everyone. Kept brief."
                            className="input-field resize-none"
                            required
                        ></textarea>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="eyebrow">Private description</label>
                            <div className="group relative">
                                <Info size={14} className="text-accent cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-ink text-white text-xs p-2 rounded hidden group-hover:block z-10">
                                    Used by AI to verify ownership. Describe hidden marks.
                                </div>
                            </div>
                            <span className="ref-tag !text-accent !border-accent/30">Crucial for AI</span>
                        </div>
                        <textarea
                            name="privateDescription"
                            value={formData.privateDescription}
                            onChange={handleChange}
                            rows="3"
                            placeholder="E.g. Scratches on bottom, 'Happy' sticker inside..."
                            className="input-field resize-none border-accent/30 focus:border-accent"
                            required
                        ></textarea>
                    </div>
                </section>

                <button type="submit" className="w-full btn-primary py-3.5 text-base">
                    Submit report
                </button>

            </form>
        </div>
    );
};

export default FoundItemForm;
