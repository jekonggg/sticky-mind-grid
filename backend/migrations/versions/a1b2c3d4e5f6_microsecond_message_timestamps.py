"""microsecond_message_timestamps

Revision ID: a1b2c3d4e5f6
Revises: a3b4c5d6e7f8
Create Date: 2026-10-13 22:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'a3b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    if conn.dialect.name == 'mysql':
        conn.execute(sa.text("ALTER TABLE conversation_participants MODIFY COLUMN joined_at DATETIME(6) NULL"))
        conn.execute(sa.text("ALTER TABLE conversation_participants MODIFY COLUMN last_read_at DATETIME(6) NULL"))
        conn.execute(sa.text("ALTER TABLE messages MODIFY COLUMN created_at DATETIME(6) NULL"))
        conn.execute(sa.text("ALTER TABLE messages MODIFY COLUMN updated_at DATETIME(6) NULL"))


def downgrade():
    conn = op.get_bind()
    if conn.dialect.name == 'mysql':
        conn.execute(sa.text("ALTER TABLE conversation_participants MODIFY COLUMN joined_at DATETIME NULL"))
        conn.execute(sa.text("ALTER TABLE conversation_participants MODIFY COLUMN last_read_at DATETIME NULL"))
        conn.execute(sa.text("ALTER TABLE messages MODIFY COLUMN created_at DATETIME NULL"))
        conn.execute(sa.text("ALTER TABLE messages MODIFY COLUMN updated_at DATETIME NULL"))
