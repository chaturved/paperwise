import io
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from src.config import settings
from src.integrations.storage import S3Storage, StorageError


def test_s3_storage_deletes_file_by_key() -> None:
    client = MagicMock()
    with patch("src.integrations.storage.boto3.client", return_value=client):
        storage = S3Storage()

    storage.delete_file("7/file-id/report.pdf")

    client.delete_object.assert_called_once_with(Bucket=settings.S3_LIBRARY_BUCKET, Key="7/file-id/report.pdf")


def _client_kwargs(monkeypatch, **overrides) -> dict:
    values = {"S3_ENDPOINT": "", "S3_REGION": "us-east-1", "S3_ACCESS_KEY": "", "S3_SECRET_ACCESS_KEY": ""}
    for name, value in {**values, **overrides}.items():
        monkeypatch.setattr(settings, name, value)
    with patch("src.integrations.storage.boto3.client") as factory:
        S3Storage()
    return factory.call_args.kwargs


def test_real_aws_uses_regional_virtual_hosted_sigv4_and_the_credential_chain(monkeypatch) -> None:
    kwargs = _client_kwargs(monkeypatch)

    assert kwargs["endpoint_url"] is None
    assert kwargs["region_name"] == "us-east-1"
    assert kwargs["aws_access_key_id"] is None and kwargs["aws_secret_access_key"] is None
    assert kwargs["config"].signature_version == "v4"
    assert kwargs["config"].s3["addressing_style"] == "virtual"


def test_a_custom_endpoint_uses_path_style_and_static_keys(monkeypatch) -> None:
    kwargs = _client_kwargs(
        monkeypatch, S3_ENDPOINT="http://localhost:9000", S3_ACCESS_KEY="key", S3_SECRET_ACCESS_KEY="secret"
    )

    assert kwargs["endpoint_url"] == "http://localhost:9000"
    assert kwargs["aws_access_key_id"] == "key" and kwargs["aws_secret_access_key"] == "secret"
    assert kwargs["config"].s3["addressing_style"] == "path"


def test_real_aws_without_a_region_is_refused(monkeypatch) -> None:
    with pytest.raises(StorageError, match="S3_REGION"):
        _client_kwargs(monkeypatch, S3_REGION="")


def _storage_with_client():
    client = MagicMock()
    with patch("src.integrations.storage.boto3.client", return_value=client):
        return S3Storage(), client


def _client_error(code: str, message: str = "boom") -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": message}}, "Operation")


def test_key_for_keeps_only_the_file_name() -> None:
    with patch("src.integrations.storage.uuid.uuid4", return_value="file-id"):
        assert S3Storage.key_for(7, "../../etc/report.pdf") == "7/file-id/report.pdf"


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
