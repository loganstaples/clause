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
        <h2 className="text-lg font-semibold text-[#F1F1F3]">Templates</h2>
        <button className="text-xs font-medium text-[#3B82F6] hover:text-[#60a5fa] transition-colors">
          View Library
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.title}
            onClick={onTemplateClick}
            className="group flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-left transition-all duration-150 hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <div>
              <p className="text-sm font-medium text-[#F1F1F3]">{template.title}</p>
              <p className="mt-0.5 text-xs text-[#5A5F6B]">{template.subtitle}</p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F6B"
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
