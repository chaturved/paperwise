import asyncio
import weakref
from collections.abc import Callable


class PerLoopSemaphore:
    """A limiter for async work, created lazily for the running event loop.

    asyncio semaphores belong to one loop, so a module-level one breaks when each test (or each server
    process) runs its own loop. The limit is read when the semaphore is first needed.
    """

    def __init__(self, limit: Callable[[], int]) -> None:
        self._limit = limit
        self._by_loop: weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Semaphore] = weakref.WeakKeyDictionary()

    def get(self) -> asyncio.Semaphore:
        loop = asyncio.get_running_loop()
        if loop not in self._by_loop:
            self._by_loop[loop] = asyncio.Semaphore(self._limit())
        return self._by_loop[loop]
