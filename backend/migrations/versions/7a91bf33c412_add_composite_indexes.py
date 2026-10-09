"""add composite indexes for tasks, board_members, and messages

Revision ID: 7a91bf33c412
Revises: 5e381b19a1c2
Create Date: 2026-10-09 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7a91bf33c412'
down_revision = '5e381b19a1c2'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Composite indexes on tasks
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.create_index('ix_tasks_board_deleted_pos', ['board_id', 'is_deleted', 'position'], unique=False)
        batch_op.create_index('ix_tasks_assigned_due', ['assigned_to', 'due_date'], unique=False)

    # 2. Composite index on board_members
    with op.batch_alter_table('board_members', schema=None) as batch_op:
        batch_op.create_index('ix_board_members_user_status', ['user_id', 'status'], unique=False)

    # 3. Composite index on messages
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.create_index('ix_messages_conv_created', ['conversation_id', 'created_at'], unique=False)


def downgrade():
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.drop_index('ix_messages_conv_created')

    with op.batch_alter_table('board_members', schema=None) as batch_op:
        batch_op.drop_index('ix_board_members_user_status')

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index('ix_tasks_assigned_due')
        batch_op.drop_index('ix_tasks_board_deleted_pos')
