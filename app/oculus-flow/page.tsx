"use client";

import React, { useState, useRef, useCallback } from "react";
import { InputForm } from "@/components/oculus-flow/InputForm";
import { PreviewPanel } from "@/components/oculus-flow/PreviewPanel";
import {
  OculusResponse,
  OculusFormData,
  DEFAULT_ARK_IMAGE_GEN_OPTIONS,
} from "@/components/oculus-flow/types";
import { ArkImageGenOptionsPanel } from "@/components/oculus-flow/ArkImageGenOptionsPanel";
import { motion } from "framer-motion";

export default function OculusFlowPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<OculusResponse | null>(null);
  const [currentFormData, setCurrentFormData] = useState<OculusFormData | null>(null);
  const [arkOptions, setArkOptions] = useState(DEFAULT_ARK_IMAGE_GEN_OPTIONS);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 停止生成
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // 手动触发生成
  const handleGenerate = useCallback(async (formData?: OculusFormData) => {
    const fd = formData || currentFormData;
    if (!fd || !fd.productName.trim()) return;

    // 取消上一次请求
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

  // 表单变化只更新状态，不自动触发
  const handleFormChange = useCallback((newFormData: OculusFormData) => {
    setCurrentFormData(newFormData);
    // Extract product images base64 (filter out potential File objects if not handled yet, usually InputForm passes everything)
    // But since InputForm keeps File objects in state, we might need to rely on PreviewPanel to handle object URLs or expect Base64 here.
    // However, for API calls, we need Base64.
    // Let's assume for now that we pass the raw array to PreviewPanel, and let it handle display/conversion if needed,
    // OR better, we convert to Base64 *before* passing if PreviewPanel needs to call API.
    
    // Actually, InputForm keeps `productImages` as (File | string)[].
    // We should convert them to string[] (base64) for the API and PreviewReference.
    
    if (newFormData.productImages && Array.isArray(newFormData.productImages)) {
       // We can't synchronously convert Files here easily without an effect or async handler.
       // For simplicity in this `page.tsx` pass-through, we can pass the mixed array if PreviewPanel can handle it,
       // BUT PreviewPanel expects `productImageBase64` string.
       // Let's update PreviewPanel props to accept `productImages`.
       
       // For the `refImage` prop in `PreviewPanel`'s generation, it needs to know the "main" image or all of them.
       // Let's simply collect the strings if they are already strings (e.g. from pre-fill),
       // or if they are Files, meaningful usage usually requires conversion.
       // 
       // STRATEGY: Update `handleFormChange` to just set the form data. 
       // `PreviewPanel` will receive the full `currentFormData` eventually or we pass the images explicitly.
       // 
       // The `PreviewPanel` currently takes `productImageBase64`. We will change this to `productImages`.
       // We can iterate and create object URLs for display, but for API calls we need base64.
       //
       // A quick fix: We will rely on `InputForm` to eventually provide base64? No, InputForm uses Files.
       // 
       // Let's change `page.tsx` state to just hold the form data. 
       // Then we update `PreviewPanel` to accept `OculusFormData` or just the images array.
       // 
       // Let's try to extract base64s effectively if possible, OR just pass the array and let PreviewPanel convert on the fly/on demand.
    }
  }, []);

  return (
    <div className="flex h-screen p-6 md:p-8 gap-6 overflow-hidden">
      {/* Left Panel - Input */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[400px] shrink-0 overflow-y-auto no-scrollbar rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Oculus Flow</h1>
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
          <ArkImageGenOptionsPanel
            value={arkOptions}
            onChange={setArkOptions}
          />
        </div>
      </motion.div>

      {/* Right Panel - Preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl"
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
