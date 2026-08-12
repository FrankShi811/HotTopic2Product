# Signal Forge

一个“证据优先”的产品发现工作台。它把信号、来源、概念生成、人工审核和兴趣验证拆成可追溯的步骤，避免将演示内容、模型输出或兴趣记录误称为真实市场需求、订单或生产承诺。

## 已完成的产品升级

- Gemini 从浏览器移到服务端，前端不再接触 API 密钥。
- 默认是无外部调用的本地演示模式，样例信号均明确标为示例数据。
- 支持手动录入可复核的公开来源；服务端只记录 URL，不会主动抓取该 URL。
- 概念生成改为异步任务，带输入校验、单 IP 限流、失败状态与审计轨迹。
- 概念必须由人工批准后才能记录“兴趣反馈”；兴趣不是付款、预售、订单或生产承诺。
- 本地文件持久化采用原子写入，生成图像仅保存到本地数据目录，不再放入浏览器 localStorage。
- 重新设计为响应式中文运营界面，含加载、错误、空状态、主题切换、键盘焦点和减少动态效果支持。
- 增加严格类型检查、单元测试、ESLint、GitHub Actions 与 Dependabot。

## 快速开始

需要 Node.js 22.12 或更高版本。

```bash
npm ci
npm run dev
```

打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)。开发时 Vite 运行在 `3000`，本地 API 运行在 `8787`，浏览器请求会自动代理到 API。

默认运行模式为 `demo`。首次启动会在 `data/atelier.json` 创建本地工作区；该文件及生成的图像被 `.gitignore` 忽略。

## 启用 Gemini（可选）

复制 `.env.example` 为本机 `.env`，只在受信任的服务端进程设置：

```dotenv
MODEL_MODE=gemini
GEMINI_API_KEY=your-server-only-key
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

密钥绝不能以 `VITE_` 前缀、HTML import map 或浏览器环境变量方式暴露。模型图仅作为内部概念审核材料，仍需要来源、商标、版权、设计权和供应链复核。

## 验证与生产运行

```bash
npm run check
npm run build
npm start
```

`npm start` 会在 `3000` 端口同时提供构建后的客户端与 API。当前的 `data/` 文件存储适合单机、单实例 MVP；在多用户或多实例生产部署前，应替换为受管数据库、对象存储、身份认证、细粒度授权、集中式限流、队列和可观察性服务。

## 项目结构

```text
App.tsx                 React 运营工作台
server/index.mjs        API、输入校验、限流、任务与本地持久化
server/domain.mjs       审核状态机和演示数据领域规则
server/domain.test.mjs  领域规则单元测试
public/assets/          前端静态资产
data/                   运行时数据，默认不入库
```

## 仍需由项目所有者决定

本仓库原先没有许可证。我没有擅自添加开源许可证或做法律承诺；公开发布前请由权利人选择合适的许可证，并完成隐私、平台条款、数据来源和生成内容权利评估。
