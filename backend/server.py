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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'chytare_luxury_secret_2024_ultra_secure')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Cloudinary Config
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')
if CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )

FRONTEND_URL = os.environ.get('FRONTEND_URL', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================= MODELS =======================

def generate_slug(text: str) -> str:
    """Generate a valid slug from text"""
    slug = text.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug

def validate_slug(slug: str) -> str:
    """Validate and clean a slug"""
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
    collection_type: str  # sarees, scarves, etc.
    material: Optional[str] = None
    work: Optional[str] = None
    design_category: Optional[str] = None
    narrative_intro: str = ""
    description: str = ""
    details: List[ProductDetail] = []
    media: List[ProductMedia] = []
    attributes: List[ProductAttribute] = []
    disclaimer: str = ""
    craft_fabric: str = ""
    craft_technique: str = ""
    care_instructions: str = ""
    delivery_info: str = ""
    price: Optional[float] = None
    price_on_request: bool = False
    stock_status: str = "in_stock"
    stock_quantity: int = 0
    continue_selling_out_of_stock: bool = False
    is_hero: bool = False
    is_secondary_highlight: bool = False
    secondary_highlight_order: int = 0
    is_primary: List[int] = []
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
    craft_fabric: str = ""
    craft_technique: str = ""
    care_instructions: str = ""
    delivery_info: str = ""
    price: Optional[float] = None
    price_on_request: bool = False
    stock_status: str = "in_stock"
    stock_quantity: int = 0
    continue_selling_out_of_stock: bool = False
    is_hero: bool = False
    is_secondary_highlight: bool = False
    secondary_highlight_order: int = 0
    is_hidden: bool = False
    is_invite_only: bool = False
    seo_title: str = ""
    seo_description: str = ""

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    type: str  # material, work, design_category, collection_type
    collection_type: str = ""  # sarees, scarves, etc.
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
    category: str  # maison_journal, craft_clusters, wearable_whispers, collections_campaigns, care_keeping, press_features
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
    enquiry_type: str = "general"  # general, product, wearable_whispers, private_viewing
    status: str = "new"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EnquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    product_id: Optional[str] = None
    enquiry_type: str = "general"

class NewsletterSubscriber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewsletterCreate(BaseModel):
    email: EmailStr

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

# ======================= AUTH ROUTES =======================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
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
    
    if user.get("totp_enabled"):
        if login_data.recovery_code:
            # Try recovery code
            recovery_codes = user.get("recovery_codes", [])
            if login_data.recovery_code in recovery_codes:
                recovery_codes.remove(login_data.recovery_code)
                await db.users.update_one(
                    {"id": user["id"]}, {"$set": {"recovery_codes": recovery_codes}}
                )
            else:
                raise HTTPException(status_code=401, detail="Invalid recovery code")
        elif not login_data.totp_code:
            return {"requires_2fa": True, "message": "2FA code required"}
        else:
            totp = pyotp.TOTP(user["totp_secret"])
            if not totp.verify(login_data.totp_code):
                raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    expiry = 720 if login_data.remember_me else JWT_EXPIRATION_HOURS  # 30 days vs default
    token = create_token(user["id"], user["email"], user["role"], expiry_hours=expiry)
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "totp_enabled": user.get("totp_enabled", False),
            "must_change_password": user.get("must_change_password", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "totp_enabled": user.get("totp_enabled", False),
        "totp_enabled_at": user.get("totp_enabled_at"),
        "must_change_password": user.get("must_change_password", False),
        "last_login": user.get("last_login"),
        "created_at": user.get("created_at")
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
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "provisioning_uri": provisioning_uri
    }

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
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {
            "totp_enabled": True,
            "totp_enabled_at": datetime.now(timezone.utc).isoformat(),
            "recovery_codes": codes
        }}
    )
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
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {
            "password_hash": new_hash,
            "must_change_password": False
        }}
    )
    return {"message": "Password changed successfully"}

# ======================= PASSWORD RESET =======================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with that email, a reset link has been sent."}
    
    # Generate secure token
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.delete_many({"user_id": user["id"]})
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    # Build reset URL
    frontend_url = os.environ.get("FRONTEND_URL", "")
    reset_url = f"{frontend_url}/admin/reset-password?token={reset_token}"
    
    # Send email if Resend is configured
    email_sent = False
    if RESEND_API_KEY:
        try:
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [data.email],
                "subject": "Password Reset - Chytare Admin",
                "html": f"""
                <div style="font-family: 'Manrope', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #FFFFF0;">
                    <h1 style="color: #1B4D3E; font-family: 'Playfair Display', serif;">Password Reset</h1>
                    <p style="color: #1B4D3E;">Click the link below to reset your password. This link expires in 1 hour.</p>
                    <a href="{reset_url}" style="display: inline-block; padding: 12px 24px; background: #1B4D3E; color: #FFFFF0; text-decoration: none; margin: 20px 0;">Reset Password</a>
                    <p style="color: #1B4D3E; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
                """
            })
            email_sent = True
        except Exception as e:
            logger.error(f"Failed to send reset email: {str(e)}")
    else:
        logger.info(f"Password reset requested for {data.email}. Reset URL: {reset_url}")
    
    return {
        "message": "If an account exists with that email, a reset link has been sent.",
        "email_sent": email_sent,
        "email_configured": bool(RESEND_API_KEY)
    }

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
    await db.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {"password_hash": new_hash, "must_change_password": False}}
    )
    
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
        # Support both full name ("Blossom Chronicles") and slug ("blossom-chronicles")
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
    
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for p in products:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
        if isinstance(p.get("updated_at"), str):
            p["updated_at"] = datetime.fromisoformat(p["updated_at"])
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/products/slug/{slug}")
async def get_product_by_slug(slug: str):
    product = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products")
async def create_product(product_data: ProductCreate, user: dict = Depends(require_editor_or_admin)):
    # Validate and clean slug
    try:
        clean_slug = validate_slug(product_data.slug)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    existing = await db.products.find_one({"slug": clean_slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Product with this slug already exists")
    
    # If setting as hero, unset any existing hero
    if product_data.is_hero:
        await db.products.update_many({}, {"$set": {"is_hero": False}})
    
    product_dict = product_data.model_dump()
    product_dict["slug"] = clean_slug  # Use cleaned slug
    product_dict["id"] = str(uuid.uuid4())
    product_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    product_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.insert_one(product_dict)
    product_dict.pop("_id", None)
    return product_dict

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductCreate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate and clean slug
    try:
        clean_slug = validate_slug(product_data.slug)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Check if slug is taken by another product
    slug_check = await db.products.find_one({"slug": clean_slug, "id": {"$ne": product_id}}, {"_id": 0})
    if slug_check:
        raise HTTPException(status_code=400, detail="Slug already in use by another product")
    
    # If setting as hero, unset any existing hero
    if product_data.is_hero and not existing.get("is_hero"):
        await db.products.update_many({"id": {"$ne": product_id}}, {"$set": {"is_hero": False}})
    
    update_data = product_data.model_dump()
    update_data["slug"] = clean_slug
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
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
    secondary = await db.products.find(
        {"is_secondary_highlight": True, "is_hidden": {"$ne": True}},
        {"_id": 0}
    ).sort("secondary_highlight_order", 1).to_list(2)
    return {"hero": hero, "secondary_highlights": secondary}

@api_router.get("/products/media/all")
async def get_all_product_media(user: dict = Depends(require_editor_or_admin)):
    """Return all products with their media arrays for the CMS image picker."""
    products = await db.products.find(
        {"media": {"$exists": True, "$ne": []}},
        {"_id": 0, "id": 1, "name": 1, "slug": 1, "media": 1, "collection_type": 1}
    ).to_list(500)
    return products

# ======================= CATEGORY ROUTES =======================

@api_router.get("/categories")
async def get_categories(
    type: Optional[str] = None,
    collection_type: Optional[str] = None
):
    query = {}
    if type:
        query["type"] = type
    if collection_type:
        query["collection_type"] = collection_type
    
    categories = await db.categories.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return categories

@api_router.post("/categories")
async def create_category(category_data: CategoryCreate, user: dict = Depends(require_editor_or_admin)):
    existing = await db.categories.find_one(
        {"slug": category_data.slug, "type": category_data.type, "collection_type": category_data.collection_type},
        {"_id": 0}
    )
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
    materials = await db.categories.find(
        {"type": "material", "collection_type": collection_type, "is_visible": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    works = await db.categories.find(
        {"type": "work", "collection_type": collection_type, "is_visible": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    design_categories = await db.categories.find(
        {"type": "design_category", "collection_type": collection_type, "is_visible": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    # Check which filters have products
    products = await db.products.find(
        {"collection_type": collection_type, "is_hidden": {"$ne": True}},
        {"_id": 0, "material": 1, "work": 1, "design_category": 1}
    ).to_list(1000)
    
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
    await db.settings.update_one(
        {"id": "home_settings"},
        {"$set": settings},
        upsert=True
    )
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
    await db.settings.update_one(
        {"id": "site_settings"},
        {"$set": settings},
        upsert=True
    )
    return {"message": "Site settings updated successfully"}

# ======================= ENQUIRY ROUTES =======================

async def send_enquiry_emails(enquiry: dict, product_name: str = None):
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured, skipping emails")
        return
    
    try:
        # Admin notification
        admin_html = f"""
        <div style="font-family: 'Manrope', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #FFFFF0;">
            <h1 style="color: #1B4D3E; font-family: 'Playfair Display', serif; font-size: 28px; margin-bottom: 30px;">Chytare</h1>
            <h1 style="color: #1B4D3E; font-family: 'Playfair Display', serif; font-size: 24px;">New Enquiry Received</h1>
            <p style="color: #1B4D3E;"><strong>Name:</strong> {enquiry['name']}</p>
            <p style="color: #1B4D3E;"><strong>Email:</strong> {enquiry['email']}</p>
            <p style="color: #1B4D3E;"><strong>Phone:</strong> {enquiry.get('phone', 'Not provided')}</p>
            <p style="color: #1B4D3E;"><strong>Type:</strong> {enquiry['enquiry_type']}</p>
            {f"<p style='color: #1B4D3E;'><strong>Product:</strong> {product_name}</p>" if product_name else ""}
            <p style="color: #1B4D3E;"><strong>Message:</strong></p>
            <p style="color: #1B4D3E; background: #fff; padding: 20px; border-left: 3px solid #DACBA0;">{enquiry['message']}</p>
        </div>
        """
        
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [os.environ.get('ADMIN_EMAIL', 'chytarelifestyle@gmail.com')],
            "subject": f"New Enquiry from {enquiry['name']} - Chytare",
            "html": admin_html
        })
        
        # Customer acknowledgement
        customer_html = f"""
        <div style="font-family: 'Manrope', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #FFFFF0;">
            <h1 style="color: #1B4D3E; font-family: 'Playfair Display', serif; font-size: 28px; margin-bottom: 30px;">Chytare</h1>
            <h1 style="color: #1B4D3E; font-family: 'Playfair Display', serif; font-size: 24px;">Thank You for Reaching Out</h1>
            <p style="color: #1B4D3E; line-height: 1.8;">Dear {enquiry['name']},</p>
            <p style="color: #1B4D3E; line-height: 1.8;">We have received your enquiry and our concierge team will be in touch with you shortly.</p>
            <p style="color: #1B4D3E; line-height: 1.8;">In the meantime, feel free to explore our collections or reach out to us on WhatsApp.</p>
            <p style="color: #1B4D3E; line-height: 1.8; margin-top: 30px;">With warmth,<br/>The Chytare Team</p>
            <p style="color: #DACBA0; font-style: italic; margin-top: 30px; font-family: 'Playfair Display', serif;">Your Life | Your Canvas</p>
        </div>
        """
        
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [enquiry['email']],
            "subject": "Thank You for Your Enquiry - Chytare",
            "html": customer_html
        })
        
    except Exception as e:
        logger.error(f"Failed to send enquiry emails: {str(e)}")

@api_router.post("/enquiries")
async def create_enquiry(enquiry_data: EnquiryCreate):
    enquiry = Enquiry(**enquiry_data.model_dump())
    enquiry_dict = enquiry.model_dump()
    enquiry_dict["created_at"] = enquiry_dict["created_at"].isoformat()
    
    product_name = None
    if enquiry_data.product_id:
        product = await db.products.find_one({"id": enquiry_data.product_id}, {"_id": 0, "name": 1})
        if product:
            product_name = product["name"]
    
    await db.enquiries.insert_one(enquiry_dict)
    
    # Send emails in background
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
    result = await db.newsletter.update_one(
        {"email": subscriber_data.email},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"message": "Successfully unsubscribed"}

# ======================= INVENTORY ROUTES =======================

@api_router.get("/inventory")
async def get_inventory(user: dict = Depends(require_editor_or_admin)):
    products = await db.products.find(
        {},
        {"_id": 0, "id": 1, "name": 1, "slug": 1, "collection_type": 1, "stock_status": 1, 
         "stock_quantity": 1, "price": 1, "price_on_request": 1, "is_hidden": 1}
    ).to_list(1000)
    
    # Get sold counts (placeholder - would need orders collection)
    for p in products:
        p["units_sold"] = 0  # Would calculate from orders
        p["low_stock"] = p.get("stock_quantity", 0) <= 2 and p.get("stock_status") == "in_stock"
    
    return products

# ======================= MEDIA UPLOAD =======================

@api_router.post("/upload")
async def upload_media(file: UploadFile = File(...), user: dict = Depends(require_editor_or_admin)):
    content = await file.read()
    file_id = str(uuid.uuid4())
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    resource_type = "video" if file_ext.lower() in ["mp4", "mov", "webm"] else "image"
    
    if CLOUDINARY_CLOUD_NAME:
        try:
            result = await asyncio.to_thread(
                cloudinary.uploader.upload,
                content,
                public_id=f"chytare/{file_id}",
                resource_type=resource_type,
                folder="chytare",
                overwrite=True,
            )
            return {
                "id": file_id,
                "filename": file.filename,
                "url": result["secure_url"],
                "type": resource_type,
                "public_id": result["public_id"]
            }
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            raise HTTPException(status_code=500, detail="Media upload failed")
    else:
        # Local fallback (development only)
        upload_dir = ROOT_DIR / "uploads"
        upload_dir.mkdir(exist_ok=True)
        file_path = upload_dir / f"{file_id}.{file_ext}"
        with open(file_path, "wb") as f:
            f.write(content)
        return {
            "id": file_id,
            "filename": file.filename,
            "url": f"/api/uploads/{file_id}.{file_ext}",
            "type": resource_type
        }

from fastapi.responses import FileResponse

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    """Serve locally uploaded files (development fallback)."""
    file_path = ROOT_DIR / "uploads" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# ======================= INIT DEFAULT DATA =======================

@api_router.post("/init-defaults")
async def init_defaults():
    # Check if already initialized
    existing = await db.settings.find_one({"id": "initialized"}, {"_id": 0})
    if existing:
        return {"message": "Already initialized"}
    
    # Default design categories
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
    
    # Default materials for sarees
    default_materials = [
        {"name": "Cotton", "slug": "cotton", "type": "material", "collection_type": "sarees", "order": 0},
        {"name": "Cotton Tussar", "slug": "cotton-tussar", "type": "material", "collection_type": "sarees", "order": 1},
        {"name": "Silk", "slug": "silk", "type": "material", "collection_type": "sarees", "order": 2},
        {"name": "Crepe", "slug": "crepe", "type": "material", "collection_type": "sarees", "order": 3},
        {"name": "Satin", "slug": "satin", "type": "material", "collection_type": "sarees", "order": 4},
    ]
    
    # Default work/techniques
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
    
    # Default home settings
    home_settings = HomePageSettings()
    await db.settings.insert_one(home_settings.model_dump())
    
    # Default site settings
    site_settings = SiteSettings()
    await db.settings.insert_one(site_settings.model_dump())
    
    # Mark as initialized
    await db.settings.insert_one({"id": "initialized", "timestamp": datetime.now(timezone.utc).isoformat()})
    
    return {"message": "Default data initialized successfully"}

# ======================= ROOT ROUTES =======================

@api_router.get("/")
async def root():
    return {"message": "Chytare API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
