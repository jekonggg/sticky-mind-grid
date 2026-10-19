"""add_notify_card_moves_to_user_preferences_and_clean_legacy_task_moves

Revision ID: c7d8e9f0a1b2
Revises: b2c3d4e5f6a7
Create Date: 2026-10-19 22:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c7d8e9f0a1b2'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # 1. Add notify_card_moves column if not already present
    if 'user_preferences' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_preferences')]
        if 'notify_card_moves' not in columns:
            op.add_column(
                'user_preferences',
                sa.Column('notify_card_moves', sa.Boolean(), nullable=False, server_default=sa.text('1'))
            )
        else:
            op.execute("UPDATE user_preferences SET notify_card_moves = 1")
            
    # 2. Clean up legacy noisy task_move notifications so inbox is clean
    if 'notifications' in inspector.get_table_names():
        op.execute("DELETE FROM notifications WHERE type = 'task_move'")

def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'user_preferences' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('user_preferences')]
        if 'notify_card_moves' in columns:
            op.drop_column('user_preferences', 'notify_card_moves')
