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
      className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-0 transition-all duration-200 ${
        isDragging ? "translate-y-[-1px]" : "hover:translate-y-[-1px]"
      }`}
      style={{
        background: isDragging
          ? "linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%)"
          : "linear-gradient(135deg, #161616 0%, #090909 100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
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
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#F0EBE3]" />
          <p className="text-sm font-medium text-[#999999]">
            Extracting text...
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(240,235,227,0.1)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F0EBE3"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-white">
            {isDragging
              ? "Drop your contract here"
              : "Drop a contract for instant analysis"}
          </p>
          <p className="mt-2 text-base text-[#5C5C5C]">
            PDF, DOCX up to 25MB &bull; Automated Clause Extraction
          </p>
        </>
      )}
    </label>
  );
}
