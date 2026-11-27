import io
import csv
import json
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.core.realtime import realtime_hub
from app.models.complaint import Complaint, ComplaintStatus, PriorityLevel
from app.schemas.complaint import ComplaintCreate, ComplaintStatusUpdate, TimelineEvent

class ComplaintService:
    def _now_label(self) -> str:
        return datetime.datetime.now().strftime("%d %b · %I:%M %p")

    def generate_ticket_id(self, db: Session) -> str:
        last_complaint = db.query(Complaint).order_by(desc(Complaint.id)).first()
        if last_complaint:
            next_num = 1000 + last_complaint.id + 1
        else:
            next_num = 1024
        return f"CV{next_num}"

    def check_duplicate(self, db: Session, category: str, location: str, issue: str) -> Optional[Complaint]:
        """
        AI Duplicate Complaint Detection:
        Checks if an active complaint already exists for the same location and category.
        """
        active_statuses = [ComplaintStatus.PENDING.value, ComplaintStatus.ASSIGNED.value, ComplaintStatus.IN_PROGRESS.value]
        existing = db.query(Complaint).filter(
            Complaint.status.in_(active_statuses),
            Complaint.category.ilike(category)
        ).all()

        loc_lower = location.lower().strip()
        issue_words = set(w.lower() for w in issue.split() if len(w) > 3)

        for comp in existing:
            comp_loc = comp.location.lower().strip()
            # If same location (e.g. 'Classroom 204' or 'Hostel Block B')
            if loc_lower and (loc_lower in comp_loc or comp_loc in loc_lower) and loc_lower != "campus area":
                # Check keyword overlap
                comp_issue_words = set(w.lower() for w in comp.issue.split() if len(w) > 3)
                if issue_words.intersection(comp_issue_words):
                    return comp
        return None

    def create_complaint(self, db: Session, complaint_in: ComplaintCreate) -> Complaint:
        ticket_id = self.generate_ticket_id(db)
        now_str = self._now_label()

        # Duplicate detection check
        duplicate_ticket = self.check_duplicate(
            db=db,
            category=complaint_in.category,
            location=complaint_in.location,
            issue=complaint_in.issue
        )

        duplicate_id = duplicate_ticket.ticket_id if duplicate_ticket else None
        sid = complaint_in.student_id or "CAMPUS-USER"
        sname = complaint_in.student_name or "Student"
        sdept = complaint_in.student_department or "Academic Department"

        # Initial Timeline Events
        initial_timeline = [
            {
                "title": "Complaint Registered",
                "description": f"Grievance recorded via {sname} ({sid}).",
                "timestamp": now_str,
                "status": "Pending"
            },
            {
                "title": f"Routed to {complaint_in.category} Department",
                "description": f"Automated priority scoring assigned: {complaint_in.priority} priority.",
                "timestamp": now_str,
                "status": "Assigned"
            }
        ]

        if duplicate_id:
            initial_timeline.append({
                "title": "Duplicate Issue Linked",
                "description": f"AI flagged similar active complaint ({duplicate_id}). Both tickets linked to the same work order.",
                "timestamp": now_str,
                "status": "In Progress"
            })

        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        db_complaint = Complaint(
            ticket_id=ticket_id,
            student_id=sid,
            student_name=sname,
            student_department=sdept,
            student_contact=complaint_in.student_contact,
            title=complaint_in.title or complaint_in.issue[:50],
            issue=complaint_in.issue,
            raw_query=complaint_in.raw_query,
            category=complaint_in.category,
            location=complaint_in.location,
            priority=complaint_in.priority or PriorityLevel.MEDIUM.value,
            status=ComplaintStatus.IN_PROGRESS.value if duplicate_id else ComplaintStatus.PENDING.value,
            sentiment=complaint_in.sentiment or "Neutral",
            urgency_score=complaint_in.urgency_score or 50,
            is_duplicate_of=duplicate_id,
            image_url=complaint_in.image_url,
            assigned_technician=f"{complaint_in.category} Duty Officer",
            admin_notes=f"Linked to existing ticket {duplicate_id}" if duplicate_id else None,
            timeline_json=json.dumps(initial_timeline),
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(db_complaint)
        db.commit()
        db.refresh(db_complaint)

        # Trigger real-time notification for student
        try:
            from app.services.notification_service import notification_service
            notification_service.create_notification(
                db=db,
                student_id=db_complaint.student_id,
                ticket_id=ticket_id,
                title=f"Grievance Ticket {ticket_id} Registered",
                message=f"Your complaint regarding '{db_complaint.issue}' has been routed to {db_complaint.category} Department. Status: {db_complaint.status}.",
                type="urgent" if db_complaint.priority in ["Critical", "High"] else "status_update"
            )
        except Exception as e:
            print(f"[ComplaintService] Notification creation error: {e}")

        # Push real-time WebSocket update to student, department queue, and admin
        realtime_hub.publish_sync(
            "complaint_created",
            {
                "ticket_id": db_complaint.ticket_id,
                "title": db_complaint.title or db_complaint.issue,
                "category": db_complaint.category,
                "priority": db_complaint.priority,
                "status": db_complaint.status,
                "location": db_complaint.location,
                "student_name": db_complaint.student_name,
            },
            target_student_id=db_complaint.student_id,
            target_category=db_complaint.category,
        )

        return db_complaint

    def get_by_ticket_id(self, db: Session, ticket_id: str) -> Optional[Complaint]:
        cleaned_id = ticket_id.strip().upper()
        return db.query(Complaint).filter(Complaint.ticket_id == cleaned_id).first()

    def list_complaints(
        self, 
        db: Session, 
        status: Optional[str] = None, 
        category: Optional[str] = None, 
        student_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[Complaint]:
        query = db.query(Complaint)
        if status and status != "All":
            query = query.filter(Complaint.status == status)
        if category and category != "All":
            query = query.filter(Complaint.category == category)
        if student_id:
            query = query.filter(Complaint.student_id == student_id)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                (Complaint.ticket_id.ilike(search_term)) |
                (Complaint.issue.ilike(search_term)) |
                (Complaint.location.ilike(search_term)) |
                (Complaint.student_name.ilike(search_term)) |
                (Complaint.category.ilike(search_term))
            )
        return query.order_by(desc(Complaint.created_at)).limit(limit).all()

    def update_status(self, db: Session, ticket_id: str, update_in: ComplaintStatusUpdate) -> Optional[Complaint]:
        complaint = self.get_by_ticket_id(db, ticket_id)
        if not complaint:
            return None

        complaint.status = update_in.status
        if update_in.assigned_technician:
            complaint.assigned_technician = update_in.assigned_technician
        if update_in.admin_notes:
            complaint.admin_notes = update_in.admin_notes
        complaint.updated_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

        # Append new timeline step
        now_str = self._now_label()
        timeline = self.get_timeline(complaint)
        timeline.append({
            "title": f"Status updated to {update_in.status}",
            "description": update_in.admin_notes or f"Updated by department supervisor. Technician: {complaint.assigned_technician or 'Assigned'}.",
            "timestamp": now_str,
            "status": update_in.status
        })
        complaint.timeline_json = json.dumps(timeline)

        db.commit()
        db.refresh(complaint)

        # Trigger real-time status update notification
        try:
            from app.services.notification_service import notification_service
            tech_info = f" Technician: {complaint.assigned_technician}." if complaint.assigned_technician else ""
            notes_info = f" Notes: {update_in.admin_notes}" if update_in.admin_notes else ""
            notification_service.create_notification(
                db=db,
                student_id=complaint.student_id,
                ticket_id=ticket_id,
                title=f"Update: Ticket {ticket_id} is now {update_in.status}",
                message=f"Status changed to {update_in.status} by {complaint.category} Dept.{tech_info}{notes_info}",
                type="status_update"
            )
        except Exception as e:
            print(f"[ComplaintService] Status update notification error: {e}")

        # Push live WebSocket update to Student, Department, and Admin
        realtime_hub.publish_sync(
            "complaint_updated",
            {
                "ticket_id": complaint.ticket_id,
                "title": complaint.title or complaint.issue,
                "category": complaint.category,
                "status": complaint.status,
                "assigned_technician": complaint.assigned_technician,
                "admin_notes": complaint.admin_notes,
            },
            target_student_id=complaint.student_id,
            target_category=complaint.category,
        )

        return complaint

    def get_timeline(self, complaint: Complaint) -> List[Dict[str, Any]]:
        if not complaint.timeline_json:
            return []
        try:
            return json.loads(complaint.timeline_json)
        except Exception:
            return []

    def get_analytics(
        self,
        db: Session,
        student_id: Optional[str] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        base = db.query(Complaint)
        if student_id:
            base = base.filter(Complaint.student_id == student_id)
        if category:
            base = base.filter(Complaint.category == category)

        total = base.count()
        pending = base.filter(Complaint.status == ComplaintStatus.PENDING.value).count()
        in_progress = base.filter(Complaint.status.in_([ComplaintStatus.IN_PROGRESS.value, ComplaintStatus.ASSIGNED.value])).count()
        resolved = base.filter(Complaint.status == ComplaintStatus.RESOLVED.value).count()
        critical = base.filter(Complaint.priority.in_([PriorityLevel.CRITICAL.value, PriorityLevel.HIGH.value])).count()

        # Breakdown by Department / Category
        category_counts = {}
        for cat, cnt in base.with_entities(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all():
            category_counts[cat] = cnt

        # Breakdown by Sentiment
        sentiment_counts = {}
        for sent, cnt in base.with_entities(Complaint.sentiment, func.count(Complaint.id)).group_by(Complaint.sentiment).all():
            sentiment_counts[sent or "Neutral"] = cnt

        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "resolved": resolved,
            "high_priority": critical,
            "categories": category_counts,
            "sentiments": sentiment_counts
        }

    def export_csv(self, db: Session) -> str:
        complaints = db.query(Complaint).order_by(desc(Complaint.created_at)).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Ticket ID", "Student Roll", "Student Name", "Department", "Category", "Issue", "Location", "Priority", "Status", "Urgency Score", "Technician", "Created At"])
        for c in complaints:
            writer.writerow([
                c.ticket_id,
                c.student_id,
                c.student_name,
                c.student_department,
                c.category,
                c.issue,
                c.location,
                c.priority,
                c.status,
                c.urgency_score or 50,
                c.assigned_technician or "Unassigned",
                c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else ""
            ])
        return output.getvalue()

    def seed_mock_data(self, db: Session, force: bool = False):
        if not force and db.query(Complaint).count() > 0:
            return

        mock_items = [
            {
                "ticket_id": "CV1020",
                "student_id": "STU-2023-01",
                "student_name": "Rahul Sharma",
                "student_department": "Computer Science & Engineering",
                "student_contact": "+91 98765 43210",
                "title": "Library Wi-Fi Constant Disconnections",
                "raw_query": "The Wi-Fi in library reading room is disconnecting constantly.",
                "category": "IT/Network",
                "issue": "Library Wi-Fi disconnecting frequently",
                "location": "Central Library - 2nd Floor",
                "priority": "Medium",
                "status": "In Progress",
                "sentiment": "Frustrated",
                "urgency_score": 65,
                "assigned_technician": "Vikram Singh (Network Admin)",
                "admin_notes": "Access Point AP-04 rebooted; firmware update scheduled tonight.",
                "timeline_json": json.dumps([
                    {"title": "Complaint Registered", "description": "Student voice report recorded via portal.", "timestamp": "21 Nov · 10:30 AM", "status": "Pending"},
                    {"title": "Assigned to IT / Network Cell", "description": "Auto-routed based on IT category.", "timestamp": "21 Nov · 11:15 AM", "status": "Assigned"},
                    {"title": "Technician Dispatched", "description": "Technician Vikram Singh inspecting access point.", "timestamp": "21 Nov · 12:00 PM", "status": "In Progress"}
                ])
            },
            {
                "ticket_id": "CV1021",
                "student_id": "STU-2023-42",
                "student_name": "Aman Verma",
                "student_department": "Mechanical Engineering",
                "student_contact": "+91 98765 11223",
                "title": "Water Cooler Breakdown & Leakage",
                "raw_query": "Water cooler in hostel block B 2nd floor is not cooling and leaking water.",
                "category": "Hostel",
                "issue": "Water cooler not cooling & water leak",
                "location": "Hostel Block B - Floor 2",
                "priority": "High",
                "status": "Pending",
                "sentiment": "Urgent",
                "urgency_score": 85,
                "assigned_technician": "Plumbing Maintenance Unit",
                "admin_notes": "Plumber scheduled for inspection at 3:00 PM.",
                "timeline_json": json.dumps([
                    {"title": "Complaint Registered", "description": "Reported via student manual form.", "timestamp": "21 Nov · 09:15 AM", "status": "Pending"},
                    {"title": "Flagged as High Urgency", "description": "Water supply interruption identified by AI analyzer.", "timestamp": "21 Nov · 09:16 AM", "status": "Pending"}
                ])
            },
            {
                "ticket_id": "CV1022",
                "student_id": "STU-2023-01",
                "student_name": "Rahul Sharma",
                "student_department": "Computer Science & Engineering",
                "student_contact": "+91 98765 43210",
                "title": "Classroom 301 Projector Display Flickering",
                "raw_query": "Projector in Room 301 has red tint and flickering.",
                "category": "Maintenance",
                "issue": "Classroom projector display flickering",
                "location": "Academic Block A - Room 301",
                "priority": "Low",
                "status": "Resolved",
                "sentiment": "Neutral",
                "urgency_score": 30,
                "assigned_technician": "Rajesh Kumar (AV Specialist)",
                "admin_notes": "Defective HDMI cable replaced and display calibrated.",
                "timeline_json": json.dumps([
                    {"title": "Complaint Registered", "description": "Recorded via voice assistant.", "timestamp": "20 Nov · 02:00 PM", "status": "Pending"},
                    {"title": "Work Order Assigned", "description": "Assigned to AV maintenance specialist Rajesh Kumar.", "timestamp": "20 Nov · 03:30 PM", "status": "In Progress"},
                    {"title": "Issue Resolved", "description": "HDMI cable replaced. Display tested in working condition.", "timestamp": "20 Nov · 05:00 PM", "status": "Resolved"}
                ])
            },
            {
                "ticket_id": "CV1023",
                "student_id": "STU-2023-88",
                "student_name": "Neha Gupta",
                "student_department": "Electrical Engineering",
                "student_contact": "+91 98765 33445",
                "title": "Admin Block 1st Floor Flush Leakage",
                "raw_query": "Washroom flush on 1st floor admin block is overflowing.",
                "category": "Sanitation",
                "issue": "Washroom flush leakage",
                "location": "Admin Block - 1st Floor",
                "priority": "High",
                "status": "In Progress",
                "sentiment": "Frustrated",
                "urgency_score": 80,
                "assigned_technician": "Campus Sanitation Supervisor",
                "admin_notes": "Water inlet valve turned off. Replacement seal being installed.",
                "timeline_json": json.dumps([
                    {"title": "Complaint Registered", "description": "Lodged via voice.", "timestamp": "21 Nov · 11:00 AM", "status": "Pending"},
                    {"title": "Sanitation Team Dispatched", "description": "Inlet valve closed to prevent water overflow.", "timestamp": "21 Nov · 11:30 AM", "status": "In Progress"}
                ])
            }
        ]

        for item in mock_items:
            existing = db.query(Complaint).filter(Complaint.ticket_id == item["ticket_id"]).first()
            if not existing:
                comp = Complaint(**item)
                db.add(comp)
        db.commit()

complaint_service = ComplaintService()
