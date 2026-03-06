"use client";

import { useState } from "react";
import { Sparkles, Paperclip, ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

type Token = {
  id: string;
  label: string;
  value: string;
  options: string[];
};

export default function InteractivePrompt() {
  const [tokens, setTokens] = useState<Token[]>([
    { id: "product", label: "爆款商品", value: "爆款商品", options: ["爆款商品", "秋季新品", "护肤套装", "数码单品"] },
    { id: "assetType", label: "主图海报", value: "主图海报", options: ["主图海报", "详情页", "朋友圈配图", "Banner"] },
    { id: "style", label: "极简高级", value: "极简高级", options: ["极简高级", "赛博朋克", "清新自然", "奢华黑金"] },
    { id: "focus", label: "材质细节", value: "材质细节", options: ["材质细节", "产品功能", "使用场景", "品牌调性"] },
  ]);

  const [activeToken, setActiveToken] = useState<string | null>(null);

  const handleTokenSelect = (tokenId: string, newValue: string) => {
    setTokens(tokens.map(t => t.id === tokenId ? { ...t, value: newValue } : t));
    setActiveToken(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      <div className="relative backdrop-blur-2xl bg-zinc-900/40 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-visible">
        
        {/* Main Mad Libs Text */}
        <div className="text-xl md:text-2xl leading-loose md:leading-[2.2] text-zinc-300 font-light placeholder-text">
          <span>我是品牌方，希望能生成一张 </span>
          
          <TokenDropdown 
            token={tokens[0]} 
            isActive={activeToken === tokens[0].id}
            onToggle={() => setActiveToken(activeToken === tokens[0].id ? null : tokens[0].id)}
            onSelect={(val) => handleTokenSelect(tokens[0].id, val)}
          />
          
          <span> 的 </span>

          <TokenDropdown 
            token={tokens[1]} 
            isActive={activeToken === tokens[1].id}
            onToggle={() => setActiveToken(activeToken === tokens[1].id ? null : tokens[1].id)}
            onSelect={(val) => handleTokenSelect(tokens[1].id, val)}
          />
          
          <span>，风格偏向 </span>

          <TokenDropdown 
            token={tokens[2]} 
            isActive={activeToken === tokens[2].id}
            onToggle={() => setActiveToken(activeToken === tokens[2].id ? null : tokens[2].id)}
            onSelect={(val) => handleTokenSelect(tokens[2].id, val)}
          />
          
          <span>，主要为了突出 </span>

          <TokenDropdown 
            token={tokens[3]} 
            isActive={activeToken === tokens[3].id}
            onToggle={() => setActiveToken(activeToken === tokens[3].id ? null : tokens[3].id)}
            onSelect={(val) => handleTokenSelect(tokens[3].id, val)}
          />
          
          <span>。</span>
        </div>

        {/* Action Bar */}
        <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-6">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-zinc-300 text-sm border border-white/5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>AI Enhance</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-zinc-300 text-sm border border-white/5">
              <Paperclip className="w-4 h-4" />
              <span>Attach</span>
            </button>
          </div>
          
          <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]">
            <span>New Creative Space</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Parameter Pills */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {["16:9 横屏", "4K 高清", "影棚光", "人像居中"].map((pill) => (
          <div key={pill} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer">
            {pill}
          </div>
        ))}
      </div>
    </div>
  );
}

// Subcomponent for the editable token
function TokenDropdown({ token, isActive, onToggle, onSelect }: { token: Token, isActive: boolean, onToggle: () => void, onSelect: (val: string) => void }) {
  return (
    <span className="relative inline-block mx-1">
      <button 
        onClick={onToggle}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        {token.value}
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      {/* Dropdown Menu */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 mt-2 w-48 py-2 rounded-xl bg-zinc-800/90 backdrop-blur-xl border border-white/10 shadow-2xl z-50"
        >
          {token.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {opt}
            </button>
          ))}
          <div className="h-px bg-white/5 my-1" />
          <button className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-white/10 transition-colors italic">
            自定义输入...
          </button>
        </motion.div>
      )}
    </span>
  );
}
