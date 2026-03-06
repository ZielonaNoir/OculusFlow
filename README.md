This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Oculus Flow — 豆包 Seedream / Seedance 使用说明

### 支持的模型

| 模型                           | 用途                                       |
| ------------------------------ | ------------------------------------------ |
| **Doubao-Seedream-5.0-lite**   | 即梦 AI 图片生成（成本更低，适合批量出图） |
| **Doubao-Seedance-1.5-pro**    | 文生短视频（短广告、动态概念演示）         |

### 使用步骤

1. **配置 API Key（必须）**  
   在环境变量中设置火山引擎方舟 API Key：`VOLCENGINE_API_KEY`。  
   未配置时：图片接口会返回占位图，视频接口会报错「VOLCENGINE_API_KEY 未配置」。

2. **在设置中选择模型**  
   - 打开 Oculus Flow 页面，进入 **设置** 面板。  
   - **图片**：在「豆包 Seedream — 即梦 AI 系列」中勾选所需模型（如 Doubao-Seedream-5.0-lite）。  
   - **视频**：在「豆包 Seedance 系列」中勾选 Doubao-Seedance-1.5-pro。  
   - 点击 **保存**，选择会写入本地并在此后的图片/视频生成中生效。
