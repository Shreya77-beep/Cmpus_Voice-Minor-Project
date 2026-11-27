from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.complaint import ComplaintOut, ComplaintCreate, ComplaintStatusUpdate
from app.services.complaint_service import complaint_service

router = APIRouter()

@router.get("/analytics", response_model=Dict[str, Any])
def get_complaint_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Role-scoped summary statistics for the authenticated user"""
    if current_user.role == UserRole.STUDENT.value:
        return complaint_service.get_analytics(
            db=db, student_id=current_user.student_id or current_user.username
        )
    if current_user.role == UserRole.DEPARTMENT.value:
        return complaint_service.get_analytics(
            db=db, category=current_user.department_name
        )
    return complaint_service.get_analytics(db=db)

@router.get("/export/csv")
def export_complaints_csv(
    current_user: User = Depends(require_roles(UserRole.ADMIN.value)),
    db: Session = Depends(get_db)
):
    """Export complaints in CSV format for Admin reports"""
    csv_data = complaint_service.export_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=CampusVoice_Complaints.csv"}
    )

@router.get("/", response_model=List[ComplaintOut])
def list_complaints(
    status: Optional[str] = Query(None, description="Pending, Assigned, In Progress, Resolved, Rejected"),
    category: Optional[str] = Query(None, description="Maintenance, IT/Network, Hostel, Sanitation, Academic"),
    student_id: Optional[str] = Query(None, description="Filter for specific student (Admin only)"),
    search: Optional[str] = Query(None, description="Search keyword"),
    limit: Optional[int] = Query(100, description="Max complaints to fetch"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve complaints strictly scoped to the authenticated user's account and role"""
    scoped_student_id = student_id
    scoped_category = category

    if current_user.role == UserRole.STUDENT.value:
        scoped_student_id = current_user.student_id or current_user.username
    elif current_user.role == UserRole.DEPARTMENT.value:
        scoped_category = current_user.department_name
        scoped_student_id = None

    complaints = complaint_service.list_complaints(
        db=db,
        status=status,
        category=scoped_category,
        student_id=scoped_student_id,
        search=search,
        limit=limit or 100
    )
    result = []
    for c in complaints:
        co = ComplaintOut.model_validate(c)
        co.timeline = complaint_service.get_timeline(c)
        result.append(co)
    return result

@router.post("/", response_model=ComplaintOut)
def register_manual_complaint(
    payload: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dedicated manual complaint registration bound to the authenticated user's identity"""
    if current_user.role == UserRole.STUDENT.value:
        payload.student_id = current_user.student_id or current_user.username
        payload.student_name = current_user.full_name
        payload.student_department = current_user.department_name or payload.student_department
        payload.student_contact = current_user.contact or payload.student_contact

    new_comp = complaint_service.create_complaint(db=db, complaint_in=payload)
    co = ComplaintOut.model_validate(new_comp)
    co.timeline = complaint_service.get_timeline(new_comp)
    return co

@router.get("/{ticket_id}", response_model=ComplaintOut)
def get_complaint_by_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full details and timeline events for a specific ticket"""
    complaint = complaint_service.get_by_ticket_id(db=db, ticket_id=ticket_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    if current_user.role == UserRole.STUDENT.value:
        user_sid = current_user.student_id or current_user.username
        if complaint.student_id != user_sid:
            raise HTTPException(status_code=403, detail="Access denied: you may only view your own tickets.")
    elif current_user.role == UserRole.DEPARTMENT.value:
        if complaint.category != current_user.department_name:
            raise HTTPException(status_code=403, detail="Access denied: ticket belongs to another department.")

    co = ComplaintOut.model_validate(complaint)
    co.timeline = complaint_service.get_timeline(complaint)
    return co

@router.patch("/{ticket_id}/status", response_model=ComplaintOut)
def update_complaint_status(
    ticket_id: str,
    payload: ComplaintStatusUpdate,
    current_user: User = Depends(require_roles(UserRole.DEPARTMENT.value, UserRole.ADMIN.value)),
    db: Session = Depends(get_db)
):
    """Department and Admin endpoint to assign technician and update status"""
    existing = complaint_service.get_by_ticket_id(db=db, ticket_id=ticket_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    if current_user.role == UserRole.DEPARTMENT.value and existing.category != current_user.department_name:
        raise HTTPException(status_code=403, detail="Access denied: you may only update tickets assigned to your department.")

    updated = complaint_service.update_status(db=db, ticket_id=ticket_id, update_in=payload)
    co = ComplaintOut.model_validate(updated)
    co.timeline = complaint_service.get_timeline(updated)
    return co
