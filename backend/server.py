from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal, Any

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 60 * 8
REFRESH_DAYS = 7


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(user_id: str, kind: str) -> str:
    delta = timedelta(minutes=ACCESS_MINUTES) if kind == "access" else timedelta(days=REFRESH_DAYS)
    payload = {"sub": user_id, "type": kind, "exp": now_utc() + delta}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user_id: str):
    response.set_cookie("access_token", make_token(user_id, "access"), httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", make_token(user_id, "refresh"), httponly=True, secure=True,
                        samesite="none", max_age=REFRESH_DAYS * 86400, path="/")


def parse_dt(v) -> Optional[datetime]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(v)


def access_state(u: dict) -> str:
    if u.get("status") == "blocked":
        return "blocked"
    if u.get("role") == "admin":
        return "active"
    exp = parse_dt(u.get("expires_at"))
    if not exp or exp < now_utc():
        return "expired"
    return "active"


def user_out(u: dict) -> dict:
    exp = parse_dt(u.get("expires_at"))
    days_left = None
    if exp:
        days_left = max(0, math.ceil((exp - now_utc()).total_seconds() / 86400))
    return {
        "id": str(u["_id"]),
        "name": u.get("name", ""),
        "email": u["email"],
        "role": u.get("role", "client"),
        "status": u.get("status", "active"),
        "credits": u.get("credits", 0),
        "expires_at": exp.isoformat() if exp else None,
        "days_left": days_left,
        "access_state": access_state(u),
        "created_at": u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if not token and auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(401, "Não autenticado")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")
    if payload.get("type") != "access":
        raise HTTPException(401, "Token inválido")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    return user


async def require_active(user: dict = Depends(get_current_user)) -> dict:
    state = access_state(user)
    if state != "active":
        raise HTTPException(403, {"code": state, "message": "Acesso expirado ou bloqueado. Contate o administrador."})
    return user


async def require_admin(user: dict = Depends(require_active)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Acesso restrito ao administrador")
    return user


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower().strip()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    if att and att.get("count", 0) >= 5 and parse_dt(att.get("locked_until")) and parse_dt(att["locked_until"]) > now_utc():
        raise HTTPException(429, "Muitas tentativas. Tente novamente em 15 minutos.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (att.get("count", 0) if att else 0) + 1
        upd = {"identifier": ident, "count": count}
        if count >= 5:
            upd["locked_until"] = (now_utc() + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, {"$set": upd}, upsert=True)
        raise HTTPException(401, "E-mail ou senha inválidos")
    await db.login_attempts.delete_many({"identifier": ident})
    set_auth_cookies(response, str(user["_id"]))
    return user_out(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    response.delete_cookie("refresh_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_out(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "Sem sessão")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Sessão inválida")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Sessão inválida")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    set_auth_cookies(response, str(user["_id"]))
    return user_out(user)


# ---------- Admin ----------
class UserCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["admin", "client"] = "client"
    credits: int = Field(default=1, ge=0, le=24)


def oid(v: str) -> ObjectId:
    if not ObjectId.is_valid(v):
        raise HTTPException(404, "Não encontrado")
    return ObjectId(v)


@api.get("/admin/users")
async def list_users(_: dict = Depends(require_admin)):
    users = await db.users.find({}).sort("created_at", -1).to_list(2000)
    return [user_out(u) for u in users]


@api.post("/admin/users")
async def create_user(body: UserCreate, _: dict = Depends(require_admin)):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "E-mail já cadastrado")
    created = now_utc()
    doc = {
        "name": body.name.strip(), "email": email, "password_hash": hash_password(body.password),
        "role": body.role, "status": "active", "credits": body.credits,
        "expires_at": (created + timedelta(days=30 * body.credits)).isoformat() if body.credits else None,
        "created_at": created.isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return user_out(doc)


@api.post("/admin/users/{user_id}/credit")
async def add_credit(user_id: str, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"_id": oid(user_id)})
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    exp = parse_dt(u.get("expires_at"))
    base = exp if exp and exp > now_utc() else now_utc()
    new_exp = (base + timedelta(days=30)).isoformat()
    await db.users.update_one({"_id": u["_id"]}, {"$set": {"expires_at": new_exp}, "$inc": {"credits": 1}})
    return user_out(await db.users.find_one({"_id": u["_id"]}))


@api.post("/admin/users/{user_id}/toggle-status")
async def toggle_status(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"_id": oid(user_id)})
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    if u["_id"] == admin["_id"]:
        raise HTTPException(400, "Você não pode bloquear a sua própria conta")
    new_status = "blocked" if u.get("status") == "active" else "active"
    await db.users.update_one({"_id": u["_id"]}, {"$set": {"status": new_status}})
    return user_out(await db.users.find_one({"_id": u["_id"]}))


# ---------- Projects ----------
ProjectType = Literal["comandos", "qdc", "nbr"]


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: ProjectType
    data: dict[str, Any]


def project_out(p: dict, with_data: bool = True) -> dict:
    out = {"id": str(p["_id"]), "name": p["name"], "type": p["type"],
           "created_at": p.get("created_at"), "updated_at": p.get("updated_at")}
    if with_data:
        out["data"] = p.get("data", {})
    return out


@api.get("/projects")
async def list_projects(type: Optional[ProjectType] = None, user: dict = Depends(require_active)):
    q = {"user_id": str(user["_id"])}
    if type:
        q["type"] = type
    items = await db.projects.find(q).sort("updated_at", -1).to_list(500)
    return [project_out(p, with_data=False) for p in items]


@api.get("/projects/{pid}")
async def get_project(pid: str, user: dict = Depends(require_active)):
    p = await db.projects.find_one({"_id": oid(pid), "user_id": str(user["_id"])})
    if not p:
        raise HTTPException(404, "Projeto não encontrado")
    return project_out(p)


@api.post("/projects")
async def create_project(body: ProjectIn, user: dict = Depends(require_active)):
    ts = now_utc().isoformat()
    doc = {"user_id": str(user["_id"]), "name": body.name, "type": body.type, "data": body.data,
           "created_at": ts, "updated_at": ts}
    res = await db.projects.insert_one(doc)
    doc["_id"] = res.inserted_id
    return project_out(doc)


@api.put("/projects/{pid}")
async def update_project(pid: str, body: ProjectIn, user: dict = Depends(require_active)):
    q = {"_id": oid(pid), "user_id": str(user["_id"])}
    res = await db.projects.update_one(q, {"$set": {"name": body.name, "data": body.data,
                                                    "updated_at": now_utc().isoformat()}})
    if not res.matched_count:
        raise HTTPException(404, "Projeto não encontrado")
    return project_out(await db.projects.find_one(q))


@api.delete("/projects/{pid}")
async def delete_project(pid: str, user: dict = Depends(require_active)):
    res = await db.projects.delete_one({"_id": oid(pid), "user_id": str(user["_id"])})
    if not res.deleted_count:
        raise HTTPException(404, "Projeto não encontrado")
    return {"ok": True}


@api.get("/")
async def root():
    return {"message": "Portal Elétrica Pro API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ["FRONTEND_URL"]],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_user(email: str, password: str, name: str, role: str, credits: int):
    email = email.lower()
    if await db.users.find_one({"email": email}):
        return
    created = now_utc()
    await db.users.insert_one({
        "name": name, "email": email, "password_hash": hash_password(password), "role": role,
        "status": "active", "credits": credits,
        "expires_at": (created + timedelta(days=30 * credits)).isoformat() if credits else None,
        "created_at": created.isoformat(),
    })


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.projects.create_index([("user_id", 1), ("updated_at", -1)])
    await seed_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], "Leandro Paes", "admin", 0)
    await seed_user(os.environ["TEST_USER_EMAIL"], os.environ["TEST_USER_PASSWORD"], "Leandro Cruz", "client", 1)


@app.on_event("shutdown")
async def shutdown():
    client.close()
