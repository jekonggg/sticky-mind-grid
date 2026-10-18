from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# Cross-database compatible JSON type:
# Emits JSONB on PostgreSQL for indexing and performance, and generic JSON on MySQL & SQLite.
CompatibleJSON = JSON().with_variant(JSONB, "postgresql")
