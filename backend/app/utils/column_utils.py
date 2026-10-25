"""Board column helpers.

A board has exactly one explicit workflow column marked ``isDone``.  The flag is
stored on the board's JSON column definition so completion never has to be
inferred from a task's percentage progress, its position, or a hard-coded
column id.
"""

ARCHIVE_COLUMN_ID = 'archive'

DONE_COLUMN_ID_HINTS = {
    'done', 'completed', 'complete', 'finished', 'closed', 'resolved',
}

DONE_TITLE_HINTS = ('done', 'complete', 'finish', 'closed', 'resolved')


def workflow_columns(columns):
    """Return only the visible (non-archive) column dictionaries."""
    return [
        col for col in (columns or [])
        if isinstance(col, dict) and col.get('id') != ARCHIVE_COLUMN_ID
    ]


def normalize_columns(columns):
    """Return a copy of ``columns`` with exactly one workflow done column.

    An explicit ``isDone`` flag always wins.  When no flag is present (legacy
    boards, templates, seed data) the done column is inferred from known ids or
    titles, falling back to the last workflow column.
    """
    if not isinstance(columns, list):
        return columns

    normalized = []
    for col in columns:
        if not isinstance(col, dict):
            normalized.append(col)
            continue
        copied = dict(col)
        copied['isDone'] = bool(copied.get('isDone')) if copied.get('id') != ARCHIVE_COLUMN_ID else False
        normalized.append(copied)

    workflow = workflow_columns(normalized)
    if not workflow:
        return normalized

    marked = [col for col in workflow if col.get('isDone')]
    if marked:
        chosen = marked[0]
    else:
        chosen = None
        for col in workflow:
            column_id = str(col.get('id') or '').lower().strip()
            title = str(col.get('title') or '').lower()
            if column_id in DONE_COLUMN_ID_HINTS or any(hint in title for hint in DONE_TITLE_HINTS):
                chosen = col
                break
        if chosen is None:
            chosen = workflow[-1]

    for col in workflow:
        col['isDone'] = col is chosen
    return normalized


def get_done_column(columns):
    """Return the board's explicit done column, or ``None``."""
    for col in workflow_columns(columns):
        if col.get('isDone'):
            return col
    return None


def get_done_column_id(columns):
    column = get_done_column(columns)
    return column.get('id') if column else None


def is_done_column(columns, column_id):
    """True only when ``column_id`` matches the board's explicit done column."""
    if not column_id:
        return False
    done_id = get_done_column_id(columns)
    if done_id is not None and str(done_id) == str(column_id):
        return True
    # Fallback: normalize columns if explicit isDone was not stored on dict
    normalized = normalize_columns(columns)
    done_id = get_done_column_id(normalized)
    if done_id is not None and str(done_id) == str(column_id):
        return True
    return str(column_id).lower().strip() in ('done', 'completed')


def compute_column_progress(columns, column_id):
    """Derive a 0-100 completion percentage from the workflow stage only."""
    if not column_id:
        return 0
    if is_done_column(columns, column_id):
        return 100

    visible = workflow_columns(columns)
    if not visible:
        norm = str(column_id).lower().strip()
        if norm in ('todo', 'to_do', 'to-do', 'backlog', 'new', 'pending', 'draft', 'icebox'):
            return 0
        if 'progress' in norm or 'doing' in norm:
            return 50
        if 'review' in norm or 'qa' in norm or 'test' in norm:
            return 75
        return 0

    total = len(visible)
    if total <= 1:
        return 0

    index = -1
    for i, col in enumerate(visible):
        if str(col.get('id')) == str(column_id):
            index = i
            break
    if index <= 0:
        return 0
    if index == total - 1:
        return 100
    return int(round((index / (total - 1)) * 100))


def derive_task_progress(columns, status, checklist=None):
    """Progress is always derived: checklist first, then workflow stage."""
    if isinstance(checklist, list) and len(checklist) > 0:
        total = len(checklist)
        completed = sum(
            1 for item in checklist
            if isinstance(item, dict) and item.get('completed')
        )
        return int(round((completed / total) * 100))
    return compute_column_progress(columns, status)
