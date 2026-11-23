import os
import uuid

import boto3
import botocore.exceptions
from botocore.client import Config

from src.config import settings
from src.core.exceptions import AppError


class StorageError(AppError):
    def __init__(self, message: str):
        super().__init__(message, "STORAGE_ERROR", 502)


class S3Storage:
    def __init__(self) -> None:
        endpoint = settings.S3_ENDPOINT or None
        if endpoint is None and not settings.S3_REGION:
            raise StorageError("S3_REGION is required when S3_ENDPOINT is empty (real AWS S3)")
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            region_name=settings.S3_REGION or None,
            aws_access_key_id=settings.S3_ACCESS_KEY or None,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY or None,
            # AWS uses bucket.s3.region.amazonaws.com; a custom endpoint (MinIO, local dev) needs path style.
            config=Config(signature_version="v4", s3={"addressing_style": "path" if endpoint else "virtual"}),
        )

    @staticmethod
    def key_for(user_id: int, filename: str) -> str:
        safe_name = os.path.basename(filename or "") or "upload"
        return f"{user_id}/{uuid.uuid4()}/{safe_name}"

    def create_upload_url(self, key: str, size: int, content_type: str) -> str:
        """A short-lived URL the browser can PUT one file to. Its exact size and type are part of the signature."""
        return self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.S3_LIBRARY_BUCKET,
                "Key": key,
                "ContentLength": size,
                "ContentType": content_type,
            },
            ExpiresIn=settings.UPLOAD_URL_EXPIRY_SECONDS,
        )

    def create_download_url(self, key: str) -> str:
        """A short-lived URL the browser can GET one stored file from, so it never passes through the API."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_LIBRARY_BUCKET, "Key": key},
            ExpiresIn=settings.DOWNLOAD_URL_EXPIRY_SECONDS,
        )

    def object_size(self, key: str) -> int | None:
        """The stored size in bytes, or None if nothing was uploaded under this key."""
        try:
            return self.client.head_object(Bucket=settings.S3_LIBRARY_BUCKET, Key=key)["ContentLength"]
        except botocore.exceptions.ClientError as e:
            if e.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                return None
            raise StorageError(f"Storage error: {e.response['Error']['Message']}")

    def download(self, key: str, max_bytes: int) -> bytes:
        try:
            body = self.client.get_object(Bucket=settings.S3_LIBRARY_BUCKET, Key=key)["Body"]
            data = body.read(max_bytes + 1)
        except botocore.exceptions.ClientError as e:
            raise StorageError(f"Storage error: {e.response['Error']['Message']}")
        if len(data) > max_bytes:
            raise StorageError("Stored file is larger than expected")
        return data

    def delete_file(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=settings.S3_LIBRARY_BUCKET, Key=key)
        except botocore.exceptions.ClientError as e:
            raise StorageError(f"Storage error: {e.response['Error']['Message']}")
