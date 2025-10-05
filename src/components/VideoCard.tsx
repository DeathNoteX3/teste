import React, { useMemo, useState } from 'react';
import { Video } from '../types';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  const [imgError, setImgError] = useState(false);

  const postDateInfo = useMemo(() => {
    if (!video.postDate) return null;

    const postDate = new Date(video.postDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formattedDate = postDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const prefix = postDate > today ? "Será postado em" : "Postado em";
    
    return {
        prefix,
        date: formattedDate,
    };
  }, [video.postDate]);

  const isChecklistComplete = useMemo(() => {
    return video.postPublicationChecklist?.every(item => item.completed);
  }, [video.postPublicationChecklist]);

  const renderThumbnail = () => {
    if (!video.thumbnail || imgError) {
      return (
        <div className="w-full aspect-video bg-gray-200 dark:bg-yt-dark-gray flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 dark:text-yt-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    return (
      <img
        src={video.thumbnail}
        alt={`${video.title} thumbnail`}
        className="w-full aspect-video object-cover"
        onError={() => setImgError(true)}
      />
    );
  };

  return (
    <div 
        className="cursor-pointer group bg-white dark:bg-yt-dark-gray rounded-xl shadow-sm border border-gray-200/80 dark:border-yt-light-gray/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1" 
        onClick={() => onClick(video)}
    >
        <div className="relative">
            {video.videoNumber && (
              <div className="absolute top-2.5 left-2.5 bg-black/60 text-white text-xs font-bold py-1 px-2.5 rounded-md backdrop-blur-sm z-10">
                  #{video.videoNumber}
              </div>
            )}
            {renderThumbnail()}
            {video.postPublicationChecklist && (
              <div className="absolute top-2.5 right-2.5">
                  {isChecklistComplete ? (
                      <div title="Checklist completo" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 rounded-full p-1.5 shadow-md border border-green-200 dark:border-green-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                      </div>
                  ) : (
                      <div title="Checklist pendente" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded-full p-1.5 shadow-md border border-yellow-200 dark:border-yellow-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                      </div>
                  )}
              </div>
            )}
        </div>
        <div className="p-4">
          <h3 className="text-gray-800 dark:text-yt-text-primary text-base font-semibold leading-snug line-clamp-2" title={video.title}>
              {video.title}
          </h3>
          {postDateInfo && (
          <p className="text-gray-500 dark:text-yt-text-secondary text-sm mt-1.5">
              {postDateInfo.prefix} {postDateInfo.date}
          </p>
          )}
        </div>
    </div>
  );
};

export default VideoCard;
