"""Add board_invitations table for invite lifecycle management

Revision ID: 7a8b9c0d1e2f
Revises: 5e381b19a1c2
Create Date: 2026-10-11 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7a8b9c0d1e2f'
down_revision = '5e381b19a1c2'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('board_invitations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('board_id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='editor'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('inviter_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['board_id'], ['boards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['inviter_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('board_invitations', schema=None) as batch_op:
        batch_op.create_index('ix_board_invitations_board_email', ['board_id', 'email'], unique=False)
        batch_op.create_index('ix_board_invitations_email', ['email'], unique=False)

def downgrade():
    with op.batch_alter_table('board_invitations', schema=None) as batch_op:
        batch_op.drop_index('ix_board_invitations_email')
        batch_op.drop_index('ix_board_invitations_board_email')
    op.drop_table('board_invitations')
