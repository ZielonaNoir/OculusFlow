"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { InputForm } from "@/components/oculus-flow/InputForm";
import { PreviewPanel } from "@/components/oculus-flow/PreviewPanel";
import {
  OculusResponse,
  OculusFormData,
  DEFAULT_ARK_IMAGE_GEN_OPTIONS,
} from "@/components/oculus-flow/types";
import { ArkImageGenOptionsPanel } from "@/components/oculus-flow/ArkImageGenOptionsPanel";

export function LegacyOculusFlowWorkspace() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<OculusResponse | null>(null);
  const [currentFormData, setCurrentFormData] = useState<OculusFormData | null>(null);
  const [arkOptions, setArkOptions] = useState(DEFAULT_ARK_IMAGE_GEN_OPTIONS);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const handleGenerate = useCallback(async (formData?: OculusFormData) => {
    const fd = formData || currentFormData;
    if (!fd || !fd.productName.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setData(null);

    try {
      const response = await fetch("/api/oculus/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: fd.productName,
          coreSpecs: fd.coreSpecs,
          targetAudience: fd.targetAudience,
          painPoints: fd.painPoints,
          trustEndorsement: fd.trustEndorsement,
          visualStyle: fd.visualStyle,
          sampleCount: fd.sampleCount,
          sellingMode: fd.sellingMode,
          fourViewImage: fd.fourViewImage,
          useFourViewRef: fd.useFourViewRef,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Generation failed");

      const result = await response.json();
      setData(result);
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error generating:", error);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [currentFormData]);

  const handleFormChange = useCallback((newFormData: OculusFormData) => {
    setCurrentFormData(newFormData);
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[400px] shrink-0 overflow-y-auto no-scrollbar rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Legacy Oculus Flow</h2>
          <p className="text-sm text-zinc-400">JD Detail Page Generator</p>
        </div>
        <InputForm
          onFormChange={handleFormChange}
          onGenerate={handleGenerate}
          onStop={handleStop}
          isGenerating={isGenerating}
          arkOptions={arkOptions}
        />
        <div className="mt-4">
          <ArkImageGenOptionsPanel value={arkOptions} onChange={setArkOptions} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl"
      >
        <PreviewPanel
          isGenerating={isGenerating}
          data={data}
          onStop={handleStop}
          productImages={currentFormData?.productImages || []}
          fourViewImage={currentFormData?.fourViewImage ?? null}
          useFourViewRef={currentFormData?.useFourViewRef ?? false}
          arkOptions={arkOptions}
          onUpdateVariant={(updatedVariant) => {
            if (!data) return;
            setData({
              ...data,
              variants: data.variants.map((v) =>
                v.id === updatedVariant.id ? updatedVariant : v
              ),
            });
          }}
        />
      </motion.div>
    </div>
  );
}
