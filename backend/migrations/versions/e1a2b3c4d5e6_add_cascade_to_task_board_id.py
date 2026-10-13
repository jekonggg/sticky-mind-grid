"""add_cascade_to_task_board_id

Revision ID: e1a2b3c4d5e6
Revises: d9363d32af21
Create Date: 2026-10-13 17:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1a2b3c4d5e6'
down_revision = 'd9363d32af21'
branch_labels = None
depends_on = None


def upgrade():
    # Update foreign key on tasks.board_id to ON DELETE CASCADE
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        try:
            batch_op.drop_constraint('tasks_ibfk_1', type_='foreignkey')
        except Exception:
            pass
        batch_op.create_foreign_key('fk_tasks_board_id', 'boards', ['board_id'], ['id'], ondelete='CASCADE')


def downgrade():
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        try:
            batch_op.drop_constraint('fk_tasks_board_id', type_='foreignkey')
        except Exception:
            pass
        batch_op.create_foreign_key('tasks_ibfk_1', 'boards', ['board_id'], ['id'])
