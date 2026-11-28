from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_env: str = "development"
    api_port: int = 7302

    database_url: str = "postgresql+asyncpg://retouch:retouch_dev@localhost:7311/retouch"
    redis_url: str = "redis://localhost:7312"

    s3_endpoint: str = "http://localhost:7313"
    # 浏览器打开签名 URL 的地址；空则与 s3_endpoint 相同
    s3_public_endpoint: str = ""
    s3_access_key: str = "retouch"
    s3_secret_key: str = "retouch_dev"
    s3_bucket: str = "retouch"
    # 签名 URL 有效期，秒
    s3_url_ttl: int = 900

    # HS256 要求密钥不短于 32 字节
    jwt_secret: str = "dev-only-secret-please-change-in-production"
    jwt_ttl_hours: int = 24

    # image provider: mock | dashscope | openai
    image_provider: str = "mock"
    dashscope_api_key: str = ""
    # 业务空间专属域名为 https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com
    dashscope_base_url: str = "https://dashscope.aliyuncs.com"
    text_to_image_model: str = "qwen-image-3.0-pro"
    image_edit_model: str = "qwen-image-edit-max"
    # openai：OpenAI 兼容的图像接口（/images/generations、/images/edits），也可指向兼容网关
    openai_api_key: str = ""
    # 含 /v1 的接口地址，必须显式配置
    openai_base_url: str = ""
    openai_image_model: str = "gpt-image-1"
    # 规划模型走哪家：dashscope 用百炼兼容模式；openai 用上面的地址和密钥
    planner_provider: str = "dashscope"
    planner_model: str = "qwen-plus"
    # auto：有 rembg 用 rembg，否则四角抠图；测试强制 corner 以免下载模型
    matting_provider: str = "auto"
    # auto：有 rapidocr 则识别文字层；none 跳过；测试强制 none
    ocr_provider: str = "auto"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def frontend_dist(self) -> Path:
        return ROOT_DIR / "frontend" / "dist"


@lru_cache
def get_settings() -> Settings:
    return Settings()
