from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Header, Query
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response as StarletteResponse
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated
from bson import ObjectId
import logging
import uuid
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- Auth utils ----------------
JWT_ALGORITHM = "HS256"
WHATSAPP_NUMBER = os.environ.get("WHATSAPP_NUMBER", "628125559681")

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Belum terautentikasi")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipe token tidak valid")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

# ---------------- Object storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "velox-bike"
storage_key = None

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------------- Models ----------------
CATEGORIES = ["Sepeda Listrik", "Sepeda Gunung", "BMX", "Sepeda Anak", "Sepeda Lipat", "Motor / Mobil Aki", "Mini Trail", "Road Bike"]

class Specs(BaseModel):
    frame: Optional[str] = ""
    transmisi: Optional[str] = ""
    rem: Optional[str] = ""
    ukuran_roda: Optional[str] = ""
    baterai_motor: Optional[str] = ""

class ProductCreate(BaseModel):
    name: str
    code: str = ""
    category: str
    description: str = ""
    price: float = 0
    stock: int = 0
    status: str = "Tersedia"
    image_url: str = ""
    specs: Specs = Field(default_factory=Specs)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    specs: Optional[Specs] = None

def product_public(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "category": doc.get("category"),
        "description": doc.get("description", ""),
        "stock": doc.get("stock", 0),
        "status": doc.get("status", "Tersedia"),
        "image_url": doc.get("image_url", ""),
        "specs": doc.get("specs", {}),
    }

def product_admin(doc: dict) -> dict:
    pub = product_public(doc)
    pub["price"] = doc.get("price", 0)
    pub["code"] = doc.get("code", "")
    return pub

# ---------------- Auth routes ----------------
class LoginInput(BaseModel):
    email: EmailStr
    password: str

@api_router.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user.get("name", "Admin"), "role": user.get("role", "admin"), "token": access}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Berhasil keluar"}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["_id"], "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}

# ---------------- Public routes ----------------
@api_router.get("/config")
async def get_config():
    return {"whatsapp_number": WHATSAPP_NUMBER, "categories": CATEGORIES}

@api_router.get("/products")
async def list_products(category: Optional[str] = None, sort: Optional[str] = None):
    q = {}
    if category and category != "Semua":
        q["category"] = category
    if sort == "price_asc":
        sort_spec = [("price", 1)]
    elif sort == "price_desc":
        sort_spec = [("price", -1)]
    else:
        sort_spec = [("created_at", -1)]
    docs = await db.products.find(q).sort(sort_spec).to_list(1000)
    return [product_public(d) for d in docs]

@api_router.get("/products/image/{path:path}")
async def serve_image(path: str):
    try:
        data, content_type = get_object(path)
        return StarletteResponse(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"Image serve failed: {e}")
        raise HTTPException(status_code=404, detail="Gambar tidak ditemukan")

# ---------------- Admin routes ----------------
@api_router.get("/admin/products")
async def admin_list_products(user: dict = Depends(get_current_user)):
    docs = await db.products.find({}).sort("created_at", -1).to_list(1000)
    return [product_admin(d) for d in docs]

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    docs = await db.products.find({}).to_list(1000)
    total = len(docs)
    cats = len(set(d.get("category") for d in docs))
    in_stock = sum(1 for d in docs if d.get("stock", 0) > 0)
    inventory_value = sum(d.get("price", 0) * d.get("stock", 0) for d in docs)
    return {"total_products": total, "total_categories": cats, "in_stock": in_stock, "inventory_value": inventory_value}

APK_PATH = ROOT_DIR / "static" / "SK-Bike-Store.apk"

@api_router.get("/admin/app-info")
async def app_info(user: dict = Depends(get_current_user)):
    if not APK_PATH.exists():
        return {"available": False}
    st = APK_PATH.stat()
    return {"available": True, "size": st.st_size, "updated_at": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat()}

@api_router.get("/admin/app")
async def download_app(user: dict = Depends(get_current_user)):
    if not APK_PATH.exists():
        raise HTTPException(status_code=404, detail="APK belum tersedia")
    return FileResponse(str(APK_PATH), media_type="application/vnd.android.package-archive", filename="SK-Bike-Store.apk")

@api_router.post("/admin/products")
async def create_product(payload: ProductCreate, user: dict = Depends(get_current_user)):
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    doc = payload.model_dump()
    doc["specs"] = payload.specs.model_dump()
    now = datetime.now(timezone.utc).isoformat()
    doc["created_at"] = now
    doc["updated_at"] = now
    res = await db.products.insert_one(doc)
    saved = await db.products.find_one({"_id": res.inserted_id})
    return product_admin(saved)

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate, user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({"_id": ObjectId(product_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "specs" in updates and payload.specs is not None:
        updates["specs"] = payload.specs.model_dump()
    if "category" in updates and updates["category"] not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Catat riwayat perubahan harga
    if "price" in updates:
        old_price = int(existing.get("price") or 0)
        new_price = int(updates["price"] or 0)
        if old_price != new_price:
            await db.price_history.insert_one({
                "product_id": str(product_id),
                "product_name": existing.get("name"),
                "old_price": old_price,
                "new_price": new_price,
                "changed_by": user.get("email"),
                "changed_at": datetime.now(timezone.utc).isoformat(),
            })
    res = await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    saved = await db.products.find_one({"_id": ObjectId(product_id)})
    return product_admin(saved)

def price_history_out(doc):
    return {
        "id": str(doc.get("_id")),
        "product_id": doc.get("product_id"),
        "product_name": doc.get("product_name"),
        "old_price": doc.get("old_price"),
        "new_price": doc.get("new_price"),
        "changed_by": doc.get("changed_by"),
        "changed_at": doc.get("changed_at"),
    }

@api_router.get("/admin/price-history")
async def price_history_all(user: dict = Depends(get_current_user)):
    docs = await db.price_history.find().sort("changed_at", -1).to_list(200)
    return [price_history_out(d) for d in docs]

@api_router.get("/admin/products/{product_id}/price-history")
async def price_history_product(product_id: str, user: dict = Depends(get_current_user)):
    docs = await db.price_history.find({"product_id": str(product_id)}).sort("changed_at", -1).to_list(100)
    return [price_history_out(d) for d in docs]

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    res = await db.products.delete_one({"_id": ObjectId(product_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    return {"message": "Produk dihapus"}

@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "png"
    content_type = MIME_TYPES.get(ext, file.content_type or "image/png")
    path = f"{APP_NAME}/products/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, content_type)
    stored_path = result["path"]
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": stored_path, "original_filename": file.filename,
        "content_type": content_type, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"image_url": f"/api/products/image/{stored_path}"}

# ---------------- Seed ----------------
SEED_PRODUCTS = [
    {"name": "SK Trail Pro 29", "category": "Sepeda Gunung", "price": 8500000, "stock": 12, "status": "Tersedia",
     "description": "Sepeda gunung hardtail agresif untuk trail teknikal dengan geometri modern dan handling presisi.",
     "image_url": "https://images.unsplash.com/photo-1621122940876-2b3be129159c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwzfHxtb3VudGFpbiUyMGJpa2UlMjBiaWN5Y2xlJTIwYWN0aW9uJTIwY3ljbGluZ3xlbnwwfHx8fDE3ODkxOTYxMjJ8MA&ixlib=rb-4.1.0&q=85",
     "specs": {"frame": "Aluminium Alloy 6061", "transmisi": "Shimano Deore 12-Speed", "rem": "Hydraulic Disc Brake", "ukuran_roda": "29 inci", "baterai_motor": "-"}},
    {"name": "SK Enduro X1", "category": "Sepeda Gunung", "price": 15750000, "stock": 5, "status": "Stok Terbatas",
     "description": "Full suspension enduro untuk medan ekstrem, travel 160mm dan performa turunan luar biasa.",
     "image_url": "https://images.unsplash.com/photo-1606087492572-424ebe0f2f61?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwyfHxtb3VudGFpbiUyMGJpa2UlMjBiaWN5Y2xlJTIwYWN0aW9uJTIwY3ljbGluZ3xlbnwwfHx8fDE3ODkxOTYxMjJ8MA&ixlib=rb-4.1.0&q=85",
     "specs": {"frame": "Carbon Fiber", "transmisi": "SRAM GX Eagle 12-Speed", "rem": "SRAM Code R 4-Piston", "ukuran_roda": "29 inci", "baterai_motor": "-"}},
    {"name": "SK Street BMX 20", "category": "BMX", "price": 3200000, "stock": 20, "status": "Tersedia",
     "description": "BMX freestyle tangguh untuk trik park dan street, ringan namun kokoh.",
     "image_url": "https://images.unsplash.com/photo-1594015197353-373334c20904?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwyfHxCTVglMjByaWRlciUyMHRyaWNrfGVufDB8fHx8MTc4NzcyMzIyOHww&ixlib=rb-4.1.0&q=85",
     "specs": {"frame": "Chromoly 4130", "transmisi": "Single Speed 25T", "rem": "U-Brake Rear", "ukuran_roda": "20 inci", "baterai_motor": "-"}},
    {"name": "SK Pro Park BMX", "category": "BMX", "price": 4100000, "stock": 8, "status": "Tersedia",
     "description": "BMX kompetisi dengan komponen premium untuk rider tingkat lanjut.",
     "image_url": "https://images.unsplash.com/flagged/photo-1553677969-1d67bbe9d55a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxCTVglMjByaWRlciUyMHRyaWNrfGVufDB8fHx8MTc4NzcyMzIyOHww&ixlib=rb-4.1.0&q=85",
     "specs": {"frame": "Full Chromoly", "transmisi": "Single Speed 25/9", "rem": "Gyro U-Brake", "ukuran_roda": "20 inci", "baterai_motor": "-"}},
    {"name": "SK Junior 16", "category": "Sepeda Anak", "price": 1450000, "stock": 25, "status": "Tersedia",
     "description": "Sepeda anak aman dan ceria dengan roda bantu, cocok usia 4-7 tahun.",
     "image_url": "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
     "specs": {"frame": "Hi-Ten Steel", "transmisi": "Single Speed", "rem": "Coaster + V-Brake", "ukuran_roda": "16 inci", "baterai_motor": "-"}},
    {"name": "SK Kids Explorer 20", "category": "Sepeda Anak", "price": 1850000, "stock": 0, "status": "Inden",
     "description": "Sepeda anak petualang dengan 6-speed untuk usia 8-11 tahun.",
     "image_url": "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
     "specs": {"frame": "Aluminium Alloy", "transmisi": "Shimano 6-Speed", "rem": "V-Brake", "ukuran_roda": "20 inci", "baterai_motor": "-"}},
    {"name": "SK Fold Urban 20", "category": "Sepeda Lipat", "price": 4750000, "stock": 15, "status": "Tersedia",
     "description": "Sepeda lipat urban ringkas, dilipat dalam 15 detik untuk mobilitas kota.",
     "image_url": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
     "specs": {"frame": "Aluminium Alloy Lipat", "transmisi": "Shimano 7-Speed", "rem": "Dual V-Brake", "ukuran_roda": "20 inci", "baterai_motor": "-"}},
    {"name": "SK Fold Lite Carbon", "category": "Sepeda Lipat", "price": 9800000, "stock": 4, "status": "Stok Terbatas",
     "description": "Sepeda lipat carbon ultra ringan hanya 9.8kg, ideal untuk komuter premium.",
     "image_url": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
     "specs": {"frame": "Carbon Fiber Lipat", "transmisi": "Shimano 9-Speed", "rem": "Hydraulic Disc", "ukuran_roda": "20 inci", "baterai_motor": "-"}},
    {"name": "SK E-Trail 750W", "category": "Sepeda Listrik", "price": 22500000, "stock": 7, "status": "Tersedia",
     "description": "E-bike gunung bertenaga motor 750W, jangkauan hingga 80km per pengisian.",
     "image_url": "https://images.unsplash.com/photo-1571068316344-75bc76f77890?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
     "specs": {"frame": "Aluminium Alloy E-Bike", "transmisi": "Shimano 9-Speed", "rem": "Hydraulic Disc 180mm", "ukuran_roda": "27.5 inci", "baterai_motor": "Motor 750W / Baterai 48V 15Ah"}},
    {"name": "SK E-City Cruiser", "category": "Sepeda Listrik", "price": 16900000, "stock": 10, "status": "Tersedia",
     "description": "E-bike perkotaan nyaman dengan desain elegan dan bantuan pedal cerdas.",
     "image_url": "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
     "specs": {"frame": "Aluminium Step-Through", "transmisi": "Shimano 7-Speed", "rem": "Tektro Disc Brake", "ukuran_roda": "700c", "baterai_motor": "Motor 500W / Baterai 36V 12Ah"}},
]

EXTRA_ADMINS = [
    {"email": "skbike.id@store.com", "password": "bryanhalimm21", "name": "Admin SK Bike Store"},
]

async def seed_admin():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password), "name": "Admin SK Bike", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info("Admin user seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    for extra in EXTRA_ADMINS:
        email = extra["email"].lower()
        found = await db.users.find_one({"email": email})
        if found is None:
            await db.users.insert_one({"email": email, "password_hash": hash_password(extra["password"]), "name": extra.get("name", "Admin"), "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
            logger.info(f"Extra admin seeded: {email}")
        elif not verify_password(extra["password"], found["password_hash"]):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(extra["password"])}})

async def seed_products():
    count = await db.products.count_documents({})
    if count == 0:
        now = datetime.now(timezone.utc).isoformat()
        for p in SEED_PRODUCTS:
            p = {**p, "created_at": now, "updated_at": now}
            await db.products.insert_one(p)
        logger.info("Products seeded")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_admin()
    await seed_products()
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
