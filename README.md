# PaperMind

CS/AI 论文追踪与深度解析工具。追踪 arXiv 最新论文，上传 PDF，由 Gemini AI 生成七维深度分析报告。

> 使用你自己的 API Key，完全免费，所有数据仅存储在本地浏览器。

---

## 功能

### 今日精选
- 自动从 arXiv RSS + OpenAlex 抓取最新论文
- 根据用户偏好关键词推断研究领域（cs.AI / cs.CL / cs.CV 等）
- 优先展示顶尖机构（MIT、Stanford、DeepMind、Tsinghua 等）和知名作者的论文
- 关键词无命中时自动退化为领域热门，不显示空白页
- 每小时缓存刷新，支持翻页"换一批"

### 追踪（Tracker）
- 多关键词并行搜索，支持作者、arXiv 分类、年份范围、相关度排序
- 多词关键词自动 AND 分解（"medical agent" → `all:medical AND all:agent`）
- 默认加载 60 篇，支持"加载更多"分页
- 机构标签：通过 Semantic Scholar API 实时补全 affiliation，显示机构角标

### 解析（Analyze）
- 上传本地 PDF 或直接从追踪/精选页传入 arXiv 论文
- Gemini AI 生成七维深度报告：摘要翻译、方法动机、方法设计、对比分析、实验表现、学习应用、总结
- 支持 LaTeX 数学公式渲染（KaTeX）
- 论文内图表引用可点击跳转至对应 PDF 页面
- 报告生成后支持自由追问（Chat）

### 历史（History）
- 所有解析记录自动保存至 localStorage
- 支持模糊搜索（Fuse.js），可按标题、摘要、分析内容检索
- 可单条删除或一键清空

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| AI | Google Gemini API (`@google/generative-ai`) |
| 论文数据 | arXiv Export API + RSS、OpenAlex API、Semantic Scholar API |
| PDF | react-pdf |
| Markdown | react-markdown + remark-gfm |
| 数学公式 | remark-math + rehype-katex + KaTeX |
| 模糊搜索 | Fuse.js |
| 存储 | localStorage（无后端数据库） |

---

## 快速开始

### 1. 克隆并安装

```bash
git clone <repo-url>
cd PaperMind
npm install
```

### 2. 配置环境变量

创建 `.env.local`：

```env
# 必填 — Gemini API Key，用于论文解析
# 申请地址：https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# 可选 — Semantic Scholar API Key，提升 affiliation 查询限速（无 key 时限 100次/5分钟）
# 申请地址：https://www.semanticscholar.org/product/api
SEMANTIC_SCHOLAR_API_KEY=your_s2_api_key
```

> Gemini API Key 也可以在应用内通过设置界面填写，不一定需要写在 `.env.local`。

### 3. 启动

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

---

## 数据流

```
arXiv RSS / Export API
        │
        ▼
  /api/arxiv          ← 关键词搜索、分类浏览
        │
        ▼
Semantic Scholar API
  /api/semanticscholar ← affiliation + 引用数补全
        │
        ▼
   浏览器 / 客户端
        │
        ├── localStorage  ← 历史记录、偏好关键词、精选缓存
        └── Gemini API    ← PDF 解析（直接从客户端调用）

OpenAlex API
  /api/openalex       ← 今日精选机构过滤（顶尖机构近期论文）
```

---

## 项目结构

```
app/
  page.tsx              # 首页（今日精选 + 最近解析）
  tracker/page.tsx      # 追踪页
  analyze/page.tsx      # 解析页
  history/page.tsx      # 历史页
  api/
    arxiv/              # arXiv 搜索 API（RSS + Export API）
    openalex/           # OpenAlex 机构论文 API
    semanticscholar/    # Semantic Scholar affiliation 补全 API
    arxiv-pdf/          # PDF 代理（arXiv PDF 下载）

components/
  NavHeader.tsx         # 顶部导航
  TodaysPicks.tsx       # 今日精选组件
  PaperCard.tsx         # 论文卡片
  KeywordManager.tsx    # 追踪关键词管理
  ReportView.tsx        # 解析报告展示（含 KaTeX）
  HistoryList.tsx       # 历史列表

lib/
  arxiv.ts              # arXiv 搜索函数
  eliteFilter.ts        # 机构/作者威望判断
  todaysPicks.ts        # 今日精选领域推断与评分
  gemini.ts             # Gemini API 调用
  history.ts            # localStorage 历史记录
  preferenceKeywords.ts # localStorage 偏好关键词
```

---

## 许可

MIT
