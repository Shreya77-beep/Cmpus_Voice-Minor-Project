from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.schemas.complaint import ComplaintOut, ComplaintCreate, ComplaintStatusUpdate
from app.services.complaint_service import complaint_service

router = APIRouter()

@router.get("/analytics", response_model=Dict[str, Any])
def get_complaint_analytics(db: Session = Depends(get_db)):
    """Summary statistics for department and administration portals"""
    return complaint_service.get_analytics(db=db)

@router.get("/export/csv")
def export_complaints_csv(db: Session = Depends(get_db)):
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
    student_id: Optional[str] = Query(None, description="Filter for specific student"),
    search: Optional[str] = Query(None, description="Search keyword"),
    limit: Optional[int] = Query(100, description="Max complaints to fetch"),
    db: Session = Depends(get_db)
):
    """Retrieve filtered list of complaints"""
    complaints = complaint_service.list_complaints(
        db=db,
        status=status,
        category=category,
        student_id=student_id,
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
    db: Session = Depends(get_db)
):
    """Dedicated manual complaint registration endpoint"""
    new_comp = complaint_service.create_complaint(db=db, complaint_in=payload)
    co = ComplaintOut.model_validate(new_comp)
    co.timeline = complaint_service.get_timeline(new_comp)
    return co

@router.get("/{ticket_id}", response_model=ComplaintOut)
def get_complaint_by_ticket(
    ticket_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve full details and timeline events for a specific ticket"""
    complaint = complaint_service.get_by_ticket_id(db=db, ticket_id=ticket_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    co = ComplaintOut.model_validate(complaint)
    co.timeline = complaint_service.get_timeline(complaint)
    return co

@router.patch("/{ticket_id}/status", response_model=ComplaintOut)
def update_complaint_status(
    ticket_id: str,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db)
):
    """Department and Admin endpoint to assign technician and update status"""
    updated = complaint_service.update_status(db=db, ticket_id=ticket_id, update_in=payload)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    co = ComplaintOut.model_validate(updated)
    co.timeline = complaint_service.get_timeline(updated)
    return co

@router.post("/seed", status_code=200)
def seed_mock_data(db: Session = Depends(get_db)):
    complaint_service.seed_mock_data(db, force=True)
    return {"message": "Data seeded successfully"}
