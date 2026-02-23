"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Icon } from "@iconify/react";
import MagneticButton from "./MagneticButton";

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ScissorsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

export default function ImageSlicer() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [sliceCount, setSliceCount] = useState<number>(4);
  const [isDragging, setIsDragging] = useState(false);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle Drag & Drop
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setProcessedImages([]); // Reset previous cuts
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Slice Logic
  const handleSlice = async () => {
    if (!imageSrc) return;
    
    const img = new Image();
    img.src = imageSrc;
    await img.decode();
    
    const pieceHeight = img.height / sliceCount;
    const newImages: string[] = [];

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = pieceHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    for (let i = 0; i < sliceCount; i++) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the slice
        ctx.drawImage(
            img,
            0, i * pieceHeight, img.width, pieceHeight, // Source
            0, 0, canvas.width, canvas.height        // Destination
        );
        
        newImages.push(canvas.toDataURL("image/png"));
    }
    
    setProcessedImages(newImages);
  };

    const downloadAll = () => {
        processedImages.forEach((src, index) => {
            const link = document.createElement("a");
            link.href = src;
            link.download = `slice_${index + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const scrollToCut = (index: number) => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollHeight = container.scrollHeight;
            const targetPos = (index / sliceCount) * scrollHeight;
            // Center the cut line in the viewport if possible, or just scroll to it
            // Let's try to center it: targetPos - (viewportHeight / 2)
            const viewportHeight = container.clientHeight;
            const centeredPos = targetPos - (viewportHeight / 2);
            
            container.scrollTo({
                top: centeredPos,
                behavior: 'smooth'
            });
        }
    };

  return (
    <div 
        className={`min-h-screen w-full flex flex-col transition-colors duration-500 ${isDragging ? "bg-zinc-900" : "bg-zinc-950"}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
    >
        {/* Header / Nav */}
        <header className="sticky top-0 w-full p-5 flex justify-between items-center z-30 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
            <h1 className="text-sm font-bold tracking-widest uppercase text-white/80">PICTRANS <span className="opacity-40 font-normal">SLICER</span></h1>
            <div className="text-[10px] tracking-widest uppercase text-zinc-500 font-mono">
                {imageSrc ? "Editor Active" : "Waiting for Input"}
            </div>
        </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 relative z-10 py-12">
        
        {!imageSrc ? (
            // Empty State
            <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
                <div 
                    className="w-64 h-64 border border-dashed border-zinc-700 rounded-full flex items-center justify-center group cursor-pointer hover:scale-105 hover:border-zinc-500 transition-all duration-300 relative overflow-hidden"
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <div className="absolute inset-0 bg-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full scale-0 group-hover:scale-100 origin-center" />
                    <UploadIcon />
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={onFileSelect}
                        aria-label="上传长图"
                    />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-2xl font-light text-zinc-200">
                        Drag &amp; Drop your long image
                    </p>
                    <p className="text-sm text-zinc-400 font-mono">
                        or click the circle to browse
                    </p>
                </div>
            </div>
        ) : (
            // Editor State
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-start animate-in slide-in-from-bottom-10 duration-700">
                
                {/* Preview Column */}
                <div className="relative group rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-zinc-900">
                     <div className="absolute top-4 right-4 z-20">
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => setImageSrc(null)}
                            className="rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 h-9 w-9"
                            title="Clear image"
                        >
                            <Icon icon="lucide:x" className="h-4 w-4" />
                        </Button>
                     </div>
                     
                     {/* The Image Preview with Slice Lines */}
                     <div 
                        ref={scrollContainerRef}
                        className="relative w-full h-[60vh] overflow-y-auto custom-scrollbar bg-zinc-800 scroll-smooth"
                     >
                        <div className="relative w-full min-h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageSrc} alt="Original uploaded content" className="w-full h-auto block" />
                            
                            {/* Overlay Lines */}
                            <div className="absolute inset-0 pointer-events-none">
                                {Array.from({ length: sliceCount - 1 }).map((_, i) => (
                                    <div 
                                        key={i}
                                        className="absolute left-0 w-full border-t border-red-500/50 border-dashed"
                                        style={{ top: `${((i + 1) / sliceCount) * 100}%` }}
                                    >
                                        <div className="absolute right-8 -top-3 text-[10px] text-red-500 bg-white/80 px-1 rounded font-mono shadow-sm">
                                            Cut #{i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>

                     {/* Navigation Rail */}
                     <div className="absolute top-0 right-0 w-6 h-[60vh] bg-zinc-800/50 backdrop-blur-sm border-l border-zinc-700 flex flex-col items-center py-2 z-10">
                        {Array.from({ length: sliceCount - 1 }).map((_, i) => (
                            <div 
                                key={i}
                                className="absolute w-4 h-4 -ml-2 left-1/2 flex items-center justify-center cursor-pointer group hover:scale-150 transition-transform"
                                style={{ top: `${((i + 1) / sliceCount) * 100}%`, marginTop: '-8px' }}
                                onClick={() => scrollToCut(i + 1)}
                                title={`Jump to Cut #${i + 1}`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 group-hover:bg-red-600 transition-colors shadow-sm" />
                            </div>
                        ))}
                     </div>
                </div>

                {/* Controls Column */}
                <div className="flex flex-col gap-8 lg:pt-12">
                     <div className="space-y-4">
                        <h2 className="text-4xl font-light tracking-tight text-white">Configure Cuts</h2>
                        <p className="text-zinc-400">
                            Split your long screenshot into multiple seamlessly connected images.
                        </p>
                     </div>

                     <div className="space-y-2">
                         <div className="flex justify-between text-sm font-medium text-white">
                             <span>Slices</span>
                             <span className="font-mono text-xl">{sliceCount}</span>
                         </div>
                         <Slider
                            min={2}
                            max={20}
                            step={1}
                            value={[sliceCount]}
                            onValueChange={([v]) => setSliceCount(v ?? 4)}
                            className="w-full"
                         />
                         <div className="flex justify-between text-xs text-zinc-400 font-mono">
                             <span>2</span>
                             <span>20</span>
                         </div>
                     </div>

                     <div className="flex gap-4">
                         <MagneticButton 
                            onClick={handleSlice}
                            className="flex-1 h-14 bg-white text-black rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-95"
                         >
                            <ScissorsIcon />
                            <span>Process Images</span>
                         </MagneticButton>
                     </div>

                     {processedImages.length > 0 && (
                         <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                             <div className="h-px w-full bg-zinc-800" />
                             <div className="flex items-center justify-between">
                                 <div>
                                     <h3 className="font-semibold text-white">{processedImages.length} Images Ready</h3>
                                     <p className="text-xs text-zinc-500">Average size: {Math.round(processedImages[0]?.length / 1024 || 0)}KB</p>
                                 </div>
                                  <MagneticButton 
                                      onClick={downloadAll}
                                      className="px-6 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm font-medium text-white"
                                 >
                                     <DownloadIcon />
                                     Download All
                                 </MagneticButton>
                             </div>
                             
                             <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                 {processedImages.map((src, i) => (
                                     <div key={i} className="aspect-3/4 rounded-md overflow-hidden bg-zinc-100 relative group ring-1 ring-black/5 dark:ring-white/10">
                                         {/* eslint-disable-next-line @next/next/no-img-element */}
                                         <img src={src} alt={`Slice ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                         <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                             #{i + 1}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}
                </div>

            </div>
        )}
      </main>
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

    </div>
  );
}
