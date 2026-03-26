# PaperToQuiz — 练习册转互动试卷

> 上传练习册照片，AI 自动识别并生成互动试卷，在线作答并智能批改。

## ✨ 功能亮点

- **📸 图片识别**：拍照或截图上传，AI 视觉模型自动解析练习册内容
- **📝 多题型支持**：填空题 (fill_in_the_blank)、匹配题 (matching)、简答题 (short_answer)
- **🔑 答案导入**：支持上传答案照片或粘贴文字答案，AI 自动匹配
- **✏️ 在线编辑**：识别结果可直接编辑标题、题目、指令和答案
- **🔄 区域重扫**：对识别不准的部分可用裁剪工具框选重新识别
- **🤖 AI 智能批改**：基于 LLM 语义理解批改，灵活接受同义表达
- **💡 AI 错题解析**：答错后一键获取 AI 语法解析（中文）
- **📊 成绩统计**：提交后即时显示正确率、正确/错误数
- **💾 本地持久化**：试卷数据存储在本地 SQLite 数据库

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Next.js 15](https://nextjs.org/) (App Router) |
| 语言 | TypeScript |
| UI | React 19 + Tailwind CSS 4 |
| 动画 | [Motion](https://motion.dev/) (Framer Motion) |
| 图标 | [Lucide React](https://lucide.dev/) |
| 数据库 | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| 图片裁剪 | [react-easy-crop](https://github.com/ricardo-ch/react-easy-crop) |
| AI 后端 | [LM Studio](https://lmstudio.ai/)（本地推理，OpenAI 兼容 API） |

## 📁 项目结构

```
worksheet-to-interactive-quiz/
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页 - 试卷列表
│   ├── globals.css             # 全局样式
│   ├── create/
│   │   └── page.tsx            # 创建试卷页面（上传→答案→识别→预览）
│   ├── quiz/
│   │   └── [id]/
│   │       └── page.tsx        # 试卷作答页面（答题→提交→批改→解析）
│   └── api/
│       ├── generate/
│       │   └── route.ts        # AI 图片识别 → Quiz JSON（流式）
│       ├── grade/
│       │   └── route.ts        # AI 智能批改
│       ├── explain/
│       │   └── route.ts        # AI 错题解析
│       └── quizzes/
│           ├── route.ts        # 试卷 CRUD - 列表 & 创建
│           └── [id]/
│               └── route.ts    # 试卷 CRUD - 查询 & 删除 & 更新答案
├── components/
│   ├── QuizRenderer.tsx        # 试卷渲染组件（预览 & 互动模式）
│   ├── QuizCard.tsx            # 试卷卡片（首页列表项）
│   ├── StepIndicator.tsx       # 创建流程步骤指示器
│   └── CropModal.tsx           # 图片裁剪弹窗
├── lib/
│   ├── db.ts                   # SQLite 数据库操作
│   ├── parseAnswerKey.ts       # 答案文本解析器
│   └── utils.ts                # 通用工具函数
├── types/
│   └── quiz.ts                 # Quiz/Section/Question/GradingResult 类型定义
├── hooks/
│   └── use-mobile.ts           # 移动端检测 Hook
├── data/
│   └── quizzes.db              # SQLite 数据库文件（自动创建，已 gitignore）
├── .env.example                # 环境变量模板
└── package.json
```

## 🚀 快速开始

### 前置条件

- **Node.js** ≥ 18
- **LM Studio**（或其他 OpenAI 兼容的本地推理服务）
  - 推荐模型：支持视觉 (Vision) 的多模态模型，如 Qwen 系列

### 安装 & 运行

```bash
# 1. 克隆项目
git clone <repo-url>
cd worksheet-to-interactive-quiz

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 LM Studio 地址和自定义提示词

# 4. 启动开发服务器
npm run dev
```

### 环境变量说明

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_LM_STUDIO_URL` | LM Studio API 地址 | `http://127.0.0.1:1234` |
| `NEXT_PUBLIC_MODEL_NAME` | 使用的模型名 | 默认`qwen/qwen3.5-35b-a3b` |
| `WORKSHEET_RECOGNITION_PROMPT` | 自定义图片识别提示词 |  |
| `GRADING_SYSTEM_PROMPT` | 自定义批改提示词 |  |
| `EXPLAIN_SYSTEM_PROMPT` | 自定义解析提示词 |  |

## 📖 使用流程

### 创建试卷

1. **上传图片** — 拖拽/粘贴/选择练习册照片
2. **录入答案**（可选）— 上传答案图片或粘贴文字答案
3. **AI 识别** — 等待 AI 分析并生成结构化试卷（15~40 秒）
4. **预览保存** — 检查识别结果，编辑修正后保存

### 作答 & 批改

1. 从首页选择试卷，进入作答页面
2. 填写各题答案
3. 点击「提交答案」，AI 自动批改
4. 查看正确率与错题详情
5. 对错题点击「AI 解析」获取语法讲解

## 🛠️ 开发命令

```bash
npm run dev     # 启动开发服务器
npm run build   # 构建生产包
npm run start   # 启动生产服务器
npm run lint    # 运行 ESLint
npm run clean   # 清理 .next 缓存
```

## 📄 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/quizzes` | 获取所有试卷列表 |
| `POST` | `/api/quizzes` | 创建新试卷 |
| `GET` | `/api/quizzes/:id` | 获取试卷详情 |
| `DELETE` | `/api/quizzes/:id` | 删除试卷 |
| `PATCH` | `/api/quizzes/:id` | 更新试卷答案 |
| `POST` | `/api/generate` | AI 图片识别（支持流式返回） |
| `POST` | `/api/grade` | AI 批量批改 |
| `POST` | `/api/explain` | AI 单题解析 |

## 📝 License

Licensed under the [Apache License, Version 2.0](LICENSE).
