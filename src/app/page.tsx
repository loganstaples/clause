"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import UploadZone from "@/components/UploadZone";
import TemplatesPanel from "@/components/TemplatesPanel";
import RecentContractsTable from "@/components/RecentContractsTable";
import FloatingAIBar from "@/components/FloatingAIBar";
import { Contract, ChatMessage } from "@/lib/types";
import { getContracts, saveContract } from "@/lib/store";
import { DEMO_CONTRACT_TEXT, DEMO_CONTRACT_NAME, DEMO_CONTRACT_TYPE } from "@/lib/demo-contract";
import { DEMO_ANALYSIS } from "@/lib/demo-analysis";

export default function Home() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setContracts(getContracts());
    setLoaded(true);
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload failed");
        }

        const { text } = await uploadRes.json();

        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!analyzeRes.ok) throw new Error("Analysis failed");

        const analysis = await analyzeRes.json();

        const contract: Contract = {
          id: uuidv4(),
          name: file.name.replace(/\.(pdf|docx?)$/i, ""),
          uploadedAt: new Date().toISOString(),
          rawText: text,
          analysis,
          chatHistory: [],
        };

        saveContract(contract);
        router.push(`/case-files/${contract.id}`);
      } catch (error) {
        console.error("Upload error:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to process file. Please try again."
        );
        setIsUploading(false);
      }
    },
    [router]
  );

  const loadDemo = useCallback(() => {
    const existing = getContracts().find(
      (c) => c.name === DEMO_CONTRACT_NAME
    );
    if (existing) {
      router.push(`/case-files/${existing.id}`);
      return;
    }

    const contract: Contract = {
      id: uuidv4(),
      name: DEMO_CONTRACT_NAME,
      uploadedAt: new Date().toISOString(),
      rawText: DEMO_CONTRACT_TEXT,
      contractType: DEMO_CONTRACT_TYPE,
      analysis: DEMO_ANALYSIS,
      chatHistory: [],
    };

    saveContract(contract);
    router.push(`/case-files/${contract.id}`);
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-[220px] flex-1 px-10 pt-8 pb-32">
        <DashboardHeader contractCount={contracts.length || 12} />

        {/* Drop zone */}
        <div className="mt-8">
          <UploadZone onUpload={handleUpload} isUploading={isUploading} />
        </div>

        {/* Templates + Recent Contracts side by side */}
        <div className="mt-10 flex gap-8">
          <TemplatesPanel onTemplateClick={loadDemo} />
          <RecentContractsTable contracts={contracts} loaded={loaded} onDemoClick={loadDemo} />
        </div>
      </main>

      <FloatingAIBar
        chatHistory={chatHistory}
        onChatUpdate={setChatHistory}
      />
    </div>
  );
}
