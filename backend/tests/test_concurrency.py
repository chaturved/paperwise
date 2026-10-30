import asyncio

from src.utils.concurrency import PerLoopSemaphore


async def test_same_loop_gets_the_same_semaphore_sized_by_the_limit():
    limiter = PerLoopSemaphore(lambda: 3)

    first = limiter.get()

    assert limiter.get() is first
    assert first._value == 3  # noqa: SLF001 — checking the configured size


def test_each_event_loop_gets_its_own_semaphore():
    limiter = PerLoopSemaphore(lambda: 1)

    async def grab():
        return limiter.get()

    assert asyncio.run(grab()) is not asyncio.run(grab())
