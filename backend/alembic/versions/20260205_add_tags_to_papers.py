"""add_tags_to_papers

Revision ID: add_tags_001
Revises: be68d6123aee
Create Date: 2026-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_tags_001'
down_revision: Union[str, None] = 'be68d6123aee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tags column to papers table."""
    op.add_column(
        'papers',
        sa.Column('tags', postgresql.ARRAY(sa.String(length=100)), nullable=True)
    )
    # Add GIN index for efficient tag searches
    op.create_index(
        'ix_papers_tags',
        'papers',
        ['tags'],
        unique=False,
        postgresql_using='gin'
    )


def downgrade() -> None:
    """Remove tags column from papers table."""
    op.drop_index('ix_papers_tags', table_name='papers')
    op.drop_column('papers', 'tags')
