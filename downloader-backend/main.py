from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError


app = FastAPI(title="Video Link Extractor")
BASE_DIR = Path(__file__).resolve().parent

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    url: HttpUrl


SUPPORTED_DOMAINS = {"instagram.com", "facebook.com", "youtube.com", "youtu.be"}


def is_supported_url(raw_url: str) -> bool:
    hostname = (urlparse(raw_url).hostname or "").lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return any(hostname == domain or hostname.endswith(f".{domain}") for domain in SUPPORTED_DOMAINS)


def map_extraction_error(exc: Exception) -> HTTPException:
    raw_message = str(exc)
    clean_message = raw_message.replace("\x1b[0;31m", "").replace("\x1b[0m", "")
    lowered = clean_message.lower()

    if (
        "only available for registered users" in lowered
        or "who follow this account" in lowered
        or "use --cookies-from-browser" in lowered
        or "use --cookies" in lowered
    ):
        return HTTPException(
            status_code=403,
            detail=(
                "This post is private or follow-only. Login cookies are required to access it, "
                "so a direct link cannot be extracted right now."
            ),
        )

    if "private" in lowered or "login" in lowered or "authentication" in lowered:
        return HTTPException(
            status_code=403,
            detail="This content requires authentication and cannot be extracted without account access.",
        )

    if "no video formats found" in lowered:
        return HTTPException(status_code=422, detail="This URL has no downloadable video stream.")

    return HTTPException(status_code=500, detail=f"Extraction failed: {clean_message}")


def normalize_title(raw_title: Any) -> str:
    title = str(raw_title or "Unknown title").strip()
    lowered = title.lower()
    if lowered.startswith("video by "):
        return title[9:].strip() or "Unknown title"
    return title


def extract_thumbnail_url(info: dict[str, Any]) -> str | None:
    thumbnail = info.get("thumbnail")
    if isinstance(thumbnail, str) and thumbnail:
        return thumbnail

    thumbnails = info.get("thumbnails")
    if not isinstance(thumbnails, list):
        return None

    candidates: list[dict[str, Any]] = []
    for item in thumbnails:
        if not isinstance(item, dict):
            continue
        url = item.get("url")
        if not isinstance(url, str) or not url:
            continue
        score = (int(item.get("height") or 0), int(item.get("width") or 0))
        candidates.append({"url": url, "score": score})

    if not candidates:
        return None
    candidates.sort(key=lambda row: row["score"], reverse=True)
    return candidates[0]["url"]


def pick_direct_video_url(info: dict[str, Any]) -> str | None:
    direct_url = info.get("url")
    if isinstance(direct_url, str) and direct_url:
        return direct_url

    formats = info.get("formats")
    if not isinstance(formats, list):
        return None

    candidates: list[dict[str, Any]] = []
    for item in formats:
        if not isinstance(item, dict):
            continue
        url = item.get("url")
        if not isinstance(url, str) or not url:
            continue
        vcodec = str(item.get("vcodec") or "").lower()
        if not vcodec or vcodec == "none":
            continue
        score = (
            int(item.get("height") or 0),
            int(item.get("width") or 0),
            int(item.get("tbr") or 0),
        )
        candidates.append({"url": url, "score": score})

    if not candidates:
        return None
    candidates.sort(key=lambda row: row["score"], reverse=True)
    return str(candidates[0]["url"])


def extract_video_info(raw_url: str) -> tuple[str, str, str | None]:
    options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "format": "best",
        "noplaylist": True,
        "socket_timeout": 8,
        "retries": 1,
        "extractor_retries": 1,
    }
    try:
        with YoutubeDL(options) as ydl:
            info = ydl.extract_info(raw_url, download=False)
    except DownloadError as exc:
        if "requested format is not available" not in str(exc).lower():
            raise
        fallback_options = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "socket_timeout": 8,
            "retries": 1,
            "extractor_retries": 1,
        }
        with YoutubeDL(fallback_options) as ydl:
            info = ydl.extract_info(raw_url, download=False)

    if not info:
        raise HTTPException(status_code=404, detail="No media found for the provided URL.")

    if "entries" in info and info["entries"]:
        info = next((entry for entry in info["entries"] if entry), None)
        if not info:
            raise HTTPException(status_code=404, detail="No playable media entries found.")

    direct_url = pick_direct_video_url(info)
    title = normalize_title(info.get("title"))

    if not direct_url:
        raise HTTPException(status_code=422, detail="This URL has no downloadable video stream.")

    thumbnail_url = extract_thumbnail_url(info)
    return direct_url, title, thumbnail_url


@app.get("/", response_class=FileResponse)
def home() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.post("/extract")
def extract(request: ExtractRequest) -> dict[str, str | None]:
    if not is_supported_url(str(request.url)):
        raise HTTPException(
            status_code=400,
            detail="Unsupported URL. Only Instagram, Facebook, and YouTube links are allowed.",
        )

    try:
        video_url, title, thumbnail_url = extract_video_info(str(request.url))
    except HTTPException:
        raise
    except DownloadError as exc:
        raise map_extraction_error(exc) from exc
    except Exception as exc:  # noqa: BLE001
        raise map_extraction_error(exc) from exc

    return {"video_url": video_url, "title": title, "thumbnail_url": thumbnail_url}
