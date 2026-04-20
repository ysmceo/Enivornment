import { useState, useRef } from 'react';

/**
 * Accordion component for collapsible sections with smooth animation.
 * Usage:
 * <Accordion title="Section Title">Content here</Accordion>
 */
export default function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);

  return (
    <div className="border border-slate-700 rounded-lg mb-3 bg-slate-900/80">
      <button
        type="button"
        className="w-full flex justify-between items-center px-4 py-3 text-left font-semibold text-slate-100 hover:bg-slate-800 transition-colors rounded-t-lg focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: open ? contentRef.current?.scrollHeight + 32 : 0,
          opacity: open ? 1 : 0,
          padding: open ? '16px' : '0 16px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
