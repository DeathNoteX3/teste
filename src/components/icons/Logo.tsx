import React from 'react';

const Logo: React.FC = () => (
    <div className="flex items-center gap-2.5">
        <div className="bg-black p-2 rounded-lg flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3.222v13.556c0 .75.875 1.222 1.5.833l10.667-6.778a.937.937 0 000-1.666L5.5 2.389C4.875 2 4 2.472 4 3.222z" />
            </svg>
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">VideoDash</span>
    </div>
);

export default Logo;
