"""编辑历史与素材顺序查询，不提交事务。"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EditHistory, EditSession, SessionAsset


async def next_position(session: AsyncSession, session_id: uuid.UUID) -> int:
    last = await session.scalar(
        select(func.max(SessionAsset.position)).where(SessionAsset.session_id == session_id)
    )
    return (last or 0) + 1


async def entry_at(session: AsyncSession, record: EditSession, seq: int) -> EditHistory | None:
    return await session.scalar(
        select(EditHistory).where(EditHistory.session_id == record.id, EditHistory.seq == seq)
    )


async def max_seq(session: AsyncSession, record: EditSession) -> int:
    return (
        await session.scalar(
            select(func.max(EditHistory.seq)).where(EditHistory.session_id == record.id)
        )
        or 0
    )


async def history_of(session: AsyncSession, record: EditSession) -> list[EditHistory]:
    result = await session.scalars(
        select(EditHistory)
        .where(EditHistory.session_id == record.id)
        .order_by(EditHistory.seq.desc())
    )
    return list(result)
