"""生产环境单页应用路由回退，资源和 API 的 404 保持原样。"""

from pathlib import PurePosixPath

from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope


class FrontendFiles(StaticFiles):
    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if (
                exc.status_code != 404
                or path.split("/", 1)[0] in {"api", "events", "assets"}
                or PurePosixPath(path).suffix
            ):
                raise
            return await super().get_response("index.html", scope)
