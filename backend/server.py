from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import pyotp
import qrcode
import io
import base64
import asyncio
import re
import json
import resend
import cloudinary
import cloudinary.uploader
import anthropic

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'chytare_luxury_secret_2024_ultra_secure')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

logger.info(f"CLOUDINARY_CLOUD_NAME present: {bool(CLOUDINARY_CLOUD_NAME)}")
logger.info(f"CLOUDINARY_API_KEY present: {bool(CLOUDINARY_API_KEY)}")
logger.info(f"CLOUDINARY_API_SECRET present: {bool(CLOUDINARY_API_SECRET)}")

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )
    logger.info("Cloudinary configured successfully")
else:
    logger.warning("Cloudinary NOT configured — using local uploads")

FRONTEND_URL = os.environ.get('FRONTEND_URL', '')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()


# ======================= MODELS =======================

def generate_slug(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug

def validate_slug(slug: str) -> str:
    if not slug:
        raise ValueError("Slug cannot be empty")
    cleaned = generate_slug(slug)
    if not cleaned:
        raise ValueError("Slug must contain valid characters")
    return cleaned

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "editor"

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None
    recovery_code: Optional[str] = None
    remember_me: bool = False

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "editor"
    totp_secret: Optional[str] = None
    totp_enabled: bool = False
    totp_enabled_at: Optional[datetime] = None
    must_change_password: bool = True
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    name: Optional[str] = None

class TOTPSetup(BaseModel):
    totp_code: str

class ProductMedia(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    type: str = "image"
    alt: str = ""
    image_type: str = "product_display"
    order: int = 0

class ProductAttribute(BaseModel):
    key: str
    value: str
    visible: bool = True

class ProductDetail(BaseModel):
    label: str
    value: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    collection_type: str
    material: Optional[str] = None
    work: Optional[str] = None
    design_category: Optional[str] = None
    narrative_intro: str = ""
    description: str = ""
    details: List[ProductDetail] = []
    media: List[ProductMedia] = []
    attributes: List[ProductAttribute] = []
    disclaimer: str = ""
    edition: str = ""
    craft_fabric: str = ""
    craft_technique: str = ""
    care_instructions: str = ""
    delivery_info: str = ""
    pricing_mode: str = "price_on_request"
    price: Optional[float] = None
    currency: str = "INR"
    is_purchasable: bool = False
    is_enquiry_only: bool = True
    stock_status: str = "in_stock"
    stock_quantity: int = 0
    units_available: int = 0
    edition_size: Optional[int] = None
    continue_selling_out_of_stock: bool = False
    made_to_order_days: int = 30
    price_on_request: bool = False
    is_hero: bool = False
    is_secondary_highlight: bool = False
    secondary_highlight_order: int = 0
    is_primary: List[int] = []
    display_order: int = 9999
    is_hidden: bool = False
    is_invite_only: bool = False
    seo_title: str = ""
    seo_description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    social_content: Optional[Dict] = None

class ProductCreate(BaseModel):
    name: str
    slug: str
    collection_type: str
    material: Optional[str] = None
    work: Optional[str] = None
    design_category: Optional[str] = None
    narrative_intro: str = ""
    description: str = ""
    details: List[Dict] = []
    media: List[Dict] = []
    attributes: List[Dict] = []
    disclaimer: str = ""
    edition: str = ""
    craft_fabric: str = ""
    craft_technique: str = ""
    care_instructions: str = ""
    delivery_info: str = ""
    pricing_mode: str = "price_on_request"
    price: Optional[float] = None
    currency: str = "INR"
    is_purchasable: bool = False
    is_enquiry_only: bool = True
    stock_status: str = "in_stock"
    stock_quantity: int = 0
    units_available: int = 0
    edition_size: Optional[int] = None
    continue_selling_out_of_stock: bool = False
    made_to_order_days: int = 30
    price_on_request: bool = False
    is_hero: bool = False
    is_secondary_highlight: bool = False
    secondary_highlight_order: int = 0
    display_order: int = 9999
    is_hidden: bool = False
    is_invite_only: bool = False
    seo_title: str = ""
    seo_description: str = ""
    # ── Commerce & Compliance (admin-only, stripped from public responses) ──
    product_type: Optional[str] = None
    composition_pct: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    hide_price: bool = False
    display_edition: bool = True
    sku: Optional[str] = None
    # ── Audit ──
    is_archived: bool = False
    social_content: Optional[Dict] = None
    ai_field_meta: Optional[Dict] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    type: str
    collection_type: str = ""
    image_url: str = ""
    thumbnail_product_id: Optional[str] = None
    is_visible: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    slug: str
    type: str
    collection_type: str = ""
    image_url: str = ""
    thumbnail_product_id: Optional[str] = None
    is_visible: bool = True
    order: int = 0

class Story(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    category: str
    hero_media_url: str = ""
    hero_media_type: str = "image"
    content: str = ""
    pull_quote: str = ""
    gallery: List[Dict] = []
    related_product_ids: List[str] = []
    seo_title: str = ""
    seo_description: str = ""
    is_published: bool = False
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoryCreate(BaseModel):
    title: str
    slug: str
    category: str
    hero_media_url: str = ""
    hero_media_type: str = "image"
    content: str = ""
    pull_quote: str = ""
    gallery: List[Dict] = []
    related_product_ids: List[str] = []
    seo_title: str = ""
    seo_description: str = ""
    is_published: bool = False

class HeroSettings(BaseModel):
    hero_title: str = ""
    hero_subtitle: str = ""
    hero_eyebrow: str = ""
    hero_cta_text: str = ""
    hero_cta_link: str = ""
    hero_image_url: str = ""
    hero_product_id: Optional[str] = None
    hero_focal_point: str = "top center"
    hero_text_theme: str = "dark"
    hero_overlay_opacity: int = 40
    hero_overlay_gradient: bool = True
    hero_text_shadow: bool = True

class ExploreTile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    subtitle: str = ""
    cta_text: str = "View Collection"
    cta_link: str = ""
    image_url: str = ""
    focal_point: str = "center center"
    is_visible: bool = True

class CategoryGridTile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    slug: str = ""
    image_url: str = ""
    focal_point: str = "center center"
    link: str = ""
    bg_color: str = "#1B4D3E"
    is_visible: bool = True

class HomePageSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "home_settings"
    hero: HeroSettings = Field(default_factory=HeroSettings)
    explore_tiles: List[Dict] = []
    show_categories_grid: bool = True
    categories_grid_title: str = "Explore Our Sarees"
    categories_grid_subtitle: str = "Each collection tells a unique story through fabric and design"
    category_grid_tiles: List[Dict] = []
    philosophy_quote: str = "Every thread holds a story. Every weave carries a legacy. We craft not garments, but canvases for your life's most treasured moments."
    show_philosophy: bool = True
    concierge_heading: str = "Begin Your Journey"
    concierge_subheading: str = "Connect with our concierge for personalized guidance."
    show_concierge: bool = True
    show_newsletter: bool = True

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_settings"
    instagram_handle: str = "@chytarelifestyle"
    instagram_visible: bool = False
    whatsapp_number: str = "+91 9330117552"
    contact_email: str = "enquiries@chytare.com"
    private_access_enabled: bool = False
    shipping_policy: str = ""
    returns_policy: str = ""
    privacy_policy: str = ""
    terms_conditions: str = ""
    care_guide: str = ""
    faqs: str = ""
    authenticity_craftsmanship: str = ""
    limited_edition_policy: str = ""
    made_to_order_policy: str = ""

class Enquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    enquiry_type: str = "general"
    country_city: Optional[str] = None
    occasion: Optional[str] = None
    status: str = "new"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EnquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    enquiry_type: str = "general"
    country_city: Optional[str] = None
    occasion: Optional[str] = None

class NewsletterSubscriber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewsletterCreate(BaseModel):
    email: EmailStr

# ======================= RBAC MODELS =======================

class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    label: str
    is_system_role: bool = False
    permissions: Dict[str, Any] = {}
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleCreate(BaseModel):
    name: str
    label: str
    permissions: Dict[str, Any] = {}

class AdminUserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role_id: str
    password: Optional[str] = None
    account_status: str = "active"

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[str] = None
    account_status: Optional[str] = None
    custom_perms: Optional[Dict[str, Any]] = None

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ======================= AUTH HELPERS =======================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str, expiry_hours: int = JWT_EXPIRATION_HOURS) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiry_hours)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_editor_or_admin(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "editor"]:
        raise HTTPException(status_code=403, detail="Editor or admin access required")
    return user

# ======================= RBAC HELPERS =======================

DEFAULT_PERMISSIONS = {
    "super_admin": {
        module: {action: True for action in ["view","create","edit","delete","export","approve"]}
        for module in ["dashboard","products","users","roles","inventory","enquiries",
                       "orders","raw_materials","suppliers","purchases","production","costing","settings"]
    },
    "admin": {
        "dashboard":     {"view": True},
        "products":      {"view": True, "create": True, "edit": True, "delete": False},
        "inventory":     {"view": True, "create": True, "edit": True, "export": True},
        "enquiries":     {"view": True, "create": True, "edit": True},
        "orders":        {"view": True, "create": True, "edit": True},
        "raw_materials": {"view": True, "create": True, "edit": True},
        "suppliers":     {"view": True, "create": True, "edit": True},
        "purchases":     {"view": True, "create": True, "edit": True},
        "production":    {"view": True, "create": True, "edit": True},
        "costing":       {"view": True},
        "users":         {"view": False, "create": False, "edit": False, "delete": False},
        "roles":         {"view": False, "create": False, "edit": False, "delete": False},
        "settings":      {"view": False, "edit": False},
    },
    "viewer": {
        module: {"view": True}
        for module in ["dashboard","products","inventory","enquiries","orders"]
    }
}

async def log_activity(user: dict, action: str, target_type: str = None, target_id: str = None, details: dict = {}):
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user.get("id", ""),
        "user_name": user.get("name") or user.get("full_name", "Unknown"),
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(log)

async def get_user_permissions(user: dict) -> Dict[str, Any]:
    role = await db.roles.find_one({"id": user.get("role_id")}, {"_id": 0})
    base_perms = role.get("permissions", {}) if role else {}
    custom_perms = user.get("custom_perms", {})
    merged = {**base_perms}
    for module, actions in custom_perms.items():
        if module in merged:
            merged[module] = {**merged[module], **actions}
        else:
            merged[module] = actions
    return merged

# ======================= AUTH ROUTES =======================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=user_data.email, name=user_data.name, role=user_data.role)
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    await db.users.insert_one(user_dict)
    return {"message": "User registered successfully", "user_id": user.id}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("account_status") == "inactive":
        raise HTTPException(status_code=403, detail="Account disabled. Contact your administrator.")
    if user.get("totp_enabled"):
        if login_data.recovery_code:
            recovery_codes = user.get("recovery_codes", [])
            if login_data.recovery_code in recovery_codes:
                recovery_codes.remove(login_data.recovery_code)
                await db.users.update_one({"id": user["id"]}, {"$set": {"recovery_codes": recovery_codes}})
            else:
                raise HTTPException(status_code=401, detail="Invalid recovery code")
        elif not login_data.totp_code:
            return {"requires_2fa": True, "message": "2FA code required"}
        else:
            totp = pyotp.TOTP(user["totp_secret"])
            if not totp.verify(login_data.totp_code):
                raise HTTPException(status_code=401, detail="Invalid 2FA code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    expiry = 720 if login_data.remember_me else JWT_EXPIRATION_HOURS
    token = create_token(user["id"], user["email"], user["role"], expiry_hours=expiry)
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "totp_enabled": user.get("totp_enabled", False),
            "must_change_password": user.get("must_change_password", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "totp_enabled": user.get("totp_enabled", False),
        "totp_enabled_at": user.get("totp_enabled_at"),
        "must_change_password": user.get("must_change_password", False),
        "last_login": user.get("last_login"), "created_at": user.get("created_at")
    }

@api_router.put("/auth/profile")
async def update_profile(data: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    return {"message": "Profile updated successfully"}

@api_router.post("/auth/setup-2fa")
async def setup_2fa(user: dict = Depends(get_current_user)):
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=user["email"], issuer_name="Chytare Admin")
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    await db.users.update_one({"id": user["id"]}, {"$set": {"totp_secret": secret}})
    return {"secret": secret, "qr_code": f"data:image/png;base64,{qr_base64}", "provisioning_uri": provisioning_uri}

def generate_recovery_codes(count=8):
    return [f"{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}".upper() for _ in range(count)]

@api_router.post("/auth/verify-2fa")
async def verify_2fa(setup: TOTPSetup, user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not user_data.get("totp_secret"):
        raise HTTPException(status_code=400, detail="2FA not set up")
    totp = pyotp.TOTP(user_data["totp_secret"])
    if not totp.verify(setup.totp_code):
        raise HTTPException(status_code=400, detail="Invalid code")
    codes = generate_recovery_codes()
    await db.users.update_one({"id": user["id"]}, {"$set": {"totp_enabled": True, "totp_enabled_at": datetime.now(timezone.utc).isoformat(), "recovery_codes": codes}})
    return {"message": "2FA enabled successfully", "recovery_codes": codes}

@api_router.post("/auth/disable-2fa")
async def disable_2fa(setup: TOTPSetup, user: dict = Depends(require_admin)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    totp = pyotp.TOTP(user_data["totp_secret"])
    if not totp.verify(setup.totp_code):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"totp_enabled": False, "totp_secret": None, "recovery_codes": []}})
    return {"message": "2FA disabled successfully"}

@api_router.post("/auth/regenerate-recovery-codes")
async def regenerate_recovery_codes(setup: TOTPSetup, user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not user_data.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    totp = pyotp.TOTP(user_data["totp_secret"])
    if not totp.verify(setup.totp_code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    codes = generate_recovery_codes()
    await db.users.update_one({"id": user["id"]}, {"$set": {"recovery_codes": codes}})
    return {"recovery_codes": codes}

@api_router.get("/auth/recovery-codes-count")
async def get_recovery_codes_count(user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"count": len(user_data.get("recovery_codes", []))}

@api_router.get("/auth/email-config-status")
async def email_config_status(user: dict = Depends(get_current_user)):
    return {"configured": bool(RESEND_API_KEY)}

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/auth/change-password")
async def change_password(data: ChangePassword, user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.current_password, user_data["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    p = data.new_password
    if len(p) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not re.search(r'[A-Z]', p):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 uppercase letter")
    if not re.search(r'[a-z]', p):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 lowercase letter")
    if not re.search(r'[0-9]', p):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 number")
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash, "must_change_password": False}})
    return {"message": "Password changed successfully"}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "If an account exists with that email, a reset link has been sent."}
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_resets.delete_many({"user_id": user["id"]})
    await db.password_resets.insert_one({"user_id": user["id"], "token": reset_token, "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()})
    frontend_url = os.environ.get("FRONTEND_URL", "")
    reset_url = f"{frontend_url}/admin/reset-password?token={reset_token}"
    email_sent = False
    if RESEND_API_KEY:
        try:
            await asyncio.to_thread(resend.Emails.send, {"from": SENDER_EMAIL, "to": [data.email], "subject": "Password Reset - Chytare Admin", "html": f'<div style="font-family:sans-serif;padding:40px;background:#FFFFF0;"><h1 style="color:#1B4D3E;">Password Reset</h1><p style="color:#1B4D3E;">Click below to reset your password. Expires in 1 hour.</p><a href="{reset_url}" style="display:inline-block;padding:12px 24px;background:#1B4D3E;color:#FFFFF0;text-decoration:none;">Reset Password</a></div>'})
            email_sent = True
        except Exception as e:
            logger.error(f"Failed to send reset email: {str(e)}")
    return {"message": "If an account exists with that email, a reset link has been sent.", "email_sent": email_sent, "email_configured": bool(RESEND_API_KEY)}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_record = await db.password_resets.find_one({"token": data.token}, {"_id": 0})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"id": reset_record["user_id"]}, {"$set": {"password_hash": new_hash, "must_change_password": False}})
    await db.password_resets.delete_many({"user_id": reset_record["user_id"]})
    return {"message": "Password has been reset successfully. You can now log in."}

@api_router.get("/auth/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    reset_record = await db.password_resets.find_one({"token": token}, {"_id": 0})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    return {"valid": True}

# ======================= PRODUCT ROUTES =======================

def resolve_commerce_flags(p: dict) -> dict:
    if p.get("price_on_request") and not p.get("pricing_mode"):
        p["pricing_mode"] = "price_on_request"
    pricing_mode = p.get("pricing_mode", "price_on_request")
    stock_status = p.get("stock_status", "in_stock")
    continue_selling = p.get("continue_selling_out_of_stock", False)
    is_hidden = p.get("is_hidden", False)
    in_stock = (stock_status == "in_stock" or stock_status == "made_to_order" or
                (stock_status == "out_of_stock" and continue_selling))
    if is_hidden:
        p["is_purchasable"] = False
        p["is_enquiry_only"] = False
    elif pricing_mode == "direct_purchase" and p.get("price"):
        p["is_purchasable"] = in_stock
        p["is_enquiry_only"] = False
    else:
        p["is_purchasable"] = False
        p["is_enquiry_only"] = True
    p["price_on_request"] = (pricing_mode == "price_on_request")
    return p

@api_router.get("/products")
async def get_products(
    collection_type: Optional[str] = None,
    material: Optional[str] = None,
    work: Optional[str] = None,
    design_category: Optional[str] = None,
    include_hidden: bool = False
):
    query = {}
    if collection_type:
        query["collection_type"] = collection_type
    if material:
        query["material"] = material
    if work:
        query["work"] = work
    if design_category:
        if "-" in design_category:
            cat = await db.categories.find_one({"slug": design_category, "type": "design_category"}, {"_id": 0})
            if cat:
                query["design_category"] = cat["name"]
            else:
                query["design_category"] = design_category
        else:
            query["design_category"] = design_category
    if not include_hidden:
        query["is_hidden"] = {"$ne": True}
    products = await db.products.find(query, {"_id": 0}).sort([("display_order", 1), ("created_at", -1)]).to_list(1000)
    result = []
    for p in products:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
        if isinstance(p.get("updated_at"), str):
            p["updated_at"] = datetime.fromisoformat(p["updated_at"])
        resolve_commerce_flags(p)
        result.append(strip_internal_fields(p))
    return result

@api_router.get("/admin/products/{product_id}/full")
async def admin_get_product(product_id: str, user: dict = Depends(require_editor_or_admin)):
    """Admin-only endpoint that returns full product data including internal fields."""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    resolve_commerce_flags(product)
    return product  # no stripping — admin sees everything

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    resolve_commerce_flags(product)
    return strip_internal_fields(product)

@api_router.get("/products/slug/{slug}")
async def get_product_by_slug(slug: str):
    product = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    resolve_commerce_flags(product)
    return strip_internal_fields(product)

@api_router.post("/products")
async def create_product(product_data: ProductCreate, user: dict = Depends(require_editor_or_admin)):
    try:
        clean_slug = validate_slug(product_data.slug)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    existing = await db.products.find_one({"slug": clean_slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Product with this slug already exists")
    if product_data.is_hero:
        await db.products.update_many({}, {"$set": {"is_hero": False}})
    product_dict = product_data.model_dump()
    product_dict["slug"] = clean_slug
    product_dict["id"] = str(uuid.uuid4())
    product_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    product_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    product_dict["price_on_request"] = (product_dict.get("pricing_mode") == "price_on_request")
    product_dict["created_by"] = user.get("id")
    product_dict["created_by_name"] = user.get("name")
    product_dict["updated_by"] = user.get("id")
    product_dict["updated_by_name"] = user.get("name")
    await db.products.insert_one(product_dict)
    await log_activity(user, "product.created", "product", product_dict["id"], {"name": product_data.name})
    product_dict.pop("_id", None)
    return product_dict

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductCreate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        clean_slug = validate_slug(product_data.slug)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    slug_check = await db.products.find_one({"slug": clean_slug, "id": {"$ne": product_id}}, {"_id": 0})
    if slug_check:
        raise HTTPException(status_code=400, detail="Slug already in use by another product")
    if product_data.is_hero and not existing.get("is_hero"):
        await db.products.update_many({"id": {"$ne": product_id}}, {"$set": {"is_hero": False}})
    update_data = product_data.model_dump()
    update_data["slug"] = clean_slug
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["price_on_request"] = (update_data.get("pricing_mode") == "price_on_request")
    update_data["updated_by"] = user.get("id")
    update_data["updated_by_name"] = user.get("name")
    # Preserve existing internal fields if not explicitly sent (None = not provided)
    for internal_field in INTERNAL_FIELDS:
        if update_data.get(internal_field) is None and existing.get(internal_field) is not None:
            update_data[internal_field] = existing[internal_field]
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    # Sync stock_quantity to inventory collection so orders stay accurate
    new_stock_qty = update_data.get("stock_quantity", 0)
    old_stock_qty = existing.get("stock_quantity", 0)
    if new_stock_qty != old_stock_qty:
        now_str = update_data["updated_at"]
        inv_existing = await db.inventory.find_one(
            {"product_id": product_id, "entity_type": "finished_good"}, {"_id": 0}
        )
        if inv_existing:
            await db.inventory.update_one(
                {"product_id": product_id, "entity_type": "finished_good"},
                {"$set": {"quantity": new_stock_qty, "updated_at": now_str}}
            )
        else:
            await db.inventory.insert_one({
                "id": str(uuid.uuid4()), "product_id": product_id,
                "entity_type": "finished_good", "quantity": new_stock_qty,
                "created_at": now_str, "updated_at": now_str,
            })
    await log_activity(user, "product.updated", "product", product_id, {"name": product_data.name, "changes": list(update_data.keys())})
    return {"message": "Product updated successfully"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

@api_router.get("/products/home/featured")
async def get_featured_products():
    hero = await db.products.find_one({"is_hero": True, "is_hidden": {"$ne": True}}, {"_id": 0})
    if hero:
        resolve_commerce_flags(hero)
        hero = strip_internal_fields(hero)
    secondary = await db.products.find({"is_secondary_highlight": True, "is_hidden": {"$ne": True}}, {"_id": 0}).sort("secondary_highlight_order", 1).to_list(2)
    secondary = [strip_internal_fields(resolve_commerce_flags(s)) for s in secondary]
    return {"hero": hero, "secondary_highlights": secondary}

@api_router.get("/products/media/all")
async def get_all_product_media(user: dict = Depends(require_editor_or_admin)):
    products = await db.products.find({"media": {"$exists": True, "$ne": []}}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "media": 1, "collection_type": 1}).to_list(500)
    return products

# ======================= ENQUIRY ANALYTICS =======================

@api_router.get("/enquiries/analytics")
async def get_enquiry_analytics(user: dict = Depends(require_editor_or_admin)):
    pipeline = [
        {"$match": {"product_id": {"$ne": None}}},
        {"$group": {"_id": "$product_id", "product_name": {"$first": "$product_name"}, "count": {"$sum": 1}, "converted": {"$sum": {"$cond": [{"$eq": ["$status", "converted"]}, 1, 0]}}}},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    results = await db.enquiries.aggregate(pipeline).to_list(50)
    for r in results:
        r.pop("_id", None)
    return results

# ======================= CATEGORY ROUTES =======================

@api_router.get("/categories")
async def get_categories(type: Optional[str] = None, collection_type: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    if collection_type:
        query["collection_type"] = collection_type
    categories = await db.categories.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return categories

@api_router.post("/categories")
async def create_category(category_data: CategoryCreate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.categories.find_one({"slug": category_data.slug, "type": category_data.type, "collection_type": category_data.collection_type}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    category = Category(**category_data.model_dump())
    category_dict = category.model_dump()
    category_dict["created_at"] = category_dict["created_at"].isoformat()
    await db.categories.insert_one(category_dict)
    category_dict.pop("_id", None)
    return category_dict

@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, category_data: CategoryCreate, user: dict = Depends(require_editor_or_admin)):
    result = await db.categories.update_one({"id": category_id}, {"$set": category_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category updated successfully"}

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

@api_router.get("/categories/filters/{collection_type}")
async def get_filters_for_collection(collection_type: str):
    materials = await db.categories.find({"type": "material", "collection_type": collection_type, "is_visible": True}, {"_id": 0}).sort("order", 1).to_list(100)
    works = await db.categories.find({"type": "work", "collection_type": collection_type, "is_visible": True}, {"_id": 0}).sort("order", 1).to_list(100)
    design_categories = await db.categories.find({"type": "design_category", "collection_type": collection_type, "is_visible": True}, {"_id": 0}).sort("order", 1).to_list(100)
    products = await db.products.find({"collection_type": collection_type, "is_hidden": {"$ne": True}}, {"_id": 0, "material": 1, "work": 1, "design_category": 1}).to_list(1000)
    used_materials = set(p.get("material") for p in products if p.get("material"))
    used_works = set(p.get("work") for p in products if p.get("work"))
    used_categories = set(p.get("design_category") for p in products if p.get("design_category"))
    return {
        "materials": [m for m in materials if m["slug"] in used_materials or m["name"] in used_materials],
        "works": [w for w in works if w["slug"] in used_works or w["name"] in used_works],
        "design_categories": [d for d in design_categories if d["slug"] in used_categories or d["name"] in used_categories]
    }

# ======================= STORY ROUTES =======================

@api_router.get("/stories")
async def get_stories(category: Optional[str] = None, published_only: bool = True):
    query = {}
    if category:
        query["category"] = category
    if published_only:
        query["is_published"] = True
    stories = await db.stories.find(query, {"_id": 0}).sort("published_at", -1).to_list(100)
    return stories

@api_router.get("/stories/{story_id}")
async def get_story(story_id: str):
    story = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@api_router.get("/stories/slug/{slug}")
async def get_story_by_slug(slug: str):
    story = await db.stories.find_one({"slug": slug}, {"_id": 0})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@api_router.post("/stories")
async def create_story(story_data: StoryCreate, user: dict = Depends(require_editor_or_admin)):
    story = Story(**story_data.model_dump())
    if story_data.is_published:
        story.published_at = datetime.now(timezone.utc)
    story_dict = story.model_dump()
    story_dict["created_at"] = story_dict["created_at"].isoformat()
    story_dict["updated_at"] = story_dict["updated_at"].isoformat()
    if story_dict["published_at"]:
        story_dict["published_at"] = story_dict["published_at"].isoformat()
    await db.stories.insert_one(story_dict)
    story_dict.pop("_id", None)
    return story_dict

@api_router.put("/stories/{story_id}")
async def update_story(story_id: str, story_data: StoryCreate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Story not found")
    update_data = story_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if story_data.is_published and not existing.get("is_published"):
        update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    await db.stories.update_one({"id": story_id}, {"$set": update_data})
    return {"message": "Story updated successfully"}

@api_router.delete("/stories/{story_id}")
async def delete_story(story_id: str, user: dict = Depends(require_admin)):
    result = await db.stories.delete_one({"id": story_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"message": "Story deleted successfully"}

# ======================= SETTINGS ROUTES =======================

@api_router.get("/settings/home")
async def get_home_settings():
    settings = await db.settings.find_one({"id": "home_settings"}, {"_id": 0})
    if not settings:
        default = HomePageSettings()
        settings = default.model_dump()
        await db.settings.insert_one(settings)
    return settings

@api_router.put("/settings/home")
async def update_home_settings(settings: Dict[str, Any], user: dict = Depends(require_editor_or_admin)):
    settings["id"] = "home_settings"
    await db.settings.update_one({"id": "home_settings"}, {"$set": settings}, upsert=True)
    return {"message": "Home settings updated successfully"}

@api_router.get("/settings/site")
async def get_site_settings():
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        default = SiteSettings()
        settings = default.model_dump()
        await db.settings.insert_one(settings)
    return settings

@api_router.put("/settings/site")
async def update_site_settings(settings: Dict[str, Any], user: dict = Depends(require_admin)):
    settings["id"] = "site_settings"
    await db.settings.update_one({"id": "site_settings"}, {"$set": settings}, upsert=True)
    return {"message": "Site settings updated successfully"}

@api_router.get("/settings/about")
async def get_about_settings():
    settings = await db.settings.find_one({"id": "about_settings"}, {"_id": 0})
    if not settings:
        return {}
    return settings

@api_router.put("/settings/about")
async def update_about_settings(settings: Dict[str, Any], user: dict = Depends(require_editor_or_admin)):
    settings["id"] = "about_settings"
    await db.settings.update_one({"id": "about_settings"}, {"$set": settings}, upsert=True)
    return {"message": "About settings updated successfully"}

# ======================= ALT TEXT GENERATION =======================

def build_alt_prompt(product: dict, image_type: str) -> str:
    name = product.get("name", "")
    collection_type = product.get("collection_type", "saree")
    fabric = product.get("craft_fabric", "") or product.get("material", "")
    technique = product.get("craft_technique", "") or product.get("work", "")
    design_category = product.get("design_category", "")
    colour = ""
    motif = ""
    for detail in product.get("details", []):
        label = detail.get("label", "").lower()
        if "colour" in label or "color" in label:
            colour = detail.get("value", "")
        if "motif" in label:
            motif = detail.get("value", "")
    inspiration = ""
    for attr in product.get("attributes", []):
        key = attr.get("key", "").lower()
        if "craft" in key or "cultural" in key or "inspir" in key or "reference" in key:
            inspiration = attr.get("value", "")[:100]
            break
    image_type_label = {"hero": "full drape hero shot", "close_up": "close-up detail", "embroidery_detail": "embroidery detail", "model": "model wearing", "product_display": "product display"}.get(image_type, "product display")
    return f"""Generate concise luxury ALT text for a fashion product image.

Product: {name}
Type: {collection_type}
Image type: {image_type_label}
Fabric: {fabric}
Colour: {colour}
Technique: {technique}
Motif: {motif}
Design category: {design_category}
Cultural inspiration: {inspiration}

Rules:
- Under 18 words total
- Mention fabric, colour, and key design element
- Luxury fashion tone
- No filler words
- End with "Chytare limited edition"
- Return ONLY the ALT text, nothing else

Example: "Ivory Tussar silk saree with black fish embroidery inspired by Bengal folk art, Chytare limited edition"
"""

async def generate_alt_for_product(product: dict, image_type: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    prompt = build_alt_prompt(product, image_type)
    ai_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    response = await asyncio.to_thread(ai_client.messages.create, model="claude-sonnet-4-6", max_tokens=100, messages=[{"role": "user", "content": prompt}])
    return response.content[0].text.strip().strip('"')

class GenerateAltRequest(BaseModel):
    product_id: str
    image_type: str = "product_display"

@api_router.post("/generate-alt")
async def generate_alt(data: GenerateAltRequest, user: dict = Depends(require_editor_or_admin)):
    product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    alt_text = await generate_alt_for_product(product, data.image_type)
    return {"alt_text": alt_text}

@api_router.post("/generate-alt/bulk")
async def bulk_generate_alt(user: dict = Depends(require_editor_or_admin)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    updated_count = 0
    skipped_count = 0
    for product in products:
        media = product.get("media", [])
        if not media:
            continue
        updated = False
        for item in media:
            existing_alt = item.get("alt", "").strip()
            if existing_alt and not existing_alt.endswith(".png") and not existing_alt.endswith(".jpg") and len(existing_alt) > 20:
                skipped_count += 1
                continue
            image_type = item.get("image_type", "product_display")
            try:
                alt_text = await generate_alt_for_product(product, image_type)
                item["alt"] = alt_text
                updated = True
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.error(f"Failed to generate ALT for product {product.get('name')}: {e}")
        if updated:
            await db.products.update_one({"id": product["id"]}, {"$set": {"media": media}})
            updated_count += 1
    return {"message": "Bulk ALT generation complete", "products_updated": updated_count, "images_skipped": skipped_count}

# ======================= AI PRODUCT CONTENT GENERATION =======================

class AIContentRequest(BaseModel):
    form_data: Dict[str, Any]
    generate_content: bool = True
    generate_social: bool = False
    brand_positioning: str = "high_luxury"   # high_luxury | premium | accessible
    writing_tone: str = "editorial"          # editorial | minimal | storytelling | factual
    content_structure: str = "standard"     # short | standard | long | bullet
    feedback_patterns: List[str] = []
    # legacy fields — ignored but accepted so old clients don't 422
    primary_tones: List[str] = []
    secondary_tones: List[str] = []

class AIFeedbackLog(BaseModel):
    product_id: str
    field_name: str
    ai_output: str
    final_output: str
    change_reason: Optional[str] = None

def _fs(form: dict, key: str, hint: str = "") -> str:
    """Return FILLED or EMPTY status string for a field."""
    val = form.get(key, "")
    if val and str(val).strip():
        display = str(val)[:80] + ("..." if len(str(val)) > 80 else "")
        return f"FILLED: {display}"
    return f"EMPTY{(' — ' + hint) if hint else ''}"

def build_content_prompt(
    form: dict,
    generate_social: bool,
    brand_positioning: str = "high_luxury",
    writing_tone: str = "editorial",
    content_structure: str = "standard",
    feedback_patterns: list = None,
    brand_rules: list = None,
    preferred_traits: list = None,
) -> str:

    # ── Brand positioning ──
    positioning_map = {
        "high_luxury": "Quiet authority. No superlatives, no hype, no 'exquisite' or 'stunning'. Restrained vocabulary. Let the craft speak.",
        "premium":     "Confident and clear. Modern craft narrative. Knowledgeable without being aloof.",
        "accessible":  "Warm and approachable. Clear benefit-forward language. Still grounded in craft.",
    }
    positioning_instruction = positioning_map.get(brand_positioning, positioning_map["high_luxury"])

    # ── Writing tone ──
    tone_map = {
        "editorial":    "Painterly and precise. Visual-first. Specific over generic. No filler adjectives.",
        "minimal":      "Spare and direct. Short sentences. Every word earns its place. Nothing decorative.",
        "storytelling": "Narrative arc. Draw the reader into the world this piece comes from.",
        "factual":      "Specification-led. Verifiable craft facts. Exact materials, techniques, origins.",
    }
    tone_instruction = tone_map.get(writing_tone, tone_map["editorial"])

    # ── Content structure ──
    structure_map = {
        "short":    "Write the description as 1 short paragraph of 2-3 sentences only.",
        "standard": "Write the description as 1-2 paragraphs. First paragraph: fabric + craft process. Second (optional): motif + texture + drape.",
        "long":     "Write the description as 2-3 rich paragraphs covering: fabric origin, craft process, motif story, texture, drape, and the cultural or emotional world it belongs to.",
        "bullet":   "Write the description as 4-6 bullet points (use '-' prefix). Each bullet covers one distinct aspect: fabric, craft, motif, texture, drape, occasion.",
    }
    structure_instruction = structure_map.get(content_structure, structure_map["standard"])

    # ── Persistent brand rules ──
    brand_rules_block = ""
    if brand_rules:
        rules = "\n".join(f"- {r}" for r in brand_rules)
        brand_rules_block = f"\nBRAND RULES — ALWAYS APPLY:\n{rules}\n"

    # ── Preferred writing traits ──
    preferred_block = ""
    if preferred_traits:
        traits = "\n".join(f"- {t}" for t in preferred_traits)
        preferred_block = f"\nPREFERRED WRITING TRAITS:\n{traits}\n"

    # ── Session + accumulated feedback avoidance ──
    feedback_block = ""
    if feedback_patterns:
        avoids = "\n".join(f"- {p}" for p in feedback_patterns)
        feedback_block = f"\nAVOID THESE PATTERNS (admin corrections):\n{avoids}\n"

    # ── Locked field values (source of truth — never modify) ──
    locked_colour   = (form.get("detail_Colour") or "").strip()
    locked_material = (form.get("material") or "").strip()
    locked_display  = ""
    if locked_colour and locked_material:
        locked_display = f"Colour: {locked_colour} | Material: {locked_material}"
    elif locked_colour:
        locked_display = f"Colour: {locked_colour} | Material: (unknown)"
    elif locked_material:
        locked_display = f"Colour: (unknown) | Material: {locked_material}"
    else:
        locked_display = "(both unknown — infer from other fields)"

    # ── Social media JSON template ──
    social_block = ""
    if generate_social:
        social_block = ''',
  "social_content": {
    "taglines": ["...", "...", "...", "...", "..."],
    "instagram": {
      "caption_storytelling": "...",
      "caption_factual": "...",
      "caption_aspirational": "...",
      "reel_1": {"hook": "...", "script": "...", "onscreen_text": "..."},
      "reel_2": {"hook": "...", "script": "...", "onscreen_text": "..."},
      "carousel": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ..."],
      "hashtags": "..."
    },
    "facebook": {"caption_1": "...", "caption_2": "..."},
    "twitter": {"tweet_sharp": "...", "tweet_craft": "...", "tweet_story": "...", "tweet_minimal": "...", "tweet_commercial": "..."},
    "whatsapp": {"short": "...", "descriptive": "..."}
  }'''

    return f"""You are an internal AI processing engine inside a product admin system for Chytare — a luxury Indian handcraft fashion brand.

DO NOT ask for input. DO NOT explain. DO NOT output anything except the JSON object below.

---
BRAND POSITIONING: {brand_positioning.upper()}
---
{positioning_instruction}

---
WRITING TONE: {writing_tone.upper()}
---
{tone_instruction}

---
DESCRIPTION STRUCTURE: {content_structure.upper()}
---
{structure_instruction}
{brand_rules_block}{preferred_block}{feedback_block}
---
LOCKED INPUT FIELDS — SOURCE OF TRUTH — NEVER MODIFY
---
These values are factual and admin-confirmed. You must use them exactly as inputs.
You must NEVER change, reinterpret, or omit them.
{locked_display}

---
NAMING RULES — MANDATORY
---
TITLE must follow: [Colour] [Material] [Descriptor] Saree
- Must include the exact colour and material from the locked fields above
- Descriptor is optional but preferred (e.g. craft technique, motif, or finish)
- Keep it clean and factual — no poetic flourishes, no filler words
- Example: 'Honey Cotton Tussar Saree' or 'Rust Tussar Silk Embroidered Saree'

SLUG must follow: [colour]-[material]-[descriptor]-saree
- Derived from the title
- Lowercase only, hyphen-separated, no special characters, no duplicate words
- Must always contain both colour and material
- Example: 'honey-cotton-tussar-saree' or 'rust-tussar-silk-embroidered-saree'

DESCRIPTION first sentence must naturally include: colour + material + 'saree'
- Do not mechanically repeat the title
- Write it as a natural sentence
- Example: 'A rust tussar silk saree defined by...'

NO GENERIC LUXURY FLUFF. No 'exquisite', 'stunning', 'timeless', 'elegant' used as empty adjectives.
Every sentence must be grounded in a specific craft fact, material property, or cultural detail.

---
FIELD PROTECTION RULES
---
- FILLED field → reproduce the value EXACTLY, unchanged
- EMPTY field → generate content following all rules above
- detail_Colour and material → always FILLED, always treat as locked input — never change them
- Saree Length is always: 5.5 meters
- Origin is always: India
- Collection type default: Sarees

---
CURRENT FIELD STATE
---
name: {_fs(form, "name", "follow TITLE RULE above")}
collection_type: {_fs(form, "collection_type")}
material: {_fs(form, "material")} [LOCKED — do not modify]
work (craft): {_fs(form, "work")}
design_category: {_fs(form, "design_category", "choose exactly one: Wearable Whispers | Legacy Threads | Streets of Reverie | Blossom Chronicles | Folk Tales in Thread | Marine Muses | Impressions Unbound | Feathered Whispers")}

detail_Colour: {_fs(form, "detail_Colour")} [LOCKED — do not modify]
detail_Fabric: {_fs(form, "detail_Fabric")}
detail_Technique: {_fs(form, "detail_Technique")}
detail_Motif: {_fs(form, "detail_Motif")}
detail_Finish: {_fs(form, "detail_Finish")}

narrative_intro: {_fs(form, "narrative_intro", "1 line — shown directly below product name on website")}
description: {_fs(form, "description", "follow DESCRIPTION STRUCTURE above")}

craft_fabric: {_fs(form, "craft_fabric", "full fabric specification, e.g. Pure Mulberry Silk, dual-warp")}
craft_technique: {_fs(form, "craft_technique", "full craft process, e.g. Handwoven Zari on pit loom, Kanchipuram")}

edition: {_fs(form, "edition", "e.g. Limited to N pieces — leave empty string if not a limited edition")}
disclaimer: {_fs(form, "disclaimer", "e.g. Slight variations in colour are natural to handwoven textiles...")}

care_instructions: {_fs(form, "care_instructions", "dry clean, storage, sunlight, folding instructions")}
delivery_info: {_fs(form, "delivery_info", "dispatch timeline, packaging, shipping notes")}

seo_title: {_fs(form, "seo_title", "under 60 chars — follow TITLE RULE, append brand name Chytare")}
seo_description: {_fs(form, "seo_description", "under 160 chars — first sentence of description adapted for search")}

---
REQUIRED JSON OUTPUT — STRICT RULES
---
- Return ONLY the raw JSON object. Nothing before it. Nothing after it.
- No markdown. No code fences. No triple backticks. No '```json'.
- No prose, no explanation, no commentary anywhere.
- Every string value must be a valid JSON string:
  - Do NOT use double quotes inside string values. Use single quotes instead.
  - Do NOT use literal newlines inside string values. Write each value on one line.
  - Do NOT use smart/curly quotes. Use straight ASCII quotes only.
- Do NOT add trailing commas after the last item in any object or array.

{{
  "name": "...",
  "slug": "...",
  "collection_type": "Sarees",
  "design_category": "...",
  "pricing_mode": "price_on_request",
  "narrative_intro": "...",
  "description": "...",
  "detail_Colour": "...",
  "detail_Fabric": "...",
  "detail_Technique": "...",
  "detail_Motif": "...",
  "detail_Finish": "...",
  "detail_Saree Length": "5.5 meters",
  "detail_Origin": "India",
  "craft_fabric": "...",
  "craft_technique": "...",
  "edition": "...",
  "disclaimer": "...",
  "care_instructions": "...",
  "delivery_info": "...",
  "seo_title": "...",
  "seo_description": "...",
  "key_attributes": [
    {{"key": "...", "value": "..."}},
    {{"key": "...", "value": "..."}},
    {{"key": "...", "value": "..."}},
    {{"key": "...", "value": "..."}},
    {{"key": "...", "value": "..."}}
  ]{social_block}
}}"""

@api_router.get("/ping")
async def ping():
    return {"status": "ok", "version": "2025-04-04-a"}

@api_router.options("/admin/products/generate-content")
async def generate_content_preflight():
    from fastapi.responses import Response
    r = Response()
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return r

@api_router.post("/admin/products/generate-content")
async def generate_product_content(data: AIContentRequest, user: dict = Depends(require_editor_or_admin)):
    from fastapi.responses import JSONResponse
    import traceback
    _cors = {"Access-Control-Allow-Origin": "*"}
    step = "start"
    try:
        step = "key_check"
        if not ANTHROPIC_API_KEY:
            return JSONResponse({"detail": "ANTHROPIC_API_KEY not set", "step": step}, status_code=500, headers=_cors)

        step = "parse_request"
        form = data.form_data or {}
        session_feedback = data.feedback_patterns or []

        # Pull persistent style config + aggregated patterns from DB
        style_cfg = await db.ai_style_config.find_one({"id": "global"}, {"_id": 0}) or {}
        persistent_negatives = style_cfg.get("negative_patterns", [])
        brand_rules = style_cfg.get("brand_rules", [])
        preferred_traits = style_cfg.get("preferred_traits", [])

        # Merge: persistent negative patterns + session overrides (session listed last = most recent)
        merged_feedback = persistent_negatives + session_feedback

        logging.info(f"[gc] positioning={data.brand_positioning} tone={data.writing_tone} structure={data.content_structure} "
                     f"form_keys={list(form.keys())} persistent_patterns={len(persistent_negatives)} session_patterns={len(session_feedback)}")

        step = "build_prompt"
        prompt = build_content_prompt(
            form, data.generate_social,
            brand_positioning=data.brand_positioning,
            writing_tone=data.writing_tone,
            content_structure=data.content_structure,
            feedback_patterns=merged_feedback,
            brand_rules=brand_rules,
            preferred_traits=preferred_traits,
        )
        logging.info(f"[gc] prompt built, len={len(prompt)}")

        step = "api_call"
        ai_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        logging.info("[gc] calling claude-sonnet-4-6")
        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        step = "extract_response"
        raw = response.content[0].text.strip()
        logging.info(f"[gc] raw_len={len(raw)} raw[:300]={raw[:300]}")

        step = "parse_json"
        # ── Attempt 1: strip markdown fences, try direct parse ──
        cleaned = raw
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-z]*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()
        # Normalize smart/curly quotes to straight quotes
        cleaned = cleaned.replace("\u201c", '"').replace("\u201d", '"').replace("\u2018", "'").replace("\u2019", "'")

        result = None
        parse_err = None

        # Try 1: parse the cleaned string as-is
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as e1:
            parse_err = e1
            logging.warning(f"[gc] direct parse failed: {e1} — trying balanced extraction")

        # Try 2: extract the outermost balanced {} block
        if result is None:
            brace_start = cleaned.find("{")
            if brace_start != -1:
                depth = 0
                in_str = False
                escape_next = False
                brace_end = -1
                for i, ch in enumerate(cleaned[brace_start:], start=brace_start):
                    if escape_next:
                        escape_next = False
                        continue
                    if ch == "\\" and in_str:
                        escape_next = True
                        continue
                    if ch == '"':
                        in_str = not in_str
                    if not in_str:
                        if ch == "{":
                            depth += 1
                        elif ch == "}":
                            depth -= 1
                            if depth == 0:
                                brace_end = i + 1
                                break
                if brace_end != -1:
                    candidate = cleaned[brace_start:brace_end]
                    logging.info(f"[gc] balanced block len={len(candidate)}")
                    try:
                        result = json.loads(candidate)
                        parse_err = None
                    except json.JSONDecodeError as e2:
                        parse_err = e2
                        # Log snippet around the failure character for diagnosis
                        col = e2.colno - 1
                        snippet = candidate[max(0, col - 80):col + 80]
                        logging.error(f"[gc] balanced parse failed at char {e2.colno}: ...{snippet}...")

        if result is None:
            col = parse_err.colno - 1 if parse_err else 0
            snippet = cleaned[max(0, col - 80):col + 80]
            return JSONResponse(
                status_code=500,
                content={
                    "detail": str(parse_err),
                    "step": "parse_json",
                    "snippet": snippet,
                    "raw_preview": raw[:1500],
                },
                headers=_cors,
            )

        step = "map_output"
        logging.info(f"[gc] result keys={list(result.keys())}")

        step = "return_response"
        return JSONResponse(result, headers=_cors)

    except Exception as e:
        tb = traceback.format_exc()
        logging.error(f"[gc] FAILED step={step} exc={type(e).__name__}: {e}\n{tb}")
        err_str = str(e).lower()
        if "credit balance is too low" in err_str or "billing" in err_str or "insufficient_quota" in err_str:
            return JSONResponse(
                status_code=402,
                content={"detail": "AI generation unavailable: Anthropic API credits exhausted. Please top up at console.anthropic.com."},
                headers=_cors
            )
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "step": step, "traceback": tb[-2000:]},
            headers=_cors
        )

@api_router.post("/admin/ai-feedback")
async def log_ai_feedback(data: AIFeedbackLog, user: dict = Depends(require_editor_or_admin)):
    # Derive a length-change signal automatically
    length_signal = None
    if data.ai_output and data.final_output:
        ratio = len(data.final_output) / max(len(data.ai_output), 1)
        if ratio < 0.6:
            length_signal = "output_too_long"
        elif ratio > 1.6:
            length_signal = "output_too_short"
    log = {
        "id": str(uuid.uuid4()),
        "product_id": data.product_id,
        "field_name": data.field_name,
        "ai_output": data.ai_output,
        "final_output": data.final_output,
        "change_reason": data.change_reason,
        "length_signal": length_signal,
        "edited_by": user.get("id"),
        "edited_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.ai_feedback.insert_one(log)
    return {"message": "Feedback logged"}

@api_router.get("/admin/ai-feedback/patterns")
async def get_ai_feedback_patterns(limit: int = 10, user: dict = Depends(require_editor_or_admin)):
    """Aggregate feedback into top recurring avoid-patterns for prompt injection."""
    logs = await db.ai_feedback.find({}, {"_id": 0}).to_list(500)

    # Count explicit change_reason values
    reason_counts: dict = {}
    length_counts: dict = {}
    field_counts: dict = {}
    for log in logs:
        r = (log.get("change_reason") or "").strip()
        if r:
            reason_counts[r] = reason_counts.get(r, 0) + 1
        ls = log.get("length_signal")
        if ls:
            length_counts[ls] = length_counts.get(ls, 0) + 1
        fn = log.get("field_name")
        if fn:
            field_counts[fn] = field_counts.get(fn, 0) + 1

    # Build ranked pattern list
    patterns = sorted(reason_counts.items(), key=lambda x: -x[1])
    top_patterns = [p for p, _ in patterns[:limit]]

    # Append derived length signals if significant (>=3 occurrences)
    if length_counts.get("output_too_long", 0) >= 3:
        top_patterns.append("Output is consistently too long — write more concisely")
    if length_counts.get("output_too_short", 0) >= 3:
        top_patterns.append("Output is consistently too brief — provide more detail")

    # Most-edited field hint
    if field_counts:
        top_field = max(field_counts, key=field_counts.get)
        top_patterns.append(f"Pay extra attention to {top_field} — it is the most frequently corrected field")

    return {
        "patterns": top_patterns,
        "total_feedback_entries": len(logs),
        "reason_counts": reason_counts,
        "length_counts": length_counts,
        "field_counts": field_counts,
    }

# ── AI Style Config (persistent brand memory) ──

class AIStyleConfigUpdate(BaseModel):
    brand_rules: List[str] = []
    negative_patterns: List[str] = []
    preferred_traits: List[str] = []

@api_router.get("/admin/ai-style-config")
async def get_ai_style_config(user: dict = Depends(require_editor_or_admin)):
    cfg = await db.ai_style_config.find_one({"id": "global"}, {"_id": 0})
    if not cfg:
        return {"id": "global", "brand_rules": [], "negative_patterns": [], "preferred_traits": []}
    return cfg

@api_router.put("/admin/ai-style-config")
async def update_ai_style_config(data: AIStyleConfigUpdate, user: dict = Depends(require_editor_or_admin)):
    doc = {
        "id": "global",
        "brand_rules": data.brand_rules,
        "negative_patterns": data.negative_patterns,
        "preferred_traits": data.preferred_traits,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("name"),
    }
    await db.ai_style_config.update_one({"id": "global"}, {"$set": doc}, upsert=True)
    return doc

# ======================= ENQUIRY ROUTES =======================

async def send_enquiry_emails(enquiry: dict, product_name: str = None):
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured, skipping emails")
        return
    try:
        admin_html = f"""
        <div style="font-family:'Manrope',sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#FFFFF0;">
            <h1 style="color:#1B4D3E;font-family:'Playfair Display',serif;font-size:28px;">Chytare</h1>
            <h2 style="color:#1B4D3E;font-family:'Playfair Display',serif;">New Enquiry Received</h2>
            <p style="color:#1B4D3E;"><strong>Name:</strong> {enquiry['name']}</p>
            <p style="color:#1B4D3E;"><strong>Email:</strong> {enquiry['email']}</p>
            <p style="color:#1B4D3E;"><strong>Phone:</strong> {enquiry.get('phone', 'Not provided')}</p>
            <p style="color:#1B4D3E;"><strong>Location:</strong> {enquiry.get('country_city', 'Not provided')}</p>
            <p style="color:#1B4D3E;"><strong>Type:</strong> {enquiry['enquiry_type']}</p>
            {f"<p style='color:#1B4D3E;'><strong>Product:</strong> {product_name}</p>" if product_name else ""}
            {f"<p style='color:#1B4D3E;'><strong>Occasion:</strong> {enquiry.get('occasion')}</p>" if enquiry.get('occasion') else ""}
            <p style="color:#1B4D3E;"><strong>Message:</strong></p>
            <p style="color:#1B4D3E;background:#fff;padding:20px;border-left:3px solid #DACBA0;">{enquiry['message']}</p>
        </div>"""
        await asyncio.to_thread(resend.Emails.send, {"from": SENDER_EMAIL, "to": [os.environ.get('ADMIN_EMAIL', 'chytarelifestyle@gmail.com')], "subject": f"New Enquiry from {enquiry['name']} - Chytare", "html": admin_html})
        customer_html = f"""
        <div style="font-family:'Manrope',sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#FFFFF0;">
            <h1 style="color:#1B4D3E;font-family:'Playfair Display',serif;font-size:28px;">Chytare</h1>
            <h2 style="color:#1B4D3E;font-family:'Playfair Display',serif;">Thank You for Your Enquiry</h2>
            <p style="color:#1B4D3E;line-height:1.8;">Dear {enquiry['name']},</p>
            <p style="color:#1B4D3E;line-height:1.8;">We have received your enquiry{f" regarding <em>{product_name}</em>" if product_name else ""} and our concierge team will be in touch with you shortly.</p>
            <p style="color:#1B4D3E;line-height:1.8;">With warmth,<br/>The Chytare Team</p>
            <p style="color:#DACBA0;font-style:italic;font-family:'Playfair Display',serif;">Your Life | Your Canvas</p>
        </div>"""
        await asyncio.to_thread(resend.Emails.send, {"from": SENDER_EMAIL, "to": [enquiry['email']], "subject": "Your Enquiry — Chytare", "html": customer_html})
    except Exception as e:
        logger.error(f"Failed to send enquiry emails: {str(e)}")

@api_router.post("/enquiries")
async def create_enquiry(enquiry_data: EnquiryCreate):
    enquiry = Enquiry(**enquiry_data.model_dump())
    enquiry_dict = enquiry.model_dump()
    enquiry_dict["created_at"] = enquiry_dict["created_at"].isoformat()
    product_name = enquiry_data.product_name
    if not product_name and enquiry_data.product_id:
        product = await db.products.find_one({"id": enquiry_data.product_id}, {"_id": 0, "name": 1})
        if product:
            product_name = product["name"]
            enquiry_dict["product_name"] = product_name
    await db.enquiries.insert_one(enquiry_dict)
    if enquiry_data.product_id:
        await db.products.update_one({"id": enquiry_data.product_id}, {"$inc": {"enquiry_count": 1}})
    asyncio.create_task(send_enquiry_emails(enquiry_dict, product_name))
    return {"message": "Enquiry submitted successfully", "id": enquiry.id}

@api_router.get("/enquiries")
async def get_enquiries(user: dict = Depends(require_editor_or_admin)):
    enquiries = await db.enquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return enquiries

@api_router.put("/enquiries/{enquiry_id}/status")
async def update_enquiry_status(enquiry_id: str, status: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.enquiries.update_one({"id": enquiry_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"message": "Enquiry status updated"}

# ======================= NEWSLETTER ROUTES =======================

@api_router.post("/newsletter/subscribe")
async def subscribe_newsletter(subscriber_data: NewsletterCreate):
    existing = await db.newsletter.find_one({"email": subscriber_data.email}, {"_id": 0})
    if existing:
        if existing.get("is_active"):
            return {"message": "Already subscribed"}
        await db.newsletter.update_one({"email": subscriber_data.email}, {"$set": {"is_active": True}})
        return {"message": "Subscription reactivated"}
    subscriber = NewsletterSubscriber(email=subscriber_data.email)
    subscriber_dict = subscriber.model_dump()
    subscriber_dict["created_at"] = subscriber_dict["created_at"].isoformat()
    await db.newsletter.insert_one(subscriber_dict)
    return {"message": "Successfully subscribed to newsletter"}

@api_router.get("/newsletter/subscribers")
async def get_subscribers(user: dict = Depends(require_editor_or_admin)):
    subscribers = await db.newsletter.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return subscribers

@api_router.post("/newsletter/unsubscribe")
async def unsubscribe_newsletter(subscriber_data: NewsletterCreate):
    result = await db.newsletter.update_one({"email": subscriber_data.email}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"message": "Successfully unsubscribed"}

# ======================= INVENTORY ROUTES =======================

@api_router.post("/admin/inventory/{product_id}/adjust")
async def adjust_inventory(product_id: str, data: dict, user: dict = Depends(require_editor_or_admin)):
    quantity_delta = float(data.get("quantity_delta", 0))
    reason = (data.get("reason") or "Manual adjustment").strip()
    if quantity_delta == 0:
        raise HTTPException(status_code=400, detail="quantity_delta must be non-zero")

    product = await db.products.find_one({"id": product_id}, {"_id": 0, "stock_quantity": 1, "units_available": 1, "name": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_qty = int(product.get("stock_quantity") or 0)
    new_qty = max(0, old_qty + int(quantity_delta))

    await db.products.update_one(
        {"id": product_id},
        {"$set": {"stock_quantity": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    movement = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "entity_type": "finished_good",
        "movement_type": "inventory_adjustment",
        "quantity": int(quantity_delta),
        "reason": reason,
        "reference_type": "manual",
        "reference_id": None,
        "location": None,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.inventory_movements.insert_one(movement)
    await log_activity(user, "product.inventory_adjusted", "product", product_id,
                       {"delta": quantity_delta, "old": old_qty, "new": new_qty, "reason": reason})

    return {"old_quantity": old_qty, "new_quantity": new_qty, "delta": quantity_delta}

@api_router.get("/admin/inventory/movements")
async def get_inventory_movements(
    user: dict = Depends(require_editor_or_admin),
    product_id: Optional[str] = None,
    material_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    movement_type: Optional[str] = None,
    limit: int = 300,
):
    query: dict = {}
    if product_id: query["product_id"] = product_id
    if material_id: query["material_id"] = material_id
    if entity_type: query["entity_type"] = entity_type
    if movement_type: query["movement_type"] = movement_type
    movements = await db.inventory_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return movements

@api_router.get("/inventory")
async def get_inventory(user: dict = Depends(require_editor_or_admin)):
    products = await db.products.find({}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "collection_type": 1, "stock_status": 1, "stock_quantity": 1, "units_available": 1, "edition_size": 1, "pricing_mode": 1, "price": 1, "price_on_request": 1, "is_hidden": 1, "enquiry_count": 1}).to_list(1000)
    for p in products:
        p["units_sold"] = 0
        p["low_stock"] = p.get("stock_quantity", 0) <= 2 and p.get("stock_status") == "in_stock"
    return products

# ======================= MEDIA UPLOAD =======================

@api_router.post("/upload")
async def upload_media(file: UploadFile = File(...), user: dict = Depends(require_editor_or_admin)):
    content = await file.read()
    file_id = str(uuid.uuid4())
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    resource_type = "video" if file_ext.lower() in ["mp4", "mov", "webm"] else "image"
    logger.info("=== UPLOAD ROUTE HIT ===")
    logger.info(f"Uploading file: {file.filename}")
    logger.info(f"Cloudinary check -> name={bool(CLOUDINARY_CLOUD_NAME)}, key={bool(CLOUDINARY_API_KEY)}, secret={bool(CLOUDINARY_API_SECRET)}")
    if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
        try:
            result = await asyncio.to_thread(cloudinary.uploader.upload, content, public_id=f"chytare/{file_id}", resource_type=resource_type, folder="chytare", overwrite=True)
            return {"id": file_id, "filename": file.filename, "url": result["secure_url"], "type": resource_type, "public_id": result["public_id"]}
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            raise HTTPException(status_code=500, detail="Media upload failed")
    else:
        upload_dir = ROOT_DIR / "uploads"
        upload_dir.mkdir(exist_ok=True)
        file_path = upload_dir / f"{file_id}.{file_ext}"
        with open(file_path, "wb") as f:
            f.write(content)
        return {"id": file_id, "filename": file.filename, "url": f"/api/uploads/{file_id}.{file_ext}", "type": resource_type}

from fastapi.responses import FileResponse

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    file_path = ROOT_DIR / "uploads" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# ======================= INIT DEFAULT DATA =======================

@api_router.post("/init-defaults")
async def init_defaults():
    existing = await db.settings.find_one({"id": "initialized"}, {"_id": 0})
    if existing:
        return {"message": "Already initialized"}
    default_categories = [
        {"name": "Atelier Variations", "slug": "atelier-variations", "type": "design_category", "collection_type": "sarees", "order": 0},
        {"name": "Legacy Threads", "slug": "legacy-threads", "type": "design_category", "collection_type": "sarees", "order": 1},
        {"name": "Blossom Chronicles", "slug": "blossom-chronicles", "type": "design_category", "collection_type": "sarees", "order": 2},
        {"name": "Marine Muses", "slug": "marine-muses", "type": "design_category", "collection_type": "sarees", "order": 3},
        {"name": "Folk Tales in Thread", "slug": "folk-tales-in-thread", "type": "design_category", "collection_type": "sarees", "order": 4},
        {"name": "Feathered Whispers", "slug": "feathered-whispers", "type": "design_category", "collection_type": "sarees", "order": 5},
        {"name": "Streets of Reverie", "slug": "streets-of-reverie", "type": "design_category", "collection_type": "sarees", "order": 6},
        {"name": "Impressions Unbound", "slug": "impressions-unbound", "type": "design_category", "collection_type": "sarees", "order": 7},
    ]
    default_materials = [
        {"name": "Cotton", "slug": "cotton", "type": "material", "collection_type": "sarees", "order": 0},
        {"name": "Cotton Tussar", "slug": "cotton-tussar", "type": "material", "collection_type": "sarees", "order": 1},
        {"name": "Silk", "slug": "silk", "type": "material", "collection_type": "sarees", "order": 2},
        {"name": "Crepe", "slug": "crepe", "type": "material", "collection_type": "sarees", "order": 3},
        {"name": "Satin", "slug": "satin", "type": "material", "collection_type": "sarees", "order": 4},
    ]
    default_works = [
        {"name": "Embroidery", "slug": "embroidery", "type": "work", "collection_type": "sarees", "order": 0},
        {"name": "Block Print", "slug": "block-print", "type": "work", "collection_type": "sarees", "order": 1},
        {"name": "Digital Print", "slug": "digital-print", "type": "work", "collection_type": "sarees", "order": 2},
        {"name": "Handloom", "slug": "handloom", "type": "work", "collection_type": "sarees", "order": 3},
    ]
    for cat in default_categories + default_materials + default_works:
        category = Category(**cat)
        cat_dict = category.model_dump()
        cat_dict["created_at"] = cat_dict["created_at"].isoformat()
        await db.categories.insert_one(cat_dict)
    home_settings = HomePageSettings()
    await db.settings.insert_one(home_settings.model_dump())
    site_settings = SiteSettings()
    await db.settings.insert_one(site_settings.model_dump())
    await db.settings.insert_one({"id": "initialized", "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"message": "Default data initialized successfully"}

# ======================= RBAC ROUTES =======================

@api_router.post("/admin/init-roles")
async def init_system_roles(user: dict = Depends(require_admin)):
    created = []
    for role_name, perms in DEFAULT_PERMISSIONS.items():
        existing = await db.roles.find_one({"name": role_name}, {"_id": 0})
        if not existing:
            labels = {"super_admin": "Super Admin", "admin": "Operations Admin", "viewer": "Viewer"}
            role = {
                "id": str(uuid.uuid4()),
                "name": role_name,
                "label": labels.get(role_name, role_name.replace("_", " ").title()),
                "is_system_role": True,
                "permissions": perms,
                "created_by": user.get("id"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.roles.insert_one(role)
            created.append(role_name)
    return {"message": "System roles ready", "created": created}

@api_router.get("/admin/roles")
async def list_roles(user: dict = Depends(require_editor_or_admin)):
    roles = await db.roles.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return roles

@api_router.get("/admin/roles/{role_id}")
async def get_role(role_id: str, user: dict = Depends(require_editor_or_admin)):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role

@api_router.post("/admin/roles")
async def create_role(data: RoleCreate, user: dict = Depends(require_admin)):
    existing = await db.roles.find_one({"name": data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    role = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "label": data.label,
        "is_system_role": False,
        "permissions": data.permissions,
        "created_by": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.roles.insert_one(role)
    role.pop("_id", None)
    await log_activity(user, "role.created", "role", role["id"], {"name": data.name})
    return role

@api_router.put("/admin/roles/{role_id}")
async def update_role(role_id: str, data: RoleCreate, user: dict = Depends(require_admin)):
    existing = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    update = {"label": data.label, "permissions": data.permissions, "updated_at": datetime.now(timezone.utc).isoformat()}
    if not existing.get("is_system_role"):
        update["name"] = data.name
    await db.roles.update_one({"id": role_id}, {"$set": update})
    await log_activity(user, "role.updated", "role", role_id, {"label": data.label})
    return {"message": "Role updated successfully"}

@api_router.post("/admin/roles/{role_id}/duplicate")
async def duplicate_role(role_id: str, user: dict = Depends(require_admin)):
    source = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Role not found")
    new_role = {**source, "id": str(uuid.uuid4()), "name": f"{source['name']}_copy_{str(uuid.uuid4())[:4]}", "label": f"{source['label']} (Copy)", "is_system_role": False, "created_by": user.get("id"), "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.roles.insert_one(new_role)
    new_role.pop("_id", None)
    await log_activity(user, "role.duplicated", "role", new_role["id"], {"from": role_id})
    return new_role

@api_router.delete("/admin/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(require_admin)):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.get("is_system_role"):
        raise HTTPException(status_code=400, detail="System roles cannot be deleted")
    users_with_role = await db.users.count_documents({"role_id": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"{users_with_role} user(s) are assigned this role. Reassign them first.")
    await db.roles.delete_one({"id": role_id})
    await log_activity(user, "role.deleted", "role", role_id, {"name": role.get("name")})
    return {"message": "Role deleted"}

@api_router.get("/admin/users")
async def list_admin_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "totp_secret": 0, "recovery_codes": 0}).sort("created_at", -1).to_list(1000)
    role_ids = list({u.get("role_id") for u in users if u.get("role_id")})
    roles = await db.roles.find({"id": {"$in": role_ids}}, {"_id": 0}).to_list(100)
    roles_map = {r["id"]: r for r in roles}
    for u in users:
        u["role_info"] = roles_map.get(u.get("role_id"), None)
    return users

@api_router.get("/admin/users/{user_id}")
async def get_admin_user(user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "totp_secret": 0, "recovery_codes": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role_id"):
        role = await db.roles.find_one({"id": target["role_id"]}, {"_id": 0})
        target["role_info"] = role
    return target

@api_router.post("/admin/users")
async def create_admin_user(data: AdminUserCreate, user: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = await db.roles.find_one({"id": data.role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")
    raw_password = data.password or str(uuid.uuid4())[:12]
    new_user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "name": data.full_name,
        "full_name": data.full_name,
        "phone": data.phone,
        "role": role.get("name", "editor"),
        "role_id": data.role_id,
        "account_status": data.account_status,
        "password_hash": hash_password(raw_password),
        "must_change_password": True,
        "totp_enabled": False,
        "created_by": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    new_user.pop("_id", None)
    new_user.pop("password_hash", None)
    await log_activity(user, "user.created", "user", new_user["id"], {"email": data.email, "role": role.get("name")})
    return {**new_user, "temp_password": raw_password}

@api_router.put("/admin/users/{user_id}")
async def update_admin_user(user_id: str, data: AdminUserUpdate, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.full_name:
        update["name"] = data.full_name
        update["full_name"] = data.full_name
    if data.phone is not None:
        update["phone"] = data.phone
    if data.role_id:
        role = await db.roles.find_one({"id": data.role_id}, {"_id": 0})
        if not role:
            raise HTTPException(status_code=400, detail="Role not found")
        update["role_id"] = data.role_id
        update["role"] = role.get("name", "editor")
    if data.account_status:
        update["account_status"] = data.account_status
    if data.custom_perms is not None:
        update["custom_perms"] = data.custom_perms
    await db.users.update_one({"id": user_id}, {"$set": update})
    await log_activity(user, "user.updated", "user", user_id, {"changes": list(update.keys())})
    return {"message": "User updated successfully"}

@api_router.post("/admin/users/{user_id}/disable")
async def disable_user(user_id: str, user: dict = Depends(require_admin)):
    if user_id == user.get("id"):
        raise HTTPException(status_code=400, detail="You cannot disable your own account")
    result = await db.users.update_one({"id": user_id}, {"$set": {"account_status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_activity(user, "user.disabled", "user", user_id)
    return {"message": "User disabled"}

@api_router.post("/admin/users/{user_id}/enable")
async def enable_user(user_id: str, user: dict = Depends(require_admin)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"account_status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_activity(user, "user.enabled", "user", user_id)
    return {"message": "User enabled"}

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    new_password = str(uuid.uuid4())[:12]
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": hash_password(new_password), "must_change_password": True, "updated_at": datetime.now(timezone.utc).isoformat()}})
    await log_activity(user, "user.password_reset", "user", user_id)
    return {"message": "Password reset", "temp_password": new_password}

@api_router.get("/admin/my-permissions")
async def get_my_permissions(user: dict = Depends(get_current_user)):
    perms = await get_user_permissions(user)
    role = await db.roles.find_one({"id": user.get("role_id")}, {"_id": 0, "name": 1, "label": 1})
    return {"user_id": user.get("id"), "role": role, "permissions": perms}

@api_router.get("/admin/activity-logs")
async def get_activity_logs(
    user: dict = Depends(require_editor_or_admin),
    limit: int = 100,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
):
    query: dict = {}
    if user_id: query["user_id"] = user_id
    if action: query["action"] = {"$regex": action, "$options": "i"}
    # Documents are stored with target_type / target_id — support both field names
    if entity_type: query["$or"] = [{"target_type": entity_type}, {"entity_type": entity_type}]
    if entity_id:
        id_clause = [{"target_id": entity_id}, {"entity_id": entity_id}]
        if "$or" in query:
            query = {"$and": [{"$or": query["$or"]}, {"$or": id_clause}]}
            if user_id: query["user_id"] = user_id
            if action: query["action"] = {"$regex": action, "$options": "i"}
        else:
            query["$or"] = id_clause
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

# ======================= ROOT ROUTES =======================

@api_router.get("/")
async def root():
    return {"message": "Chytare API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# =====================================================================
# SUPPLIER MANAGEMENT MODULE
# =====================================================================

SUPPLIER_TYPES = [
    "Fabric Supplier", "Trim Supplier", "Packaging Vendor",
    "Embroiderer", "Weaver", "Block Printer", "Hand Painter",
    "Tailor", "Dyer", "Finisher", "Artisan Cluster",
    "Production Workshop", "Dyeing / Finishing Unit", "Other",
]

PAYMENT_TERMS_OPTIONS = [
    "Advance", "50% Advance / 50% on Delivery",
    "Net 15", "Net 30", "Net 45", "Net 60", "On Delivery",
]

class SupplierCreate(BaseModel):
    supplier_name: str
    supplier_type: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    gst_number: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None

class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = None
    supplier_type: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    gst_number: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None

async def generate_supplier_code() -> str:
    all_codes = await db.suppliers.find({}, {"_id": 0, "supplier_code": 1}).to_list(10000)
    nums = []
    for doc in all_codes:
        try:
            nums.append(int(doc["supplier_code"].split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"SUP-{str(next_num).zfill(3)}"

@api_router.get("/admin/suppliers/meta")
async def get_supplier_meta(user: dict = Depends(require_editor_or_admin)):
    return {"supplier_types": SUPPLIER_TYPES, "payment_terms": PAYMENT_TERMS_OPTIONS}

@api_router.get("/admin/suppliers")
async def list_suppliers(
    user: dict = Depends(require_editor_or_admin),
    supplier_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
):
    query = {}
    if supplier_type: query["supplier_type"] = supplier_type
    if status: query["status"] = status
    if search:
        query["$or"] = [
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"supplier_code": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
        ]
    suppliers = await db.suppliers.find(query, {"_id": 0}).sort("supplier_code", 1).limit(limit).to_list(limit)
    return suppliers

@api_router.get("/admin/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str, user: dict = Depends(require_editor_or_admin)):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@api_router.post("/admin/suppliers")
async def create_supplier(data: SupplierCreate, user: dict = Depends(require_editor_or_admin)):
    if data.supplier_type not in SUPPLIER_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid supplier type.")
    supplier_code = await generate_supplier_code()
    now = datetime.now(timezone.utc).isoformat()
    supplier = {
        "id": str(uuid.uuid4()), "supplier_code": supplier_code,
        "supplier_name": data.supplier_name, "supplier_type": data.supplier_type,
        "contact_person": data.contact_person, "phone": data.phone,
        "alternate_phone": data.alternate_phone, "email": data.email,
        "address_line_1": data.address_line_1, "address_line_2": data.address_line_2,
        "city": data.city, "state": data.state, "country": data.country or "India",
        "gst_number": data.gst_number, "payment_terms": data.payment_terms,
        "lead_time_days": data.lead_time_days, "notes": data.notes,
        "status": "active", "created_by": user.get("id"),
        "created_by_name": user.get("name"), "updated_by": user.get("id"),
        "updated_by_name": user.get("name"), "created_at": now, "updated_at": now,
    }
    await db.suppliers.insert_one(supplier)
    supplier.pop("_id", None)
    await log_activity(user, "supplier.created", "supplier", supplier["id"], {"name": data.supplier_name, "code": supplier_code})
    return supplier

@api_router.put("/admin/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, data: SupplierUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if data.supplier_type and data.supplier_type not in SUPPLIER_TYPES:
        raise HTTPException(status_code=400, detail="Invalid supplier type")
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}
    for field in ["supplier_name", "supplier_type", "contact_person", "phone", "alternate_phone",
                  "email", "address_line_1", "address_line_2", "city", "state", "country",
                  "gst_number", "payment_terms", "lead_time_days", "notes", "status"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    await db.suppliers.update_one({"id": supplier_id}, {"$set": update})
    await log_activity(user, "supplier.updated", "supplier", supplier_id, {"changes": list(update.keys())})
    return {"message": "Supplier updated successfully"}

@api_router.post("/admin/suppliers/{supplier_id}/deactivate")
async def deactivate_supplier(supplier_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.suppliers.update_one({"id": supplier_id}, {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    await log_activity(user, "supplier.deactivated", "supplier", supplier_id)
    return {"message": "Supplier deactivated"}

@api_router.post("/admin/suppliers/{supplier_id}/reactivate")
async def reactivate_supplier(supplier_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.suppliers.update_one({"id": supplier_id}, {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    await log_activity(user, "supplier.reactivated", "supplier", supplier_id)
    return {"message": "Supplier reactivated"}

# =====================================================================
# MATERIALS MASTER MODULE
# =====================================================================

MATERIAL_TYPES = ["fabric", "thread", "trim", "accessory", "packaging", "dye", "other"]
UNITS_OF_MEASURE = ["metre", "yard", "piece", "gram", "kilogram", "spool", "unit"]
STORAGE_LOCATIONS = ["Studio", "Warehouse 1", "Warehouse 2", "Storage Room", "Off-site", "With Supplier", "Other"]
FABRIC_TYPES = ["Tussar Silk", "Mulberry Silk", "Cotton", "Cotton Tussar", "Linen", "Georgette", "Chiffon", "Crepe", "Satin", "Organza", "Velvet", "Chanderi", "Banarasi", "Khadi", "Other"]

class MaterialCreate(BaseModel):
    material_name: str
    material_type: str
    fabric_type: Optional[str] = None
    color: Optional[str] = None
    unit_of_measure: str
    description: Optional[str] = None
    weave_type: Optional[str] = None
    gsm: Optional[float] = None
    origin_region: Optional[str] = None
    composition: Optional[str] = None
    swatch_url: Optional[str] = None
    current_stock_qty: Optional[float] = None
    storage_location: Optional[str] = None
    supplier_id: Optional[str] = None
    fabric_count: Optional[str] = None

class MaterialUpdate(BaseModel):
    material_name: Optional[str] = None
    material_type: Optional[str] = None
    fabric_type: Optional[str] = None
    color: Optional[str] = None
    unit_of_measure: Optional[str] = None
    description: Optional[str] = None
    weave_type: Optional[str] = None
    gsm: Optional[float] = None
    origin_region: Optional[str] = None
    composition: Optional[str] = None
    status: Optional[str] = None
    swatch_url: Optional[str] = None
    current_stock_qty: Optional[float] = None
    storage_location: Optional[str] = None
    supplier_id: Optional[str] = None
    fabric_count: Optional[str] = None

async def generate_material_code() -> str:
    all_codes = await db.materials.find({}, {"_id": 0, "material_code": 1}).to_list(10000)
    nums = []
    for doc in all_codes:
        code = doc.get("material_code", "")
        try:
            nums.append(int(code.split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"MAT-{str(next_num).zfill(3)}"

@api_router.get("/admin/materials/meta")
async def get_material_meta(user: dict = Depends(require_editor_or_admin)):
    suppliers = await db.suppliers.find({"status": "active"}, {"_id": 0, "id": 1, "supplier_code": 1, "supplier_name": 1}).sort("supplier_name", 1).to_list(500)
    return {"material_types": MATERIAL_TYPES, "units_of_measure": UNITS_OF_MEASURE, "fabric_types": FABRIC_TYPES, "storage_locations": STORAGE_LOCATIONS, "suppliers": suppliers}

@api_router.get("/admin/materials")
async def list_materials(
    user: dict = Depends(require_editor_or_admin),
    material_type: Optional[str] = None,
    fabric_type: Optional[str] = None,
    color: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if material_type: query["material_type"] = material_type
    if fabric_type: query["fabric_type"] = fabric_type
    if color: query["color"] = {"$regex": color, "$options": "i"}
    if status: query["status"] = status
    if search:
        query["$or"] = [
            {"material_name": {"$regex": search, "$options": "i"}},
            {"material_code": {"$regex": search, "$options": "i"}},
        ]
    materials = await db.materials.find(query, {"_id": 0}).sort("material_code", 1).limit(limit).to_list(limit)
    return materials

@api_router.get("/admin/materials/{material_id}")
async def get_material(material_id: str, user: dict = Depends(require_editor_or_admin)):
    material = await db.materials.find_one({"id": material_id}, {"_id": 0})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    material["_linked"] = {
        "purchase_count": await db.material_purchases.count_documents({"material_id": material_id}) if "material_purchases" in await db.list_collection_names() else 0,
        "allocation_count": 0,
    }
    return material

@api_router.post("/admin/materials")
async def create_material(data: MaterialCreate, user: dict = Depends(require_editor_or_admin)):
    if data.material_type not in MATERIAL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid material_type.")
    if data.unit_of_measure not in UNITS_OF_MEASURE:
        raise HTTPException(status_code=400, detail=f"Invalid unit_of_measure.")
    if data.fabric_type and data.fabric_type not in FABRIC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid fabric_type.")
    fabric_type = data.fabric_type if data.material_type == "fabric" else None
    weave_type = data.weave_type if data.material_type == "fabric" else None
    gsm = data.gsm if data.material_type == "fabric" else None
    origin_region = data.origin_region if data.material_type == "fabric" else None
    composition = data.composition if data.material_type == "fabric" else None
    material_code = await generate_material_code()
    material = {
        "id": str(uuid.uuid4()), "material_code": material_code,
        "material_name": data.material_name, "material_type": data.material_type,
        "fabric_type": fabric_type, "color": data.color, "unit_of_measure": data.unit_of_measure,
        "description": data.description, "weave_type": weave_type, "gsm": gsm,
        "origin_region": origin_region, "composition": composition, "swatch_url": data.swatch_url,
        "current_stock_qty": data.current_stock_qty or 0, "storage_location": data.storage_location,
        "supplier_id": data.supplier_id,
        "fabric_count": data.fabric_count if data.material_type == "fabric" else None,
        "status": "active", "created_by": user.get("id"), "created_by_name": user.get("name"),
        "updated_by": user.get("id"), "updated_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.materials.insert_one(material)
    material.pop("_id", None)
    await log_activity(user, "material.created", "material", material["id"], {"name": data.material_name, "code": material_code, "type": data.material_type})
    return material

@api_router.put("/admin/materials/{material_id}")
async def update_material(material_id: str, data: MaterialUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.materials.find_one({"id": material_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    if data.material_type and data.material_type not in MATERIAL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid material_type.")
    if data.unit_of_measure and data.unit_of_measure not in UNITS_OF_MEASURE:
        raise HTTPException(status_code=400, detail=f"Invalid unit_of_measure.")
    if data.fabric_type and data.fabric_type not in FABRIC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid fabric_type.")
    update = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id"), "updated_by_name": user.get("name")}
    for field in ["material_name", "material_type", "fabric_type", "color", "unit_of_measure",
                  "description", "weave_type", "gsm", "origin_region", "composition", "status",
                  "swatch_url", "current_stock_qty", "storage_location", "supplier_id", "fabric_count"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    new_type = data.material_type or existing.get("material_type")
    if new_type != "fabric":
        update["fabric_type"] = None
        update["weave_type"] = None
        update["gsm"] = None
        update["origin_region"] = None
        update["composition"] = None
    await db.materials.update_one({"id": material_id}, {"$set": update})
    await log_activity(user, "material.updated", "material", material_id, {"changes": list(update.keys())})
    return {"message": "Material updated successfully"}

@api_router.post("/admin/materials/{material_id}/deactivate")
async def deactivate_material(material_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.materials.update_one({"id": material_id}, {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    await log_activity(user, "material.deactivated", "material", material_id)
    return {"message": "Material deactivated"}

@api_router.post("/admin/materials/{material_id}/reactivate")
async def reactivate_material(material_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.materials.update_one({"id": material_id}, {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    await log_activity(user, "material.reactivated", "material", material_id)
    return {"message": "Material reactivated"}

# =====================================================================
# MATERIAL PURCHASES MODULE
# =====================================================================

PAYMENT_TYPES = ["cash", "bill"]
PURCHASE_STATUSES = ["received", "partial", "allocated"]

class MaterialPurchaseCreate(BaseModel):
    material_id: str
    supplier_id: Optional[str] = None
    quantity_received: float
    unit_price: Optional[float] = None
    total_cost: Optional[float] = None
    purchase_date: str
    payment_type: str = "cash"
    invoice_number: Optional[str] = None
    invoice_url: Optional[str] = None
    notes: Optional[str] = None

class MaterialPurchaseUpdate(BaseModel):
    supplier_id: Optional[str] = None
    quantity_received: Optional[float] = None
    unit_price: Optional[float] = None
    total_cost: Optional[float] = None
    purchase_date: Optional[str] = None
    payment_type: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_url: Optional[str] = None
    notes: Optional[str] = None

async def generate_purchase_code() -> str:
    all_codes = await db.material_purchases.find({}, {"_id": 0, "purchase_code": 1}).to_list(10000)
    nums = []
    for doc in all_codes:
        try:
            nums.append(int(doc["purchase_code"].split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"PUR-{str(next_num).zfill(3)}"

@api_router.get("/admin/material-purchases/meta")
async def get_material_purchase_meta(user: dict = Depends(require_editor_or_admin)):
    suppliers = await db.suppliers.find({"status": "active"}, {"_id": 0, "id": 1, "supplier_code": 1, "supplier_name": 1}).sort("supplier_name", 1).to_list(500)
    return {"payment_types": PAYMENT_TYPES, "statuses": PURCHASE_STATUSES, "suppliers": suppliers}

@api_router.get("/admin/material-purchases")
async def list_material_purchases(
    user: dict = Depends(require_editor_or_admin),
    material_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if material_id: query["material_id"] = material_id
    if supplier_id: query["supplier_id"] = supplier_id
    if status: query["status"] = status
    purchases = await db.material_purchases.find(query, {"_id": 0}).sort("purchase_date", -1).limit(limit).to_list(limit)
    return purchases

@api_router.get("/admin/material-purchases/{purchase_id}")
async def get_material_purchase(purchase_id: str, user: dict = Depends(require_editor_or_admin)):
    purchase = await db.material_purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@api_router.post("/admin/material-purchases")
async def create_material_purchase(data: MaterialPurchaseCreate, user: dict = Depends(require_editor_or_admin)):
    material = await db.materials.find_one({"id": data.material_id}, {"_id": 0})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if material.get("status") == "inactive":
        raise HTTPException(status_code=400, detail="Cannot record a purchase for an inactive material")
    supplier_name = None
    supplier_code = None
    if data.supplier_id:
        supplier = await db.suppliers.find_one({"id": data.supplier_id}, {"_id": 0})
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        supplier_name = supplier.get("supplier_name")
        supplier_code = supplier.get("supplier_code")
    if data.quantity_received <= 0:
        raise HTTPException(status_code=400, detail="quantity_received must be greater than 0")
    if data.payment_type not in PAYMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"payment_type must be one of: {', '.join(PAYMENT_TYPES)}")
    unit_price = data.unit_price
    total_cost = data.total_cost
    if unit_price and not total_cost:
        total_cost = round(unit_price * data.quantity_received, 2)
    elif total_cost and not unit_price:
        unit_price = round(total_cost / data.quantity_received, 4)
    purchase_code = await generate_purchase_code()
    now = datetime.now(timezone.utc).isoformat()
    purchase_id = str(uuid.uuid4())
    purchase = {
        "id": purchase_id, "purchase_code": purchase_code,
        "material_id": data.material_id, "material_name": material.get("material_name"),
        "material_code": material.get("material_code"), "unit_of_measure": material.get("unit_of_measure"),
        "supplier_id": data.supplier_id, "supplier_name": supplier_name, "supplier_code": supplier_code,
        "quantity_received": data.quantity_received, "quantity_available": data.quantity_received,
        "unit_price": unit_price, "total_cost": total_cost,
        "purchase_date": data.purchase_date, "payment_type": data.payment_type,
        "invoice_number": data.invoice_number, "invoice_url": data.invoice_url,
        "notes": data.notes, "status": "received",
        "created_by": user.get("id"), "created_by_name": user.get("name"),
        "updated_by": user.get("id"), "updated_by_name": user.get("name"),
        "created_at": now, "updated_at": now,
    }
    await db.material_purchases.insert_one(purchase)
    purchase.pop("_id", None)
    new_stock = (material.get("current_stock_qty") or 0) + data.quantity_received
    await db.materials.update_one({"id": data.material_id}, {"$set": {"current_stock_qty": new_stock, "updated_at": now}})
    movement = {
        "id": str(uuid.uuid4()), "material_id": data.material_id,
        "material_purchase_id": purchase_id, "product_id": None,
        "entity_type": "material", "movement_type": "purchase_received",
        "quantity": data.quantity_received, "reference_type": "material_purchase",
        "reference_id": purchase_id, "location": material.get("storage_location"),
        "created_by": user.get("id"), "created_by_name": user.get("name"), "created_at": now,
    }
    await db.inventory_movements.insert_one(movement)
    await log_activity(user, "material_purchase.created", "material_purchase", purchase_id, {
        "code": purchase_code, "material": material.get("material_name"),
        "quantity": data.quantity_received, "total_cost": total_cost,
    })
    return purchase

@api_router.put("/admin/material-purchases/{purchase_id}")
async def update_material_purchase(purchase_id: str, data: MaterialPurchaseUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.material_purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if data.payment_type and data.payment_type not in PAYMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid payment_type")
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}
    for field in ["supplier_id", "quantity_received", "unit_price", "total_cost",
                  "purchase_date", "payment_type", "invoice_number", "invoice_url", "notes"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    if data.supplier_id:
        supplier = await db.suppliers.find_one({"id": data.supplier_id}, {"_id": 0})
        if supplier:
            update["supplier_name"] = supplier.get("supplier_name")
            update["supplier_code"] = supplier.get("supplier_code")
    await db.material_purchases.update_one({"id": purchase_id}, {"$set": update})
    await log_activity(user, "material_purchase.updated", "material_purchase", purchase_id)
    return {"message": "Purchase updated"}

# =====================================================================
# PRODUCT MASTER MODULE
# =====================================================================

PRODUCT_CATEGORIES = ["saree", "scarf", "dress", "jacket", "blouse", "accessory", "jewelry"]
CATEGORY_CODES = {"saree": "SAR", "scarf": "SCF", "dress": "DRS", "jacket": "JKT", "blouse": "BLO", "accessory": "ACC", "jewelry": "JWL"}
PRICING_MODES = ["direct_purchase", "price_on_request"]
PRODUCT_STATUSES = ["draft", "active", "archived"]

class ProductAttributesCreate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    fabric_type: Optional[str] = None
    craft_technique: Optional[str] = None
    motif_type: Optional[str] = None
    motif_subject: Optional[str] = None
    embroidery_type: Optional[str] = None
    embroidery_density: Optional[str] = None
    border_type: Optional[str] = None
    pattern_scale: Optional[str] = None
    art_inspiration: Optional[str] = None
    aesthetic_category: Optional[str] = None
    # Design AI data — capture now, use later
    occasion: Optional[str] = None        # wedding / festive / casual / office / gifting / everyday
    season: Optional[str] = None          # summer / winter / festive / all-season
    customer_age_range: Optional[str] = None  # 20s / 30s / 40s / 50+
    how_sold: Optional[str] = None        # online / showroom / offline / gifted
    style_region: Optional[str] = None    # Banarasi / Kantha / Kanjeevaram / Kashmiri / Rajasthani / South Indian / Contemporary / Fusion / Other
    buyer_geography: Optional[str] = None # metro India / tier-2 India / international
    formality: Optional[str] = None       # bridal / ceremonial / festive / semi-formal / casual

PRODUCT_TYPES = ["woven", "stitched", "accessory"]
GST_RATES = [5.0, 12.0, 18.0]

# HSN auto-mapping table — extend here as needed
HSN_MAPPING = {
    ("saree", "silk"):   "5007",
    ("saree", "cotton"): "5208",
    ("saree", "tussar"): "5007",
    ("saree", "cotton tussar"): "5208",
    ("saree", "linen"):  "5309",
    ("saree", "georgette"): "5407",
    ("saree", "crepe"):  "5407",
    ("saree", "chiffon"): "5407",
    ("saree", "satin"):  "5007",
    ("scarf", None):     "6214",
    ("blouse", None):    "6206",
    ("dress", None):     "6204",
    ("jacket", None):    "6201",
    ("accessory", None): "6217",
    ("jewelry", None):   "7117",
}

def get_hsn_code(category: str, material: str = None) -> Optional[str]:
    cat = (category or "").lower().strip()
    mat = (material or "").lower().strip() if material else None
    if mat:
        key = (cat, mat)
        if key in HSN_MAPPING:
            return HSN_MAPPING[key]
    return HSN_MAPPING.get((cat, None))

def generate_sku(category: str, material: str, product_code: str, design_code: str = None) -> str:
    cat_part = (category or "")[:3].upper()
    mat_part = "".join((material or "")[:3].upper().split())
    seq = product_code.split("-")[-1] if product_code else "000"
    des_part = (design_code or "GEN")[:3].upper()
    return f"{cat_part}-{mat_part}-{des_part}-{seq}"

# Internal-only fields — never returned to the public frontend
INTERNAL_FIELDS = {"cost_price", "hsn_code", "gst_rate", "selling_price", "sku",
                   "product_type", "composition_pct", "hide_price", "social_content",
                   "ai_field_meta"}

def strip_internal_fields(product: dict) -> dict:
    """Strip fields that must never reach the public API.

    Two-layer edition protection:
      • Internal commerce/compliance fields are always removed (INTERNAL_FIELDS).
      • When display_edition is False, edition text and edition_size are also
        removed so the public response contains no edition data at all, regardless
        of what the frontend does.  display_edition itself is kept so the frontend
        can still use it as a gating flag if present.
    """
    result = {k: v for k, v in product.items() if k not in INTERNAL_FIELDS}
    if not result.get("display_edition", True):
        result.pop("edition", None)
        result.pop("edition_size", None)
    return result

class ProductMasterCreate(BaseModel):
    product_name: str
    category: str
    subcategory: Optional[str] = None
    collection_name: Optional[str] = None
    drop_name: Optional[str] = None
    pricing_mode: str
    price: Optional[float] = None
    currency: str = "INR"
    edition_size: Optional[int] = None
    release_date: Optional[str] = None
    description: Optional[str] = None
    website_product_id: Optional[str] = None
    listing_status: Optional[str] = None   # backend_only / website_linked / website_listed
    attributes: Optional[ProductAttributesCreate] = None
    # ── Commerce & Compliance ──────────────────────────
    product_type: Optional[str] = None           # woven / stitched / accessory
    composition_pct: Optional[str] = None        # e.g. "100% Silk"
    hsn_code: Optional[str] = None               # auto-filled or manual override
    gst_rate: Optional[float] = None             # 5 / 12 / 18
    cost_price: Optional[float] = None           # internal cost — never public
    selling_price: Optional[float] = None        # master selling price
    hide_price: bool = False                     # True → show "Price on Request" on site
    display_edition: bool = True                 # False → hide edition on site
    sku: Optional[str] = None                    # auto-generated if blank
    production_job_id: Optional[str] = None      # required after 1 Oct 2026 (unless super_admin)

class ProductMasterUpdate(BaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    collection_name: Optional[str] = None
    drop_name: Optional[str] = None
    pricing_mode: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    edition_size: Optional[int] = None
    release_date: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    website_product_id: Optional[str] = None
    listing_status: Optional[str] = None
    attributes: Optional[ProductAttributesCreate] = None
    # ── Commerce & Compliance ──────────────────────────
    product_type: Optional[str] = None
    composition_pct: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    hide_price: Optional[bool] = None
    display_edition: Optional[bool] = None
    sku: Optional[str] = None

async def generate_product_code(category: str) -> str:
    cat_code = CATEGORY_CODES.get(category, "PRD")
    prefix = f"CH-{cat_code}-"
    all_in_cat = await db.product_master.find({"product_code": {"$regex": f"^{prefix}"}}, {"_id": 0, "product_code": 1}).to_list(10000)
    nums = []
    for doc in all_in_cat:
        try:
            nums.append(int(doc["product_code"].split("-")[2]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"{prefix}{str(next_num).zfill(3)}"

@api_router.get("/admin/product-master/meta")
async def get_product_master_meta(user: dict = Depends(require_editor_or_admin)):
    return {
        "categories": PRODUCT_CATEGORIES,
        "category_codes": CATEGORY_CODES,
        "pricing_modes": PRICING_MODES,
        "statuses": PRODUCT_STATUSES,
        "design_categories": DESIGN_CATEGORIES if "DESIGN_CATEGORIES" in dir() else [],
        "product_types": PRODUCT_TYPES,
        "gst_rates": GST_RATES,
        "hsn_mapping": {f"{k[0]}|{k[1] or ''}": v for k, v in HSN_MAPPING.items()},
    }

@api_router.get("/admin/product-master")
async def list_product_master(
    user: dict = Depends(require_editor_or_admin),
    category: Optional[str] = None,
    collection_name: Optional[str] = None,
    drop_name: Optional[str] = None,
    pricing_mode: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if category: query["category"] = category
    if collection_name: query["collection_name"] = {"$regex": collection_name, "$options": "i"}
    if drop_name: query["drop_name"] = {"$regex": drop_name, "$options": "i"}
    if pricing_mode: query["pricing_mode"] = pricing_mode
    if status: query["status"] = status
    if search:
        query["$or"] = [{"product_name": {"$regex": search, "$options": "i"}}, {"product_code": {"$regex": search, "$options": "i"}}]
    products = await db.product_master.find(query, {"_id": 0}).sort("product_code", 1).limit(limit).to_list(limit)
    return products

@api_router.get("/admin/product-master/{product_id}")
async def get_product_master(product_id: str, user: dict = Depends(require_editor_or_admin)):
    product = await db.product_master.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    attributes = await db.product_attributes.find_one({"product_id": product_id}, {"_id": 0})
    product["attributes"] = attributes or {}
    product["_linked"] = {
        "production_jobs": await db.production_jobs.count_documents({"product_id": product_id}),
        "inventory_units": (await db.inventory.find_one(
            {"product_id": product_id, "entity_type": "finished_good"}, {"_id": 0}
        ) or {}).get("quantity", 0),
        "enquiries": await db.enquiries.count_documents({"product_id": product_id}),
        "orders": await db.orders.count_documents({"product_id": product_id}),
    }
    return product

@api_router.post("/admin/product-master")
async def create_product_master(data: ProductMasterCreate, user: dict = Depends(require_editor_or_admin)):
    if data.category not in PRODUCT_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category.")
    if data.pricing_mode not in PRICING_MODES:
        raise HTTPException(status_code=400, detail=f"Invalid pricing_mode.")
    if data.pricing_mode == "direct_purchase" and not data.price and not data.selling_price:
        raise HTTPException(status_code=400, detail="Price is required for direct_purchase products")
    if data.edition_size is not None and data.edition_size <= 0:
        raise HTTPException(status_code=400, detail="edition_size must be greater than 0")
    if data.product_type and data.product_type not in PRODUCT_TYPES:
        raise HTTPException(status_code=400, detail=f"product_type must be one of: {', '.join(PRODUCT_TYPES)}")
    if data.gst_rate is not None and data.gst_rate not in GST_RATES:
        raise HTTPException(status_code=400, detail=f"gst_rate must be one of: {GST_RATES}")
    # Production flow gate — direct upload allowed until 1 Oct 2026
    FLOW_GATE = datetime(2026, 10, 1, tzinfo=timezone.utc)
    if datetime.now(timezone.utc) >= FLOW_GATE and user.get("role") != "super_admin":
        if not data.production_job_id:
            raise HTTPException(status_code=400, detail="Direct product upload closed 1 Oct 2026. All products must come from a production job. Contact super admin to bypass.")
        job_check = await db.production_jobs.find_one({"id": data.production_job_id}, {"_id": 0, "id": 1})
        if not job_check:
            raise HTTPException(status_code=400, detail="Production job not found.")
    # Auto-derive material from attributes if provided
    material_hint = data.attributes.fabric_type if data.attributes else None
    # Auto-fill HSN if not manually set
    hsn = data.hsn_code or get_hsn_code(data.category, material_hint)
    product_code = await generate_product_code(data.category)
    # Auto-generate SKU if not provided
    design_code = (data.collection_name or data.drop_name or "GEN")[:3]
    sku = data.sku or generate_sku(data.category, material_hint or "GEN", product_code, design_code)
    # selling_price wins over price if both set
    effective_price = data.selling_price or data.price
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    product = {
        "id": product_id, "product_code": product_code, "product_name": data.product_name,
        "category": data.category, "subcategory": data.subcategory,
        "collection_name": data.collection_name, "drop_name": data.drop_name,
        "pricing_mode": data.pricing_mode, "price": effective_price, "currency": data.currency,
        "edition_size": data.edition_size, "release_date": data.release_date,
        "description": data.description, "website_product_id": data.website_product_id,
        "listing_status": data.listing_status or "backend_only",
        # Commerce & Compliance
        "product_type": data.product_type, "composition_pct": data.composition_pct,
        "hsn_code": hsn, "gst_rate": data.gst_rate,
        "cost_price": data.cost_price, "selling_price": data.selling_price,
        "hide_price": data.hide_price, "display_edition": data.display_edition, "sku": sku,
        "production_job_id": data.production_job_id,
        "status": "draft", "created_by": user.get("id"), "created_by_name": user.get("name"),
        "updated_by": user.get("id"), "updated_by_name": user.get("name"),
        "created_at": now, "updated_at": now,
    }
    await db.product_master.insert_one(product)
    product.pop("_id", None)
    if data.attributes:
        attrs = data.attributes.model_dump()
        attrs["id"] = str(uuid.uuid4())
        attrs["product_id"] = product_id
        attrs["created_at"] = now
        attrs["updated_at"] = now
        await db.product_attributes.insert_one(attrs)
    # Sync display flags to linked website product
    if data.website_product_id:
        wp_update = {"display_edition": data.display_edition, "updated_at": now}
        if data.hide_price:
            wp_update["pricing_mode"] = "price_on_request"
            wp_update["price_on_request"] = True
        elif data.selling_price:
            wp_update["price"] = data.selling_price
            wp_update["pricing_mode"] = "fixed_price"
            wp_update["price_on_request"] = False
        await db.products.update_one({"id": data.website_product_id}, {"$set": wp_update})
    await log_activity(user, "product_master.created", "product_master", product_id, {"name": data.product_name, "code": product_code, "category": data.category, "sku": sku, "hsn": hsn})
    return product

@api_router.put("/admin/product-master/{product_id}")
async def update_product_master(product_id: str, data: ProductMasterUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.product_master.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    if existing.get("status") == "archived":
        raise HTTPException(status_code=400, detail="Archived products cannot be edited.")
    if data.category and data.category not in PRODUCT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    if data.pricing_mode and data.pricing_mode not in PRICING_MODES:
        raise HTTPException(status_code=400, detail="Invalid pricing_mode")
    if data.edition_size is not None and data.edition_size <= 0:
        raise HTTPException(status_code=400, detail="edition_size must be greater than 0")
    if data.product_type and data.product_type not in PRODUCT_TYPES:
        raise HTTPException(status_code=400, detail=f"product_type must be one of: {', '.join(PRODUCT_TYPES)}")
    if data.gst_rate is not None and data.gst_rate not in GST_RATES:
        raise HTTPException(status_code=400, detail=f"gst_rate must be one of: {GST_RATES}")
    # Edition vs stock validation
    effective_edition = data.edition_size if data.edition_size is not None else existing.get("edition_size")
    if effective_edition:
        inv = await db.inventory.find_one({"product_id": product_id, "entity_type": "finished_good"}, {"_id": 0})
        current_stock = inv.get("quantity", 0) if inv else 0
        if current_stock > effective_edition:
            raise HTTPException(
                status_code=400,
                detail=f"Edition size ({effective_edition}) cannot be less than current stock ({current_stock}). Adjust inventory first."
            )
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}
    for field in ["product_name", "category", "subcategory", "collection_name", "drop_name",
                  "pricing_mode", "price", "currency", "edition_size", "release_date",
                  "description", "status", "website_product_id", "listing_status",
                  "product_type", "composition_pct", "hsn_code", "gst_rate",
                  "cost_price", "selling_price", "sku"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    # Booleans need explicit handling (False is valid)
    if data.hide_price is not None:
        update["hide_price"] = data.hide_price
    if data.display_edition is not None:
        update["display_edition"] = data.display_edition
    if data.pricing_mode == "price_on_request":
        update["price"] = data.price
    # Auto-recompute HSN if category or material changed and no manual override
    if (data.category or data.attributes) and not data.hsn_code:
        new_cat = data.category or existing.get("category")
        attrs = await db.product_attributes.find_one({"product_id": product_id}, {"_id": 0})
        material_hint = None
        if data.attributes and data.attributes.fabric_type:
            material_hint = data.attributes.fabric_type
        elif attrs:
            material_hint = attrs.get("fabric_type")
        auto_hsn = get_hsn_code(new_cat, material_hint)
        if auto_hsn and not existing.get("hsn_code"):
            update["hsn_code"] = auto_hsn
    # Regenerate SKU if category or material changed and SKU not manually set
    if (data.category or data.attributes) and not data.sku and not existing.get("sku"):
        new_cat = data.category or existing.get("category", "")
        attrs = await db.product_attributes.find_one({"product_id": product_id}, {"_id": 0})
        material_hint = (data.attributes.fabric_type if data.attributes else None) or (attrs.get("fabric_type") if attrs else "GEN")
        design_code = (data.collection_name or existing.get("collection_name") or data.drop_name or existing.get("drop_name") or "GEN")[:3]
        update["sku"] = generate_sku(new_cat, material_hint, existing.get("product_code", ""), design_code)
    await db.product_master.update_one({"id": product_id}, {"$set": update})
    if data.attributes:
        attrs = data.attributes.model_dump()
        attrs["updated_at"] = now
        existing_attrs = await db.product_attributes.find_one({"product_id": product_id})
        if existing_attrs:
            await db.product_attributes.update_one({"product_id": product_id}, {"$set": attrs})
        else:
            attrs["id"] = str(uuid.uuid4())
            attrs["product_id"] = product_id
            attrs["created_at"] = now
            await db.product_attributes.insert_one(attrs)
    # Sync display-control flags to linked website product
    linked_wp_id = data.website_product_id or existing.get("website_product_id")
    if linked_wp_id:
        wp_update = {"updated_at": now}
        effective_hide = data.hide_price if data.hide_price is not None else existing.get("hide_price", False)
        effective_disp = data.display_edition if data.display_edition is not None else existing.get("display_edition", True)
        effective_price = data.selling_price or existing.get("selling_price") or data.price or existing.get("price")
        wp_update["display_edition"] = effective_disp
        if effective_hide:
            wp_update["pricing_mode"] = "price_on_request"
            wp_update["price_on_request"] = True
        elif effective_price:
            wp_update["price"] = effective_price
            wp_update["pricing_mode"] = "fixed_price"
            wp_update["price_on_request"] = False
        if effective_edition:
            wp_update["edition_size"] = effective_edition
        await db.products.update_one({"id": linked_wp_id}, {"$set": wp_update})
    await log_activity(user, "product_master.updated", "product_master", product_id, {"changes": list(update.keys())})
    return {"message": "Product updated successfully"}

@api_router.post("/admin/product-master/{product_id}/activate")
async def activate_product_master(product_id: str, user: dict = Depends(require_editor_or_admin)):
    product = await db.product_master.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("pricing_mode") == "direct_purchase" and not product.get("price"):
        raise HTTPException(status_code=400, detail="Cannot activate: price is required")
    if not product.get("edition_size"):
        raise HTTPException(status_code=400, detail="Cannot activate: edition_size is required")
    await db.product_master.update_one({"id": product_id}, {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}})
    await log_activity(user, "product_master.activated", "product_master", product_id)
    return {"message": "Product activated"}

COLLECTION_TYPE_TO_CATEGORY = {
    "sarees": "saree", "scarves": "scarf", "dresses": "dress", "jackets": "jacket",
    "blouses": "blouse", "accessories": "accessory", "jewelry": "jewelry",
    "saree": "saree", "scarf": "scarf",
}

@api_router.post("/admin/product-master/import-from-website")
async def import_products_from_website(user: dict = Depends(require_editor_or_admin)):
    website_products = await db.products.find({}, {"_id": 0}).to_list(1000)
    if not website_products:
        return {"message": "No website products found", "created": 0, "skipped": 0}
    existing_masters = await db.product_master.find({}, {"_id": 0, "website_product_id": 1}).to_list(10000)
    already_linked = {m["website_product_id"] for m in existing_masters if m.get("website_product_id")}
    created = []
    skipped = []
    now = datetime.now(timezone.utc).isoformat()
    for wp in website_products:
        wp_id = wp.get("id")
        if wp_id in already_linked:
            skipped.append(wp.get("name", wp_id))
            continue
        collection_type = wp.get("collection_type", "").lower()
        category = COLLECTION_TYPE_TO_CATEGORY.get(collection_type, "accessory")
        pricing_mode = "price_on_request"
        price = None
        if wp.get("pricing_mode") == "fixed_price" and wp.get("price"):
            pricing_mode = "direct_purchase"
            price = wp.get("price")
        elif wp.get("price") and not wp.get("price_on_request"):
            pricing_mode = "direct_purchase"
            price = wp.get("price")
        product_code = await generate_product_code(category)
        product_id = str(uuid.uuid4())
        master = {
            "id": product_id, "product_code": product_code,
            "product_name": wp.get("name", "Unnamed Product"), "category": category,
            "subcategory": None, "collection_name": wp.get("design_category"), "drop_name": None,
            "pricing_mode": pricing_mode, "price": price, "currency": wp.get("currency", "INR"),
            "edition_size": wp.get("edition_size"), "release_date": None,
            "description": wp.get("description") or wp.get("narrative_intro"),
            "website_product_id": wp_id,
            "status": "active" if not wp.get("is_hidden") else "draft",
            "created_by": user.get("id"), "created_by_name": user.get("name"),
            "updated_by": user.get("id"), "updated_by_name": user.get("name"),
            "created_at": now, "updated_at": now,
        }
        await db.product_master.insert_one(master)
        attrs = {
            "id": str(uuid.uuid4()), "product_id": product_id,
            "primary_color": None, "secondary_color": None, "accent_color": None,
            "fabric_type": wp.get("material") or wp.get("craft_fabric"),
            "craft_technique": wp.get("work") or wp.get("craft_technique"),
            "motif_type": None, "motif_subject": None, "embroidery_type": None,
            "embroidery_density": None, "border_type": None, "pattern_scale": None,
            "art_inspiration": None, "aesthetic_category": wp.get("design_category"),
            "created_at": now, "updated_at": now,
        }
        for detail in wp.get("details", []):
            label = detail.get("label", "").lower()
            if "colour" in label or "color" in label:
                attrs["primary_color"] = detail.get("value")
            if "motif" in label:
                attrs["motif_subject"] = detail.get("value")
        await db.product_attributes.insert_one(attrs)
        created.append(f"{product_code} — {master['product_name']}")
    await log_activity(user, "product_master.bulk_import", "product_master", None, {"created": len(created), "skipped": len(skipped)})
    return {"message": f"Import complete. {len(created)} created, {len(skipped)} already linked.", "created": len(created), "skipped": len(skipped), "created_list": created, "skipped_list": skipped}

@api_router.post("/admin/product-master/{product_id}/archive")
async def archive_product_master(product_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.product_master.update_one({"id": product_id}, {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    await log_activity(user, "product_master.archived", "product_master", product_id)
    return {"message": "Product archived"}

# =====================================================================
# PRODUCTION JOBS MODULE
# =====================================================================

PRODUCTION_JOB_STATUSES = ["planned", "in_progress", "completed", "cancelled"]
INVENTORY_MOVEMENT_TYPES = ["purchase_received", "material_allocated", "production_completed", "order_fulfilled", "inventory_adjustment"]
INVENTORY_ENTITY_TYPES = ["material", "finished_good"]

QC_STATUSES = ["pending", "passed", "failed", "conditional"]

class ProductionJobCreate(BaseModel):
    product_id: str
    supplier_id: str
    quantity_planned: int
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    work_type: Optional[str] = None
    parent_job_id: Optional[str] = None
    sequence_number: Optional[int] = None
    stage_group_id: Optional[str] = None
    proposed_end_date: Optional[str] = None
    cost_to_pay: Optional[float] = None
    amount_paid: Optional[float] = None
    payment_date: Optional[str] = None
    payment_notes: Optional[str] = None
    incentive_amount: Optional[float] = None
    incentive_reason: Optional[str] = None
    supplier_provides_materials: bool = False

class ProductionJobUpdate(BaseModel):
    supplier_id: Optional[str] = None
    quantity_planned: Optional[int] = None
    quantity_completed: Optional[int] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    actual_completion_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    work_type: Optional[str] = None
    parent_job_id: Optional[str] = None
    sequence_number: Optional[int] = None
    stage_group_id: Optional[str] = None
    proposed_end_date: Optional[str] = None
    cost_to_pay: Optional[float] = None
    amount_paid: Optional[float] = None
    payment_date: Optional[str] = None
    payment_notes: Optional[str] = None
    incentive_amount: Optional[float] = None
    incentive_reason: Optional[str] = None
    supplier_provides_materials: Optional[bool] = None
    qc_status: Optional[str] = None
    qc_notes: Optional[str] = None
    qc_date: Optional[str] = None
    change_reason: Optional[str] = None  # required for locked record overrides

class CompleteJobRequest(BaseModel):
    quantity_completed: int
    actual_completion_date: Optional[str] = None
    notes: Optional[str] = None

async def generate_job_code() -> str:
    all_jobs = await db.production_jobs.find({}, {"_id": 0, "job_code": 1}).to_list(10000)
    nums = []
    for doc in all_jobs:
        try:
            nums.append(int(doc["job_code"].split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"JOB-{str(next_num).zfill(3)}"

async def update_inventory_snapshot(product_id: str, quantity_delta: float, location: str = None):
    existing = await db.inventory.find_one({"product_id": product_id, "entity_type": "finished_good"}, {"_id": 0})
    if existing:
        new_qty = (existing.get("quantity") or 0) + quantity_delta
        await db.inventory.update_one({"product_id": product_id, "entity_type": "finished_good"}, {"$set": {"quantity": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}})
    else:
        await db.inventory.insert_one({"id": str(uuid.uuid4()), "product_id": product_id, "entity_type": "finished_good", "quantity": quantity_delta, "location": location, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()})

@api_router.get("/admin/production-jobs/meta")
async def get_production_jobs_meta(user: dict = Depends(require_editor_or_admin)):
    products = await db.product_master.find({"status": {"$in": ["active", "draft"]}}, {"_id": 0, "id": 1, "product_code": 1, "product_name": 1, "category": 1, "status": 1}).sort("product_code", 1).to_list(500)
    suppliers = await db.suppliers.find({"status": "active"}, {"_id": 0, "id": 1, "supplier_code": 1, "supplier_name": 1, "supplier_type": 1}).sort("supplier_name", 1).to_list(500)
    return {"statuses": PRODUCTION_JOB_STATUSES, "work_types": WORK_TYPES, "products": products, "suppliers": suppliers}

@api_router.get("/admin/production-jobs")
async def list_production_jobs(
    user: dict = Depends(require_editor_or_admin),
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    product_id: Optional[str] = None,
    parent_job_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if status: query["status"] = status
    if supplier_id: query["supplier_id"] = supplier_id
    if product_id: query["product_id"] = product_id
    if parent_job_id: query["parent_job_id"] = parent_job_id
    if search:
        query["$or"] = [{"job_code": {"$regex": search, "$options": "i"}}, {"product_name": {"$regex": search, "$options": "i"}}]
    jobs = await db.production_jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return jobs

@api_router.get("/admin/production-jobs/{job_id}")
async def get_production_job(job_id: str, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")
    if job.get("product_id"):
        product = await db.product_master.find_one({"id": job["product_id"]}, {"_id": 0, "product_code": 1, "product_name": 1, "category": 1, "collection_name": 1})
        job["_product"] = product or {}
    if job.get("supplier_id"):
        supplier = await db.suppliers.find_one({"id": job["supplier_id"]}, {"_id": 0, "supplier_code": 1, "supplier_name": 1, "supplier_type": 1, "city": 1})
        job["_supplier"] = supplier or {}
    job["_linked"] = {
        "material_allocations": await db.material_allocations.count_documents({"production_job_id": job_id}),
        "inventory_movements": await db.inventory_movements.count_documents({"reference_id": job_id}),
    }
    # Parent job link
    if job.get("parent_job_id"):
        parent = await db.production_jobs.find_one(
            {"id": job["parent_job_id"]},
            {"_id": 0, "job_code": 1, "work_type": 1, "status": 1, "supplier_name": 1}
        )
        job["_parent_job"] = parent or {}
    # Child jobs (jobs that reference this one as parent)
    children = await db.production_jobs.find(
        {"parent_job_id": job_id},
        {"_id": 0, "id": 1, "job_code": 1, "work_type": 1, "status": 1,
         "quantity_planned": 1, "quantity_completed": 1, "supplier_name": 1}
    ).sort("sequence_number", 1).to_list(50)
    job["_child_jobs"] = children
    # Listing status from product master
    if job.get("product_id"):
        pm_status = await db.product_master.find_one(
            {"id": job["product_id"]}, {"_id": 0, "listing_status": 1, "website_product_id": 1}
        )
        job["_listing_status"] = pm_status.get("listing_status") if pm_status else None
        job["_website_product_id"] = pm_status.get("website_product_id") if pm_status else None
    return job

@api_router.post("/admin/production-jobs")
async def create_production_job(data: ProductionJobCreate, user: dict = Depends(require_editor_or_admin)):
    product = await db.product_master.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found in Product Master")
    if product.get("status") != "active":
        raise HTTPException(status_code=400, detail=f"Product must be active. Current status: {product.get('status')}")
    supplier = await db.suppliers.find_one({"id": data.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=400, detail="Supplier not found")
    if supplier.get("status", "active") != "active":
        raise HTTPException(status_code=400, detail="Supplier is inactive")
    if data.quantity_planned <= 0:
        raise HTTPException(status_code=400, detail="quantity_planned must be greater than 0")
    if data.work_type and data.work_type not in WORK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid work_type.")
    if data.parent_job_id:
        parent = await db.production_jobs.find_one({"id": data.parent_job_id}, {"_id": 0})
        if not parent:
            raise HTTPException(status_code=400, detail="Parent job not found")
    job_code = await generate_job_code()
    now = datetime.now(timezone.utc).isoformat()
    job = {
        "id": str(uuid.uuid4()), "job_code": job_code,
        "product_id": data.product_id, "product_name": product.get("product_name"),
        "product_code": product.get("product_code"), "supplier_id": data.supplier_id,
        "supplier_name": supplier.get("supplier_name"), "supplier_code": supplier.get("supplier_code"),
        "quantity_planned": data.quantity_planned, "quantity_completed": 0,
        "start_date": data.start_date, "due_date": data.due_date,
        "actual_completion_date": None, "status": "planned", "notes": data.notes,
        "work_type": data.work_type, "parent_job_id": data.parent_job_id,
        "sequence_number": data.sequence_number,
        "stage_group_id": data.stage_group_id or str(uuid.uuid4())[:8] if not data.parent_job_id else None,
        "proposed_end_date": data.proposed_end_date, "cost_to_pay": data.cost_to_pay,
        "amount_paid": data.amount_paid or 0, "payment_date": data.payment_date,
        "payment_notes": data.payment_notes, "incentive_amount": data.incentive_amount,
        "incentive_reason": data.incentive_reason, "total_product_cost": data.cost_to_pay,
        "supplier_provides_materials": data.supplier_provides_materials,
        "qc_status": None, "qc_notes": None, "qc_date": None,
        "created_by": user.get("id"), "created_by_name": user.get("name"),
        "updated_by": user.get("id"), "updated_by_name": user.get("name"),
        "created_at": now, "updated_at": now,
    }
    await db.production_jobs.insert_one(job)
    job.pop("_id", None)
    await log_activity(user, "production_job.created", "production_job", job["id"], {"code": job_code, "product": product.get("product_name"), "supplier": supplier.get("supplier_name")})
    return job

@api_router.put("/admin/production-jobs/{job_id}")
async def update_production_job(job_id: str, data: ProductionJobUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Production job not found")
    if existing.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled jobs cannot be edited")
    # 48-hour auto-lock check + lock enforcement
    existing = await check_and_apply_48hr_lock(existing)
    override_used = await enforce_lock(existing, user, data.change_reason)
    is_completed_edit = existing.get("status") == "completed"
    if data.status and data.status not in PRODUCTION_JOB_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status")
    if data.quantity_planned is not None and data.quantity_planned <= 0:
        raise HTTPException(status_code=400, detail="quantity_planned must be > 0")
    if data.quantity_completed is not None:
        planned = data.quantity_planned or existing.get("quantity_planned", 0)
        if data.quantity_completed > planned:
            raise HTTPException(status_code=400, detail="quantity_completed cannot exceed quantity_planned")
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name"), "last_edited_at": now, "last_edited_by": user.get("id")}
    for field in ["supplier_id", "quantity_planned", "quantity_completed", "start_date",
                  "due_date", "actual_completion_date", "status", "notes", "work_type",
                  "parent_job_id", "sequence_number", "stage_group_id", "proposed_end_date",
                  "cost_to_pay", "amount_paid", "payment_date", "payment_notes",
                  "incentive_amount", "incentive_reason",
                  "supplier_provides_materials", "qc_status", "qc_notes", "qc_date"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    if data.supplier_id:
        supplier = await db.suppliers.find_one({"id": data.supplier_id}, {"_id": 0})
        if supplier:
            update["supplier_name"] = supplier.get("supplier_name")
            update["supplier_code"] = supplier.get("supplier_code")
    # Diff sensitive fields for audit
    sensitive = ["quantity_planned", "quantity_completed", "status", "actual_completion_date", "cost_to_pay", "amount_paid"]
    field_changes = diff_fields(existing, update, sensitive)
    await db.production_jobs.update_one({"id": job_id}, {"$set": update})
    if is_completed_edit:
        audit = {"id": str(uuid.uuid4()), "job_id": job_id, "previous_values": {k: existing.get(k) for k in update.keys() if k not in ["updated_at", "updated_by", "updated_by_name", "last_edited_at", "last_edited_by"]}, "updated_values": {k: v for k, v in update.items() if k not in ["updated_at", "updated_by", "updated_by_name", "last_edited_at", "last_edited_by"]}, "updated_by": user.get("id"), "updated_by_name": user.get("name"), "updated_at": now}
        await db.production_job_audit_log.insert_one(audit)
        await db.production_jobs.update_one({"id": job_id}, {"$set": {"edit_flag": True, "edited_at": now, "edited_by": user.get("name")}})
    await write_audit_log("production_jobs", job_id, "override_edit" if override_used else "update", user, field_changes, data.change_reason, is_locked_record=existing.get("is_locked", False), override_used=override_used)
    await log_activity(user, "production_job.updated", "production_job", job_id, {"changes": list(update.keys()), "completed_edit": is_completed_edit, "override": override_used})
    return {"message": "Production job updated"}

@api_router.post("/admin/production-jobs/{job_id}/start")
async def start_production_job(job_id: str, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "planned":
        raise HTTPException(status_code=400, detail="Only planned jobs can be started")
    now = datetime.now(timezone.utc).isoformat()
    await db.production_jobs.update_one({"id": job_id}, {"$set": {"status": "in_progress", "start_date": job.get("start_date") or now[:10], "updated_at": now, "updated_by": user.get("id")}})
    await log_activity(user, "production_job.started", "production_job", job_id)
    return {"message": "Job started"}

@api_router.post("/admin/production-jobs/{job_id}/complete")
async def complete_production_job(job_id: str, data: CompleteJobRequest, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") not in ["planned", "in_progress"]:
        raise HTTPException(status_code=400, detail=f"Cannot complete a {job['status']} job")
    if data.quantity_completed <= 0:
        raise HTTPException(status_code=400, detail="quantity_completed must be > 0")
    if data.quantity_completed > job.get("quantity_planned", 0):
        raise HTTPException(status_code=400, detail="quantity_completed cannot exceed quantity_planned")
    if data.actual_completion_date and job.get("start_date"):
        if data.actual_completion_date < job["start_date"]:
            raise HTTPException(status_code=400, detail="Completion date cannot be before start date")
    now = datetime.now(timezone.utc).isoformat()
    completion_date = data.actual_completion_date or now[:10]
    await db.production_jobs.update_one({"id": job_id}, {"$set": {
        "status": "completed", "quantity_completed": data.quantity_completed,
        "actual_completion_date": completion_date, "completion_timestamp": now,
        "is_locked": False, "locked_at": None,
        "notes": data.notes or job.get("notes"),
        "updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name"),
        "last_edited_at": now, "last_edited_by": user.get("id"),
    }})
    movement = {"id": str(uuid.uuid4()), "product_id": job["product_id"], "material_purchase_id": None, "entity_type": "finished_good", "movement_type": "production_completed", "quantity": data.quantity_completed, "reference_type": "production_job", "reference_id": job_id, "location": None, "created_by": user.get("id"), "created_by_name": user.get("name"), "created_at": now}
    await db.inventory_movements.insert_one(movement)
    await update_inventory_snapshot(job["product_id"], data.quantity_completed)
    # Sync new inventory quantity to products.stock_quantity so website shows correct stock
    inv_snap = await db.inventory.find_one(
        {"product_id": job["product_id"], "entity_type": "finished_good"}, {"_id": 0}
    )
    if inv_snap:
        # Find the linked website product via product_master.website_product_id
        pm = await db.product_master.find_one({"id": job["product_id"]}, {"_id": 0, "website_product_id": 1})
        website_pid = (pm.get("website_product_id") if pm else None) or job["product_id"]
        await db.products.update_one(
            {"id": website_pid},
            {"$set": {"stock_quantity": inv_snap.get("quantity", 0), "updated_at": now}}
        )
    # Auto-calc cost_price on product_master if cost_to_pay is set and product has no cost_price yet
    cost_to_pay = job.get("cost_to_pay")
    if cost_to_pay and data.quantity_completed > 0:
        cost_per_unit = round(cost_to_pay / data.quantity_completed, 2)
        pm = await db.product_master.find_one({"id": job["product_id"]}, {"_id": 0, "cost_price": 1})
        if pm and not pm.get("cost_price"):
            await db.product_master.update_one(
                {"id": job["product_id"]},
                {"$set": {"cost_price": cost_per_unit, "cost_price_auto": True, "updated_at": now}}
            )
    await write_audit_log("production_jobs", job_id, "status_change", user, [
        {"field_name": "status", "old_value": job.get("status"), "new_value": "completed"},
        {"field_name": "quantity_completed", "old_value": str(job.get("quantity_completed", 0)), "new_value": str(data.quantity_completed)},
    ])
    await log_activity(user, "production_job.completed", "production_job", job_id, {"quantity_completed": data.quantity_completed, "completion_date": completion_date})
    return {"message": f"Job completed. {data.quantity_completed} units added to inventory."}

class ProgressReportCreate(BaseModel):
    progress_pct: int
    note: str
    attachment_url: Optional[str] = None

@api_router.get("/admin/production-jobs/{job_id}/progress-reports")
async def get_progress_reports(job_id: str, user: dict = Depends(require_editor_or_admin)):
    reports = await db.production_job_reports.find(
        {"job_id": job_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return reports

@api_router.post("/admin/production-jobs/{job_id}/progress-reports")
async def add_progress_report(job_id: str, data: ProgressReportCreate, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0, "status": 1})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") in ["cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Cannot add reports to a cancelled or completed job")
    if not (0 <= data.progress_pct <= 100):
        raise HTTPException(status_code=400, detail="progress_pct must be 0–100")
    if not data.note.strip():
        raise HTTPException(status_code=400, detail="Note is required")
    now = datetime.now(timezone.utc).isoformat()
    report = {
        "id": str(uuid.uuid4()), "job_id": job_id,
        "progress_pct": data.progress_pct, "note": data.note.strip(),
        "attachment_url": data.attachment_url,
        "created_by": user.get("id"), "created_by_name": user.get("name"),
        "created_at": now,
    }
    await db.production_job_reports.insert_one(report)
    await db.production_jobs.update_one(
        {"id": job_id},
        {"$set": {"latest_progress_pct": data.progress_pct, "updated_at": now}}
    )
    report.pop("_id", None)
    return report

class QCUpdate(BaseModel):
    qc_status: str
    qc_notes: Optional[str] = None
    qc_date: Optional[str] = None

@api_router.post("/admin/production-jobs/{job_id}/qc")
async def record_qc(job_id: str, data: QCUpdate, user: dict = Depends(require_editor_or_admin)):
    if data.qc_status not in QC_STATUSES:
        raise HTTPException(status_code=400, detail=f"qc_status must be one of {QC_STATUSES}")
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0, "status": 1})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.production_jobs.update_one(
        {"id": job_id},
        {"$set": {
            "qc_status": data.qc_status,
            "qc_notes": data.qc_notes,
            "qc_date": data.qc_date or now[:10],
            "updated_at": now, "updated_by": user.get("id"),
        }}
    )
    await log_activity(user, "production_job.qc_recorded", "production_job", job_id, {"qc_status": data.qc_status})
    return {"message": "QC recorded", "qc_status": data.qc_status}

@api_router.post("/admin/production-jobs/{job_id}/cancel")
async def cancel_production_job(job_id: str, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Completed jobs cannot be cancelled")
    if job.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Job is already cancelled")
    now = datetime.now(timezone.utc).isoformat()
    await db.production_jobs.update_one({"id": job_id}, {"$set": {"status": "cancelled", "updated_at": now, "updated_by": user.get("id")}})
    await log_activity(user, "production_job.cancelled", "production_job", job_id)
    return {"message": "Job cancelled"}

# =====================================================================
# PRODUCTION LAYER MODULE
# =====================================================================

SUPPLIER_CAPABILITY_TYPES = ["raw_material_supplier", "weaver", "embroiderer", "printer", "tailor", "dyer", "finisher", "painter", "block_printer", "other"]
WORK_TYPES = ["weaving", "embroidery", "block_printing", "hand_painting", "tailoring", "dyeing", "finishing", "printing", "other"]
DESIGN_CATEGORIES = ["floral", "geometric", "block_print", "abstract", "heritage", "animal", "landscape", "folk", "other"]
DESIGN_CATEGORY_CODES = {"floral": "FLR", "geometric": "GEO", "block_print": "BLK", "abstract": "ABS", "heritage": "HER", "animal": "ANI", "landscape": "LAN", "folk": "FOL", "other": "OTH"}

class SupplierCapabilityCreate(BaseModel):
    capability_type: str

class MaterialAllocationCreate(BaseModel):
    production_job_id: str
    material_id: Optional[str] = None
    material_purchase_id: Optional[str] = None
    quantity_allocated: float
    notes: Optional[str] = None

class MaterialAllocationUpdate(BaseModel):
    quantity_allocated: Optional[float] = None
    quantity_used: Optional[float] = None
    notes: Optional[str] = None
    change_reason: Optional[str] = None  # required for locked record overrides

@api_router.get("/admin/supplier-capabilities/meta")
async def get_capability_meta(user: dict = Depends(require_editor_or_admin)):
    return {"capability_types": SUPPLIER_CAPABILITY_TYPES, "work_types": WORK_TYPES, "design_categories": DESIGN_CATEGORIES, "design_category_codes": DESIGN_CATEGORY_CODES}

@api_router.get("/admin/suppliers/{supplier_id}/capabilities")
async def get_supplier_capabilities(supplier_id: str, user: dict = Depends(require_editor_or_admin)):
    caps = await db.supplier_capabilities.find({"supplier_id": supplier_id}, {"_id": 0}).to_list(100)
    return caps

@api_router.post("/admin/suppliers/{supplier_id}/capabilities")
async def add_supplier_capability(supplier_id: str, data: SupplierCapabilityCreate, user: dict = Depends(require_editor_or_admin)):
    if data.capability_type not in SUPPLIER_CAPABILITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid capability_type.")
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    existing = await db.supplier_capabilities.find_one({"supplier_id": supplier_id, "capability_type": data.capability_type})
    if existing:
        raise HTTPException(status_code=400, detail="Capability already exists for this supplier")
    cap = {"id": str(uuid.uuid4()), "supplier_id": supplier_id, "capability_type": data.capability_type, "created_by": user.get("id"), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.supplier_capabilities.insert_one(cap)
    cap.pop("_id", None)
    await log_activity(user, "supplier.capability_added", "supplier", supplier_id, {"capability": data.capability_type})
    return cap

@api_router.delete("/admin/suppliers/{supplier_id}/capabilities/{capability_id}")
async def remove_supplier_capability(supplier_id: str, capability_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.supplier_capabilities.delete_one({"id": capability_id, "supplier_id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Capability not found")
    await log_activity(user, "supplier.capability_removed", "supplier", supplier_id, {"capability_id": capability_id})
    return {"message": "Capability removed"}

@api_router.get("/admin/production-jobs/full-meta")
async def get_production_jobs_full_meta(user: dict = Depends(require_editor_or_admin)):
    products = await db.product_master.find({"status": {"$in": ["active", "draft"]}}, {"_id": 0, "id": 1, "product_code": 1, "product_name": 1, "category": 1, "status": 1}).sort("product_code", 1).to_list(500)
    suppliers = await db.suppliers.find({"status": "active"}, {"_id": 0, "id": 1, "supplier_code": 1, "supplier_name": 1, "supplier_type": 1}).sort("supplier_name", 1).to_list(500)
    jobs = await db.production_jobs.find({}, {"_id": 0, "id": 1, "job_code": 1, "product_name": 1, "status": 1}).sort("job_code", 1).to_list(1000)
    return {"statuses": PRODUCTION_JOB_STATUSES, "work_types": WORK_TYPES, "products": products, "suppliers": suppliers, "jobs": jobs}

async def generate_allocation_code() -> str:
    all_allocs = await db.material_allocations.find({}, {"_id": 0, "allocation_code": 1}).to_list(10000)
    nums = []
    for doc in all_allocs:
        try:
            nums.append(int(doc["allocation_code"].split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"ALLOC-{str(next_num).zfill(3)}"

@api_router.get("/admin/material-allocations/meta")
async def get_allocation_meta(user: dict = Depends(require_editor_or_admin)):
    jobs = await db.production_jobs.find({"status": {"$in": ["planned", "in_progress"]}}, {"_id": 0, "id": 1, "job_code": 1, "product_name": 1, "product_code": 1, "status": 1}).sort("job_code", -1).to_list(500)
    purchases = await db.material_purchases.find({"status": {"$in": ["received", "partial"]}}, {"_id": 0, "id": 1, "purchase_code": 1, "material_name": 1, "material_code": 1, "quantity_received": 1, "quantity_available": 1, "unit_of_measure": 1, "supplier_name": 1}).sort("purchase_code", -1).to_list(500) if "material_purchases" in await db.list_collection_names() else []
    materials = await db.materials.find({"status": "active", "current_stock_qty": {"$gt": 0}}, {"_id": 0, "id": 1, "material_code": 1, "material_name": 1, "current_stock_qty": 1, "unit_of_measure": 1, "material_type": 1}).sort("material_name", 1).to_list(500)
    return {"jobs": jobs, "purchases": purchases, "materials": materials}

@api_router.get("/admin/material-allocations")
async def list_material_allocations(
    user: dict = Depends(require_editor_or_admin),
    production_job_id: Optional[str] = None,
    material_purchase_id: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if production_job_id: query["production_job_id"] = production_job_id
    if material_purchase_id: query["material_purchase_id"] = material_purchase_id
    allocations = await db.material_allocations.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return allocations

@api_router.get("/admin/material-allocations/{allocation_id}")
async def get_material_allocation(allocation_id: str, user: dict = Depends(require_editor_or_admin)):
    alloc = await db.material_allocations.find_one({"id": allocation_id}, {"_id": 0})
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if alloc.get("production_job_id"):
        job = await db.production_jobs.find_one({"id": alloc["production_job_id"]}, {"_id": 0})
        alloc["_job"] = job or {}
    if alloc.get("material_purchase_id"):
        purchase = await db.material_purchases.find_one({"id": alloc["material_purchase_id"]}, {"_id": 0}) if "material_purchases" in await db.list_collection_names() else None
        alloc["_purchase"] = purchase or {}
    movement = await db.inventory_movements.find_one({"reference_id": allocation_id, "movement_type": "material_allocated"}, {"_id": 0}) if "inventory_movements" in await db.list_collection_names() else None
    alloc["_inventory_movement"] = movement or {}
    return alloc

@api_router.post("/admin/material-allocations")
async def create_material_allocation(data: MaterialAllocationCreate, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": data.production_job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")
    if job.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot allocate materials to a cancelled job")
    if data.quantity_allocated <= 0:
        raise HTTPException(status_code=400, detail="quantity_allocated must be > 0")
    if not data.material_id and not data.material_purchase_id:
        raise HTTPException(status_code=400, detail="Either material_id or material_purchase_id is required")
    collection_names = await db.list_collection_names()
    purchase = None
    material = None
    material_name = None
    material_code = None
    unit_of_measure = None
    if data.material_purchase_id and "material_purchases" in collection_names:
        purchase = await db.material_purchases.find_one({"id": data.material_purchase_id}, {"_id": 0})
        if not purchase:
            raise HTTPException(status_code=404, detail="Material purchase batch not found")
        available = purchase.get("quantity_available", 0)
        if data.quantity_allocated > available:
            raise HTTPException(status_code=400, detail=f"Cannot allocate {data.quantity_allocated} — only {available} {purchase.get('unit_of_measure', 'units')} available")
        material_name = purchase.get("material_name")
        material_code = purchase.get("material_code")
        unit_of_measure = purchase.get("unit_of_measure")
    elif data.material_id:
        material = await db.materials.find_one({"id": data.material_id}, {"_id": 0})
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")
        available = material.get("current_stock_qty", 0) or 0
        if data.quantity_allocated > available:
            raise HTTPException(status_code=400, detail=f"Cannot allocate {data.quantity_allocated} — only {available} {material.get('unit_of_measure', 'units')} available")
        material_name = material.get("material_name")
        material_code = material.get("material_code")
        unit_of_measure = material.get("unit_of_measure")
    allocation_code = await generate_allocation_code()
    now = datetime.now(timezone.utc).isoformat()
    allocation_id = str(uuid.uuid4())
    allocation = {
        "id": allocation_id, "allocation_code": allocation_code,
        "production_job_id": data.production_job_id, "job_code": job.get("job_code"),
        "product_name": job.get("product_name"), "material_id": data.material_id,
        "material_purchase_id": data.material_purchase_id, "material_name": material_name,
        "material_code": material_code, "quantity_allocated": data.quantity_allocated,
        "quantity_used": 0, "unit_of_measure": unit_of_measure, "notes": data.notes,
        "created_by": user.get("id"), "created_by_name": user.get("name"),
        "updated_by": user.get("id"), "updated_by_name": user.get("name"),
        "created_at": now, "updated_at": now,
    }
    await db.material_allocations.insert_one(allocation)
    allocation.pop("_id", None)
    if purchase:
        new_available = purchase.get("quantity_available", 0) - data.quantity_allocated
        await db.material_purchases.update_one({"id": data.material_purchase_id}, {"$set": {"quantity_available": new_available, "updated_at": now}})
    if material:
        new_qty = (material.get("current_stock_qty") or 0) - data.quantity_allocated
        await db.materials.update_one({"id": data.material_id}, {"$set": {"current_stock_qty": max(0, new_qty), "updated_at": now}})
    movement = {"id": str(uuid.uuid4()), "product_id": None, "material_id": data.material_id, "material_purchase_id": data.material_purchase_id, "entity_type": "material", "movement_type": "material_allocated", "quantity": -data.quantity_allocated, "reference_type": "production_job", "reference_id": allocation_id, "location": None, "created_by": user.get("id"), "created_by_name": user.get("name"), "created_at": now}
    await db.inventory_movements.insert_one(movement)
    mat_id = data.material_id
    if not mat_id and purchase:
        mat_id = purchase.get("material_id")
    if mat_id:
        mat = await db.materials.find_one({"id": mat_id}, {"_id": 0})
        if mat:
            new_stock = max(0, (mat.get("current_stock_qty") or 0) - data.quantity_allocated)
            await db.materials.update_one({"id": mat_id}, {"$set": {"current_stock_qty": new_stock, "updated_at": now}})
    await log_activity(user, "material_allocation.created", "material_allocation", allocation_id, {"code": allocation_code, "job": job.get("job_code"), "quantity": data.quantity_allocated})
    return allocation

@api_router.put("/admin/material-allocations/{allocation_id}")
async def update_material_allocation(allocation_id: str, data: MaterialAllocationUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.material_allocations.find_one({"id": allocation_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Allocation not found")
    job = await db.production_jobs.find_one({"id": existing["production_job_id"]}, {"_id": 0})
    # Check lock via linked job — allocations inherit the job's lock status
    if job:
        job = await check_and_apply_48hr_lock(job)
        if job.get("is_locked"):
            override_used = await enforce_lock(job, user, data.change_reason)
        else:
            override_used = False
    else:
        override_used = False
    if data.quantity_used is not None and data.quantity_used > existing.get("quantity_allocated", 0):
        raise HTTPException(status_code=400, detail="quantity_used cannot exceed quantity_allocated")
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}
    for field in ["quantity_allocated", "quantity_used", "notes"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    sensitive = ["quantity_allocated", "quantity_used", "material_purchase_id"]
    field_changes = diff_fields(existing, update, sensitive)
    await db.material_allocations.update_one({"id": allocation_id}, {"$set": update})
    await write_audit_log("material_allocations", allocation_id, "override_edit" if override_used else "update", user, field_changes, data.change_reason, is_locked_record=job.get("is_locked", False) if job else False, override_used=override_used)
    await log_activity(user, "material_allocation.updated", "material_allocation", allocation_id)
    return {"message": "Allocation updated"}

# =====================================================================
# ENQUIRIES MODULE (Enhanced)
# =====================================================================

ENQUIRY_SOURCES = ["website", "whatsapp", "instagram", "phone", "showroom", "other"]
ENQUIRY_STATUSES = ["new", "contacted", "negotiating", "converted", "closed"]

CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "CAD", "AUD"]
ORDER_CHANNELS = ["online", "showroom", "offline", "phone"]

class EnquiryAdminCreate(BaseModel):
    product_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_city: Optional[str] = None
    customer_country: Optional[str] = None
    message: str
    enquiry_source: str = "website"
    assigned_to: Optional[str] = None
    quoted_price: Optional[float] = None
    quoted_currency: str = "INR"

class EnquiryAdminUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_city: Optional[str] = None
    customer_country: Optional[str] = None
    message: Optional[str] = None
    enquiry_source: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    internal_notes: Optional[str] = None
    quoted_price: Optional[float] = None
    quoted_currency: Optional[str] = None

class ConvertToOrderRequest(BaseModel):
    agreed_price: float
    currency: str = "INR"
    notes: Optional[str] = None

async def generate_client_code() -> str:
    all_clients = await db.clients.find({}, {"_id": 0, "client_code": 1}).to_list(10000)
    nums = []
    for doc in all_clients:
        try:
            nums.append(int(doc["client_code"].split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"CLT-{str(next_num).zfill(3)}"

async def upsert_client(name: str, email: Optional[str], phone: Optional[str], city: Optional[str], country: Optional[str], source: str):
    """Find or create a client profile, keyed by email. Skipped if no email."""
    if not email:
        return None
    email_lc = email.strip().lower()
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.clients.find_one({"email_lc": email_lc}, {"_id": 0})
    if existing:
        update = {"last_activity_at": now, "updated_at": now}
        if not existing.get("phone") and phone:
            update["phone"] = phone
        if not existing.get("city") and city:
            update["city"] = city
        if not existing.get("country") and country:
            update["country"] = country
        # Keep the longest/most complete name
        if name and len(name) > len(existing.get("name", "")):
            update["name"] = name
        await db.clients.update_one({"email_lc": email_lc}, {"$set": update})
        return existing["id"]
    client_code = await generate_client_code()
    client = {
        "id": str(uuid.uuid4()), "client_code": client_code,
        "name": name or "", "email": email.strip(), "email_lc": email_lc,
        "phone": phone or "", "city": city or "", "country": country or "India",
        "tags": [], "internal_notes": "",
        "preferences": {"occasions": [], "styles": [], "categories": []},
        "source": source,
        "created_at": now, "updated_at": now,
        "first_activity_at": now, "last_activity_at": now,
    }
    await db.clients.insert_one(client)
    return client["id"]

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tags: Optional[list] = None
    internal_notes: Optional[str] = None
    preferences: Optional[dict] = None

@api_router.get("/admin/clients")
async def list_clients(
    user: dict = Depends(require_editor_or_admin),
    search: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 200,
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"client_code": {"$regex": search, "$options": "i"}},
        ]
    if tag:
        query["tags"] = tag
    clients = await db.clients.find(query, {"_id": 0}).sort("last_activity_at", -1).to_list(limit)
    # Attach order stats
    all_emails = [c["email_lc"] for c in clients if c.get("email_lc")]
    if all_emails:
        order_agg = await db.orders.aggregate([
            {"$match": {"customer_email": {"$in": [c["email"] for c in clients if c.get("email")]}}},
            {"$group": {"_id": {"$toLower": "$customer_email"}, "count": {"$sum": 1}, "total_inr": {"$sum": "$total_amount_inr"}}},
        ]).to_list(1000)
        order_map = {r["_id"]: r for r in order_agg}
        enq_agg = await db.enquiries.aggregate([
            {"$match": {"customer_email": {"$in": [c["email"] for c in clients if c.get("email")]}}},
            {"$group": {"_id": {"$toLower": "$customer_email"}, "count": {"$sum": 1}}},
        ]).to_list(1000)
        enq_map = {r["_id"]: r["count"] for r in enq_agg}
        for c in clients:
            em = c.get("email_lc", "")
            c["total_orders"] = order_map.get(em, {}).get("count", 0)
            c["total_spent_inr"] = order_map.get(em, {}).get("total_inr", 0)
            c["total_enquiries"] = enq_map.get(em, 0)
    return clients

@api_router.get("/admin/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(require_editor_or_admin)):
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    email = client.get("email", "")
    orders = await db.orders.find({"customer_email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0}).sort("created_at", -1).to_list(50)
    enquiries = await db.enquiries.find({"customer_email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0}).sort("created_at", -1).to_list(50)
    total_spent_inr = sum(o.get("total_amount_inr") or o.get("total_amount", 0) for o in orders)
    client["_orders"] = orders
    client["_enquiries"] = enquiries
    client["total_orders"] = len(orders)
    client["total_spent_inr"] = total_spent_inr
    client["total_enquiries"] = len(enquiries)
    return client

@api_router.put("/admin/clients/{client_id}")
async def update_client(client_id: str, data: ClientUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now}
    for field in ["name", "phone", "city", "country", "tags", "internal_notes", "preferences"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    await db.clients.update_one({"id": client_id}, {"$set": update})
    await log_activity(user, "client.updated", "client", client_id, {"name": existing.get("name")})
    return {"message": "Client updated"}

async def generate_enquiry_code() -> str:
    all_enqs = await db.enquiries.find({"enquiry_code": {"$exists": True}}, {"_id": 0, "enquiry_code": 1}).to_list(100000)
    nums = []
    for doc in all_enqs:
        try:
            code = doc.get("enquiry_code", "")
            if code.startswith("ENQ-"):
                nums.append(int(code.split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"ENQ-{str(next_num).zfill(3)}"

async def generate_order_code() -> str:
    all_orders = await db.orders.find({}, {"_id": 0, "order_code": 1}).to_list(10000)
    nums = []
    for doc in all_orders:
        try:
            nums.append(int(doc["order_code"].split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"ORD-{str(next_num).zfill(3)}"

@api_router.get("/admin/enquiries/meta")
async def get_enquiry_meta(user: dict = Depends(require_editor_or_admin)):
    admins = await db.users.find({"role": {"$in": ["admin", "editor"]}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(100)
    products = await db.product_master.find({"status": "active"}, {"_id": 0, "id": 1, "product_code": 1, "product_name": 1}).sort("product_code", 1).to_list(500)
    return {"sources": ENQUIRY_SOURCES, "statuses": ENQUIRY_STATUSES, "admins": admins, "products": products}

@api_router.get("/admin/enquiries/enhanced")
async def list_enquiries_enhanced(
    user: dict = Depends(require_editor_or_admin),
    status: Optional[str] = None,
    enquiry_source: Optional[str] = None,
    product_id: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if status: query["status"] = status
    if enquiry_source: query["enquiry_source"] = enquiry_source
    if product_id: query["product_id"] = product_id
    if search:
        query["$or"] = [{"enquiry_code": {"$regex": search, "$options": "i"}}, {"name": {"$regex": search, "$options": "i"}}, {"customer_name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}, {"customer_email": {"$regex": search, "$options": "i"}}, {"product_name": {"$regex": search, "$options": "i"}}]
    if date_from or date_to:
        query["created_at"] = {}
        if date_from: query["created_at"]["$gte"] = date_from
        if date_to: query["created_at"]["$lte"] = date_to + "T23:59:59"
    enquiries = await db.enquiries.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for e in enquiries:
        if not e.get("customer_name") and e.get("name"): e["customer_name"] = e["name"]
        if not e.get("customer_email") and e.get("email"): e["customer_email"] = e["email"]
        if not e.get("customer_phone") and e.get("phone"): e["customer_phone"] = e["phone"]
        if not e.get("enquiry_source"): e["enquiry_source"] = "website"
        if not e.get("enquiry_code"): e["enquiry_code"] = e.get("id", "")[:8].upper()
    return enquiries

@api_router.get("/admin/enquiries/detail/{enquiry_id}")
async def get_enquiry_detail(enquiry_id: str, user: dict = Depends(require_editor_or_admin)):
    enquiry = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if not enquiry.get("customer_name"): enquiry["customer_name"] = enquiry.get("name", "")
    if not enquiry.get("customer_email"): enquiry["customer_email"] = enquiry.get("email", "")
    if not enquiry.get("customer_phone"): enquiry["customer_phone"] = enquiry.get("phone", "")
    if not enquiry.get("enquiry_source"): enquiry["enquiry_source"] = "website"
    if enquiry.get("product_id"):
        product = await db.product_master.find_one({"id": enquiry["product_id"]}, {"_id": 0}) or await db.products.find_one({"id": enquiry["product_id"]}, {"_id": 0})
        enquiry["_product"] = product or {}
    if enquiry.get("order_id"):
        order = await db.orders.find_one({"id": enquiry["order_id"]}, {"_id": 0})
        enquiry["_order"] = order or {}
    return enquiry

@api_router.post("/admin/enquiries/create")
async def admin_create_enquiry(data: EnquiryAdminCreate, user: dict = Depends(require_editor_or_admin)):
    if not data.customer_email and not data.customer_phone:
        raise HTTPException(status_code=400, detail="At least one contact field (email or phone) is required")
    if data.enquiry_source not in ENQUIRY_SOURCES:
        raise HTTPException(status_code=400, detail=f"Invalid enquiry_source")
    product_name = None
    if data.product_id:
        product = await db.product_master.find_one({"id": data.product_id}, {"_id": 0}) or await db.products.find_one({"id": data.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail="Product not found")
        product_name = product.get("product_name") or product.get("name")
    enquiry_code = await generate_enquiry_code()
    now = datetime.now(timezone.utc).isoformat()
    enquiry_id = str(uuid.uuid4())
    enquiry = {
        "id": enquiry_id, "enquiry_code": enquiry_code, "product_id": data.product_id,
        "product_name": product_name, "customer_name": data.customer_name, "name": data.customer_name,
        "customer_email": data.customer_email, "email": data.customer_email,
        "customer_phone": data.customer_phone, "phone": data.customer_phone,
        "customer_city": data.customer_city, "customer_country": data.customer_country,
        "message": data.message, "enquiry_source": data.enquiry_source, "enquiry_type": "product",
        "quoted_price": data.quoted_price, "quoted_currency": data.quoted_currency,
        "status": "new", "assigned_to": data.assigned_to, "internal_notes": None, "order_id": None,
        "status_history": [{"status": "new", "changed_at": now, "changed_by": user.get("name")}],
        "created_by": user.get("id"), "created_by_name": user.get("name"),
        "created_at": now, "updated_at": now,
    }
    await db.enquiries.insert_one(enquiry)
    enquiry.pop("_id", None)
    await upsert_client(data.customer_name, data.customer_email, data.customer_phone, data.customer_city, data.customer_country, "enquiry")
    await log_activity(user, "enquiry.created", "enquiry", enquiry_id, {"code": enquiry_code, "customer": data.customer_name})
    return enquiry

@api_router.put("/admin/enquiries/{enquiry_id}/update")
async def update_enquiry(enquiry_id: str, data: EnquiryAdminUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if existing.get("status") == "converted":
        raise HTTPException(status_code=400, detail="Converted enquiries cannot be edited directly")
    if data.status and data.status not in ENQUIRY_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if data.enquiry_source and data.enquiry_source not in ENQUIRY_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid enquiry_source")
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now}
    for field in ["customer_name", "customer_email", "customer_phone", "customer_city", "customer_country", "message", "enquiry_source", "assigned_to", "internal_notes", "quoted_price", "quoted_currency"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
            if field == "customer_name": update["name"] = val
            if field == "customer_email": update["email"] = val
            if field == "customer_phone": update["phone"] = val
    if data.status and data.status != existing.get("status"):
        update["status"] = data.status
        history = existing.get("status_history", [])
        history.append({"status": data.status, "changed_at": now, "changed_by": user.get("name")})
        update["status_history"] = history
    if not existing.get("enquiry_code"):
        update["enquiry_code"] = await generate_enquiry_code()
    await db.enquiries.update_one({"id": enquiry_id}, {"$set": update})
    await log_activity(user, "enquiry.updated", "enquiry", enquiry_id, {"changes": list(update.keys())})
    return {"message": "Enquiry updated"}

@api_router.post("/admin/enquiries/{enquiry_id}/convert")
async def convert_enquiry_to_order(enquiry_id: str, data: ConvertToOrderRequest, user: dict = Depends(require_editor_or_admin)):
    enquiry = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if enquiry.get("status") == "converted":
        raise HTTPException(status_code=400, detail="Enquiry is already converted to an order")
    if enquiry.get("status") == "closed":
        raise HTTPException(status_code=400, detail="Closed enquiries cannot be converted")
    if data.agreed_price <= 0:
        raise HTTPException(status_code=400, detail="Agreed price must be greater than 0")
    order_code = await generate_order_code()
    now = datetime.now(timezone.utc).isoformat()
    order_id = str(uuid.uuid4())
    customer_name = enquiry.get("customer_name") or enquiry.get("name", "")
    customer_email = enquiry.get("customer_email") or enquiry.get("email", "")
    order = {
        "id": order_id, "order_code": order_code, "enquiry_id": enquiry_id,
        "enquiry_code": enquiry.get("enquiry_code"), "product_id": enquiry.get("product_id"),
        "product_name": enquiry.get("product_name"), "customer_name": customer_name,
        "customer_email": customer_email, "customer_phone": enquiry.get("customer_phone") or enquiry.get("phone"),
        "customer_city": enquiry.get("customer_city"), "customer_country": enquiry.get("customer_country"),
        "agreed_price": data.agreed_price, "currency": data.currency, "status": "confirmed",
        "payment_status": "unpaid", "notes": data.notes,
        "created_by": user.get("id"), "created_by_name": user.get("name"),
        "created_at": now, "updated_at": now,
    }
    await db.orders.insert_one(order)
    history = enquiry.get("status_history", [])
    history.append({"status": "converted", "changed_at": now, "changed_by": user.get("name")})
    await db.enquiries.update_one({"id": enquiry_id}, {"$set": {"status": "converted", "order_id": order_id, "updated_at": now, "status_history": history}})
    await log_activity(user, "enquiry.converted", "enquiry", enquiry_id, {"order_code": order_code, "agreed_price": data.agreed_price})
    return {"message": f"Enquiry converted to order {order_code}", "order_id": order_id, "order_code": order_code}

@api_router.post("/admin/enquiries/backfill-codes")
async def backfill_enquiry_codes(user: dict = Depends(require_admin)):
    enquiries = await db.enquiries.find({"enquiry_code": {"$exists": False}}, {"_id": 0, "id": 1}).sort("created_at", 1).to_list(10000)
    count = 0
    for e in enquiries:
        code = await generate_enquiry_code()
        await db.enquiries.update_one({"id": e["id"]}, {"$set": {"enquiry_code": code}})
        count += 1
    return {"message": f"Backfilled {count} enquiry codes"}

# =====================================================================
# ORDERS MODULE
# =====================================================================

ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
PAYMENT_STATUSES = ["unpaid", "pending", "paid", "refunded"]

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int
    unit_price: float

class OrderCreate(BaseModel):
    enquiry_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_city: Optional[str] = None
    customer_country: Optional[str] = None
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    currency: str = "INR"
    exchange_rate_to_inr: float = 1.0
    channel: str = "online"

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_city: Optional[str] = None
    customer_country: Optional[str] = None
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    channel: Optional[str] = None
    change_reason: Optional[str] = None  # required for locked record overrides

async def deduct_finished_goods(order_id: str, items: list, user_id: str, user_name: str):
    now = datetime.now(timezone.utc).isoformat()
    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 0)
        movement = {"id": str(uuid.uuid4()), "product_id": product_id, "material_purchase_id": None, "entity_type": "finished_good", "movement_type": "order_fulfilled", "quantity": -quantity, "reference_type": "order", "reference_id": order_id, "location": None, "created_by": user_id, "created_by_name": user_name, "created_at": now}
        await db.inventory_movements.insert_one(movement)
        existing = await db.inventory.find_one({"product_id": product_id, "entity_type": "finished_good"})
        if existing:
            new_qty = max(0, (existing.get("quantity") or 0) - quantity)
            await db.inventory.update_one({"product_id": product_id, "entity_type": "finished_good"}, {"$set": {"quantity": new_qty, "updated_at": now}})

async def restore_finished_goods(order_id: str, items: list, user_id: str, user_name: str):
    now = datetime.now(timezone.utc).isoformat()
    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 0)
        movement = {"id": str(uuid.uuid4()), "product_id": product_id, "material_purchase_id": None, "entity_type": "finished_good", "movement_type": "inventory_adjustment", "quantity": quantity, "reference_type": "order", "reference_id": order_id, "location": None, "created_by": user_id, "created_by_name": user_name, "created_at": now}
        await db.inventory_movements.insert_one(movement)
        existing = await db.inventory.find_one({"product_id": product_id, "entity_type": "finished_good"})
        if existing:
            new_qty = (existing.get("quantity") or 0) + quantity
            await db.inventory.update_one({"product_id": product_id, "entity_type": "finished_good"}, {"$set": {"quantity": new_qty, "updated_at": now}})

@api_router.get("/admin/orders/meta")
async def get_order_meta(user: dict = Depends(require_editor_or_admin)):
    products = await db.product_master.find({"status": "active"}, {"_id": 0, "id": 1, "product_code": 1, "product_name": 1, "pricing_mode": 1, "price": 1}).sort("product_code", 1).to_list(500)
    inventory = await db.inventory.find({"entity_type": "finished_good"}, {"_id": 0, "product_id": 1, "quantity": 1}).to_list(1000)
    inv_map = {i["product_id"]: i.get("quantity", 0) for i in inventory}
    for p in products:
        p["available_stock"] = inv_map.get(p["id"], 0)
    return {"order_statuses": ORDER_STATUSES, "payment_statuses": PAYMENT_STATUSES, "products": products}

@api_router.get("/admin/orders")
async def list_orders(
    user: dict = Depends(require_editor_or_admin),
    order_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if order_status: query["order_status"] = order_status
    if payment_status: query["payment_status"] = payment_status
    if search:
        query["$or"] = [{"order_code": {"$regex": search, "$options": "i"}}, {"customer_name": {"$regex": search, "$options": "i"}}, {"customer_email": {"$regex": search, "$options": "i"}}]
    if date_from or date_to:
        query["created_at"] = {}
        if date_from: query["created_at"]["$gte"] = date_from
        if date_to: query["created_at"]["$lte"] = date_to + "T23:59:59"
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return orders

@api_router.get("/admin/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(require_editor_or_admin)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    items = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    order["items"] = items
    if order.get("enquiry_id"):
        enquiry = await db.enquiries.find_one({"id": order["enquiry_id"]}, {"_id": 0})
        if enquiry:
            order["_enquiry"] = {"enquiry_code": enquiry.get("enquiry_code"), "id": enquiry.get("id"), "message": enquiry.get("message"), "enquiry_source": enquiry.get("enquiry_source")}
    movements = await db.inventory_movements.find({"reference_id": order_id, "reference_type": "order"}, {"_id": 0}).to_list(100)
    order["_movements"] = movements
    return order

@api_router.post("/admin/orders")
async def create_order(data: OrderCreate, user: dict = Depends(require_editor_or_admin)):
    if not data.customer_name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required")
    if not data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
    now = datetime.now(timezone.utc).isoformat()
    order_id = str(uuid.uuid4())
    order_code = await generate_order_code()
    total_amount = 0
    validated_items = []
    for item in data.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")
        product = await db.product_master.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
        if product.get("status") != "active":
            raise HTTPException(status_code=400, detail=f"Product {product.get('product_name')} is not active")
        inv = await db.inventory.find_one({"product_id": item.product_id, "entity_type": "finished_good"})
        available = inv.get("quantity", 0) if inv else 0
        if item.quantity > available:
            # Check if the linked website product allows selling beyond stock
            wp_id = product.get("website_product_id")
            wp = await db.products.find_one({"id": wp_id}, {"_id": 0, "continue_selling_out_of_stock": 1, "made_to_order_days": 1}) if wp_id else None
            if not (wp and wp.get("continue_selling_out_of_stock")):
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.get('product_name')}. Available: {available}, Requested: {item.quantity}")
        # Edition limit: total units sold must not exceed edition_size
        edition_size = product.get("edition_size")
        if edition_size:
            total_sold = await db.order_items.aggregate([
                {"$match": {"product_id": item.product_id}},
                {"$group": {"_id": None, "total": {"$sum": "$quantity"}}}
            ]).to_list(1)
            already_sold = total_sold[0]["total"] if total_sold else 0
            if already_sold + item.quantity > edition_size:
                remaining = edition_size - already_sold
                raise HTTPException(status_code=400, detail=f"Edition limit reached for {product.get('product_name')}. Edition size: {edition_size}, already sold: {already_sold}, remaining: {remaining}")
        item_total = item.quantity * item.unit_price
        total_amount += item_total
        validated_items.append({"id": str(uuid.uuid4()), "order_id": order_id, "product_id": item.product_id, "product_name": product.get("product_name"), "product_code": product.get("product_code"), "quantity": item.quantity, "unit_price": item.unit_price, "total_price": item_total, "created_at": now})
    order = {
        "id": order_id, "order_code": order_code, "enquiry_id": data.enquiry_id,
        "customer_name": data.customer_name, "customer_email": data.customer_email,
        "customer_phone": data.customer_phone, "customer_city": data.customer_city,
        "customer_country": data.customer_country, "order_status": "confirmed",
        "payment_status": "unpaid", "payment_reference": None, "total_amount": total_amount,
        "currency": data.currency, "exchange_rate_to_inr": data.exchange_rate_to_inr,
        "total_amount_inr": round(total_amount * data.exchange_rate_to_inr, 2),
        "channel": data.channel,
        "notes": data.notes, "inventory_deducted": False,
        "created_by": user.get("id"), "created_by_name": user.get("name"),
        "updated_by": user.get("id"), "updated_by_name": user.get("name"),
        "created_at": now, "updated_at": now,
    }
    await db.orders.insert_one(order)
    for item in validated_items:
        await db.order_items.insert_one(item)
    await deduct_finished_goods(order_id, validated_items, user.get("id"), user.get("name"))
    await db.orders.update_one({"id": order_id}, {"$set": {"inventory_deducted": True}})
    if data.enquiry_id:
        await db.enquiries.update_one({"id": data.enquiry_id}, {"$set": {"status": "converted", "order_id": order_id, "updated_at": now}})
    order.pop("_id", None)
    await upsert_client(data.customer_name, data.customer_email, data.customer_phone, data.customer_city, data.customer_country, "order")
    await log_activity(user, "order.created", "order", order_id, {"code": order_code, "total": total_amount})
    return order

@api_router.put("/admin/orders/{order_id}")
async def update_order(order_id: str, data: OrderUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    # Lock enforcement
    override_used = await enforce_lock(existing, user, data.change_reason)
    if data.order_status and data.order_status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid order_status")
    if data.payment_status and data.payment_status not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payment_status")
    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name"), "last_edited_at": now, "last_edited_by": user.get("id")}
    for field in ["customer_name", "customer_email", "customer_phone", "customer_city", "customer_country", "order_status", "payment_status", "payment_reference", "notes", "channel"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val
    # Lock when order reaches terminal state
    new_status = data.order_status or existing.get("order_status")
    if new_status in ["delivered", "closed"] and not existing.get("is_locked"):
        update["is_locked"] = True
        update["locked_at"] = now
    if data.order_status == "cancelled" and existing.get("order_status") != "cancelled":
        if existing.get("inventory_deducted"):
            items = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(100)
            await restore_finished_goods(order_id, items, user.get("id"), user.get("name"))
            update["inventory_deducted"] = False
    sensitive = ["order_status", "payment_status", "total_amount", "agreed_price"]
    field_changes = diff_fields(existing, update, sensitive)
    await db.orders.update_one({"id": order_id}, {"$set": update})
    await write_audit_log("orders", order_id, "override_edit" if override_used else "update", user, field_changes, data.change_reason, is_locked_record=existing.get("is_locked", False), override_used=override_used)
    await log_activity(user, "order.updated", "order", order_id, {"changes": list(update.keys()), "override": override_used})
    return {"message": "Order updated"}

# =====================================================================
# OPERATIONS DASHBOARD MODULE
# =====================================================================

@api_router.get("/admin/dashboard/metrics")
async def get_dashboard_metrics(user: dict = Depends(require_editor_or_admin), date_from: Optional[str] = None, date_to: Optional[str] = None):
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0).isoformat()
    today = now.isoformat()
    open_jobs = await db.production_jobs.count_documents({"status": {"$in": ["planned", "in_progress"]}})
    completed_this_week = await db.production_jobs.count_documents({"status": "completed", "actual_completion_date": {"$gte": week_start[:10]}})
    overdue_jobs = await db.production_jobs.count_documents({"status": {"$in": ["planned", "in_progress"]}, "due_date": {"$lt": today[:10]}})
    jobs_by_work_type_pipeline = [{"$match": {"status": {"$in": ["planned", "in_progress"]}}}, {"$group": {"_id": "$work_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    jobs_by_work_type = await db.production_jobs.aggregate(jobs_by_work_type_pipeline).to_list(20)
    jobs_by_work_type = [{"work_type": r["_id"] or "unspecified", "count": r["count"]} for r in jobs_by_work_type]
    open_jobs_list = await db.production_jobs.find({"status": {"$in": ["planned", "in_progress"]}}, {"_id": 0, "job_code": 1, "product_name": 1, "supplier_name": 1, "work_type": 1, "quantity_planned": 1, "quantity_completed": 1, "due_date": 1, "status": 1}).sort("due_date", 1).to_list(20)
    inventory_snapshot = await db.inventory.find({"entity_type": "finished_good"}, {"_id": 0, "product_id": 1, "quantity": 1, "location": 1}).to_list(500)
    inventory_map = {i["product_id"]: i for i in inventory_snapshot}
    active_products = await db.product_master.find({"status": "active"}, {"_id": 0, "id": 1, "product_name": 1, "product_code": 1, "category": 1, "edition_size": 1, "website_product_id": 1}).to_list(500)
    finished_goods = []
    for pm in active_products:
        pid = pm["id"]
        inv = inventory_map.get(pid)
        wp_qty = 0
        if pm.get("website_product_id"):
            wp = await db.products.find_one({"id": pm["website_product_id"]}, {"_id": 0, "stock_quantity": 1, "units_available": 1, "edition_size": 1})
            if wp:
                wp_qty = wp.get("stock_quantity") or wp.get("units_available") or wp.get("edition_size") or 0
        qty = inv.get("quantity", 0) if inv else (wp_qty or pm.get("edition_size") or 0)
        finished_goods.append({"product_id": pid, "product_name": pm.get("product_name", ""), "product_code": pm.get("product_code", ""), "category": pm.get("category", ""), "quantity": qty, "location": inv.get("location") if inv else None})
    total_finished_goods = sum(f.get("quantity", 0) for f in finished_goods)
    materials_stock = await db.materials.find({"status": "active"}, {"_id": 0, "material_code": 1, "material_name": 1, "material_type": 1, "current_stock_qty": 1, "unit_of_measure": 1, "storage_location": 1}).sort("current_stock_qty", 1).to_list(500)
    low_stock = [m for m in materials_stock if (m.get("current_stock_qty") or 0) <= 5]
    new_enquiries_week = await db.enquiries.count_documents({"created_at": {"$gte": week_start}})
    enq_by_status = await db.enquiries.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(10)
    enq_by_status = [{"status": r["_id"] or "new", "count": r["count"]} for r in enq_by_status]
    enq_by_source = await db.enquiries.aggregate([{"$group": {"_id": {"$ifNull": ["$enquiry_source", "website"]}, "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(10)
    enq_by_source = [{"source": r["_id"], "count": r["count"]} for r in enq_by_source]
    most_enquired = await db.enquiries.aggregate([{"$match": {"product_id": {"$ne": None}, "product_name": {"$ne": None}}}, {"$group": {"_id": "$product_id", "product_name": {"$first": "$product_name"}, "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 5}]).to_list(5)
    most_enquired = [{"product_id": r["_id"], "product_name": r["product_name"], "count": r["count"]} for r in most_enquired]
    orders_this_week = await db.orders.count_documents({"created_at": {"$gte": week_start}, "order_status": {"$ne": "cancelled"}})
    orders_this_month = await db.orders.count_documents({"created_at": {"$gte": month_start}, "order_status": {"$ne": "cancelled"}})
    revenue_result = await db.orders.aggregate([{"$match": {"created_at": {"$gte": month_start}, "order_status": {"$ne": "cancelled"}}}, {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}]).to_list(1)
    revenue_this_month = revenue_result[0]["total"] if revenue_result else 0
    avg_order_value = round(revenue_this_month / revenue_result[0]["count"], 2) if revenue_result and revenue_result[0]["count"] > 0 else 0
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    revenue_by_day = await db.orders.aggregate([{"$match": {"created_at": {"$gte": thirty_days_ago}, "order_status": {"$ne": "cancelled"}}}, {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "revenue": {"$sum": "$total_amount"}, "orders": {"$sum": 1}}}, {"$sort": {"_id": 1}}]).to_list(31)
    revenue_by_day = [{"date": r["_id"], "revenue": r["revenue"], "orders": r["orders"]} for r in revenue_by_day]
    orders_by_status = await db.orders.aggregate([{"$group": {"_id": "$order_status", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(10)
    orders_by_status = [{"status": r["_id"], "count": r["count"]} for r in orders_by_status]
    top_selling = await db.orders.aggregate([{"$match": {"order_status": {"$ne": "cancelled"}}}, {"$lookup": {"from": "order_items", "localField": "id", "foreignField": "order_id", "as": "items"}}, {"$unwind": "$items"}, {"$group": {"_id": "$items.product_id", "product_name": {"$first": "$items.product_name"}, "product_code": {"$first": "$items.product_code"}, "units_sold": {"$sum": "$items.quantity"}, "revenue": {"$sum": "$items.total_price"}}}, {"$sort": {"units_sold": -1}}, {"$limit": 5}]).to_list(5)
    top_selling = [{"product_id": r["_id"], "product_name": r["product_name"], "product_code": r["product_code"], "units_sold": r["units_sold"], "revenue": r["revenue"]} for r in top_selling]
    # ── Margin analysis ──
    margin_products = await db.product_master.find(
        {"cost_price": {"$gt": 0}, "selling_price": {"$gt": 0}, "status": "active"},
        {"_id": 0, "product_name": 1, "product_code": 1, "cost_price": 1, "selling_price": 1}
    ).to_list(200)
    margin_data = []
    for p in margin_products:
        cp = p.get("cost_price", 0) or 0
        sp = p.get("selling_price", 0) or 0
        if sp > 0:
            margin_data.append({
                "product_name": p.get("product_name"), "product_code": p.get("product_code"),
                "cost_price": cp, "selling_price": sp,
                "margin_pct": round((sp - cp) / sp * 100, 1),
                "margin_abs": round(sp - cp, 0),
            })
    margin_data.sort(key=lambda x: x["margin_pct"], reverse=True)
    margin_data = margin_data[:10]
    # ── Sell-through ──
    edition_products = await db.product_master.find(
        {"edition_size": {"$gt": 0}, "status": "active"},
        {"_id": 0, "id": 1, "product_name": 1, "product_code": 1, "edition_size": 1}
    ).to_list(200)
    all_sold_agg = await db.order_items.aggregate([
        {"$group": {"_id": "$product_id", "total": {"$sum": "$quantity"}}}
    ]).to_list(1000)
    sold_map = {r["_id"]: r["total"] for r in all_sold_agg}
    sell_through_data = []
    for p in edition_products:
        units_sold = sold_map.get(p["id"], 0)
        es = p.get("edition_size", 0) or 0
        sell_through_data.append({
            "product_name": p.get("product_name"), "product_code": p.get("product_code"),
            "edition_size": es, "units_sold": units_sold,
            "sell_through_pct": round(units_sold / es * 100, 1) if es > 0 else 0,
        })
    sell_through_data.sort(key=lambda x: x["sell_through_pct"], reverse=True)
    sell_through_data = sell_through_data[:10]
    return {"production": {"open_jobs": open_jobs, "completed_this_week": completed_this_week, "overdue_jobs": overdue_jobs, "jobs_by_work_type": jobs_by_work_type, "open_jobs_list": open_jobs_list}, "inventory": {"total_finished_goods": total_finished_goods, "finished_goods": finished_goods, "materials_stock": materials_stock, "low_stock_count": len(low_stock), "low_stock": low_stock}, "enquiries": {"new_this_week": new_enquiries_week, "by_status": enq_by_status, "by_source": enq_by_source, "most_enquired": most_enquired}, "orders": {"this_week": orders_this_week, "this_month": orders_this_month, "revenue_this_month": revenue_this_month, "avg_order_value": avg_order_value, "revenue_by_day": revenue_by_day, "by_status": orders_by_status}, "top_products": {"top_selling": top_selling, "most_enquired": most_enquired}, "margins": {"products": margin_data}, "sell_through": {"products": sell_through_data}}

# =====================================================================
# EXCEL EXPORT MODULE
# =====================================================================

# All export endpoints accept optional filter params matching their list endpoints.
# This means the frontend can pass its active filters and get a filtered export
# instead of always dumping the full collection.

@api_router.get("/admin/export/suppliers")
async def export_suppliers(
    user: dict = Depends(require_editor_or_admin),
    supplier_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    query = {}
    if supplier_type: query["supplier_type"] = supplier_type
    if status: query["status"] = status
    if search:
        query["$or"] = [
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"supplier_code": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
        ]
    suppliers = await db.suppliers.find(query, {"_id": 0}).sort("supplier_code", 1).to_list(10000)
    return [{"Code": s.get("supplier_code"), "Name": s.get("supplier_name"), "Type": s.get("supplier_type"), "Contact": s.get("contact_person"), "Phone": s.get("phone"), "Email": s.get("email"), "City": s.get("city"), "State": s.get("state"), "GST": s.get("gst_number"), "Payment Terms": s.get("payment_terms"), "Lead Time (days)": s.get("lead_time_days"), "Status": s.get("status")} for s in suppliers]

@api_router.get("/admin/export/materials")
async def export_materials(
    user: dict = Depends(require_editor_or_admin),
    material_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    query = {}
    if material_type: query["material_type"] = material_type
    if status: query["status"] = status
    if search:
        query["$or"] = [
            {"material_name": {"$regex": search, "$options": "i"}},
            {"material_code": {"$regex": search, "$options": "i"}},
        ]
    materials = await db.materials.find(query, {"_id": 0}).sort("material_code", 1).to_list(10000)
    return [{"Code": m.get("material_code"), "Name": m.get("material_name"), "Type": m.get("material_type"), "Fabric Type": m.get("fabric_type"), "Colour": m.get("color"), "Unit": m.get("unit_of_measure"), "Stock Qty": m.get("current_stock_qty"), "Location": m.get("storage_location"), "Fabric Count": m.get("fabric_count"), "GSM": m.get("gsm"), "Origin": m.get("origin_region"), "Composition": m.get("composition"), "Status": m.get("status")} for m in materials]

@api_router.get("/admin/export/products")
async def export_products(
    user: dict = Depends(require_editor_or_admin),
    category: Optional[str] = None,
    status: Optional[str] = None,
    pricing_mode: Optional[str] = None,
    search: Optional[str] = None,
):
    query = {}
    if category: query["category"] = category
    if status: query["status"] = status
    if pricing_mode: query["pricing_mode"] = pricing_mode
    if search:
        query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"product_code": {"$regex": search, "$options": "i"}},
        ]
    products = await db.product_master.find(query, {"_id": 0}).sort("product_code", 1).to_list(10000)
    return [{"Code": p.get("product_code"), "Name": p.get("product_name"), "Category": p.get("category"), "Collection": p.get("collection_name"), "Pricing Mode": p.get("pricing_mode"), "Price": p.get("price"), "Edition Size": p.get("edition_size"), "Status": p.get("status")} for p in products]

@api_router.get("/admin/export/production-jobs")
async def export_production_jobs(
    user: dict = Depends(require_editor_or_admin),
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    product_id: Optional[str] = None,
    search: Optional[str] = None,
):
    query = {}
    if status: query["status"] = status
    if supplier_id: query["supplier_id"] = supplier_id
    if product_id: query["product_id"] = product_id
    if search:
        query["$or"] = [
            {"job_code": {"$regex": search, "$options": "i"}},
            {"product_name": {"$regex": search, "$options": "i"}},
        ]
    jobs = await db.production_jobs.find(query, {"_id": 0}).sort("job_code", 1).to_list(10000)
    return [{"Job Code": j.get("job_code"), "Product": j.get("product_name"), "Product Code": j.get("product_code"), "Supplier": j.get("supplier_name"), "Work Type": j.get("work_type"), "Qty Planned": j.get("quantity_planned"), "Qty Completed": j.get("quantity_completed"), "Start Date": j.get("start_date"), "Proposed End": j.get("proposed_end_date"), "Due Date": j.get("due_date"), "Actual Completion": j.get("actual_completion_date"), "Cost to Pay": j.get("cost_to_pay"), "Amount Paid": j.get("amount_paid"), "Incentive": j.get("incentive_amount"), "Status": j.get("status")} for j in jobs]

@api_router.get("/admin/export/enquiries")
async def export_enquiries(
    user: dict = Depends(require_editor_or_admin),
    status: Optional[str] = None,
    enquiry_source: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = {}
    if status: query["status"] = status
    if enquiry_source: query["enquiry_source"] = enquiry_source
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"enquiry_code": {"$regex": search, "$options": "i"}},
        ]
    if date_from or date_to:
        query["created_at"] = {}
        if date_from: query["created_at"]["$gte"] = date_from
        if date_to: query["created_at"]["$lte"] = date_to + "T23:59:59"
    enquiries = await db.enquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return [{"Code": e.get("enquiry_code", e.get("id", "")[:8]), "Customer": e.get("customer_name") or e.get("name"), "Email": e.get("customer_email") or e.get("email"), "Phone": e.get("customer_phone") or e.get("phone"), "City": e.get("customer_city"), "Product": e.get("product_name"), "Source": e.get("enquiry_source", "website"), "Status": e.get("status"), "Date": e.get("created_at", "")[:10]} for e in enquiries]

@api_router.get("/admin/export/orders")
async def export_orders(
    user: dict = Depends(require_editor_or_admin),
    order_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = {}
    if order_status: query["order_status"] = order_status
    if payment_status: query["payment_status"] = payment_status
    if search:
        query["$or"] = [
            {"order_code": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
        ]
    if date_from or date_to:
        query["created_at"] = {}
        if date_from: query["created_at"]["$gte"] = date_from
        if date_to: query["created_at"]["$lte"] = date_to + "T23:59:59"
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return [{"Order Code": o.get("order_code"), "Customer": o.get("customer_name"), "Email": o.get("customer_email"), "Phone": o.get("customer_phone"), "City": o.get("customer_city"), "Total Amount": o.get("total_amount"), "Order Status": o.get("order_status"), "Payment Status": o.get("payment_status"), "Payment Ref": o.get("payment_reference"), "Date": o.get("created_at", "")[:10]} for o in orders]

# ── New: 3 previously missing export endpoints ────────────────────────

@api_router.get("/admin/export/material-purchases")
async def export_material_purchases(
    user: dict = Depends(require_editor_or_admin),
    material_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    status: Optional[str] = None,
    payment_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = {}
    if material_id: query["material_id"] = material_id
    if supplier_id: query["supplier_id"] = supplier_id
    if status: query["status"] = status
    if payment_type: query["payment_type"] = payment_type
    if date_from or date_to:
        query["purchase_date"] = {}
        if date_from: query["purchase_date"]["$gte"] = date_from
        if date_to: query["purchase_date"]["$lte"] = date_to
    purchases = await db.material_purchases.find(query, {"_id": 0}).sort("purchase_date", -1).to_list(10000)
    return [{"Code": p.get("purchase_code"), "Material": p.get("material_name"), "Material Code": p.get("material_code"), "Supplier": p.get("supplier_name"), "Qty Received": p.get("quantity_received"), "Qty Available": p.get("quantity_available"), "Unit": p.get("unit_of_measure"), "Unit Price": p.get("unit_price"), "Total Cost": p.get("total_cost"), "Payment Type": p.get("payment_type"), "Invoice No": p.get("invoice_number"), "Purchase Date": p.get("purchase_date"), "Status": p.get("status")} for p in purchases]

@api_router.get("/admin/export/inventory-movements")
async def export_inventory_movements(
    user: dict = Depends(require_editor_or_admin),
    entity_type: Optional[str] = None,
    movement_type: Optional[str] = None,
    product_id: Optional[str] = None,
    material_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = {}
    if entity_type: query["entity_type"] = entity_type
    if movement_type: query["movement_type"] = movement_type
    if product_id: query["product_id"] = product_id
    if material_id: query["material_id"] = material_id
    if date_from or date_to:
        query["created_at"] = {}
        if date_from: query["created_at"]["$gte"] = date_from
        if date_to: query["created_at"]["$lte"] = date_to + "T23:59:59"
    movements = await db.inventory_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return [{"Entity Type": m.get("entity_type"), "Movement Type": m.get("movement_type"), "Quantity": m.get("quantity"), "Product ID": m.get("product_id"), "Material ID": m.get("material_id"), "Reference Type": m.get("reference_type"), "Reference ID": m.get("reference_id"), "Reason": m.get("reason"), "Location": m.get("location"), "By": m.get("created_by_name"), "Date": m.get("created_at", "")[:19]} for m in movements]

@api_router.get("/admin/export/material-allocations")
async def export_material_allocations(
    user: dict = Depends(require_editor_or_admin),
    production_job_id: Optional[str] = None,
    material_purchase_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = {}
    if production_job_id: query["production_job_id"] = production_job_id
    if material_purchase_id: query["material_purchase_id"] = material_purchase_id
    if date_from or date_to:
        query["created_at"] = {}
        if date_from: query["created_at"]["$gte"] = date_from
        if date_to: query["created_at"]["$lte"] = date_to + "T23:59:59"
    allocations = await db.material_allocations.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return [{"Code": a.get("allocation_code"), "Job Code": a.get("job_code"), "Product": a.get("product_name"), "Material": a.get("material_name"), "Material Code": a.get("material_code"), "Qty Allocated": a.get("quantity_allocated"), "Qty Used": a.get("quantity_used"), "Unit": a.get("unit_of_measure"), "Notes": a.get("notes"), "By": a.get("created_by_name"), "Date": a.get("created_at", "")[:10]} for a in allocations]

# =====================================================================
# DUPLICATE FUNCTIONALITY
# =====================================================================

@api_router.post("/admin/production-jobs/{job_id}/duplicate")
async def duplicate_production_job(job_id: str, user: dict = Depends(require_editor_or_admin)):
    source = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Job not found")
    new_code = await generate_job_code()
    now = datetime.now(timezone.utc).isoformat()
    new_job = {**source, "id": str(uuid.uuid4()), "job_code": new_code, "status": "planned", "quantity_completed": 0, "actual_completion_date": None, "amount_paid": 0, "payment_date": None, "edit_flag": False, "edited_at": None, "created_by": user.get("id"), "created_by_name": user.get("name"), "created_at": now, "updated_at": now}
    await db.production_jobs.insert_one(new_job)
    new_job.pop("_id", None)
    await log_activity(user, "production_job.duplicated", "production_job", new_job["id"], {"from": job_id, "new_code": new_code})
    return new_job

@api_router.post("/admin/product-master/{product_id}/duplicate")
async def duplicate_product_master(product_id: str, user: dict = Depends(require_editor_or_admin)):
    source = await db.product_master.find_one({"id": product_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Product not found")
    attrs = await db.product_attributes.find_one({"product_id": product_id}, {"_id": 0})
    new_code = await generate_product_code(source.get("category", "accessory"))
    now = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    new_product = {**source, "id": new_id, "product_code": new_code, "status": "draft", "website_product_id": None, "created_by": user.get("id"), "created_by_name": user.get("name"), "created_at": now, "updated_at": now}
    await db.product_master.insert_one(new_product)
    if attrs:
        new_attrs = {**attrs, "id": str(uuid.uuid4()), "product_id": new_id, "created_at": now, "updated_at": now}
        await db.product_attributes.insert_one(new_attrs)
    new_product.pop("_id", None)
    await log_activity(user, "product_master.duplicated", "product_master", new_id, {"from": product_id, "new_code": new_code})
    return new_product

@api_router.get("/admin/production-jobs/{job_id}/audit-log")
async def get_job_audit_log(job_id: str, user: dict = Depends(require_editor_or_admin)):
    logs = await db.production_job_audit_log.find({"job_id": job_id}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return logs

class BulkImportPayload(BaseModel):
    rows: List[Dict[str, Any]]

class BulkIdsPayload(BaseModel):
    ids: List[str]

class BulkEnquiryStatusPayload(BaseModel):
    ids: List[str]
    status: str

@api_router.post("/admin/product-master/bulk-activate")
async def bulk_activate_products(payload: BulkIdsPayload, user: dict = Depends(require_editor_or_admin)):
    now = datetime.now(timezone.utc).isoformat()
    count = 0
    for pid in payload.ids:
        r = await db.product_master.update_one(
            {"id": pid, "status": "draft"},
            {"$set": {"status": "active", "updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}}
        )
        if r.modified_count: count += 1
    await log_activity(user, "product_master.bulk_activated", "product_master", None, {"count": count})
    return {"updated": count}

@api_router.post("/admin/product-master/bulk-archive")
async def bulk_archive_products(payload: BulkIdsPayload, user: dict = Depends(require_editor_or_admin)):
    now = datetime.now(timezone.utc).isoformat()
    r = await db.product_master.update_many(
        {"id": {"$in": payload.ids}},
        {"$set": {"status": "archived", "updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}}
    )
    await log_activity(user, "product_master.bulk_archived", "product_master", None, {"count": r.modified_count})
    return {"updated": r.modified_count}

@api_router.post("/admin/enquiries/bulk-status")
async def bulk_update_enquiry_status(payload: BulkEnquiryStatusPayload, user: dict = Depends(require_editor_or_admin)):
    valid = ["new", "contacted", "negotiating", "converted", "closed"]
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status")
    now = datetime.now(timezone.utc).isoformat()
    r = await db.enquiries.update_many(
        {"id": {"$in": payload.ids}},
        {"$set": {"status": payload.status, "updated_at": now}}
    )
    await log_activity(user, "enquiry.bulk_status_updated", "enquiry", None, {"count": r.modified_count, "status": payload.status})
    return {"updated": r.modified_count}

@api_router.post("/admin/production-jobs/bulk-cancel")
async def bulk_cancel_jobs(payload: BulkIdsPayload, user: dict = Depends(require_editor_or_admin)):
    now = datetime.now(timezone.utc).isoformat()
    r = await db.production_jobs.update_many(
        {"id": {"$in": payload.ids}, "status": {"$nin": ["completed", "cancelled"]}},
        {"$set": {"status": "cancelled", "updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}}
    )
    await log_activity(user, "production_job.bulk_cancelled", "production_job", None, {"count": r.modified_count})
    return {"updated": r.modified_count}

@api_router.post("/admin/import/suppliers")
async def import_suppliers(payload: BulkImportPayload, user: dict = Depends(require_editor_or_admin)):
    now = datetime.now(timezone.utc).isoformat()
    created = updated = 0
    def safe_int(v):
        try: return int(v)
        except: return None
    for row in payload.rows:
        supplier_name = (row.get("supplier_name") or "").strip()
        supplier_type = (row.get("supplier_type") or "").strip()
        if not supplier_name or supplier_type not in SUPPLIER_TYPES:
            continue
        code_in_row = (row.get("supplier_code") or "").strip()
        existing = await db.suppliers.find_one({"supplier_code": code_in_row}, {"_id": 0}) if code_in_row else None
        if existing:
            await db.suppliers.update_one({"supplier_code": code_in_row}, {"$set": {
                "supplier_name": supplier_name, "supplier_type": supplier_type,
                "contact_person": row.get("contact_person", existing.get("contact_person", "")),
                "phone": row.get("phone", existing.get("phone", "")),
                "alternate_phone": row.get("alternate_phone", existing.get("alternate_phone", "")),
                "email": row.get("email", existing.get("email", "")),
                "address_line_1": row.get("address_line_1", existing.get("address_line_1", "")),
                "address_line_2": row.get("address_line_2", existing.get("address_line_2", "")),
                "city": row.get("city", existing.get("city", "")),
                "state": row.get("state", existing.get("state", "")),
                "country": row.get("country") or existing.get("country") or "India",
                "gst_number": row.get("gst_number", existing.get("gst_number", "")),
                "payment_terms": row.get("payment_terms", existing.get("payment_terms", "")),
                "lead_time_days": safe_int(row.get("lead_time_days")) if row.get("lead_time_days") else existing.get("lead_time_days"),
                "notes": row.get("notes", existing.get("notes", "")),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"), "updated_at": now,
            }})
            updated += 1
        else:
            supplier_code = await generate_supplier_code()
            await db.suppliers.insert_one({
                "id": str(uuid.uuid4()), "supplier_code": supplier_code,
                "supplier_name": supplier_name, "supplier_type": supplier_type,
                "contact_person": row.get("contact_person", ""), "phone": row.get("phone", ""),
                "alternate_phone": row.get("alternate_phone", ""), "email": row.get("email", ""),
                "address_line_1": row.get("address_line_1", ""), "address_line_2": row.get("address_line_2", ""),
                "city": row.get("city", ""), "state": row.get("state", ""),
                "country": row.get("country") or "India",
                "gst_number": row.get("gst_number", ""), "payment_terms": row.get("payment_terms", ""),
                "lead_time_days": safe_int(row.get("lead_time_days")),
                "notes": row.get("notes", ""), "status": "active",
                "created_by": user.get("id"), "created_by_name": user.get("name"),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"),
                "created_at": now, "updated_at": now,
            })
            created += 1
    await log_activity(user, "supplier.bulk_imported", "supplier", None, {"created": created, "updated": updated})
    return {"created": created, "updated": updated}

@api_router.post("/admin/import/materials")
async def import_materials(payload: BulkImportPayload, user: dict = Depends(require_editor_or_admin)):
    now = datetime.now(timezone.utc).isoformat()
    created = updated = 0
    def safe_float(v):
        try: return float(v)
        except: return None
    for row in payload.rows:
        material_name = (row.get("material_name") or "").strip()
        material_type = (row.get("material_type") or "").strip()
        unit_of_measure = (row.get("unit_of_measure") or "").strip()
        if not material_name or material_type not in MATERIAL_TYPES or unit_of_measure not in UNITS_OF_MEASURE:
            continue
        code_in_row = (row.get("material_code") or "").strip()
        existing = await db.materials.find_one({"material_code": code_in_row}, {"_id": 0}) if code_in_row else None
        is_fabric = material_type == "fabric"
        if existing:
            await db.materials.update_one({"material_code": code_in_row}, {"$set": {
                "material_name": material_name, "material_type": material_type,
                "unit_of_measure": unit_of_measure,
                "color": row.get("color", existing.get("color", "")),
                "description": row.get("description", existing.get("description", "")),
                "fabric_type": row.get("fabric_type") if is_fabric else existing.get("fabric_type"),
                "weave_type": row.get("weave_type") if is_fabric else existing.get("weave_type"),
                "gsm": safe_float(row.get("gsm")) if (is_fabric and row.get("gsm")) else existing.get("gsm"),
                "origin_region": row.get("origin_region") if is_fabric else existing.get("origin_region"),
                "composition": row.get("composition") if is_fabric else existing.get("composition"),
                "storage_location": row.get("storage_location", existing.get("storage_location", "")),
                "current_stock_qty": safe_float(row.get("current_stock_qty")) if row.get("current_stock_qty") else existing.get("current_stock_qty", 0),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"), "updated_at": now,
            }})
            updated += 1
        else:
            material_code = await generate_material_code()
            await db.materials.insert_one({
                "id": str(uuid.uuid4()), "material_code": material_code,
                "material_name": material_name, "material_type": material_type,
                "unit_of_measure": unit_of_measure, "color": row.get("color", ""),
                "description": row.get("description", ""),
                "fabric_type": row.get("fabric_type") if is_fabric else None,
                "weave_type": row.get("weave_type") if is_fabric else None,
                "gsm": safe_float(row.get("gsm")) if is_fabric else None,
                "origin_region": row.get("origin_region") if is_fabric else None,
                "composition": row.get("composition") if is_fabric else None,
                "fabric_count": row.get("fabric_count") if is_fabric else None,
                "swatch_url": row.get("swatch_url", ""),
                "current_stock_qty": safe_float(row.get("current_stock_qty")) or 0,
                "storage_location": row.get("storage_location", ""),
                "supplier_id": row.get("supplier_id") or None,
                "status": "active",
                "created_by": user.get("id"), "created_by_name": user.get("name"),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"),
                "created_at": now, "updated_at": now,
            })
            created += 1
    await log_activity(user, "material.bulk_imported", "material", None, {"created": created, "updated": updated})
    return {"created": created, "updated": updated}

@api_router.post("/admin/import/products")
async def import_products(payload: BulkImportPayload, user: dict = Depends(require_editor_or_admin)):
    now = datetime.now(timezone.utc).isoformat()
    created = updated = 0
    def safe_float(v):
        try: return float(v)
        except: return None
    for row in payload.rows:
        product_name = (row.get("product_name") or "").strip()
        category = (row.get("category") or "").strip()
        pricing_mode = (row.get("pricing_mode") or "").strip()
        if not product_name or category not in PRODUCT_CATEGORIES or pricing_mode not in PRICING_MODES:
            continue
        code_in_row = (row.get("product_code") or "").strip()
        existing = await db.product_master.find_one({"product_code": code_in_row}, {"_id": 0}) if code_in_row else None
        price_val = safe_float(row.get("selling_price") or row.get("price"))
        if existing:
            await db.product_master.update_one({"product_code": code_in_row}, {"$set": {
                "product_name": product_name, "category": category, "pricing_mode": pricing_mode,
                "subcategory": row.get("subcategory") or existing.get("subcategory"),
                "collection_name": row.get("collection_name") or existing.get("collection_name"),
                "drop_name": row.get("drop_name") or existing.get("drop_name"),
                "description": row.get("description") or existing.get("description"),
                "currency": row.get("currency") or existing.get("currency") or "INR",
                "price": price_val if price_val is not None else existing.get("price"),
                "selling_price": price_val if price_val is not None else existing.get("selling_price"),
                "product_type": row.get("product_type") or existing.get("product_type"),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"), "updated_at": now,
            }})
            updated += 1
        else:
            product_code = await generate_product_code(category)
            design_code = (row.get("collection_name") or "GEN")[:3]
            sku = generate_sku(category, "GEN", product_code, design_code)
            hsn = get_hsn_code(category, None)
            await db.product_master.insert_one({
                "id": str(uuid.uuid4()), "product_code": product_code, "product_name": product_name,
                "category": category, "subcategory": row.get("subcategory", ""),
                "collection_name": row.get("collection_name", ""), "drop_name": row.get("drop_name", ""),
                "pricing_mode": pricing_mode, "price": price_val, "currency": row.get("currency") or "INR",
                "edition_size": None, "release_date": None, "description": row.get("description", ""),
                "website_product_id": None, "listing_status": "backend_only",
                "product_type": row.get("product_type") or None, "composition_pct": None,
                "hsn_code": hsn, "gst_rate": None, "cost_price": None, "selling_price": price_val,
                "hide_price": False, "display_edition": True, "sku": sku,
                "status": "draft",
                "created_by": user.get("id"), "created_by_name": user.get("name"),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"),
                "created_at": now, "updated_at": now,
            })
            created += 1
    await log_activity(user, "product_master.bulk_imported", "product_master", None, {"created": created, "updated": updated})
    return {"created": created, "updated": updated}

@api_router.post("/admin/import/production-jobs")
async def import_production_jobs(payload: BulkImportPayload, user: dict = Depends(require_editor_or_admin)):
    now = datetime.now(timezone.utc).isoformat()
    created = updated = skipped = 0
    def safe_float(v):
        try: return float(v)
        except: return None
    for row in payload.rows:
        product_code = (row.get("product_code") or "").strip()
        supplier_code = (row.get("supplier_code") or "").strip()
        quantity_planned = safe_float(row.get("quantity_planned")) or 0
        if not product_code or not supplier_code or quantity_planned <= 0:
            skipped += 1
            continue
        code_in_row = (row.get("job_code") or "").strip()
        existing = await db.production_jobs.find_one({"job_code": code_in_row}, {"_id": 0}) if code_in_row else None
        if existing:
            await db.production_jobs.update_one({"job_code": code_in_row}, {"$set": {
                "quantity_planned": quantity_planned,
                "due_date": row.get("due_date") or existing.get("due_date"),
                "start_date": row.get("start_date") or existing.get("start_date"),
                "notes": row.get("notes") or existing.get("notes", ""),
                "work_type": row.get("work_type") or existing.get("work_type"),
                "proposed_end_date": row.get("proposed_end_date") or existing.get("proposed_end_date"),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"), "updated_at": now,
            }})
            updated += 1
        else:
            product = await db.product_master.find_one({"product_code": product_code}, {"_id": 0})
            supplier = await db.suppliers.find_one({"supplier_code": supplier_code, "status": "active"}, {"_id": 0})
            if not product or not supplier:
                skipped += 1
                continue
            job_code = await generate_job_code()
            await db.production_jobs.insert_one({
                "id": str(uuid.uuid4()), "job_code": job_code,
                "product_id": product["id"], "product_name": product.get("product_name"),
                "product_code": product.get("product_code"), "supplier_id": supplier["id"],
                "supplier_name": supplier.get("supplier_name"), "supplier_code": supplier.get("supplier_code"),
                "quantity_planned": quantity_planned, "quantity_completed": 0,
                "start_date": row.get("start_date") or None, "due_date": row.get("due_date") or None,
                "actual_completion_date": None, "status": "planned",
                "notes": row.get("notes", ""), "work_type": row.get("work_type") or None,
                "parent_job_id": None, "sequence_number": None,
                "stage_group_id": str(uuid.uuid4())[:8],
                "proposed_end_date": row.get("proposed_end_date") or None,
                "cost_to_pay": None, "amount_paid": 0, "payment_date": None,
                "payment_notes": None, "incentive_amount": None, "incentive_reason": None,
                "total_product_cost": None,
                "created_by": user.get("id"), "created_by_name": user.get("name"),
                "updated_by": user.get("id"), "updated_by_name": user.get("name"),
                "created_at": now, "updated_at": now,
            })
            created += 1
    await log_activity(user, "production_job.bulk_imported", "production_job", None, {"created": created, "updated": updated, "skipped": skipped})
    return {"created": created, "updated": updated, "skipped": skipped}

app.include_router(api_router)
