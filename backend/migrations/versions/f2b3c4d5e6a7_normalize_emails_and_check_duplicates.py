"""normalize_emails_and_check_duplicates

Revision ID: f2b3c4d5e6a7
Revises: e1a2b3c4d5e6
Create Date: 2026-10-13 21:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f2b3c4d5e6a7'
down_revision = 'e1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # 1. Inspect for case-insensitive duplicate users and abort if conflicts exist
    duplicates = conn.execute(
        sa.text("SELECT LOWER(TRIM(email)) AS norm_email, COUNT(*) AS cnt FROM users GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1")
    ).fetchall()

    if duplicates:
        conflict_list = [f"'{row[0]}' ({row[1]} users)" for row in duplicates]
        raise RuntimeError(
            f"Migration aborted: Found case-duplicate emails in 'users' table: {', '.join(conflict_list)}. "
            "Resolve duplicate user accounts manually before running this migration."
        )

    # 2. Normalize email fields across users and board_invitations
    conn.execute(sa.text("UPDATE users SET email = LOWER(TRIM(email))"))
    conn.execute(sa.text("UPDATE board_invitations SET email = LOWER(TRIM(email))"))


def downgrade():
    # Email normalization is a non-destructive data sanitation; cannot reconstruct original whitespace or casing
    pass
