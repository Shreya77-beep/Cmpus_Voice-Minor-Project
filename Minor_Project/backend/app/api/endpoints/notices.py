from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.notice import NoticeOut, NoticeCreate
from app.services.notice_service import notice_service

router = APIRouter()

@router.get("/", response_model=List[NoticeOut])
def get_notices(
    category: Optional[str] = Query(None, description="Exam, Holiday, Academic, Placement, Event"),
    search: Optional[str] = Query(None, description="Search keyword"),
    db: Session = Depends(get_db)
):
    """List published college notices with optional category filtering and search"""
    return notice_service.list_notices(db=db, category=category, search=search)

@router.post("/", response_model=NoticeOut)
def publish_notice(
    payload: NoticeCreate,
    db: Session = Depends(get_db)
):
    """Admin endpoint to publish a new college circular or notice"""
    return notice_service.create_notice(db=db, notice_in=payload)
