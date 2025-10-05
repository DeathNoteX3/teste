import React from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible }) => {
  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      <div className="bg-gray-900 text-white dark:bg-yt-text-primary dark:text-yt-black font-semibold py-3 px-6 rounded-lg shadow-lg flex items-center">
        {message}
      </div>
    </div>
  );
};

export default Toast;
