"""One-off copy of every object from one S3-compatible bucket (Supabase Storage) to another (AWS S3).

Run it by hand, from the backend folder:

    python -m scripts.migrate_storage --dry-run
    python -m scripts.migrate_storage

The source is only ever read. Nothing is deleted anywhere. It is safe to stop and run again: an object that is
already in the destination with the same size is skipped. Settings come from SRC_* and DST_* environment variables
(see `from_env`), because the two sides differ and the app's own S3_* settings point at only one of them.
"""

import argparse
import logging
import os
import sys
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Protocol

import boto3
from botocore.client import Config

_log = logging.getLogger("migrate_storage")


class S3Client(Protocol):
    """The parts of a boto3 S3 client used here, so tests can pass a fake."""

    def get_paginator(self, operation: str): ...
    def get_object(self, **kwargs): ...
    def upload_fileobj(self, fileobj, bucket: str, key: str, **kwargs): ...


@dataclass(frozen=True)
class BucketRef:
    client: S3Client
    bucket: str


@dataclass
class MigrationReport:
    copied: int = 0
    skipped: int = 0
    failed: int = 0
    source_count: int = 0
    source_bytes: int = 0
    dest_count: int = 0
    dest_bytes: int = 0
    mismatches: tuple[str, ...] = ()

    @property
    def ok(self) -> bool:
        return self.failed == 0 and not self.mismatches


class StorageMigrator:
    def __init__(self, source: BucketRef, destination: BucketRef, dry_run: bool = False) -> None:
        self.source = source
        self.destination = destination
        self.dry_run = dry_run

    @staticmethod
    def list_objects(ref: BucketRef) -> dict[str, int]:
        """Every key in the bucket with its size in bytes."""
        sizes: dict[str, int] = {}
        for page in ref.client.get_paginator("list_objects_v2").paginate(Bucket=ref.bucket):
            for item in page.get("Contents", []):
                sizes[item["Key"]] = item["Size"]
        return sizes

    def run(self) -> MigrationReport:
        source_sizes = self.list_objects(self.source)
        dest_sizes = self.list_objects(self.destination)
        report = MigrationReport()

        for key, size in self._pending(source_sizes, dest_sizes, report):
            if self.dry_run:
                _log.info("would copy %s (%d bytes)", key, size)
                report.copied += 1
                continue
            try:
                self._copy(key)
                report.copied += 1
                _log.info("copied %s (%d bytes)", key, size)
            except Exception:  # noqa: BLE001 - one bad object must not stop the rest; it is counted and reported
                report.failed += 1
                _log.exception("failed to copy %s", key)

        if not self.dry_run:
            self._verify(source_sizes, report)
        else:
            report.source_count, report.source_bytes = len(source_sizes), sum(source_sizes.values())
        return report

    def _pending(
        self, source_sizes: dict[str, int], dest_sizes: dict[str, int], report: MigrationReport
    ) -> Iterator[tuple[str, int]]:
        for key, size in source_sizes.items():
            if dest_sizes.get(key) == size:
                report.skipped += 1
            else:
                yield key, size

    def _copy(self, key: str) -> None:
        body = self.source.client.get_object(Bucket=self.source.bucket, Key=key)["Body"]
        try:
            self.destination.client.upload_fileobj(body, self.destination.bucket, key)
        finally:
            body.close()

    def _verify(self, source_sizes: dict[str, int], report: MigrationReport) -> None:
        """Re-list the destination and compare it with the source, key by key."""
        dest_sizes = self.list_objects(self.destination)
        report.source_count, report.source_bytes = len(source_sizes), sum(source_sizes.values())
        in_dest = {key: dest_sizes.get(key) for key in source_sizes}
        report.dest_count = sum(1 for size in in_dest.values() if size is not None)
        report.dest_bytes = sum(size for size in in_dest.values() if size is not None)
        report.mismatches = tuple(sorted(key for key, size in source_sizes.items() if dest_sizes.get(key) != size))


def from_env() -> tuple[BucketRef, BucketRef]:
    """SRC_ENDPOINT, SRC_REGION, SRC_ACCESS_KEY, SRC_SECRET_KEY, SRC_BUCKET and DST_REGION, DST_BUCKET.

    The destination uses the normal AWS credential chain (instance role, AWS_PROFILE, ...) unless DST_ACCESS_KEY
    and DST_SECRET_KEY are set.
    """
    env = os.environ
    source = boto3.client(
        "s3",
        endpoint_url=env["SRC_ENDPOINT"],
        region_name=env.get("SRC_REGION") or None,
        aws_access_key_id=env["SRC_ACCESS_KEY"],
        aws_secret_access_key=env["SRC_SECRET_KEY"],
        config=Config(signature_version="v4", s3={"addressing_style": "path"}),
    )
    destination = boto3.client(
        "s3",
        region_name=env["DST_REGION"],
        aws_access_key_id=env.get("DST_ACCESS_KEY") or None,
        aws_secret_access_key=env.get("DST_SECRET_KEY") or None,
        config=Config(signature_version="v4", s3={"addressing_style": "virtual"}),
    )
    return BucketRef(source, env.get("SRC_BUCKET", "library")), BucketRef(destination, env["DST_BUCKET"])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="list what would be copied, change nothing")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

    source, destination = from_env()
    report = StorageMigrator(source, destination, dry_run=args.dry_run).run()

    _log.info("copied=%d skipped=%d failed=%d", report.copied, report.skipped, report.failed)
    if args.dry_run:
        _log.info("dry run: source has %d objects, %d bytes", report.source_count, report.source_bytes)
        return 0
    _log.info(
        "source: %d objects, %d bytes | destination: %d objects, %d bytes",
        report.source_count,
        report.source_bytes,
        report.dest_count,
        report.dest_bytes,
    )
    for key in report.mismatches:
        _log.error("missing or wrong size in destination: %s", key)
    _log.info("VERIFIED" if report.ok else "NOT VERIFIED")
    return 0 if report.ok else 1


if __name__ == "__main__":
    sys.exit(main())
