"use client";

interface TemplatesPanelProps {
  onTemplateClick: () => void;
}

const TEMPLATES = [
  { title: "Master Service Agreement", subtitle: "Standard B2B terms" },
  { title: "Non-Disclosure Agreement", subtitle: "Mutual protection" },
  { title: "Employment Offer", subtitle: "Executive level" },
];

export default function TemplatesPanel({ onTemplateClick }: TemplatesPanelProps) {
  return (
    <div className="w-[280px] flex-shrink-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Templates</h2>
        <button className="text-xs font-medium text-[#F0EBE3] hover:text-[#F5EFE0] transition-colors">
          View Library
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.title}
            onClick={onTemplateClick}
            className="group flex items-center justify-between rounded-xl border-0 px-5 py-6 text-left transition-all duration-200 hover:translate-y-[-1px]"
            style={{
              background: "linear-gradient(135deg, #161616 0%, #0A0A0A 100%)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div>
              <p className="text-sm font-medium text-white">{template.title}</p>
              <p className="mt-0.5 text-xs text-[#5C5C5C]">{template.subtitle}</p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5C5C5C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
