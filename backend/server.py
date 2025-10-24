from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get('REFRESH_TOKEN_EXPIRE_DAYS', 7))

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class SummarizeRequest(BaseModel):
    text: str
    title: Optional[str] = "Untitled"
    generate_flashcards: bool = True

class Flashcard(BaseModel):
    question: str
    answer: str

class SummaryResponse(BaseModel):
    id: str
    title: str
    original_text: str
    summary_text: str
    flashcards: List[Flashcard]
    created_at: str

class Summary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    original_text: str
    summary_text: str
    flashcards: List[Flashcard] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# AI Summarization function
async def generate_summary_and_flashcards(text: str, generate_flashcards: bool = True):
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    # Initialize OpenAI client
    client = AsyncOpenAI(api_key=api_key)
    
    # Generate summary
    summary_response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert at summarizing academic notes. Provide clear, concise summaries that capture key concepts."},
            {"role": "user", "content": f"Summarize the following class notes concisely:\n\n{text}"}
        ]
    )
    summary_text = summary_response.choices[0].message.content
    
    flashcards = []
    if generate_flashcards:
        # Generate flashcards
        flashcard_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert at creating educational flashcards. Generate 5-7 flashcards with questions and answers based on the provided text. Format each flashcard as 'Q: [question]\\nA: [answer]' separated by double newlines."},
                {"role": "user", "content": f"Create flashcards from these notes:\n\n{text}"}
            ]
        )
        flashcard_text = flashcard_response.choices[0].message.content
        
        # Parse flashcards
        cards = flashcard_text.split('\n\n')
        for card in cards:
            if 'Q:' in card and 'A:' in card:
                parts = card.split('\nA:')
                question = parts[0].replace('Q:', '').strip()
                answer = parts[1].strip() if len(parts) > 1 else ''
                if question and answer:
                    flashcards.append(Flashcard(question=question, answer=answer))
    
    return summary_text, flashcards

# Auth Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Generate tokens
    access_token = create_token(
        {"sub": user_id, "email": user_data.email},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate tokens
    access_token = create_token(
        {"sub": user["id"], "email": user["email"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        {"sub": user["id"], "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@api_router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Generate new tokens
    access_token = create_token(
        {"sub": user["id"], "email": user["email"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        {"sub": user["id"], "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"]
    }

# AI Routes
@api_router.post("/ai/summarize", response_model=SummaryResponse)
async def summarize_text(request: SummarizeRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Generate summary and flashcards using GPT-4o
        summary_text, flashcards = await generate_summary_and_flashcards(
            request.text, 
            request.generate_flashcards
        )
        
        # Save to database
        summary_id = str(uuid.uuid4())
        summary_doc = {
            "id": summary_id,
            "user_id": current_user["id"],
            "title": request.title,
            "original_text": request.text,
            "summary_text": summary_text,
            "flashcards": [fc.model_dump() for fc in flashcards],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.summaries.insert_one(summary_doc)
        
        return SummaryResponse(
            id=summary_id,
            title=request.title,
            original_text=request.text,
            summary_text=summary_text,
            flashcards=flashcards,
            created_at=summary_doc["created_at"]
        )
    except Exception as e:
        logging.error(f"Error generating summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

# Summary Management Routes
@api_router.get("/summaries", response_model=List[SummaryResponse])
async def get_summaries(current_user: dict = Depends(get_current_user)):
    summaries = await db.summaries.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return summaries

@api_router.get("/summaries/{summary_id}", response_model=SummaryResponse)
async def get_summary(summary_id: str, current_user: dict = Depends(get_current_user)):
    summary = await db.summaries.find_one(
        {"id": summary_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return summary

@api_router.delete("/summaries/{summary_id}")
async def delete_summary(summary_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.summaries.delete_one({"id": summary_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Summary not found")
    return {"message": "Summary deleted successfully"}

@api_router.get("/")
async def root():
    return {"message": "Study AI API - Powered by GPT-4o"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()