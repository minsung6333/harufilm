from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import supabase

bearer_scheme = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        response = supabase.auth.get_user(credentials.credentials)
        return response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
