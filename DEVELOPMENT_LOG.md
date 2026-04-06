# Development Log

## [2026-04-04] - 高级极简主义大纲目录 (TOC) 组件实现

### 核心功能
- **极简设计**：在静止状态下仅显示代表标题等级的水平横线，不占用正文空间。
- **动态交互**：鼠标悬停时平滑展开，显示标题文字，伴随毛玻璃效果和贝塞尔曲线动画。
- **自动提取**：集成 Tiptap 的标题提取逻辑，自动构建 H1-H3 层级树。
- **同步高亮**：利用 `IntersectionObserver` 实现滚动时的实时位置跟踪与高亮。
- **平滑滚动**：点击目录项可平滑跳转至对应正文位置。

### 技术栈
- **React**: 组件化开发。
- **Framer Motion**: 高级补间动画与状态切换。
- **Tailwind CSS**: 基础布局与响应式样式。
- **IntersectionObserver API**: 高性能的可见性追踪。

### 视觉细节 (ui-ux-pro-max)
- 使用 `cubic-bezier(0.4, 0, 0.2, 1)` 贝塞尔曲线。
- 采用 1.5px 的精致线条和 `text-[11px]` 的极简字体。
- 实现了展开时的模糊滤镜 (`backdrop-blur`) 和文字渐入 (`opacity + blur`) 效果。

## [2026-04-06] - 修复组件输入消失问题 & 还原 Blockquote 样式

### 核心修复
- **修复组件消失**: 修复了在 CodeBlock、Sticky Note 和 Footnote 中输入时导致组件消失的 Bug。主要原因是 `NovaBlockEditor.tsx` 中的状态同步逻辑在每次按键时不断调用 `setContent`，导致 ProseMirror 销毁并重建 NodeViews。现已将同步逻辑改为仅在 `note.id` 改变时触发。
- **严格 DOM 映射**: 重构了 `CodeBlockComponent.tsx` 和 `FootnoteComponent.tsx`，使其 React `NodeViewWrapper` 和 `NodeViewContent` 严格使用 `code` 和 `span` 标签，与 Tiptap 的 `renderHTML` 架构定义完美匹配，防止 ProseMirror 丢弃“无效”的嵌套节点。
- **拖拽事件冒泡**: 在 `StickyNoteComponent.tsx` 中重写了拖拽手柄的事件处理逻辑，严格执行 `e.preventDefault()` 和 `e.stopPropagation()`，并确保 `draggable={true}` 以允许正常拖拽。

### 样式调整
- **Blockquote 还原**: 更新了 `novablock-core.css`，将 Blockquote 的样式还原为最初的设计（`font-style: italic !important;` 以及固定的段落边距），符合用户的“初始实现样式”偏好。

## [2026-04-06] - Tiptap 注脚 (Footnote) 组件重构与自动序号系统实现

### 核心功能
- **全自动序号重排**: 实现 ProseMirror 插件 `footnote-reindexer`，通过 `appendTransaction` 实时监听文档变更。无论是插入、删除还是移动注脚，所有序号都会在毫秒级内自动重新计算并同步（[1], [2], [3]...）。
- **交互状态分离**: 
  - **View Mode**: 默认仅显示蓝色的数字序号 `[n]`，保持正文排版极致整洁。
  - **Edit Mode**: 双击序号即可唤起精致的编辑气泡框，支持实时内容修改。
- **高级悬停提示 (Tooltip)**: 鼠标悬停在序号上时，显示带有 **毛玻璃背景 (`backdrop-blur`)** 和 **平滑缩放/淡入动画** 的 Tooltip，优雅呈现注脚全文。
- **内联排版优化**: 严格遵循行内元素规范，采用 `inline-flex` 布局，确保在不同字号和行高下均能完美对齐。

### 技术栈与 UI/UX 设计
- **ProseMirror Plugin**: 负责底层文档树遍历与属性原子化更新。
- **Framer Motion**: 处理 Tooltip 和编辑框的所有补间动画，采用 `easeOut` 曲线。
- **UI-UX Pro Max**: 
  - 编辑框支持 `Cmd/Ctrl + Enter` 快捷保存。
  - Tooltip 采用 `bg-white/90` 半透明设计，增加 `shadow-[0_20px_50px_rgba(0,0,0,0.15)]` 增强悬浮感。
  - 蓝色序号在悬停时具备 `scale-110` 的动态反馈。

### 热修复
- **修复加粗字体颜色与主题适配**: 重构了 `strong` / `b` 标签在 `novablock-core.css` 中的样式，使其不再被不当的全局规则继承为白色。使用了可扩展的主题语义变量（`color: var(--text-primary, #111827)`）来保证其在当前的浅色背景（如 `bg-white`）下保持清晰可读，同时也能完美向前兼容后续即将开发的深浅色/自定义主题系统。不再依赖写死的白字或强制的 `!important`。

### UI 优化
- **待办事项完成动画**: 为 Tiptap TaskList 添加了纯 CSS 的完成效果。当勾选待办事项（`[data-checked="true"]`）时，文字会带有丝滑的过渡动画（`cubic-bezier`）并显示删除线、颜色变浅和透明度降低，增强“划掉待办”的视觉反馈。

### UI 优化
- **TOC 语义化主题变量与可见性修复**: 修复了 TOC（大纲目录）在浅色背景下非悬停状态横线几乎不可见的问题。通过引入语义化 CSS 变量（`--toc-line-muted` / `--toc-line-hover` / `--toc-line-active` 等），并结合 `@media (prefers-color-scheme: dark)` 为不同模式提供合理的默认值。
  - **设计提升**: 浅色模式下，非激活状态的横线可见度从 30% 提升至 40% (rgba(120, 113, 108, 0.4))，确保在白色背景下依然清晰可辨。
  - **健壮性**: 采用 CSS 变量方案，支持未来一键切换主题或自定义背景，且改动仅局限在 TOC 容器内，不影响全局。
  - **性能**: 保持原有的 `IntersectionObserver` 逻辑，无冗余 re-render。

### 热修复
- **TOC 静默状态对比度微调**: 重新调整了浅色模式下目录横线的基准变量（从使用 `stone-500` 透明度调整为直接使用基于黑色的 `rgba(0,0,0,0.15)`），解决部分浅色背景下横线对比度依旧偏低的问题。深色模式则使用 `rgba(255,255,255,0.3)` 来确保良好的辨识度。

### 热修复
- **TOC 悬停状态恢复**: 响应用户反馈，恢复了 TOC 在【鼠标悬停展开时】的高级视觉效果（毛玻璃背板 `backdrop-blur`、投影、以及圆角背景框），确保展开后目录层级清晰且具有原先受青睐的美感。同时保留了【非悬停静默状态】下无背景的极简设定，并进一步固化了主题 token 对深浅色双模式的支持。

### 热修复
- **TOC 非悬停可见度终极调整**: 彻底去除了 TOC 的所有背景颜色（无论是悬停还是非悬停），在悬停时仅保留纯净的 `backdrop-blur(12px)` 毛玻璃滤镜。同时，大幅提升了非悬停状态下的横线不透明度（达到 `0.35`），确保在没有背景衬托的浅色环境中也能清晰辨认。

### 热修复
- **TOC 非悬停可见度终极修复**: 找到了导致 TOC 在非悬停状态下隐藏横线的底层原因——原先的组件由于内部强加的 `overflow-hidden` 和固定宽度在失去背景板后导致了元素的布局截断。我们解除了强制隐藏与冗余 `padding`，将非悬停宽度从 40px 微调到 48px，并在内层 `div` 取消了 `overflow-hidden`，确保横线能够自然展现而不被裁剪缩回。

### UI 微调
- **TOC 静默状态视觉弱化**: 听取用户对于极简美学的要求，将非活跃状态的横线透明度降至极低的 `0.12`（深色模式 `0.15`），呈现“隐隐约约”的视觉边缘存在感。当用户滚动到特定区域时，当前标题的横线高亮才会真正脱颖而出，从而在“指示”与“不打扰”之间找到了最优雅的平衡。

### 交互优化
- **侧边栏悬停展示完整标题**: 解决了侧边栏笔记标题过长被隐藏的问题。添加了浏览器原生的 `title` 属性，当鼠标悬停在被截断的标题上时，可以显示出完整的笔记名称，既保持了侧边栏的整洁，又提升了信息可读性。

## [2026-04-06] - Sticky Note (便利贴) 体验优化

### 核心功能与交互
- **光标处流式插入**: 将便利贴的默认定位从绝对定位 (`position: absolute`) 改为相对流式定位 (`position: relative` + `inline-block`)。现在通过 `/` 斜杠菜单插入便利贴时，它会完美出现在当前光标所在的文档流位置，无需再从顶部固定位置拖拽。
- **内部滚动条 (防溢出)**: 为便利贴的内容区域添加了 `max-h-[260px]` 和优雅的内部滚动条 (`overflow-y-auto custom-scrollbar`)。当输入超长文本时，便利贴本身的大小不再无限撑大，而是保持精致的卡片比例。
- **隐藏式多巴胺/马卡龙色卡**: 
  - 在便利贴右上角新增了一个悬浮呼出的调色板图标 (`Palette`)。
  - 点击即可展开带有 Framer Motion 平滑动画的色卡面板。
  - 内置 12 种精心调配的马卡龙/多巴胺配色（阳光黄、樱花粉、薄荷绿、海冻蓝、香芋紫、蜜桃橘），每种颜色均提供“纯色”与“微透 (0.6 opacity)”两种质感，并支持实时无缝切换。

## [2026-04-06] - 修复文件拖拽功能 Bug 与 Heading 稳定性增强

### 核心修复
- **修复 `ensureHeadingIds` 报错**：在 `CollapsibleHeading.tsx` 扩展中显式实现了 `ensureHeadingIds` 命令，通过遍历文档树为缺失 ID 的标题自动生成基于内容的 Safe Slug 或随机 ID，解决了 `NovaBlockEditor.tsx` 在 `onCreate` 阶段因找不到该命令导致的崩溃。
- **修复 `NodeViewWrapper` 缺失报错**：重构了 `tiptapExtensions.ts` 中的 `FilePlaceholder` 组件，将原始 `div` 渲染修改为使用 `@tiptap/react` 提供的 `NodeViewWrapper` 包裹。这符合 Tiptap React NodeView 的架构要求，消除了控制台中的 `Please use the NodeViewWrapper component` 错误。
- **修复上传接口路径与多文件支持**：
  - 修正了 `api.ts` 中 `upload` 方法的请求路径（从 `/api/upload` 更改为后端实际挂载的 `/api/media/upload`）。
  - 重构了上传逻辑，支持并发处理多文件上传，并将字段名统一为后端期望的 `file`。
  - 在 `handleFilesUpload` 中添加了详细的错误处理和用户提示（Alert），当后端未启动或连接失败（`ERR_CONNECTION_REFUSED`）时，能够自动清理无效的占位符并告知用户。

### 细节优化
- **增强 ID 生成逻辑**：标题 ID 生成现在支持中文字符过滤（Safe Slug），并具备自动冲突检测（Counter 递增），确保 TOC 锚点跳转的唯一性。
- **文件卡片元数据同步**：修复了上传完成后 `FileNode` 属性（size, type）未能正确从后端返回结果中同步的问题。
- **UI/UX 鲁棒性**：增强了上传失败时的回滚机制，确保编辑器状态在网络异常时仍能保持干净、一致。

## [2026-04-06] - 万物皆可拖拽与本地文件预览 (Universal Drag & Drop)

### 核心功能
- **智能拖拽与粘贴 (Drag & Paste)**：深度集成 Tiptap 扩展，支持从系统资源管理器直接拖入文件或从剪贴板粘贴。
- **分类自动化处理**：
  - **图片/视频/音频**：上传后自动识别 MIME 类型，分别渲染为 `ResizableImage`、`VideoNode` 或 `AudioNode`，实现即时预览。
  - **通用文件 (PDF/Word/Excel 等)**：渲染为精美的 **「文件卡片 (File Card)」**，展示图标、文件名和格式化大小。
- **上传占位加载 UX (Placeholder)**：在文件上传期间，在编辑器内插入带有**脉冲动画 (Pulse Animation)** 和进度条提示的临时卡片，上传完成后无缝替换为实际内容，确保流畅的写作节奏。
- **本地程序唤起 (Open-in-System)**：点击文件卡片时，通过后端 `open-file` API 调用操作系统默认关联程序（Windows: `os.startfile`, macOS: `open`, Linux: `xdg-open`）打开文件，实现真正的本地联动。

### 技术栈与 UI/UX 设计
- **后端 (Python/FastAPI)**：
  - 新增 `/api/system/open-file` 接口，支持绝对路径与相对上传目录的安全解析。
  - 已有 `/api/media/upload` 与静态文件挂载逻辑。
- **前端 (NovaBlock/React)**：
  - **ProseMirror Plugin**: 拦截 `drop` 和 `paste` 事件，处理 `File` 对象队列。
  - **Tailwind CSS & Lucide**: 
    - File Card 采用 **Notion/Linear 风格** 的现代极简设计：`rounded-xl` 大圆角、`shadow-sm` 微阴影。
    - 增加 Hover 时的 `scale-105` 缩放反馈与背景色微变 (`transition-all duration-200`)。
    - 支持暗色模式 (`dark:bg-stone-900`)，保持灰阶克制。

### 细节优化
- **安全性**: 限制 `open-file` 仅能访问本地已存在的文件，并优先匹配上传目录。
- **UI Pro Max**: 文件类型标签 (Type Tag) 采用全大写字母与 `tracking-wider` 间距，增强专业感。
- **交互**: 在 File Card 右侧添加 `ExternalLink` 图标，暗示点击即可在外部打开。

## [2026-04-06] - v0.01 发布：拍立得风格 UI 与云端环境适配

### 核心更新
- **发布 v0.01**：正式发布项目初始版本，包含完整的块级编辑器脚手架。
- **“拍立得”风格 UI 上线**：彻底重构了多媒体卡片（图片、视频、音频）的展示 UI。引入了类似拍立得照片的视觉风格，包含精致的边框、阴影以及鼠标悬停时的微位移/缩放交互效果。
- **修复云端 500 错误**：修复了在云端代理（Strato Proxy）环境下，图片上传因 Content-Length 或路径解析问题导致的 500 内部服务器错误。
- **环境自适应**：完善了 `getApiBase` 逻辑，支持本地与云端环境的动态切换。

## [2026-04-07] - 发布 v0.02 版本：极速保存与拖拽性能优化

### 核心功能与修复
- **v0.02 版本发布**: 正式将版本更新为 0.02，专注于极致流畅度的编辑器底座打磨。
- **修复 React 渲染栈溢出 (Maximum update depth exceeded)**: 彻底重构了拖拽便利贴 (`StickyNoteItem`) 时的保存逻辑。拖拽的 60fps 坐标变化现已彻底脱离全局 `onSave` 渲染树，改为本地高频更新与统一的 3 秒 Debounce 后台静默合并保存。杜绝了因高频拖拽导致的页面死锁与崩溃。
- **修复 `onFlushSave` 解构遗漏**: 修复了属性面板（`PropertyPanel.tsx`）中 `ReferenceError: onFlushSave is not defined` 的报错，使得天气/心情等元数据的修改能够立即“Flush”当前笔记状态，实现保存的极速响应（所见即所存）。
- **同步机制升级 (Flush 模式)**: 确立了 "编辑器内部修改走 Debounce（防抖），外部元数据修改走 Flush（立即刷新）" 的高性能双轨保存架构。

### 规范与流程
- **约定 Commit Message 语言**: 根据用户偏好，今后涉及到 GitHub 提交、Release 注释以及更新说明的撰写，将全面采用**中文**，以便于后续回顾与文档同步。