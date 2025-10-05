import React, { useState, useMemo } from 'react';

const ThumbPreview: React.FC = () => {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const extractVideoId = (url: string): string | null => {
        if (!url) return null;
        // Regex to handle various YouTube URL formats
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return match[2];
        }
        return null;
    };

    const videoId = useMemo(() => extractVideoId(youtubeUrl), [youtubeUrl]);
    const thumbnailUrl = useMemo(() => {
        if (videoId) {
            setError(null);
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
        if (youtubeUrl.trim() !== '') {
            setError('URL do YouTube inválida ou ID do vídeo não encontrado.');
        } else {
             setError(null);
        }
        return null;
    }, [videoId, youtubeUrl]);

    const handleCopy = async () => {
        if (thumbnailUrl) {
            await window.electronAPI.writeToClipboard(thumbnailUrl);
            alert('URL da thumbnail copiada!');
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <div className="relative mb-6">
                <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Cole o link de um vídeo do YouTube aqui..."
                    className="w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-3 px-4 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray text-base"
                    aria-label="YouTube video URL input"
                />
            </div>

            {error && <p className="text-center text-red-500">{error}</p>}

            {thumbnailUrl ? (
                <div className="space-y-6">
                    <div className="bg-black rounded-lg overflow-hidden border border-gray-200 dark:border-yt-light-gray shadow-lg">
                        <img 
                           src={thumbnailUrl} 
                           alt="YouTube video thumbnail preview" 
                           className="w-full h-auto object-contain"
                           onError={(e) => { 
                               if (videoId) {
                                  // Standard quality fallback
                                  e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
                                  e.currentTarget.onerror = null; // prevent infinite loop
                               }
                           }}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-yt-dark-gray p-3 rounded-lg border border-gray-300 dark:border-yt-light-gray">
                        <input
                            type="text"
                            value={thumbnailUrl}
                            readOnly
                            className="flex-grow bg-transparent text-gray-700 dark:text-yt-text-secondary focus:outline-none"
                            aria-label="Generated thumbnail URL"
                        />
                         <button
                            onClick={handleCopy}
                            className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-yt-light-gray hover:dark:bg-yt-light-gray/80 text-gray-800 dark:text-yt-text-primary font-medium p-2 rounded-lg transition-colors"
                            aria-label="Copiar Link"
                            title="Copiar Link"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                               <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                               <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => window.electronAPI.openExternalLink(thumbnailUrl)}
                            className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-yt-light-gray hover:dark:bg-yt-light-gray/80 text-gray-800 dark:text-yt-text-primary font-medium p-2 rounded-lg transition-colors"
                            aria-label="Abrir link em nova aba"
                            title="Abrir link em nova aba"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                        </button>
                    </div>
                </div>
            ) : (
                 <div className="text-center py-20 text-gray-400 dark:text-yt-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h2 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-yt-text-primary">Preview da Thumbnail</h2>
                    <p className="mt-2 text-gray-500 dark:text-yt-text-secondary">Insira o link de um vídeo para ver a thumbnail em alta resolução.</p>
                </div>
            )}
        </div>
    );
};

export default ThumbPreview;