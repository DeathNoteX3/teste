import React, { useMemo, useState } from 'react';
import { Video } from '../types';

interface DraftCardProps {
  draft: Video;
  onEdit: (draft: Video) => void;
}

const DraftCard: React.FC<DraftCardProps> = ({ draft, onEdit }) => {
  const [imgError, setImgError] = useState(false);

  const formattedDate = useMemo(() => {
    if (!draft.postDate) return 'Sem data';
    const date = new Date(draft.postDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateString = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });

    if (date.getFullYear() !== today.getFullYear()) {
      dateString = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    if (date < today) {
        return <span className="text-red-500 dark:text-red-400 font-semibold">{dateString} (Atrasado)</span>;
    }
    return dateString;

  }, [draft.postDate]);
  
  const checklistProgress = useMemo(() => {
    if (!draft.checklist || draft.checklist.length === 0) return 0;
    const completed = draft.checklist.filter(item => item.completed).length;
    return Math.round((completed / draft.checklist.length) * 100);
  }, [draft.checklist]);
  
  const renderThumbnail = () => {
    if (!draft.thumbnail || imgError) {
      return (
        <div className="w-full aspect-video bg-gray-200 dark:bg-yt-dark-gray flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-yt-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    return (
      <img
        src={draft.thumbnail}
        alt={`${draft.title} thumbnail`}
        className="w-full aspect-video object-cover"
        onError={() => setImgError(true)}
      />
    );
  };
  
  return (
    <div 
        onClick={() => onEdit(draft)}
        className="cursor-pointer group bg-white dark:bg-yt-dark-gray rounded-xl shadow-sm border border-gray-200/80 dark:border-yt-light-gray/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col"
    >
      {renderThumbnail()}
      <div className="p-4 flex-grow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-3">
              <h3 className="text-gray-800 dark:text-yt-text-primary text-base font-semibold leading-snug line-clamp-3" title={draft.title}>
                  {draft.title || <span className="text-gray-400 dark:text-yt-text-secondary">Rascunho sem título</span>}
              </h3>
              {draft.videoNumber && (
                  <div className="bg-gray-100 dark:bg-yt-light-gray text-gray-600 dark:text-yt-text-secondary text-xs font-bold py-1 px-2.5 rounded-md whitespace-nowrap">
                      #{draft.videoNumber}
                  </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-500 dark:text-yt-text-secondary text-sm mb-2">
                Postar em: {formattedDate}
            </p>
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-yt-text-secondary">Progresso</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-yt-text-secondary">{checklistProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-yt-light-gray/50 rounded-full h-1.5">
                  <div className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${checklistProgress}%` }}></div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default DraftCard;
