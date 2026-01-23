import { Camera, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';

const CameraUpload = ({ onImageCapture }) => {
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
                onImageCapture(file, reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearImage = () => {
        setPreview(null);
        onImageCapture(null, null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                capture="environment" // Opens camera on mobile
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {!preview ? (
                <div
                    onClick={() => fileInputRef.current.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-orange-50 transition-colors h-48"
                >
                    <div className="bg-orange-100 p-4 rounded-full mb-3 text-primary">
                        <Camera size={32} />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Tap to Take Photo</p>
                    <p className="text-xs text-gray-500 mt-1">or upload from gallery</p>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden shadow-md">
                    <img src={preview} alt="Captured item" className="w-full h-48 object-cover" />
                    <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <p className="text-white text-xs font-medium flex items-center gap-1">
                            <Upload size={12} /> Image Ready
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CameraUpload;
