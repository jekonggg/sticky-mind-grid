"""add auth_provider, notes table, and message flags

Revision ID: 5e381b19a1c2
Revises: 2bf738216089
Create Date: 2026-10-09 14:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '5e381b19a1c2'
down_revision = '2bf738216089'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add auth_provider and auth_provider_id to users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('auth_provider', sa.String(length=50), nullable=True, server_default='local'))
        batch_op.add_column(sa.Column('auth_provider_id', sa.String(length=255), nullable=True))

    # 2. Add is_forwarded and is_pinned to messages
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_forwarded', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # 3. Create notes table
    op.create_table('notes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('board_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=False, server_default='#fef3c7'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['board_id'], ['boards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('notes')

    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.drop_column('is_pinned')
        batch_op.drop_column('is_forwarded')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('auth_provider_id')
        batch_op.drop_column('auth_provider')
