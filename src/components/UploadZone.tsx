"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export default function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files?.length) onUpload(files[0]);
    },
    [onUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) onUpload(files[0]);
    },
    [onUpload]
  );

  return (
    <label
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging
          ? "border-[#3B82F6] bg-[rgba(59,130,246,0.06)]"
          : "border-[rgba(255,255,255,0.08)] bg-[#12131A] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#151620]"
      }`}
    >
      <input
        type="file"
        className="sr-only"
        accept=".pdf,.docx,.doc"
        onChange={handleFileInput}
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#3B82F6]" />
          <p className="text-sm font-medium text-[#8A8F98]">
            Analyzing contract...
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-base font-medium text-[#F1F1F3]">
            {isDragging
              ? "Drop your contract here"
              : "Drop a contract for instant analysis"}
          </p>
          <p className="mt-1.5 text-sm text-[#5A5F6B]">
            PDF, DOCX up to 25MB &bull; Automated Clause Extraction
          </p>
        </>
      )}
    </label>
  );
}
