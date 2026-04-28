import re


_UNSAFE_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9_.-]+")


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a user-provided filename for use in S3-compatible object keys.

    - Only keep ASCII letters/digits/underscore/hyphen/dot; other chars become "_".
    - Drop any directory components (both "/" and "\\").
    - Prevent hidden filenames / pure-extension names by stripping leading dots.
    """
    basename = filename.strip().split("/")[-1].split("\\")[-1]
    if not basename:
        return "file"

    name = _UNSAFE_FILENAME_CHARS.sub("_", basename).lstrip(".")
    return name or "file"
