import React from 'react';

const ClipboardCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75h6.75m-6.75 3h6.75m-12.75-3h.008v.008H3v-.008Zm0 3h.008v.008H3v-.008Zm0-9h.008v.008H3V6.75Zm0 3h.008v.008H3V9.75Zm.008-3.75h16.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5h1.5M19.5 3v.75m0 0h-6.75M19.5 3.75a1.5 1.5 0 0 1-1.5-1.5h-5.25a1.5 1.5 0 0 1-1.5 1.5m1.5-1.5v.75" />
  </svg>
);

export default ClipboardCheckIcon;
