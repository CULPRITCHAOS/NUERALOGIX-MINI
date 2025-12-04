
import React, { useCallback, useState } from 'react';
import { ImageIcon, ResetIcon } from './icons';

interface ImageItem {
    id: string;
    previewUrl: string;
}

interface ImageUploaderProps {
    images: ImageItem[];
    onFilesAdded: (files: FileList) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onFilesAdded, onRemove, onClear }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onFilesAdded(e.target.files);
            // Reset input value to allow uploading the same file again
            e.target.value = '';
        }
    };
    
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragIn = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragOut = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesAdded(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    }, [onFilesAdded]);


    return (
        <div className="h-full flex flex-col" style={{ minHeight: '260px' }}>
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Image Data Input</h3>
                <button onClick={onClear} className="text-sm flex items-center space-x-1 text-gray-400 hover:text-lab-light transition-colors"><ResetIcon className="w-4 h-4" /> <span>Reset to Samples</span></button>
            </div>
            <div 
                onDrop={handleDrop} 
                onDragOver={handleDrag}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragging ? 'border-lab-accent bg-lab-accent/10' : 'border-lab-dark-3 hover:border-lab-accent/50'}`}
            >
                <ImageIcon className="mx-auto h-10 w-10 text-gray-400" />
                <label htmlFor="file-upload" className="mt-2 block text-sm relative cursor-pointer rounded-md font-semibold text-lab-accent hover:text-lab-accent-hover">
                    <span>Upload files</span>
                    <input id="file-upload" name="file-upload" type="file" multiple accept="image/*" className="sr-only" onChange={handleFileChange} />
                </label>
                <p className="text-xs text-gray-500">or drag and drop</p>
            </div>
            {images.length > 0 && (
                <div className="mt-4 flex-grow overflow-auto pr-2 -mr-2">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {images.map(image => (
                            <div key={image.id} className="relative group aspect-square">
                                <img src={image.previewUrl} alt="User upload" className="w-full h-full object-cover rounded-md bg-lab-dark-1" />
                                <button onClick={() => onRemove(image.id)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
