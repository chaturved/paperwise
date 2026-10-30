"""User-facing messages for files we cannot process. Shown as-is in the upload response."""

UNREADABLE_FILE_MESSAGE = "This file couldn't be read. It may be empty, corrupted or password-protected."
NO_TEXT_MESSAGE = "No readable text found. Scanned or image-only files aren't supported yet."
TOO_LARGE_MESSAGE = "This file is too large or complex to process. Try splitting it into smaller files."
TIMEOUT_MESSAGE = "This file took too long to process. Try a smaller or simpler file."
BUSY_MESSAGE = "Paperwise is busy processing other files. Please try again in a moment."
