---
description: Enforce using custom smooth scrollbar across the project
---

# Using Custom Scrollbar Skill

## 目的

此 skill 强制在整个 VetFlow 项目中使用一致的自定义平滑滚动条，以保持视觉一致性并提升用户体验。

## 规则

### 必须使用自定义滚动条

1. **所有可滚动容器** 必须使用 `.scrollbar-custom` CSS 类
2. **需要平滑滚动时**，使用 `useSmoothScroll` hook（集成 Lenis 库）
3. **禁止使用原生滚动条**，除非应用了自定义样式

---

## CSS 类使用方法

### 基础用法（仅滚动条样式，无平滑滚动）

```tsx
// 简单的滚动条样式
<div className="overflow-y-auto scrollbar-custom">
  {content}
</div>

// 结合 Tailwind 实用类
<div className="h-screen overflow-y-auto scrollbar-custom">
  {content}
</div>
```

---

## Hook 使用方法（平滑滚动）

### 基础示例

```tsx
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

function MyComponent() {
  const { wrapperRef, contentRef } = useSmoothScroll();

  return (
    <div
      ref={wrapperRef as React.RefObject<HTMLDivElement>}
      className="h-full overflow-y-auto scrollbar-custom"
    >
      <div ref={contentRef}>{/* Your content */}</div>
    </div>
  );
}
```

### 高级配置

```tsx
const { wrapperRef, contentRef } = useSmoothScroll({
  duration: 1.5, // 滚动动画持续时间
  wheelMultiplier: 1.5, // 鼠标滚轮速度倍数
  touchMultiplier: 2, // 触摸滚动速度倍数
});
```

---

## 实现细节

### 滚动条样式

- **宽度**: 5px（纤细，视觉占用小）
- **滑块颜色**: `rgba(255, 255, 255, 0.1)`（微妙的半透明）
- **滑块悬停**: `rgba(255, 255, 255, 0.2)`（悬停时稍微明显）
- **轨道**: 透明
- **圆角**: 20px（完全圆润）

### 平滑滚动库

- 使用 **Lenis** 实现类原生的平滑滚动
- 桌面和移动端均可工作
- 组件卸载时自动清理

---

## 何时使用

### ✅ 使用自定义滚动条 + 平滑滚动

- 主要内容区域（页面、模态框）
- 侧边栏导航
- 聊天历史
- 知识库面板
- 长表单输入
- 数据表格

### ✅ 仅使用自定义滚动条（无平滑滚动）

- 小型下拉菜单
- 工具提示
- 短列表
- 平滑滚动可能感觉太慢的组件

### ❌ 不要使用

- 系统级滚动条（body 元素）- 让浏览器处理
- 水平滚动（当前实现仅支持垂直滚动）

---

## 故障排除

### 滚动条未显示

- 确保父容器有固定高度或 `max-height`
- 检查 `overflow-y-auto` 已应用
- 验证内容超过容器高度

### 平滑滚动不工作

- 确保 `wrapperRef` 和 `contentRef` 都已应用
- 检查 Lenis 已安装：`bun add lenis`
- 验证 ref 应用到正确的元素（wrapper = 可滚动容器，content = 内部内容）

### 性能问题

- 减少 `duration` 值以加快滚动速度
- 调整 `wheelMultiplier` 和 `touchMultiplier` 以提高响应性
- 检查是否有多个 Lenis 实例运行（每个应该是独立的）

---

## 代码库中的示例

- **侧边栏**: [`components/layout/Sidebar.tsx`](file:///c:/Users/a4061/Desktop/LianYin/PetInsuranceSystem/vetflow/components/layout/Sidebar.tsx) (第 193-219 行)
- **宠物表单页面**: [`app/dashboard/pets/new/page.tsx`](file:///c:/Users/a4061/Desktop/LianYin/PetInsuranceSystem/vetflow/app/dashboard/pets/new/page.tsx)

---

## 相关 Skills

- `using-iconify` - 图标一致性
- `using-shadcn-date-picker` - 组件一致性
- `no-emoji-use-iconify` - 禁止使用 emoji

---

## 维护

在以下情况下更新此 skill：

- 滚动条样式发生变化
- Lenis 配置更新
- 需要新的滚动条变体（例如水平滚动）
