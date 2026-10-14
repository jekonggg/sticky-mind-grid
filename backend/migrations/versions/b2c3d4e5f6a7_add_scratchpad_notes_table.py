"""add_scratchpad_notes_table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-14 19:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    # Check if table already exists (e.g. from db.create_all in sqlite or dev)
    inspector = sa.inspect(conn)
    if 'scratchpad_notes' not in inspector.get_table_names():
        op.create_table(
            'scratchpad_notes',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False, server_default='Untitled Scratchpad'),
            sa.Column('content', sa.Text(), nullable=True),
            sa.Column('color', sa.String(length=50), nullable=False, server_default='#fef3c7'),
            sa.Column('pinned', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_scratchpad_notes_user_id'), 'scratchpad_notes', ['user_id'], unique=False)

def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'scratchpad_notes' in inspector.get_table_names():
        op.drop_index(op.f('ix_scratchpad_notes_user_id'), table_name='scratchpad_notes')
        op.drop_table('scratchpad_notes')
