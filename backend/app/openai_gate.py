"""
Concurrency gate for OpenAI API calls.

Limits concurrent requests to prevent rate-limit errors when hundreds
of workshop participants hit the API simultaneously.
"""

import asyncio

_semaphore = asyncio.Semaphore(10)


async def gated_completion(client, **kwargs):
    """Run a chat completion through the concurrency gate."""
    async with _semaphore:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(**kwargs),
        )
