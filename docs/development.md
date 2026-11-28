# AI 修图智能体 · 开发文档

> 本文从项目 README 迁移而来，项目介绍见 [README](../README.md)。

## 结构与约定

后端按 routers、schemas、services、repositories、models 分层，耗时任务由独立 Worker 执行，依赖 PostgreSQL、Redis 和兼容 S3 的对象存储。前端按业务组织页面，接口调用集中在 service/api，通过 REST API 和 SSE 获取数据及进度。

- 开发约定：[AGENTS.md](../AGENTS.md)
- 功能范围与验证记录：[docs/spec.md](spec.md)
- 界面风格：[docs/design.md](design.md)
- 重构记录：[docs/NOTES.md](NOTES.md)

## 本地运行

### 前置条件

- Docker >= 20（含 Compose）
- Python >= 3.13
- Node.js `^20.19.0 || >=22.12.0`（与当前 Vite 版本一致）
- 真实模型调用所需的密钥：百炼的 `DASHSCOPE_API_KEY`，或 OpenAI 兼容接口的 `OPENAI_API_KEY`（二选一）；AI 对话也需要。

### 1. 准备配置

在项目根目录执行，已有 `.env` 时直接编辑：

```bash
cp -n .env.example .env
```

`IMAGE_PROVIDER=mock` 使用本地占位图。真实生图和图像编辑有两种接法：

- `dashscope`：百炼千问图像模型，填写 `DASHSCOPE_API_KEY`。
- `openai`：任何 OpenAI 兼容的图像接口（`/images/generations`、`/images/edits`），包括各类兼容网关；填写 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_IMAGE_MODEL`。网关可能忽略 `n` 和画幅参数，后端会逐张并发请求，并把结果居中裁切到目标尺寸。

AI 对话的规划模型由 `PLANNER_PROVIDER` 决定：`dashscope` 走百炼兼容模式，`openai` 复用上面的 OpenAI 兼容地址和密钥；模型名填在 `PLANNER_MODEL`。后端从项目根目录的 `.env` 读取配置。

### 2. 启动中间件

打开 Docker Desktop，在项目根目录执行：

```bash
docker compose up -d
```

### 3. 启动后端

```bash
# 在项目根目录打开终端一
cd backend

# 安装 uv（已有可跳过）
curl -LsSf https://astral.sh/uv/install.sh | sh   # Windows: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# 安装依赖（国内可加 --index-url https://pypi.tuna.tsinghua.edu.cn/simple）
uv sync --frozen --all-extras

# 初始化数据库
uv run alembic upgrade head

# 启动 API 服务（终端一）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 7302
```

在项目根目录打开终端二，启动 Worker：

```bash
cd backend
uv run arq app.worker.WorkerSettings
```

启动成功后访问 [http://localhost:7302/api/health](http://localhost:7302/api/health)，三个字段全是 `ok` 即为正常。

### 4. 启动前端

**在项目根目录新开终端三**：

```bash
cd frontend
npm ci                                # 国内可加 --registry=https://registry.npmmirror.com
npm run dev
```

浏览器打开 [http://localhost:7301](http://localhost:7301) 即可使用。

### 5. 运行测试

```bash
# 在项目根目录打开终端
cd backend
uv run pytest -q
uv run ruff check app tests
uv run ruff format --check app tests
```

默认只运行断网的单元测试，不连接 PostgreSQL、Redis、对象存储或真实模型。完整服务集成测试需准备独立资源，并显式设置 `TEST_DATABASE_URL`、`TEST_REDIS_URL`、`TEST_S3_ENDPOINT`、`TEST_S3_BUCKET`；数据库名须以 `_test` 结尾，桶名须以 `-test` 结尾，Redis 须显式使用非 0 的独立库，且不能与当前应用配置相同。配置后在 `backend` 执行 `uv run pytest --integration tests/integration`。测试不会初始化数据库或创建桶，需提前按独立测试配置完成迁移和资源准备。

前端在项目根目录另开终端：

```bash
cd frontend
npm ci
npm run type-check
npm run lint
npm test
npm run build
npm run format:check
npm run test:e2e
```

流程测试使用系统已安装的 Google Chrome，构建后临时在 5175 预览生产产物，拦截 API / SSE，结束后自动关闭，不访问真实后端。真实模型与外部服务联调仍需单独验收。

`npm run check:content` 检查模板内容；`npm run build` 自动在构建前后检查源码和发布包，Docker 构建也执行相同检查。禁止推广文案、未批准的外链及未经检查的静态素材。规则和已检查素材的 SHA-256 清单位于 `scripts/content-policy.json`；新增或替换素材须先查看实际内容，再更新清单。第三方依赖许可保持原样，技术文档链接仅按明确地址放行。

### 6. 部署

`Dockerfile` 提供多阶段构建，前端编译后打进后端镜像同源托管。部署前设置根目录 `.env` 中的 `APP_ENV=production` 和随机的 `JWT_SECRET`，并将 `docker-compose.yml` 中 `app`、`worker` 的 `S3_PUBLIC_ENDPOINT` 改为浏览器可访问的对象存储地址。在项目根目录执行：

```bash
docker compose --profile deploy up -d --build
docker compose --profile deploy exec app alembic upgrade head
```

浏览器打开 `http://你的公网IP:7302`。
