"""Add workspace_id to boards and make comments.user_id nullable

Revision ID: 8b9c0d1e2f3a
Revises: 7a8b9c0d1e2f
Create Date: 2026-10-11 02:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '8b9c0d1e2f3a'
down_revision = '7a8b9c0d1e2f'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Add workspace_id column to boards table
    with op.batch_alter_table('boards', schema=None) as batch_op:
        batch_op.add_column(sa.Column('workspace_id', sa.String(length=36), nullable=True))
        batch_op.create_index('ix_boards_workspace_id', ['workspace_id'], unique=False)

    # 2. Alter comments.user_id to be nullable for author preservation
    with op.batch_alter_table('comments', schema=None) as batch_op:
        batch_op.alter_column('user_id',
                              existing_type=sa.String(length=36),
                              nullable=True)

def downgrade():
    with op.batch_alter_table('comments', schema=None) as batch_op:
        batch_op.alter_column('user_id',
                              existing_type=sa.String(length=36),
                              nullable=False)

    with op.batch_alter_table('boards', schema=None) as batch_op:
        batch_op.drop_index('ix_boards_workspace_id')
        batch_op.drop_column('workspace_id')
