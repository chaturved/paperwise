import io
from unittest.mock import MagicMock

from scripts.migrate_storage import BucketRef, StorageMigrator


class FakeBucket:
    """An in-memory stand-in for a boto3 S3 client holding one bucket."""

    def __init__(self, objects: dict[str, bytes] | None = None) -> None:
        self.objects = dict(objects or {})
        self.reads: list[str] = []
        self.writes: list[str] = []
        self.deletes: list[str] = []

    def get_paginator(self, operation: str):
        assert operation == "list_objects_v2"
        paginator = MagicMock()
        paginator.paginate.side_effect = lambda Bucket: [
            {"Contents": [{"Key": k, "Size": len(v)} for k, v in self.objects.items()]}
        ]
        return paginator

    def get_object(self, Bucket, Key):
        self.reads.append(Key)
        return {"Body": io.BytesIO(self.objects[Key])}

    def upload_fileobj(self, fileobj, bucket, key, **kwargs):
        self.writes.append(key)
        self.objects[key] = fileobj.read()

    def delete_object(self, **kwargs):
        self.deletes.append(kwargs["Key"])


def _migrate(source: FakeBucket, dest: FakeBucket, dry_run: bool = False):
    migrator = StorageMigrator(BucketRef(source, "library"), BucketRef(dest, "aws"), dry_run=dry_run)
    return migrator.run()


def test_copies_every_object_and_verifies_counts_and_sizes() -> None:
    source, dest = FakeBucket({"7/a/a.pdf": b"aaa", "7/b/b.pdf": b"bbbbb"}), FakeBucket()

    report = _migrate(source, dest)

    assert dest.objects == source.objects
    assert report.ok and report.copied == 2 and report.skipped == 0
    assert (report.source_count, report.source_bytes, report.dest_count, report.dest_bytes) == (2, 8, 2, 8)


def test_a_second_run_skips_what_is_already_copied() -> None:
    source, dest = FakeBucket({"7/a/a.pdf": b"aaa"}), FakeBucket({"7/a/a.pdf": b"aaa"})

    report = _migrate(source, dest)

    assert report.copied == 0 and report.skipped == 1 and report.ok
    assert dest.writes == []


def test_resumes_after_a_partial_copy_and_replaces_a_truncated_object() -> None:
    source = FakeBucket({"7/a/a.pdf": b"aaaa", "7/b/b.pdf": b"bbbb", "7/c/c.pdf": b"cccc"})
    dest = FakeBucket({"7/a/a.pdf": b"aaaa", "7/b/b.pdf": b"bb"})

    report = _migrate(source, dest)

    assert sorted(dest.writes) == ["7/b/b.pdf", "7/c/c.pdf"]
    assert dest.objects == source.objects and report.ok


def test_a_failed_object_is_reported_and_the_run_is_not_verified() -> None:
    source, dest = FakeBucket({"7/a/a.pdf": b"aaa", "7/b/b.pdf": b"bbb"}), FakeBucket()
    original = dest.upload_fileobj

    def flaky(fileobj, bucket, key, **kwargs):
        if key == "7/a/a.pdf":
            raise OSError("network")
        original(fileobj, bucket, key, **kwargs)

    dest.upload_fileobj = flaky

    report = _migrate(source, dest)

    assert report.failed == 1 and report.copied == 1
    assert report.mismatches == ("7/a/a.pdf",) and not report.ok


def test_dry_run_changes_nothing() -> None:
    source, dest = FakeBucket({"7/a/a.pdf": b"aaa"}), FakeBucket()

    report = _migrate(source, dest, dry_run=True)

    assert dest.objects == {} and dest.writes == [] and report.copied == 1


def test_the_source_is_only_read_and_nothing_is_deleted() -> None:
    source, dest = FakeBucket({"7/a/a.pdf": b"aaa"}), FakeBucket({"old/x.pdf": b"x"})

    _migrate(source, dest)

    assert source.writes == [] and source.deletes == [] and dest.deletes == []
    assert "old/x.pdf" in dest.objects
