# Moving document storage from Supabase Storage to AWS S3

Only **storage** moves. The Postgres database stays on Supabase.

## What changed in the code

- `libraries.path` now holds the S3 object key (`{user_id}/{uuid}/{filename}`), not a URL. `S3Storage` no longer has
  `public_url` or `key_from_path`, and `delete_file` takes a key.
- Alembic `0014` rewrites existing rows from URL to key. It only touches rows that contain `://`, so it is safe to
  run twice. Migrations run automatically when the backend container starts (`alembic upgrade head` in the
  Dockerfile), so **`0014` runs during the deploy**, not as a separate step.
- With `S3_ENDPOINT` empty, `S3Storage` talks to real AWS: SigV4, virtual-hosted-style URLs, `S3_REGION` required.
  With `S3_ENDPOINT` set (MinIO, local dev) it uses path-style URLs as before.
- Old code still works on rows already converted to keys (its `key_from_path` returns a bare key unchanged), so
  rolling the app back does not need a database rollback.
- The frontend is unchanged: it `PUT`s to whatever `upload_url` the API returns.

## 1. Create the bucket

Pick the region (for example `us-east-1`, the region `deploy.sh` defaults to) and a globally unique name. Replace
`BUCKET`, `REGION`, `SITE` below.

```bash
aws s3api create-bucket --bucket BUCKET --region REGION            # add --create-bucket-configuration
                                                                   # LocationConstraint=REGION outside us-east-1

# 1. Block all public access
aws s3api put-public-access-block --bucket BUCKET --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 2. Encrypt at rest with S3-managed keys (SSE-S3). No KMS permissions needed by the app.
aws s3api put-bucket-encryption --bucket BUCKET --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'

# 3. Disable ACLs (bucket owner owns every object)
aws s3api put-bucket-ownership-controls --bucket BUCKET \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

**TLS-only bucket policy** (`tls-only.json`). Phase 1 adds the instance role's own access through IAM, so this
policy only denies insecure transport:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::BUCKET", "arn:aws:s3:::BUCKET/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

```bash
aws s3api put-bucket-policy --bucket BUCKET --policy file://tls-only.json
```

**Lifecycle rule** (`lifecycle.json`): abandoned multipart uploads are cleaned up. Uploads from the browser are
single `PUT`s, so this mostly protects the migration script.

```json
{
  "Rules": [
    {
      "ID": "abort-incomplete-multipart",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 3 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration --bucket BUCKET --lifecycle-configuration file://lifecycle.json
```

### CORS for browser uploads and downloads

The browser `PUT`s files straight to S3 with a signed URL and `GET`s signed URLs for the PDF viewer, so the bucket
must allow the site's origin. Without this, uploads fail in the browser with a CORS error even though the signed URL
is valid. `cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://SITE", "http://localhost:3000"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["Content-Type"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

```bash
aws s3api put-bucket-cors --bucket BUCKET --cors-configuration file://cors.json
```

- `AllowedOrigins`: the production origin exactly (scheme + host, no trailing slash). Drop `localhost` from the
  production bucket if you use a separate dev bucket.
- `AllowedHeaders`: the signed `PUT` sends `Content-Type`. The browser sets `Content-Length` itself.
- The upload URL signs the exact size and content type, so S3 rejects a file that differs from what was declared.

## 2. Copy the files

`backend/scripts/migrate_storage.py` copies every object from the Supabase bucket to S3. It only reads the source,
never deletes anything, and skips objects already in the destination with the same size, so you can stop it and
run it again. It ends by comparing object counts and sizes and exits non-zero if anything is missing.

Run it from the server (or anywhere with network access), from the `backend` folder, with AWS credentials able to
write to the bucket (the Phase 1 instance role, or `AWS_PROFILE`):

```bash
export SRC_ENDPOINT=https://<project>.storage.supabase.co/storage/v1/s3
export SRC_REGION=us-west-1
export SRC_ACCESS_KEY=...        # the existing S3_ACCESS_KEY
export SRC_SECRET_KEY=...        # the existing S3_SECRET_ACCESS_KEY
export SRC_BUCKET=library
export DST_REGION=REGION
export DST_BUCKET=BUCKET

python -m scripts.migrate_storage --dry-run   # lists what would be copied
python -m scripts.migrate_storage             # copies, then verifies
```

Inside the container: `docker compose exec -e SRC_ENDPOINT=... backend python -m scripts.migrate_storage`.
It prints `VERIFIED` and exits 0 only when every source key exists in the destination with the same size.

## 3. Cut over

Order matters because the migration runs during the deploy.

1. Update the Parameter Store values under `/paperwise/prod/` (`deploy.sh` turns them into `backend/.env`):
   - `S3_ENDPOINT` → **delete the parameter**. SSM cannot hold an empty value, and an absent parameter leaves
     the setting at its default (empty), which means real AWS.
   - `S3_REGION` → `REGION`
   - `S3_LIBRARY_BUCKET` → `BUCKET`
   - `S3_ACCESS_KEY` / `S3_SECRET_ACCESS_KEY` → a key pair for an IAM user with access to the bucket, **until
     Phase 1** (`docs/aws-iam.md`) switches to the instance role and removes them.
2. Run the **Deploy** workflow. The container starts, `0014` converts `libraries.path` to keys, and the app
   serves from S3.
3. Run the copy script again. Anything uploaded to Supabase between step 2 of "Copy the files" and the deploy is
   picked up now (it skips everything already copied).

## 4. Verify

- The script prints `VERIFIED`.
- `SELECT count(*) FROM libraries WHERE path LIKE '%://%';` returns 0.
- In the app: upload a new PDF and see it reach **Ready**; open an existing document's source page in the viewer
  (a signed `GET`); delete a test document and confirm the object is gone from S3.
- `aws s3 ls s3://BUCKET/ --recursive | wc -l` matches the script's destination count (plus any new uploads).
- Backend logs show no `STORAGE_ERROR` or `S3_REGION is required`.

## 5. Decommission Supabase storage

Wait at least a week, long enough to be sure nothing needs the old files, then:

1. Take a last copy with `--dry-run` and confirm it would copy nothing.
2. Delete the Supabase `library` bucket and revoke its S3 access keys.
3. Remove any unused `SRC_*` variables and the old key pair. Do **not** touch the Supabase Postgres database.

## Rollback

Until step 5 nothing in Supabase has been deleted, so rolling back is a config change:

1. Put the old `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_ACCESS_KEY` and `S3_LIBRARY_BUCKET=library`
   back in Parameter Store.
2. Run **Deploy** again. The app (new or previous commit) reads keys from `libraries.path` and works against
   Supabase. The previous commit works too, because its `key_from_path` returns a bare key unchanged.
3. Files uploaded to S3 after the cutover exist only in S3. Copy them back before rolling back for good (swap the
   `SRC_*`/`DST_*` values), or accept losing them.
4. Only if you want URLs in the database again: `alembic downgrade 0013` rewrites keys to
   `{S3_ENDPOINT}/object/{S3_LIBRARY_BUCKET}/{key}`, so run it with the Supabase `S3_ENDPOINT` and bucket in the
   environment.
