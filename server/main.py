"""Hold'em accounts server.

A small FastAPI app that stores accounts and profiles so they sync across devices.
Passwords are hashed with PBKDF2-SHA256 and a per-user salt; session tokens are
random and only their SHA-256 hashes are stored. It can also serve the built app
(../dist) so the app and API share one domain.

Run:  uvicorn main:app --host 127.0.0.1 --port 8000
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

DB_PATH = os.environ.get("HOLDEM_DB", str(Path(__file__).with_name("holdem.db")))
CORS_ORIGINS = [o.strip() for o in os.environ.get("HOLDEM_CORS_ORIGINS", "").split(",") if o.strip()]
SESSION_DAYS = int(os.environ.get("HOLDEM_SESSION_DAYS", "90"))
DIST = Path(os.environ.get("HOLDEM_DIST", str(Path(__file__).resolve().parent.parent / "dist")))

USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]{3,20}$")
PBKDF2_ITERATIONS = 310_000
MAX_PROFILE_BYTES = 64 * 1024
MAX_FAILS, FAIL_WINDOW = 8, 15 * 60  # per username

app = FastAPI(title="Hold'em accounts", docs_url=None, redoc_url=None)
if CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with connect() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          username TEXT NOT NULL,
          username_key TEXT NOT NULL UNIQUE,
          salt BLOB NOT NULL,
          pw_hash BLOB NOT NULL,
          profile TEXT NOT NULL,
          created INTEGER NOT NULL,
          updated INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created INTEGER NOT NULL,
          expires INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS login_fails (
          username_key TEXT NOT NULL,
          at INTEGER NOT NULL
        );
        """)


init_db()


def fail(status: int, field: str, msg: str):
    raise HTTPException(status_code=status, detail={"field": field, "msg": msg})


def hash_pw(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_session(c, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    c.execute("DELETE FROM sessions WHERE expires < ?", (now,))
    c.execute("INSERT INTO sessions VALUES (?,?,?,?)", (token_hash(token), user_id, now, now + SESSION_DAYS * 86400))
    return token


def check_profile(profile: dict) -> str:
    raw = json.dumps(profile, separators=(",", ":"))
    if len(raw.encode()) > MAX_PROFILE_BYTES:
        fail(413, "form", "That profile is too large to save.")
    if not isinstance(profile.get("name"), str) or not profile["name"].strip():
        fail(422, "form", "The profile needs a name.")
    return raw


def account(row) -> dict:
    return {"username": row["username"], "profile": json.loads(row["profile"])}


def current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        fail(401, "form", "Log in to continue.")
    with connect() as c:
        row = c.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?",
            (token_hash(authorization[7:]), int(time.time())),
        ).fetchone()
    if not row:
        fail(401, "form", "Your session has ended. Log in again.")
    return row


class RegisterIn(BaseModel):
    username: str
    password: str
    profile: dict


class LoginIn(BaseModel):
    username: str
    password: str


class ProfileIn(BaseModel):
    profile: dict


@app.post("/api/register")
def register(body: RegisterIn):
    username = body.username.strip()
    if not USERNAME_RE.match(username):
        fail(422, "username", "Use 3 to 20 letters, numbers, dashes or underscores.")
    if not 6 <= len(body.password) <= 200:
        fail(422, "password", "Use at least 6 characters.")
    raw = check_profile(body.profile)
    salt = secrets.token_bytes(16)
    now = int(time.time())
    try:
        with connect() as c:
            cur = c.execute(
                "INSERT INTO users (username, username_key, salt, pw_hash, profile, created, updated) VALUES (?,?,?,?,?,?,?)",
                (username, username.lower(), salt, hash_pw(body.password, salt), raw, now, now),
            )
            token = new_session(c, cur.lastrowid)
    except sqlite3.IntegrityError:
        fail(409, "username", "That username is taken. Pick another, or log in instead.")
    return {"token": token, "account": {"username": username, "profile": body.profile}}


@app.post("/api/login")
def login(body: LoginIn):
    key = body.username.strip().lower()
    now = int(time.time())
    with connect() as c:
        c.execute("DELETE FROM login_fails WHERE at < ?", (now - FAIL_WINDOW,))
        fails = c.execute("SELECT COUNT(*) FROM login_fails WHERE username_key = ?", (key,)).fetchone()[0]
        if fails >= MAX_FAILS:
            fail(429, "password", "Too many wrong passwords. Wait 15 minutes and try again.")
        row = c.execute("SELECT * FROM users WHERE username_key = ?", (key,)).fetchone()
        if not row:
            fail(401, "username", "There’s no account with that username. Check the spelling, or create an account.")
        if not hmac.compare_digest(hash_pw(body.password, row["salt"]), row["pw_hash"]):
            c.execute("INSERT INTO login_fails VALUES (?,?)", (key, now))
            c.commit()
            fail(401, "password", "That password doesn’t match this account. Try again.")
        c.execute("DELETE FROM login_fails WHERE username_key = ?", (key,))
        token = new_session(c, row["id"])
    return {"token": token, "account": account(row)}


@app.get("/api/me")
def me(user=Depends(current_user)):
    return account(user)


@app.put("/api/me/profile")
def save_profile(body: ProfileIn, user=Depends(current_user)):
    raw = check_profile(body.profile)
    with connect() as c:
        c.execute("UPDATE users SET profile = ?, updated = ? WHERE id = ?", (raw, int(time.time()), user["id"]))
    return {"ok": True}


@app.post("/api/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        with connect() as c:
            c.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash(authorization[7:]),))
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}


# Serve the built app from the same origin, if it has been built.
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="app")
