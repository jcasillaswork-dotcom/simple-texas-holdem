import os, tempfile
os.environ["HOLDEM_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["HOLDEM_DIST"] = "/nonexistent"
from fastapi.testclient import TestClient
import main

c = TestClient(main.app)
P = {"v": 1, "name": "Javier", "avatar": {"color": "#155056", "emblem": "initial"}, "stats": {"hands": 0}}

def test_flow():
    r = c.post("/api/register", json={"username": "Javier", "password": "secret1", "profile": P})
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    assert c.post("/api/register", json={"username": "javier", "password": "secret1", "profile": P}).json()["detail"]["field"] == "username"
    assert c.post("/api/register", json={"username": "x", "password": "secret1", "profile": P}).status_code == 422
    h = {"Authorization": "Bearer " + tok}
    assert c.get("/api/me", headers=h).json()["username"] == "Javier"
    P2 = {**P, "stats": {"hands": 12}}
    assert c.put("/api/me/profile", json={"profile": P2}, headers=h).status_code == 200
    assert c.get("/api/me", headers=h).json()["profile"]["stats"]["hands"] == 12
    assert c.post("/api/login", json={"username": "JAVIER", "password": "nope"}).json()["detail"]["field"] == "password"
    r = c.post("/api/login", json={"username": "JAVIER", "password": "secret1"})
    assert r.status_code == 200 and r.json()["account"]["profile"]["stats"]["hands"] == 12
    c.post("/api/logout", headers=h)
    assert c.get("/api/me", headers=h).status_code == 401

def test_lockout():
    c.post("/api/register", json={"username": "maria", "password": "hunter22", "profile": {**P, "name": "Maria"}})
    for _ in range(8):
        c.post("/api/login", json={"username": "maria", "password": "bad"})
    assert c.post("/api/login", json={"username": "maria", "password": "hunter22"}).status_code == 429
