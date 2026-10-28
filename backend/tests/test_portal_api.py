# Portal Elétrica Pro — backend regression tests (auth, admin licensing, projects)
import os
import uuid
from datetime import datetime

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = ("devleandropaes@gmail.com", "Le693261*")
CLIENT = ("Leandro1000cruz@gmail.com", "Teste123*")


def login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw})
    return s, r


@pytest.fixture(scope="module")
def admin():
    s, r = login(*ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


@pytest.fixture(scope="module")
def client_s():
    s, r = login(*CLIENT)
    if r.status_code != 200:
        pytest.skip(f"client login failed {r.status_code}")
    return s


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    mc = MongoClient("mongodb://localhost:27017")
    db = mc["test_database"]
    ids = [str(u["_id"]) for u in db.users.find({"email": {"$regex": "^test_"}})]
    db.projects.delete_many({"$or": [{"user_id": {"$in": ids}}, {"name": {"$regex": "^TEST_"}}]})
    db.users.delete_many({"email": {"$regex": "^test_"}})
    db.login_attempts.delete_many({"identifier": {"$regex": "test_"}})


def new_email():
    return f"TEST_{uuid.uuid4().hex[:8]}@example.com"


# --- Auth ---
class TestAuth:
    def test_admin_login_cookies(self):
        s, r = login(*ADMIN)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "admin" and d["access_state"] == "active"
        sc = r.headers.get("set-cookie", "")
        assert "access_token" in sc and "HttpOnly" in sc and "refresh_token" in sc
        assert "_id" not in d and "password_hash" not in d

    def test_client_login_case_insensitive(self):
        s, r = login(CLIENT[0].upper(), CLIENT[1])
        assert r.status_code == 200
        assert r.json()["email"] == CLIENT[0].lower()
        assert r.json()["role"] == "client"

    def test_wrong_password(self):
        _, r = login("TEST_nouser_x@example.com", "bad")
        assert r.status_code == 401
        assert "inválidos" in r.json()["detail"]

    def test_me_and_refresh(self, admin):
        r = admin.get(f"{API}/auth/me")
        assert r.status_code == 200 and r.json()["email"] == ADMIN[0]
        r2 = admin.post(f"{API}/auth/refresh")
        assert r2.status_code == 200

    def test_me_unauth(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_bcrypt_hash(self):
        db = MongoClient("mongodb://localhost:27017")["test_database"]
        u = db.users.find_one({"email": ADMIN[0]})
        assert u["password_hash"].startswith("$2b$")

    def test_bruteforce_lockout(self, admin):
        email = new_email()
        admin.post(f"{API}/admin/users", json={"name": "TEST_lock", "email": email, "password": "Secret12", "credits": 1})
        codes = [login(email, "wrongpw")[1].status_code for _ in range(6)]
        assert codes[:5] == [401] * 5, codes
        assert codes[5] == 429, codes
        # correct password also locked
        assert login(email, "Secret12")[1].status_code == 429

    def test_cors_credentials(self):
        r = requests.options(f"{API}/auth/login", headers={"Origin": BASE_URL, "Access-Control-Request-Method": "POST"})
        assert r.headers.get("access-control-allow-origin") == BASE_URL
        assert r.headers.get("access-control-allow-credentials") == "true"


# --- Admin ---
class TestAdmin:
    def test_client_forbidden(self, client_s):
        r = client_s.get(f"{API}/admin/users")
        assert r.status_code == 403

    def test_list_users(self, admin):
        r = admin.get(f"{API}/admin/users")
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert ADMIN[0] in emails and CLIENT[0].lower() in emails

    def test_create_duplicate_and_validation(self, admin):
        email = new_email()
        r = admin.post(f"{API}/admin/users", json={"name": "TEST_u", "email": email, "password": "Secret12", "credits": 1})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == email.lower() and d["credits"] == 1 and d["access_state"] == "active"
        assert d["days_left"] == 30
        r2 = admin.post(f"{API}/admin/users", json={"name": "TEST_u", "email": email, "password": "Secret12"})
        assert r2.status_code == 400
        r3 = admin.post(f"{API}/admin/users", json={"name": "TEST_u", "email": new_email(), "password": "123"})
        assert r3.status_code == 422

    def test_add_credit(self, admin):
        r = admin.post(f"{API}/admin/users", json={"name": "TEST_c", "email": new_email(), "password": "Secret12", "credits": 1})
        u = r.json()
        r2 = admin.post(f"{API}/admin/users/{u['id']}/credit")
        assert r2.status_code == 200
        d = r2.json()
        assert d["credits"] == 2
        delta = datetime.fromisoformat(d["expires_at"]) - datetime.fromisoformat(u["expires_at"])
        assert abs(delta.total_seconds() - 30 * 86400) < 5
        assert admin.post(f"{API}/admin/users/badid/credit").status_code == 404

    def test_toggle_and_self_block(self, admin):
        me = admin.get(f"{API}/auth/me").json()
        assert admin.post(f"{API}/admin/users/{me['id']}/toggle-status").status_code == 400
        u = admin.post(f"{API}/admin/users", json={"name": "TEST_t", "email": new_email(), "password": "Secret12"}).json()
        r = admin.post(f"{API}/admin/users/{u['id']}/toggle-status")
        assert r.json()["status"] == "blocked" and r.json()["access_state"] == "blocked"
        r = admin.post(f"{API}/admin/users/{u['id']}/toggle-status")
        assert r.json()["status"] == "active"


# --- Access control: blocked / expired ---
class TestAccess:
    def test_blocked_user(self, admin):
        email = new_email()
        u = admin.post(f"{API}/admin/users", json={"name": "TEST_b", "email": email, "password": "Secret12"}).json()
        admin.post(f"{API}/admin/users/{u['id']}/toggle-status")
        s, r = login(email, "Secret12")
        assert r.status_code == 200 and r.json()["access_state"] == "blocked"
        p = s.get(f"{API}/projects")
        assert p.status_code == 403 and p.json()["detail"]["code"] == "blocked"

    def test_expired_user(self, admin):
        email = new_email()
        admin.post(f"{API}/admin/users", json={"name": "TEST_e", "email": email, "password": "Secret12", "credits": 0})
        s, r = login(email, "Secret12")
        assert r.json()["access_state"] == "expired"
        p = s.get(f"{API}/projects")
        assert p.status_code == 403 and p.json()["detail"]["code"] == "expired"


# --- Projects CRUD ---
class TestProjects:
    def test_crud_and_isolation(self, client_s, admin):
        r = client_s.post(f"{API}/projects", json={"name": "TEST_proj", "type": "qdc", "data": {"a": 1}})
        assert r.status_code == 200
        pid = r.json()["id"]
        g = client_s.get(f"{API}/projects/{pid}")
        assert g.status_code == 200 and g.json()["data"] == {"a": 1}
        lst = client_s.get(f"{API}/projects?type=qdc").json()
        assert any(p["id"] == pid for p in lst) and "data" not in lst[0]
        # isolation: admin cannot read client project
        assert admin.get(f"{API}/projects/{pid}").status_code == 404
        u = client_s.put(f"{API}/projects/{pid}", json={"name": "TEST_proj2", "type": "qdc", "data": {"a": 2}})
        assert u.status_code == 200
        assert client_s.get(f"{API}/projects/{pid}").json()["name"] == "TEST_proj2"
        assert client_s.delete(f"{API}/projects/{pid}").status_code == 200
        assert client_s.get(f"{API}/projects/{pid}").status_code == 404

    def test_invalid_type(self, client_s):
        r = client_s.post(f"{API}/projects", json={"name": "TEST_x", "type": "foo", "data": {}})
        assert r.status_code == 422
