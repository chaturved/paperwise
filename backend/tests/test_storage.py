import io
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from src.config import settings
from src.integrations.storage import S3Storage, StorageError


def test_s3_storage_deletes_file_by_storage_key() -> None:
    client = MagicMock()
    with patch("src.integrations.storage.boto3.client", return_value=client):
        storage = S3Storage()

    storage.delete_file(f"https://example.com/object/{settings.S3_LIBRARY_BUCKET}/7/file-id/report.pdf")

    client.delete_object.assert_called_once_with(
        Bucket=settings.S3_LIBRARY_BUCKET,
        Key="7/file-id/report.pdf",
    )


def _storage_with_client():
    client = MagicMock()
    with patch("src.integrations.storage.boto3.client", return_value=client):
        return S3Storage(), client


def _client_error(code: str, message: str = "boom") -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": message}}, "Operation")


def test_key_and_url_helpers_round_trip() -> None:
    with patch("src.integrations.storage.uuid.uuid4", return_value="file-id"):
        key = S3Storage.key_for(7, "../../etc/report.pdf")

    assert key == "7/file-id/report.pdf"
    assert S3Storage.key_from_path(S3Storage.public_url(key)) == key


def test_create_upload_url_signs_the_exact_size_and_type() -> None:
    storage, client = _storage_with_client()
    client.generate_presigned_url.return_value = "https://signed.example/put"

    url = storage.create_upload_url("7/id/a.pdf", size=123, content_type="application/pdf")

    assert url == "https://signed.example/put"
    client.generate_presigned_url.assert_called_once_with(
        "put_object",
        Params={
            "Bucket": settings.S3_LIBRARY_BUCKET,
            "Key": "7/id/a.pdf",
            "ContentLength": 123,
            "ContentType": "application/pdf",
        },
        ExpiresIn=settings.UPLOAD_URL_EXPIRY_SECONDS,
    )


def test_object_size_returns_the_stored_size() -> None:
    storage, client = _storage_with_client()
    client.head_object.return_value = {"ContentLength": 42}

    assert storage.object_size("k") == 42


@pytest.mark.parametrize("code", ["404", "NoSuchKey", "NotFound"])
def test_object_size_is_none_when_nothing_was_uploaded(code: str) -> None:
    storage, client = _storage_with_client()
    client.head_object.side_effect = _client_error(code)

    assert storage.object_size("k") is None


def test_object_size_raises_on_other_storage_errors() -> None:
    storage, client = _storage_with_client()
    client.head_object.side_effect = _client_error("500", "storage down")

    with pytest.raises(StorageError, match="storage down"):
        storage.object_size("k")


def test_download_returns_the_stored_bytes() -> None:
    storage, client = _storage_with_client()
    client.get_object.return_value = {"Body": io.BytesIO(b"hello")}

    assert storage.download("k", max_bytes=10) == b"hello"


def test_download_refuses_a_file_larger_than_expected() -> None:
    storage, client = _storage_with_client()
    client.get_object.return_value = {"Body": io.BytesIO(b"x" * 11)}

    with pytest.raises(StorageError, match="larger than expected"):
        storage.download("k", max_bytes=10)


def test_download_wraps_client_errors() -> None:
    storage, client = _storage_with_client()
    client.get_object.side_effect = _client_error("500", "storage down")

    with pytest.raises(StorageError, match="storage down"):
        storage.download("k", max_bytes=10)


def test_create_download_url_signs_a_get_for_the_key() -> None:
    client = MagicMock()
    client.generate_presigned_url.return_value = "https://signed.example/get"

    with patch("src.integrations.storage.boto3.client", return_value=client):
        url = S3Storage().create_download_url("7/id/lease.pdf")

    assert url == "https://signed.example/get"
    client.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": settings.S3_LIBRARY_BUCKET, "Key": "7/id/lease.pdf"},
        ExpiresIn=settings.DOWNLOAD_URL_EXPIRY_SECONDS,
    )
