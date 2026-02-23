"use client";

import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import MagneticButton from "@/app/components/MagneticButton";

interface ApparelInputFormProps {
  onGenerate: (data: { category: string; targetAudience: string; images: File[] }) => void;
  onStop: () => void;
  isGenerating: boolean;
}

export function ApparelInputForm({ onGenerate, onStop, isGenerating }: ApparelInputFormProps) {
  const [category, setCategory] = useState("羽绒服");
  const [targetAudience, setTargetAudience] = useState("儿童；中大童；110-175");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !targetAudience.trim()) return;
    onGenerate({ category, targetAudience, images });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 flex-1">
      <div className="space-y-4">
        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-zinc-300">产品品类 (Category)</Label>
          <Input 
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isGenerating}
            placeholder="例如：羽绒服、冲锋衣"
            className="bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
          />
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience" className="text-zinc-300">目标客群 (Audience Tags)</Label>
          <Input 
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            disabled={isGenerating}
            placeholder="例如：儿童；中大童；110-175"
            className="bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 font-mono text-sm"
          />
          <p className="text-[10px] text-zinc-500 mt-1">无需输入详细尺码或参数，AI 自动进行人群降维洞察。</p>
        </div>

        {/* Visual Input (Dropzone simplified) */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center">
             <Label className="text-zinc-300">视觉资产 (Vision Input)</Label>
             <span className="text-[10px] text-zinc-500">{images.length} / 5</span>
          </div>
          
          <div 
            onClick={() => !isGenerating && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isGenerating ? 'border-zinc-800 opacity-50 cursor-not-allowed' : 'border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/5'}`}
          >
             <Icon icon="lucide:image-plus" className="h-8 w-8 text-zinc-400 mb-2" />
             <span className="text-sm font-medium text-zinc-300">添加平铺图/模特图</span>
             <span className="text-xs text-zinc-500 mt-1">AI 视觉解析师将自动识别设计卖点</span>
             <input 
               ref={fileInputRef}
               type="file"
               multiple
               accept="image/*"
               className="hidden"
               onChange={handleImageUpload}
               disabled={isGenerating}
             />
          </div>

          {/* Image Previews */}
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative group w-16 h-16 rounded-md overflow-hidden ring-1 ring-white/10 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  {!isGenerating && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon icon="lucide:x" className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6 flex gap-3">
        {isGenerating ? (
          <MagneticButton
            onClick={onStop}
            type="button"
            className="flex-1 h-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
          >
            <Icon icon="lucide:square" className="h-4 w-4" />
            紧急中断
          </MagneticButton>
        ) : (
          <MagneticButton
            type="submit"
            className="flex-1 h-12 bg-linear-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] shadow-lg shadow-indigo-500/25"
          >
            <Icon icon="lucide:bot" className="h-5 w-5" />
            交由 AI 接管策划
          </MagneticButton>
        )}
      </div>
    </form>
  );
}
