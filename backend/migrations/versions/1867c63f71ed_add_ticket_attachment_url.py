"""add support ticket attachment_url

Revision ID: 1867c63f71ed
Revises: 2beb54ffd31d
Create Date: 2026-08-13 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '1867c63f71ed'
down_revision: Union[str, None] = '2beb54ffd31d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('supportticket', sa.Column('attachment_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade() -> None:
    op.drop_column('supportticket', 'attachment_url')
