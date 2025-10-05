import React, { useMemo } from 'react';
import { Video, PostPublicationChecklistItem } from '../types';

interface VideoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  onCopy: (message: string) => void;
  onDelete: (videoId: string) => void;
  onUpdateChecklist: (videoId: string, checklist: PostPublicationChecklistItem[]) => void;
  onEdit: (video: Video) => void;
}

const InfoSection: React.FC<{ label: string; content: string; onCopy: (message: string) => void; }> = ({ label, content, onCopy }) => {
  if (!content) return null;

  const handleCopy = async () => {
    try {
      await window.electronAPI.writeToClipboard(content);
      onCopy(`${label} copiado!`);
    } catch (err) {
      console.error('Falha ao copiar: ', err);
      onCopy(`Falha ao copiar ${label}.`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-base font-semibold text-gray-700 dark:text-yt-text-secondary">{label}</h4>
        <button
          onClick={handleCopy}
          title={`Copiar ${label}`}
          className="p-2 text-gray-500 dark:text-yt-text-secondary hover:bg-gray-100 dark:hover:bg-yt-light-gray rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
          </svg>
        </button>
      </div>
      <div className="bg-gray-50 dark:bg-yt-black p-3 rounded-md text-gray-700 dark:text-yt-text-secondary whitespace-pre-wrap text-sm border border-gray-200/80 dark:border-yt-light-gray">
        {content}
      </div>
    </div>
  );
};


const VideoDetailModal: React.FC<VideoDetailModalProps> = ({ isOpen, onClose, video, onCopy, onDelete, onUpdateChecklist, onEdit }) => {
  const fullDescription = useMemo(() => {
    if (!video) return '';

    const sections: string[] = [];
    
    if (video.products && video.products.length > 0) {
        const linksContent = video.products.map(product => {
            const productTitle = `✅ ${product.name}`;
            const storeLinks = product.stores.map(store => {
                if (store.isNotBivolt) {
                    const link110 = store.url110v ? `🛒 ${store.name} (110V): ${store.url110v}` : '';
                    const link220 = store.url220v ? `🛒 ${store.name} (220V): ${store.url220v}` : '';
                    return [link110, link220].filter(Boolean).join('\n');
                }
                return store.url ? `🛒 ${store.name}: ${store.url}` : '';
            }).filter(Boolean).join('\n');
            return `${productTitle}\n${storeLinks}`;
        }).join('\n\n');
        sections.push(`👇Links para compra SEGURA ✅\n${linksContent}`);
    }

    if(video.description){
        sections.push(video.description);
    }
    
    return sections.filter(Boolean).join('\n\n');
  }, [video]);
  
  const handleChecklistToggle = (key: string) => {
    if (!video || !video.postPublicationChecklist) return;
    const newChecklist = video.postPublicationChecklist.map(item =>
      item.key === key ? { ...item, completed: !item.completed } : item
    );
    onUpdateChecklist(video.id, newChecklist);
  };
  
  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="video-modal-title">
      <div 
        className="bg-white dark:bg-yt-dark-gray rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 pr-2 pl-6 flex justify-between items-center border-b border-gray-200 dark:border-yt-light-gray/50 flex-shrink-0">
          <h2 id="video-modal-title" className="text-xl font-bold text-gray-900 dark:text-yt-text-primary truncate pr-4" title={video.title}>
            {video.title}
          </h2>
          <button onClick={onClose} aria-label="Fechar modal" className="p-2 text-gray-500 hover:bg-gray-100 dark:text-yt-text-secondary dark:hover:bg-yt-light-gray rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                <div className="md:col-span-3 space-y-6">
                    <InfoSection label="Título" content={video.title} onCopy={onCopy} />
                    <InfoSection label="Descrição Completa" content={fullDescription} onCopy={onCopy} />
                    <InfoSection label="Tags" content={video.tags} onCopy={onCopy} />
                </div>
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <img src={video.thumbnail} alt="Thumbnail" className="w-full aspect-video object-cover rounded-lg border border-gray-200 dark:border-yt-light-gray" />
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-gray-700 dark:text-yt-text-secondary mb-3">Checklist Pós-Publicação</h4>
                        <div className="space-y-3 bg-gray-50 dark:bg-yt-black p-4 rounded-md border border-gray-200/80 dark:border-yt-light-gray">
                            {video.postPublicationChecklist && video.postPublicationChecklist.map(item => (
                                <label key={item.key} htmlFor={`post-checklist-${item.key}`} className="flex items-center cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        id={`post-checklist-${item.key}`}
                                        checked={item.completed} 
                                        onChange={() => handleChecklistToggle(item.key)}
                                        className="h-4 w-4 rounded text-gray-600 dark:text-yt-text-secondary border-gray-300 dark:border-yt-light-gray focus:ring-gray-500 dark:focus:ring-yt-light-gray bg-gray-100 dark:bg-yt-light-gray"
                                    />
                                    <span className={`ml-3 text-sm ${item.completed ? 'text-gray-500 dark:text-yt-text-secondary line-through' : 'text-gray-700 dark:text-yt-text-secondary group-hover:text-gray-800 dark:group-hover:text-yt-text-primary'}`}>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer className="p-4 flex justify-between items-center border-t border-gray-200 dark:border-yt-light-gray/50 bg-gray-50/50 dark:bg-yt-black/30 flex-shrink-0">
          <button
              type="button"
              onClick={() => onDelete(video.id)}
              className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm"
          >
              Excluir Vídeo
          </button>
          <button
              type="button"
              onClick={() => onEdit(video)}
              className="py-2 px-4 bg-gray-800 hover:bg-gray-900 dark:bg-yt-text-primary dark:hover:bg-white text-white dark:text-yt-black font-bold rounded-lg shadow-sm transition-colors text-sm"
          >
              Editar Vídeo
          </button>
        </footer>
      </div>
    </div>
  );
};

export default VideoDetailModal;