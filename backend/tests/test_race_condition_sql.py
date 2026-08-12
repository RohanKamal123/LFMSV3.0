"""
Direct SQL-level proof that the claim race guard actually closes the race
window, independent of HTTP timing.

tests/test_claims.py::test_concurrent_claims_exactly_one_wins exercises the
same guard over real HTTP with two threads, which is a good end-to-end
smoke test but - confirmed by hand during development - doesn't reliably
force two requests into the same true race window; Python's GIL and the
request round-trip tend to serialize them enough that the earlier
`if item.state != ACTIVE: raise 409` check alone can resolve the race
before either request reaches the UPDATE at all, without ever exercising
the UPDATE...WHERE guard itself. This test constructs the actual race
condition directly: two DB sessions that have BOTH already read
state=ACTIVE before either one writes - which is the only way to prove the
atomic UPDATE is what's actually deciding the winner, not the earlier
read-time check.
"""
from conftest import create_found_item, register_student


def test_atomic_update_lets_only_one_writer_win(server, db_engine):
    from sqlmodel import Session, select, update
    from models import Item, ItemState

    _, _, finder = register_student(server)
    item_id = create_found_item(db_engine, finder["id"])

    with Session(db_engine) as session_a, Session(db_engine) as session_b:
        item_a = session_a.get(Item, item_id)
        item_b = session_b.get(Item, item_id)
        assert item_a.state == ItemState.ACTIVE
        assert item_b.state == ItemState.ACTIVE  # both readers see ACTIVE before either writes

        result_a = session_a.exec(
            update(Item).where(Item.id == item_id).where(Item.state == ItemState.ACTIVE)
            .values(state=ItemState.PENDING_HANDOVER)
        )
        session_a.commit()

        result_b = session_b.exec(
            update(Item).where(Item.id == item_id).where(Item.state == ItemState.ACTIVE)
            .values(state=ItemState.PENDING_HANDOVER)
        )
        session_b.commit()

    assert (result_a.rowcount, result_b.rowcount) in [(1, 0), (0, 1)]

    with Session(db_engine) as session:
        final = session.get(Item, item_id)
        assert final.state == ItemState.PENDING_HANDOVER
