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
    if user["role"] != "admin":
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
    elif pricing_mode == "fixed_price" and p.get("price"):
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
    for p in products:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
        if isinstance(p.get("updated_at"), str):
            p["updated_at"] = datetime.fromisoformat(p["updated_at"])
        resolve_commerce_flags(p)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    resolve_commerce_flags(product)
    return product

@api_router.get("/products/slug/{slug}")
async def get_product_by_slug(slug: str):
    product = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    resolve_commerce_flags(product)
    return product

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
    await db.products.insert_one(product_dict)
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
    await db.products.update_one({"id": product_id}, {"$set": update_data})
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
    secondary = await db.products.find({"is_secondary_highlight": True, "is_hidden": {"$ne": True}}, {"_id": 0}).sort("secondary_highlight_order", 1).to_list(2)
    for s in secondary:
        resolve_commerce_flags(s)
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
async def get_activity_logs(user: dict = Depends(require_admin), limit: int = 100, user_id: Optional[str] = None, action: Optional[str] = None):
    query = {}
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
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
# MATERIALS MASTER MODULE
# Append this block to server.py before app.include_router(api_router)
# =====================================================================

# ── Controlled value enums ────────────────────────────────────────────

MATERIAL_TYPES = [
    "fabric",
    "thread",
    "trim",
    "accessory",
    "packaging",
    "dye",
    "other",
]

UNITS_OF_MEASURE = [
    "metre",
    "yard",
    "piece",
    "gram",
    "kilogram",
    "spool",
    "unit",
]

FABRIC_TYPES = [
    "Tussar Silk",
    "Mulberry Silk",
    "Cotton",
    "Cotton Tussar",
    "Linen",
    "Georgette",
    "Chiffon",
    "Crepe",
    "Satin",
    "Organza",
    "Velvet",
    "Chanderi",
    "Banarasi",
    "Khadi",
    "Other",
]

# ── Material Models ───────────────────────────────────────────────────

class MaterialCreate(BaseModel):
    material_name: str
    material_type: str
    fabric_type: Optional[str] = None
    color: Optional[str] = None
    unit_of_measure: str
    description: Optional[str] = None
    # Fabric-specific optional attributes
    weave_type: Optional[str] = None
    gsm: Optional[float] = None
    origin_region: Optional[str] = None
    composition: Optional[str] = None
    swatch_url: Optional[str] = None
    current_stock_qty: Optional[float] = None
    storage_location: Optional[str] = None

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

# ── Material Code Generator ───────────────────────────────────────────

async def generate_material_code() -> str:
    """Generate next MAT-001, MAT-002 etc. Uses count-based approach for reliability."""
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

# ── Material Routes ───────────────────────────────────────────────────

@api_router.get("/admin/materials/meta")
async def get_material_meta(user: dict = Depends(require_editor_or_admin)):
    """Return all controlled values for dropdowns."""
    return {
        "material_types": MATERIAL_TYPES,
        "units_of_measure": UNITS_OF_MEASURE,
        "fabric_types": FABRIC_TYPES,
    }

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
    if material_type:
        query["material_type"] = material_type
    if fabric_type:
        query["fabric_type"] = fabric_type
    if color:
        query["color"] = {"$regex": color, "$options": "i"}
    if status:
        query["status"] = status
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
    # Placeholder counts for linked records (populated once those modules exist)
    material["_linked"] = {
        "purchase_count": await db.material_purchases.count_documents({"material_id": material_id}) if await db.list_collection_names() and "material_purchases" in await db.list_collection_names() else 0,
        "allocation_count": 0,
    }
    return material

@api_router.post("/admin/materials")
async def create_material(data: MaterialCreate, user: dict = Depends(require_editor_or_admin)):
    # Validate controlled values
    if data.material_type not in MATERIAL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid material_type. Must be one of: {', '.join(MATERIAL_TYPES)}")
    if data.unit_of_measure not in UNITS_OF_MEASURE:
        raise HTTPException(status_code=400, detail=f"Invalid unit_of_measure. Must be one of: {', '.join(UNITS_OF_MEASURE)}")
    if data.fabric_type and data.fabric_type not in FABRIC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid fabric_type.")
    # fabric_type only makes sense for fabric material_type
    fabric_type = data.fabric_type if data.material_type == "fabric" else None
    weave_type = data.weave_type if data.material_type == "fabric" else None
    gsm = data.gsm if data.material_type == "fabric" else None
    origin_region = data.origin_region if data.material_type == "fabric" else None
    composition = data.composition if data.material_type == "fabric" else None

    material_code = await generate_material_code()
    material = {
        "id": str(uuid.uuid4()),
        "material_code": material_code,
        "material_name": data.material_name,
        "material_type": data.material_type,
        "fabric_type": fabric_type,
        "color": data.color,
        "unit_of_measure": data.unit_of_measure,
        "description": data.description,
        "weave_type": weave_type,
        "gsm": gsm,
        "origin_region": origin_region,
        "composition": composition,
        "swatch_url": data.swatch_url,
        "current_stock_qty": data.current_stock_qty or 0,
        "storage_location": data.storage_location,
        "status": "active",
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_by": user.get("id"),
        "updated_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.materials.insert_one(material)
    material.pop("_id", None)
    await log_activity(user, "material.created", "material", material["id"], {
        "name": data.material_name, "code": material_code, "type": data.material_type
    })
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

    update = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("id"),
        "updated_by_name": user.get("name"),
    }
    for field in ["material_name", "material_type", "fabric_type", "color",
                  "unit_of_measure", "description", "weave_type", "gsm",
                  "origin_region", "composition", "status", "swatch_url", "current_stock_qty", "storage_location"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val

    # If material_type changed away from fabric, clear fabric-only fields
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
    result = await db.materials.update_one(
        {"id": material_id},
        {"$set": {
            "status": "inactive",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id"),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    await log_activity(user, "material.deactivated", "material", material_id)
    return {"message": "Material deactivated"}

@api_router.post("/admin/materials/{material_id}/reactivate")
async def reactivate_material(material_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.materials.update_one(
        {"id": material_id},
        {"$set": {
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id"),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    await log_activity(user, "material.reactivated", "material", material_id)
    return {"message": "Material reactivated"}


# =====================================================================
# PRODUCT MASTER MODULE
# Append this block to server.py before app.include_router(api_router)
# =====================================================================

# ── Controlled value enums ────────────────────────────────────────────

PRODUCT_CATEGORIES = [
    "saree",
    "scarf",
    "dress",
    "jacket",
    "blouse",
    "accessory",
    "jewelry",
]

CATEGORY_CODES = {
    "saree":     "SAR",
    "scarf":     "SCF",
    "dress":     "DRS",
    "jacket":    "JKT",
    "blouse":    "BLO",
    "accessory": "ACC",
    "jewelry":   "JWL",
}

PRICING_MODES = ["direct_purchase", "price_on_request"]

PRODUCT_STATUSES = ["draft", "active", "archived"]

# ── Models ────────────────────────────────────────────────────────────

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
    attributes: Optional[ProductAttributesCreate] = None

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
    attributes: Optional[ProductAttributesCreate] = None

# ── Product Code Generator ────────────────────────────────────────────

async def generate_product_code(category: str) -> str:
    """
    Generate CH-SAR-001, CH-SAR-002, CH-SCF-001 etc.
    Counter is per category so each category starts at 001.
    """
    cat_code = CATEGORY_CODES.get(category, "PRD")
    prefix = f"CH-{cat_code}-"
    # Find highest existing number for this category
    all_in_cat = await db.product_master.find(
        {"product_code": {"$regex": f"^{prefix}"}},
        {"_id": 0, "product_code": 1}
    ).to_list(10000)
    nums = []
    for doc in all_in_cat:
        try:
            nums.append(int(doc["product_code"].split("-")[2]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"{prefix}{str(next_num).zfill(3)}"

# ── Product Master Routes ─────────────────────────────────────────────

@api_router.get("/admin/product-master/meta")
async def get_product_master_meta(user: dict = Depends(require_editor_or_admin)):
    return {
        "categories": PRODUCT_CATEGORIES,
        "category_codes": CATEGORY_CODES,
        "pricing_modes": PRICING_MODES,
        "statuses": PRODUCT_STATUSES,
        "design_categories": DESIGN_CATEGORIES if "DESIGN_CATEGORIES" in dir() else [],
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
        query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"product_code": {"$regex": search, "$options": "i"}},
        ]
    products = await db.product_master.find(query, {"_id": 0}).sort("product_code", 1).limit(limit).to_list(limit)
    return products

@api_router.get("/admin/product-master/{product_id}")
async def get_product_master(product_id: str, user: dict = Depends(require_editor_or_admin)):
    product = await db.product_master.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Fetch linked attributes
    attributes = await db.product_attributes.find_one({"product_id": product_id}, {"_id": 0})
    product["attributes"] = attributes or {}
    # Placeholder counts for future modules
    product["_linked"] = {
        "production_jobs": 0,
        "inventory_units": 0,
        "enquiries": await db.enquiries.count_documents({"product_id": product_id}),
        "orders": 0,
    }
    return product

@api_router.post("/admin/product-master")
async def create_product_master(data: ProductMasterCreate, user: dict = Depends(require_editor_or_admin)):
    # Validate
    if data.category not in PRODUCT_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(PRODUCT_CATEGORIES)}")
    if data.pricing_mode not in PRICING_MODES:
        raise HTTPException(status_code=400, detail=f"Invalid pricing_mode. Must be one of: {', '.join(PRICING_MODES)}")
    if data.pricing_mode == "direct_purchase" and not data.price:
        raise HTTPException(status_code=400, detail="Price is required for direct_purchase products")
    if data.edition_size is not None and data.edition_size <= 0:
        raise HTTPException(status_code=400, detail="edition_size must be greater than 0")

    product_code = await generate_product_code(data.category)
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    product = {
        "id": product_id,
        "product_code": product_code,
        "product_name": data.product_name,
        "category": data.category,
        "subcategory": data.subcategory,
        "collection_name": data.collection_name,
        "drop_name": data.drop_name,
        "pricing_mode": data.pricing_mode,
        "price": data.price,
        "currency": data.currency,
        "edition_size": data.edition_size,
        "release_date": data.release_date,
        "description": data.description,
        "website_product_id": data.website_product_id,
        "status": "draft",
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_by": user.get("id"),
        "updated_by_name": user.get("name"),
        "created_at": now,
        "updated_at": now,
    }
    await db.product_master.insert_one(product)
    product.pop("_id", None)

    # Save attributes if provided
    if data.attributes:
        attrs = data.attributes.model_dump()
        attrs["id"] = str(uuid.uuid4())
        attrs["product_id"] = product_id
        attrs["created_at"] = now
        attrs["updated_at"] = now
        await db.product_attributes.insert_one(attrs)

    await log_activity(user, "product_master.created", "product_master", product_id, {
        "name": data.product_name, "code": product_code, "category": data.category
    })
    return product

@api_router.put("/admin/product-master/{product_id}")
async def update_product_master(product_id: str, data: ProductMasterUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.product_master.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    if existing.get("status") == "archived":
        raise HTTPException(status_code=400, detail="Archived products cannot be edited. Reactivate first.")
    if data.category and data.category not in PRODUCT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    if data.pricing_mode and data.pricing_mode not in PRICING_MODES:
        raise HTTPException(status_code=400, detail="Invalid pricing_mode")
    if data.edition_size is not None and data.edition_size <= 0:
        raise HTTPException(status_code=400, detail="edition_size must be greater than 0")

    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}

    for field in ["product_name", "category", "subcategory", "collection_name", "drop_name",
                  "pricing_mode", "price", "currency", "edition_size", "release_date",
                  "description", "status", "website_product_id"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val

    # If switching to price_on_request, price can be null
    if data.pricing_mode == "price_on_request":
        update["price"] = data.price  # allow null

    await db.product_master.update_one({"id": product_id}, {"$set": update})

    # Update attributes
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

    await log_activity(user, "product_master.updated", "product_master", product_id, {"changes": list(update.keys())})
    return {"message": "Product updated successfully"}

@api_router.post("/admin/product-master/{product_id}/activate")
async def activate_product_master(product_id: str, user: dict = Depends(require_editor_or_admin)):
    product = await db.product_master.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Validate before activating
    if product.get("pricing_mode") == "direct_purchase" and not product.get("price"):
        raise HTTPException(status_code=400, detail="Cannot activate: price is required for direct_purchase products")
    if not product.get("edition_size"):
        raise HTTPException(status_code=400, detail="Cannot activate: edition_size is required")
    await db.product_master.update_one(
        {"id": product_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}}
    )
    await log_activity(user, "product_master.activated", "product_master", product_id)
    return {"message": "Product activated"}


# ── Category mapping from website collection_type → product master ─────

COLLECTION_TYPE_TO_CATEGORY = {
    "sarees":      "saree",
    "scarves":     "scarf",
    "dresses":     "dress",
    "jackets":     "jacket",
    "blouses":     "blouse",
    "accessories": "accessory",
    "jewelry":     "jewelry",
    # fallbacks
    "saree":       "saree",
    "scarf":       "scarf",
}

@api_router.post("/admin/product-master/import-from-website")
async def import_products_from_website(user: dict = Depends(require_editor_or_admin)):
    """
    One-time migration: reads all existing website products and creates
    Product Master records for any that don't already have one.
    Links via website_product_id.
    """
    # Get all existing website products
    website_products = await db.products.find({}, {"_id": 0}).to_list(1000)
    if not website_products:
        return {"message": "No website products found", "created": 0, "skipped": 0}

    # Get already-linked website_product_ids
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

        # Map collection_type to category
        collection_type = wp.get("collection_type", "").lower()
        category = COLLECTION_TYPE_TO_CATEGORY.get(collection_type, "accessory")

        # Map pricing mode
        pricing_mode = "price_on_request"
        price = None
        if wp.get("pricing_mode") == "fixed_price" and wp.get("price"):
            pricing_mode = "direct_purchase"
            price = wp.get("price")
        elif wp.get("price") and not wp.get("price_on_request"):
            pricing_mode = "direct_purchase"
            price = wp.get("price")

        # Generate product code
        product_code = await generate_product_code(category)
        product_id = str(uuid.uuid4())

        # Build master record
        master = {
            "id": product_id,
            "product_code": product_code,
            "product_name": wp.get("name", "Unnamed Product"),
            "category": category,
            "subcategory": None,
            "collection_name": wp.get("design_category"),
            "drop_name": None,
            "pricing_mode": pricing_mode,
            "price": price,
            "currency": wp.get("currency", "INR"),
            "edition_size": wp.get("edition_size"),
            "release_date": None,
            "description": wp.get("description") or wp.get("narrative_intro"),
            "website_product_id": wp_id,
            "status": "active" if not wp.get("is_hidden") else "draft",
            "created_by": user.get("id"),
            "created_by_name": user.get("name"),
            "updated_by": user.get("id"),
            "updated_by_name": user.get("name"),
            "created_at": now,
            "updated_at": now,
        }
        await db.product_master.insert_one(master)

        # Build attributes from website product fields
        attrs = {
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "primary_color": None,
            "secondary_color": None,
            "accent_color": None,
            "fabric_type": wp.get("material") or wp.get("craft_fabric"),
            "craft_technique": wp.get("work") or wp.get("craft_technique"),
            "motif_type": None,
            "motif_subject": None,
            "embroidery_type": None,
            "embroidery_density": None,
            "border_type": None,
            "pattern_scale": None,
            "art_inspiration": None,
            "aesthetic_category": wp.get("design_category"),
            "created_at": now,
            "updated_at": now,
        }
        # Try to extract colour from product details
        for detail in wp.get("details", []):
            label = detail.get("label", "").lower()
            if "colour" in label or "color" in label:
                attrs["primary_color"] = detail.get("value")
            if "motif" in label:
                attrs["motif_subject"] = detail.get("value")

        await db.product_attributes.insert_one(attrs)
        created.append(f"{product_code} — {master['product_name']}")

    await log_activity(user, "product_master.bulk_import", "product_master", None, {
        "created": len(created), "skipped": len(skipped)
    })

    return {
        "message": f"Import complete. {len(created)} created, {len(skipped)} already linked.",
        "created": len(created),
        "skipped": len(skipped),
        "created_list": created,
        "skipped_list": skipped,
    }

@api_router.post("/admin/product-master/{product_id}/archive")
async def archive_product_master(product_id: str, user: dict = Depends(require_editor_or_admin)):
    result = await db.product_master.update_one(
        {"id": product_id},
        {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("id")}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    await log_activity(user, "product_master.archived", "product_master", product_id)
    return {"message": "Product archived"}


# =====================================================================
# PRODUCTION JOBS MODULE
# Append this block to server.py before app.include_router(api_router)
# =====================================================================

# ── Controlled values ─────────────────────────────────────────────────

PRODUCTION_JOB_STATUSES = [
    "planned",
    "in_progress",
    "completed",
    "cancelled",
]

INVENTORY_MOVEMENT_TYPES = [
    "purchase_received",
    "material_allocated",
    "production_completed",
    "order_fulfilled",
    "inventory_adjustment",
]

INVENTORY_ENTITY_TYPES = ["material", "finished_good"]

# ── Models ────────────────────────────────────────────────────────────

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

class CompleteJobRequest(BaseModel):
    quantity_completed: int
    actual_completion_date: Optional[str] = None
    notes: Optional[str] = None

# ── Job Code Generator ────────────────────────────────────────────────

async def generate_job_code() -> str:
    """Generate next JOB-001, JOB-002 etc."""
    all_jobs = await db.production_jobs.find(
        {}, {"_id": 0, "job_code": 1}
    ).to_list(10000)
    nums = []
    for doc in all_jobs:
        try:
            nums.append(int(doc["job_code"].split("-")[1]))
        except Exception:
            pass
    next_num = max(nums) + 1 if nums else 1
    return f"JOB-{str(next_num).zfill(3)}"

# ── Inventory snapshot helper ─────────────────────────────────────────

async def update_inventory_snapshot(product_id: str, quantity_delta: float, location: str = None):
    """Update or create inventory snapshot for a finished good."""
    existing = await db.inventory.find_one(
        {"product_id": product_id, "entity_type": "finished_good"}, {"_id": 0}
    )
    if existing:
        new_qty = (existing.get("quantity") or 0) + quantity_delta
        await db.inventory.update_one(
            {"product_id": product_id, "entity_type": "finished_good"},
            {"$set": {"quantity": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.inventory.insert_one({
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "entity_type": "finished_good",
            "quantity": quantity_delta,
            "location": location,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

# ── Production Job Routes ─────────────────────────────────────────────

@api_router.get("/admin/production-jobs/meta")
async def get_production_jobs_meta(user: dict = Depends(require_editor_or_admin)):
    """Return controlled values + active products and suppliers for dropdowns."""
    products = await db.product_master.find(
        {"status": "active"}, {"_id": 0, "id": 1, "product_code": 1, "product_name": 1, "category": 1}
    ).sort("product_code", 1).to_list(500)
    suppliers = await db.suppliers.find(
        {"status": "active"}, {"_id": 0, "id": 1, "supplier_code": 1, "supplier_name": 1, "supplier_type": 1}
    ).sort("supplier_code", 1).to_list(500)
    return {
        "statuses": PRODUCTION_JOB_STATUSES,
        "products": products,
        "suppliers": suppliers,
    }

@api_router.get("/admin/production-jobs")
async def list_production_jobs(
    user: dict = Depends(require_editor_or_admin),
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    product_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if status: query["status"] = status
    if supplier_id: query["supplier_id"] = supplier_id
    if product_id: query["product_id"] = product_id
    if search:
        # Search by job_code or product_name (via lookup)
        query["$or"] = [
            {"job_code": {"$regex": search, "$options": "i"}},
            {"product_name": {"$regex": search, "$options": "i"}},
        ]
    jobs = await db.production_jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return jobs

@api_router.get("/admin/production-jobs/{job_id}")
async def get_production_job(job_id: str, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")
    # Enrich with linked product and supplier details
    if job.get("product_id"):
        product = await db.product_master.find_one({"id": job["product_id"]}, {"_id": 0, "product_code": 1, "product_name": 1, "category": 1, "collection_name": 1})
        job["_product"] = product or {}
    if job.get("supplier_id"):
        supplier = await db.suppliers.find_one({"id": job["supplier_id"]}, {"_id": 0, "supplier_code": 1, "supplier_name": 1, "supplier_type": 1, "city": 1})
        job["_supplier"] = supplier or {}
    # Placeholder counts
    job["_linked"] = {
        "material_allocations": 0,  # populated when material allocation module is built
        "inventory_movements": await db.inventory_movements.count_documents({"reference_id": job_id}) if "inventory_movements" in await db.list_collection_names() else 0,
    }
    return job

@api_router.post("/admin/production-jobs")
async def create_production_job(data: ProductionJobCreate, user: dict = Depends(require_editor_or_admin)):
    # Validate product exists and is active
    product = await db.product_master.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found in Product Master")
    if product.get("status") != "active":
        raise HTTPException(status_code=400, detail=f"Product must be active to create a production job. Current status: {product.get('status')}")
    # Validate supplier exists and is active
    supplier = await db.suppliers.find_one({"id": data.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=400, detail="Supplier not found")
    if supplier.get("status", "active") != "active":
        raise HTTPException(status_code=400, detail="Supplier is inactive")
    # Validate quantity
    if data.quantity_planned <= 0:
        raise HTTPException(status_code=400, detail="quantity_planned must be greater than 0")
    if data.work_type and data.work_type not in WORK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid work_type. Must be one of: {', '.join(WORK_TYPES)}")

    job_code = await generate_job_code()
    now = datetime.now(timezone.utc).isoformat()

    job = {
        "id": str(uuid.uuid4()),
        "job_code": job_code,
        "product_id": data.product_id,
        "product_name": product.get("product_name"),
        "product_code": product.get("product_code"),
        "supplier_id": data.supplier_id,
        "supplier_name": supplier.get("supplier_name"),
        "supplier_code": supplier.get("supplier_code"),
        "quantity_planned": data.quantity_planned,
        "quantity_completed": 0,
        "start_date": data.start_date,
        "due_date": data.due_date,
        "actual_completion_date": None,
        "status": "planned",
        "notes": data.notes,
        "work_type": data.work_type,
        "parent_job_id": data.parent_job_id,
        "sequence_number": data.sequence_number,
        "stage_group_id": data.stage_group_id or str(uuid.uuid4())[:8] if not data.parent_job_id else None,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_by": user.get("id"),
        "updated_by_name": user.get("name"),
        "created_at": now,
        "updated_at": now,
    }
    await db.production_jobs.insert_one(job)
    job.pop("_id", None)
    await log_activity(user, "production_job.created", "production_job", job["id"], {
        "code": job_code, "product": product.get("product_name"), "supplier": supplier.get("supplier_name")
    })
    return job

@api_router.put("/admin/production-jobs/{job_id}")
async def update_production_job(job_id: str, data: ProductionJobUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Production job not found")
    if existing.get("status") in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot edit a {existing['status']} job")
    if data.status and data.status not in PRODUCTION_JOB_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status")
    if data.quantity_planned is not None and data.quantity_planned <= 0:
        raise HTTPException(status_code=400, detail="quantity_planned must be > 0")
    if data.quantity_completed is not None:
        planned = data.quantity_planned or existing.get("quantity_planned", 0)
        if data.quantity_completed > planned:
            raise HTTPException(status_code=400, detail="quantity_completed cannot exceed quantity_planned")

    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}

    for field in ["supplier_id", "quantity_planned", "quantity_completed", "start_date",
                  "due_date", "actual_completion_date", "status", "notes",
                  "work_type", "parent_job_id", "sequence_number", "stage_group_id"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val

    # If supplier changed, update denormalised supplier_name
    if data.supplier_id:
        supplier = await db.suppliers.find_one({"id": data.supplier_id}, {"_id": 0})
        if supplier:
            update["supplier_name"] = supplier.get("supplier_name")
            update["supplier_code"] = supplier.get("supplier_code")

    await db.production_jobs.update_one({"id": job_id}, {"$set": update})
    await log_activity(user, "production_job.updated", "production_job", job_id, {"changes": list(update.keys())})
    return {"message": "Production job updated"}

@api_router.post("/admin/production-jobs/{job_id}/start")
async def start_production_job(job_id: str, user: dict = Depends(require_editor_or_admin)):
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "planned":
        raise HTTPException(status_code=400, detail="Only planned jobs can be started")
    now = datetime.now(timezone.utc).isoformat()
    await db.production_jobs.update_one(
        {"id": job_id},
        {"$set": {
            "status": "in_progress",
            "start_date": job.get("start_date") or now[:10],
            "updated_at": now,
            "updated_by": user.get("id"),
        }}
    )
    await log_activity(user, "production_job.started", "production_job", job_id)
    return {"message": "Job started"}

@api_router.post("/admin/production-jobs/{job_id}/complete")
async def complete_production_job(job_id: str, data: CompleteJobRequest, user: dict = Depends(require_editor_or_admin)):
    """
    Mark job as completed.
    Creates inventory_movements record (production_completed).
    Updates inventory snapshot.
    """
    job = await db.production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") not in ["planned", "in_progress"]:
        raise HTTPException(status_code=400, detail=f"Cannot complete a {job['status']} job")
    if data.quantity_completed <= 0:
        raise HTTPException(status_code=400, detail="quantity_completed must be > 0")
    if data.quantity_completed > job.get("quantity_planned", 0):
        raise HTTPException(status_code=400, detail="quantity_completed cannot exceed quantity_planned")
    # Validate dates
    if data.actual_completion_date and job.get("start_date"):
        if data.actual_completion_date < job["start_date"]:
            raise HTTPException(status_code=400, detail="Completion date cannot be before start date")

    now = datetime.now(timezone.utc).isoformat()
    completion_date = data.actual_completion_date or now[:10]

    # 1. Update job status
    await db.production_jobs.update_one(
        {"id": job_id},
        {"$set": {
            "status": "completed",
            "quantity_completed": data.quantity_completed,
            "actual_completion_date": completion_date,
            "notes": data.notes or job.get("notes"),
            "updated_at": now,
            "updated_by": user.get("id"),
            "updated_by_name": user.get("name"),
        }}
    )

    # 2. Create inventory movement — production_completed
    movement = {
        "id": str(uuid.uuid4()),
        "product_id": job["product_id"],
        "material_purchase_id": None,
        "entity_type": "finished_good",          # controlled value
        "movement_type": "production_completed",  # controlled value
        "quantity": data.quantity_completed,
        "reference_type": "production_job",       # controlled value
        "reference_id": job_id,
        "location": None,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now,
    }
    await db.inventory_movements.insert_one(movement)

    # 3. Update inventory snapshot
    await update_inventory_snapshot(job["product_id"], data.quantity_completed)

    await log_activity(user, "production_job.completed", "production_job", job_id, {
        "quantity_completed": data.quantity_completed,
        "completion_date": completion_date,
    })
    return {"message": f"Job completed. {data.quantity_completed} units added to inventory."}

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
    await db.production_jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "cancelled", "updated_at": now, "updated_by": user.get("id")}}
    )
    await log_activity(user, "production_job.cancelled", "production_job", job_id)
    return {"message": "Job cancelled"}

# =====================================================================
# PRODUCTION LAYER MODULE
# Supplier Capabilities + Work Types + Material Allocations
# Append this block to server.py before app.include_router(api_router)
# =====================================================================

# ── Controlled value enums ────────────────────────────────────────────

SUPPLIER_CAPABILITY_TYPES = [
    "raw_material_supplier",
    "weaver",
    "embroiderer",
    "printer",
    "tailor",
    "dyer",
    "finisher",
    "painter",
    "block_printer",
    "other",
]

WORK_TYPES = [
    "weaving",
    "embroidery",
    "block_printing",
    "hand_painting",
    "tailoring",
    "dyeing",
    "finishing",
    "printing",
    "other",
]

DESIGN_CATEGORIES = [
    "floral",
    "geometric",
    "block_print",
    "abstract",
    "heritage",
    "animal",
    "landscape",
    "folk",
    "other",
]

DESIGN_CATEGORY_CODES = {
    "floral":      "FLR",
    "geometric":   "GEO",
    "block_print": "BLK",
    "abstract":    "ABS",
    "heritage":    "HER",
    "animal":      "ANI",
    "landscape":   "LAN",
    "folk":        "FOL",
    "other":       "OTH",
}

# ── Models ────────────────────────────────────────────────────────────

class SupplierCapabilityCreate(BaseModel):
    capability_type: str

class MaterialAllocationCreate(BaseModel):
    production_job_id: str
    material_purchase_id: str
    quantity_allocated: float
    notes: Optional[str] = None

class MaterialAllocationUpdate(BaseModel):
    quantity_allocated: Optional[float] = None
    quantity_used: Optional[float] = None
    notes: Optional[str] = None

# ── Supplier Capabilities Routes ──────────────────────────────────────

@api_router.get("/admin/supplier-capabilities/meta")
async def get_capability_meta(user: dict = Depends(require_editor_or_admin)):
    return {
        "capability_types": SUPPLIER_CAPABILITY_TYPES,
        "work_types": WORK_TYPES,
        "design_categories": DESIGN_CATEGORIES,
        "design_category_codes": DESIGN_CATEGORY_CODES,
    }

@api_router.get("/admin/suppliers/{supplier_id}/capabilities")
async def get_supplier_capabilities(supplier_id: str, user: dict = Depends(require_editor_or_admin)):
    caps = await db.supplier_capabilities.find({"supplier_id": supplier_id}, {"_id": 0}).to_list(100)
    return caps

@api_router.post("/admin/suppliers/{supplier_id}/capabilities")
async def add_supplier_capability(supplier_id: str, data: SupplierCapabilityCreate, user: dict = Depends(require_editor_or_admin)):
    if data.capability_type not in SUPPLIER_CAPABILITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid capability_type. Must be one of: {', '.join(SUPPLIER_CAPABILITY_TYPES)}")
    # Check supplier exists
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    # Check not duplicate
    existing = await db.supplier_capabilities.find_one({"supplier_id": supplier_id, "capability_type": data.capability_type})
    if existing:
        raise HTTPException(status_code=400, detail="Capability already exists for this supplier")
    cap = {
        "id": str(uuid.uuid4()),
        "supplier_id": supplier_id,
        "capability_type": data.capability_type,
        "created_by": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
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

# ── Production Jobs — Meta update (include work_types) ────────────────

@api_router.get("/admin/production-jobs/full-meta")
async def get_production_jobs_full_meta(user: dict = Depends(require_editor_or_admin)):
    products = await db.product_master.find(
        {"status": "active"}, {"_id": 0, "id": 1, "product_code": 1, "product_name": 1, "category": 1}
    ).sort("product_code", 1).to_list(500)
    suppliers = await db.suppliers.find(
        {"status": "active"}, {"_id": 0, "id": 1, "supplier_code": 1, "supplier_name": 1, "supplier_type": 1}
    ).sort("supplier_code", 1).to_list(500)
    # Get all jobs for parent job selection
    jobs = await db.production_jobs.find(
        {}, {"_id": 0, "id": 1, "job_code": 1, "product_name": 1, "status": 1}
    ).sort("job_code", 1).to_list(1000)
    return {
        "statuses": PRODUCTION_JOB_STATUSES,
        "work_types": WORK_TYPES,
        "products": products,
        "suppliers": suppliers,
        "jobs": jobs,
    }

# ── Material Allocation Code Generator ────────────────────────────────

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

# ── Material Allocation Routes ────────────────────────────────────────

@api_router.get("/admin/material-allocations/meta")
async def get_allocation_meta(user: dict = Depends(require_editor_or_admin)):
    """Return active production jobs and material purchases for dropdowns."""
    jobs = await db.production_jobs.find(
        {"status": {"$in": ["planned", "in_progress"]}},
        {"_id": 0, "id": 1, "job_code": 1, "product_name": 1, "product_code": 1, "status": 1}
    ).sort("job_code", -1).to_list(500)
    # Get purchases that have available stock
    purchases = await db.material_purchases.find(
        {"status": {"$in": ["received", "partial"]}},
        {"_id": 0, "id": 1, "purchase_code": 1, "material_name": 1, "material_code": 1,
         "quantity_received": 1, "quantity_available": 1, "unit_of_measure": 1, "supplier_name": 1}
    ).sort("purchase_code", -1).to_list(500) if "material_purchases" in await db.list_collection_names() else []
    return {
        "jobs": jobs,
        "purchases": purchases,
    }

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
    # Enrich with linked records
    if alloc.get("production_job_id"):
        job = await db.production_jobs.find_one({"id": alloc["production_job_id"]}, {"_id": 0})
        alloc["_job"] = job or {}
    if alloc.get("material_purchase_id"):
        purchase = await db.material_purchases.find_one({"id": alloc["material_purchase_id"]}, {"_id": 0}) if "material_purchases" in await db.list_collection_names() else None
        alloc["_purchase"] = purchase or {}
    # Get inventory movement
    movement = await db.inventory_movements.find_one(
        {"reference_id": allocation_id, "movement_type": "material_allocated"},
        {"_id": 0}
    ) if "inventory_movements" in await db.list_collection_names() else None
    alloc["_inventory_movement"] = movement or {}
    return alloc

@api_router.post("/admin/material-allocations")
async def create_material_allocation(data: MaterialAllocationCreate, user: dict = Depends(require_editor_or_admin)):
    # Validate job
    job = await db.production_jobs.find_one({"id": data.production_job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")
    if job.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot allocate materials to a completed job")
    if job.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot allocate materials to a cancelled job")
    # Validate quantity
    if data.quantity_allocated <= 0:
        raise HTTPException(status_code=400, detail="quantity_allocated must be > 0")
    # Validate purchase batch exists (if purchases module is live)
    collection_names = await db.list_collection_names()
    purchase = None
    if "material_purchases" in collection_names:
        purchase = await db.material_purchases.find_one({"id": data.material_purchase_id}, {"_id": 0})
        if not purchase:
            raise HTTPException(status_code=404, detail="Material purchase batch not found")
        available = purchase.get("quantity_available", 0)
        if data.quantity_allocated > available:
            raise HTTPException(status_code=400, detail=f"Cannot allocate {data.quantity_allocated} — only {available} {purchase.get('unit_of_measure', 'units')} available in this batch")

    allocation_code = await generate_allocation_code()
    now = datetime.now(timezone.utc).isoformat()
    allocation_id = str(uuid.uuid4())

    allocation = {
        "id": allocation_id,
        "allocation_code": allocation_code,
        "production_job_id": data.production_job_id,
        "job_code": job.get("job_code"),
        "product_name": job.get("product_name"),
        "material_purchase_id": data.material_purchase_id,
        "material_name": purchase.get("material_name") if purchase else None,
        "material_code": purchase.get("material_code") if purchase else None,
        "quantity_allocated": data.quantity_allocated,
        "quantity_used": 0,
        "unit_of_measure": purchase.get("unit_of_measure") if purchase else None,
        "notes": data.notes,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_by": user.get("id"),
        "updated_by_name": user.get("name"),
        "created_at": now,
        "updated_at": now,
    }
    await db.material_allocations.insert_one(allocation)
    allocation.pop("_id", None)

    # Reduce available quantity in purchase batch
    if purchase and "material_purchases" in collection_names:
        new_available = purchase.get("quantity_available", 0) - data.quantity_allocated
        await db.material_purchases.update_one(
            {"id": data.material_purchase_id},
            {"$set": {"quantity_available": new_available, "updated_at": now}}
        )

    # Create inventory movement — material_allocated
    movement = {
        "id": str(uuid.uuid4()),
        "product_id": None,
        "material_purchase_id": data.material_purchase_id,
        "entity_type": "material",               # controlled value
        "movement_type": "material_allocated",   # controlled value
        "quantity": -data.quantity_allocated,    # negative = stock out
        "reference_type": "production_job",      # controlled value
        "reference_id": allocation_id,
        "location": None,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now,
    }
    await db.inventory_movements.insert_one(movement)

    await log_activity(user, "material_allocation.created", "material_allocation", allocation_id, {
        "code": allocation_code,
        "job": job.get("job_code"),
        "quantity": data.quantity_allocated,
    })
    return allocation

@api_router.put("/admin/material-allocations/{allocation_id}")
async def update_material_allocation(allocation_id: str, data: MaterialAllocationUpdate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.material_allocations.find_one({"id": allocation_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Allocation not found")
    # Check job is not completed (unless admin)
    job = await db.production_jobs.find_one({"id": existing["production_job_id"]}, {"_id": 0})
    if job and job.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot edit allocations for a completed job")
    if data.quantity_used is not None and data.quantity_used > existing.get("quantity_allocated", 0):
        raise HTTPException(status_code=400, detail="quantity_used cannot exceed quantity_allocated")

    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_name": user.get("name")}
    for field in ["quantity_allocated", "quantity_used", "notes"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val

    await db.material_allocations.update_one({"id": allocation_id}, {"$set": update})
    await log_activity(user, "material_allocation.updated", "material_allocation", allocation_id)
    return {"message": "Allocation updated"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
