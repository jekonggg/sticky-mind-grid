"""add_user_onboarding_role_tips_and_explicit_done_columns

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-10-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json
import uuid

from app.utils.column_utils import normalize_columns, derive_task_progress

# revision identifiers, used by Alembic.
revision = 'd8e9f0a1b2c3'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def _table_names(conn):
    return set(sa.inspect(conn).get_table_names())


def _as_json(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return []
    return value


def upgrade():
    conn = op.get_bind()
    tables = _table_names(conn)

    if 'user_onboarding' not in tables:
        op.create_table(
            'user_onboarding',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='not_applicable'),
            sa.Column('template', sa.String(length=30), nullable=True),
            sa.Column('starter_board_id', sa.String(length=36), nullable=True),
            sa.Column('step_board_created_at', sa.DateTime(), nullable=True),
            sa.Column('step_task_created_at', sa.DateTime(), nullable=True),
            sa.Column('step_task_completed_at', sa.DateTime(), nullable=True),
            sa.Column('coach_marks_seen', sa.JSON(), nullable=True),
            sa.Column('whats_new_seen_version', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('tour_banner_dismissed_at', sa.DateTime(), nullable=True),
            sa.Column('replay_started_at', sa.DateTime(), nullable=True),
            sa.Column('started_at', sa.DateTime(), nullable=True),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.Column('skipped_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', name='uq_user_onboarding_user_id'),
        )
        op.create_index('ix_user_onboarding_user_id', 'user_onboarding', ['user_id'], unique=False)
        op.create_index('ix_user_onboarding_status', 'user_onboarding', ['status'], unique=False)

    if 'onboarding_events' not in tables:
        op.create_table(
            'onboarding_events',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('event', sa.String(length=50), nullable=False),
            sa.Column('step', sa.String(length=50), nullable=True),
            sa.Column('template', sa.String(length=30), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_onboarding_events_user_id', 'onboarding_events', ['user_id'], unique=False)
        op.create_index('ix_onboarding_events_event', 'onboarding_events', ['event'], unique=False)
        op.create_index('ix_onboarding_events_created_at', 'onboarding_events', ['created_at'], unique=False)

    if 'board_role_tips' not in tables:
        op.create_table(
            'board_role_tips',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('board_id', sa.String(length=36), nullable=False),
            sa.Column('last_known_role', sa.String(length=20), nullable=True),
            sa.Column('role_change_from_role', sa.String(length=20), nullable=True),
            sa.Column('tip_seen_at', sa.DateTime(), nullable=True),
            sa.Column('role_change_pending', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('role_change_seen_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['board_id'], ['boards.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'board_id', name='uq_board_role_tips_user_board'),
        )
        op.create_index('ix_board_role_tips_user_id', 'board_role_tips', ['user_id'], unique=False)
        op.create_index('ix_board_role_tips_board_id', 'board_role_tips', ['board_id'], unique=False)

    # Every existing account is explicitly not eligible.  This includes existing
    # users with no boards; deleting boards later never re-onboards them.
    if 'users' in tables and 'user_onboarding' in _table_names(conn):
        existing_user_ids = {
            str(row[0]) for row in conn.execute(sa.text('SELECT id FROM users')).fetchall()
        }
        onboarded_user_ids = {
            str(row[0]) for row in conn.execute(sa.text('SELECT user_id FROM user_onboarding')).fetchall()
        }
        for user_id in existing_user_ids - onboarded_user_ids:
            conn.execute(
                sa.text(
                    'INSERT INTO user_onboarding (id, user_id, status, whats_new_seen_version, created_at, updated_at) '
                    'VALUES (:id, :user_id, :status, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
                ),
                {
                    'id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'status': 'not_applicable',
                },
            )

    # Backfill one explicit isDone column on every board and recompute the
    # persisted progress cache from the new derived semantics.
    if 'boards' in tables:
        metadata = sa.MetaData()
        boards = sa.Table('boards', metadata, autoload_with=conn)
        board_columns = {}
        for row in conn.execute(sa.select(boards.c.id, boards.c.columns)).fetchall():
            columns = normalize_columns(_as_json(row.columns))
            board_columns[str(row.id)] = columns
            conn.execute(
                boards.update().where(boards.c.id == row.id).values(columns=columns)
            )

        if 'tasks' in tables:
            tasks = sa.Table('tasks', metadata, autoload_with=conn)
            for row in conn.execute(
                sa.select(tasks.c.id, tasks.c.board_id, tasks.c.status, tasks.c.checklist)
            ).fetchall():
                columns = board_columns.get(str(row.board_id))
                checklist = _as_json(row.checklist)
                progress = derive_task_progress(columns, row.status, checklist)
                conn.execute(
                    tasks.update().where(tasks.c.id == row.id).values(progress=progress)
                )


def downgrade():
    conn = op.get_bind()
    tables = _table_names(conn)

    # Remove the explicit done flag from board column JSON.
    if 'boards' in tables:
        metadata = sa.MetaData()
        boards = sa.Table('boards', metadata, autoload_with=conn)
        for row in conn.execute(sa.select(boards.c.id, boards.c.columns)).fetchall():
            columns = _as_json(row.columns)
            if isinstance(columns, list):
                cleaned = []
                for col in columns:
                    if isinstance(col, dict):
                        col = {k: v for k, v in col.items() if k != 'isDone'}
                    cleaned.append(col)
                conn.execute(boards.update().where(boards.c.id == row.id).values(columns=cleaned))

    if 'board_role_tips' in tables:
        op.drop_table('board_role_tips')
    if 'onboarding_events' in tables:
        op.drop_table('onboarding_events')
    if 'user_onboarding' in tables:
        op.drop_table('user_onboarding')
