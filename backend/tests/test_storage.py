from io import BytesIO
from unittest.mock import MagicMock, patch

from fastapi import UploadFile

from src.config import settings
from src.integrations.storage import S3Storage


async def test_s3_storage_uploads_file_and_returns_its_url() -> None:
    client = MagicMock()
    file = UploadFile(filename="report.pdf", file=BytesIO(b"document"))

    with (
        patch("src.integrations.storage.boto3.client", return_value=client),
        patch("src.integrations.storage.uuid.uuid4", return_value="file-id"),
    ):
        storage = S3Storage()
        url, contents = await storage.save_raw_file(file, user_id=7)

    client.put_object.assert_called_once_with(
        Bucket=settings.S3_LIBRARY_BUCKET,
        Key="7/file-id/report.pdf",
        Body=b"document",
    )
    assert url == f"{settings.S3_ENDPOINT}/object/{settings.S3_LIBRARY_BUCKET}/7/file-id/report.pdf"
    assert contents == b"document"
    assert file.file.tell() == 0


def test_s3_storage_deletes_file_by_storage_key() -> None:
    client = MagicMock()
    with patch("src.integrations.storage.boto3.client", return_value=client):
        storage = S3Storage()

    storage.delete_file(f"https://example.com/object/{settings.S3_LIBRARY_BUCKET}/7/file-id/report.pdf")

    client.delete_object.assert_called_once_with(
        Bucket=settings.S3_LIBRARY_BUCKET,
        Key="7/file-id/report.pdf",
    )
