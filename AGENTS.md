# 项目约定

阅读 `docs/spec.md` 和 `docs/design.md` 后再改动。已确定采用 Python / FastAPI / SQLAlchemy / PostgreSQL 后端，React / TypeScript / Konva 前端；不机械迁移到 Java 或 Vue。

- 后端：routers 做 HTTP 适配，schemas 做字段校验与响应模型，services 做业务、归属与事务，repositories 放复杂 / 复用查询。业务异常通过 exceptions 和 error_handlers 映射。
- 保持现有 REST、UUID、HTTP 状态、原始成功响应、JWT HttpOnly Cookie、SSE 和下载协议。数据库迁移另行设计。
- 前端：请求统一走 request → service/api，协议类型放 types，页面放 pages/<业务>，局部组件跟随页面。严格 TypeScript，不用 any 或 ts-ignore。
- 视觉：松绿 · 工具，石墨主色，统一 CSS token、8/8/12px 圆角、36px 控件、160ms 动效。无渐变和装饰阴影，最小文字 12px，390px 无页面横向溢出。
- 验证：backend 中运行 `uv run pytest -q`、Ruff 检查与格式检查；frontend 中运行 type-check、lint、test、build、test:e2e。e2e 在 5175 完全拦截 API / SSE，结束后关闭。
- 默认单测不访问网络。集成测试必须显式开启并使用独立资源；不把真实数据库当测试库。服务由用户启动，真实环境由用户验收。
- 用户已授权按需安装本项目必要的工具链、依赖与模型文件，无需逐项确认安装。
- 模板与发布包禁止任何第三方推广、引流链接、宣传图片、二维码和追踪脚本。`npm run build` 必须通过源码与产物内容检查；新增外链或静态素材先检查用途与内容，再更新 `scripts/content-policy.json`，不能为通过构建直接放行。用户自行上传或生成的业务素材不受静态素材清单限制。
- 保持改动可审查；未经用户确认不提交，不推送，不再次改写 Git 历史。
