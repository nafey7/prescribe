import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings
from app.repository.chat import ensure_indexes as ensure_chat_indexes
from app.repository.fitness_plan_share import ensure_indexes as ensure_fitness_plan_share_indexes
from app.repository.meal_plan_share import ensure_indexes as ensure_meal_plan_share_indexes
from app.repository.refresh_tokens import ensure_indexes as ensure_refresh_token_indexes

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongodb() -> None:
    global _client, _database
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _database = _client[settings.DATABASE_NAME]
    # Verify connectivity
    await _client.admin.command("ping")
    await ensure_chat_indexes(_database)
    await ensure_refresh_token_indexes(_database)
    await ensure_meal_plan_share_indexes(_database)
    await ensure_fitness_plan_share_indexes(_database)
    logger.info("Connected to MongoDB: %s", settings.DATABASE_NAME)


async def close_mongodb() -> None:
    global _client, _database
    if _client is not None:
        _client.close()
        _client = None
        _database = None
        logger.info("Disconnected from MongoDB")


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("MongoDB not connected. Call connect_to_mongodb() first.")
    return _database
