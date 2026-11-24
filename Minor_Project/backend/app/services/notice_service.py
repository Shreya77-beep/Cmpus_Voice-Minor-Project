from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.notice import Notice
from app.schemas.notice import NoticeCreate

class NoticeService:
    def list_notices(self, db: Session, category: Optional[str] = None, search: Optional[str] = None, limit: int = 50) -> List[Notice]:
        query = db.query(Notice)
        if category and category != "All":
            query = query.filter(Notice.category == category)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter((Notice.title.ilike(s)) | (Notice.content.ilike(s)))
        return query.order_by(desc(Notice.is_pinned), desc(Notice.published_date)).limit(limit).all()

    def create_notice(self, db: Session, notice_in: NoticeCreate) -> Notice:
        db_notice = Notice(
            title=notice_in.title,
            category=notice_in.category,
            department=notice_in.department,
            content=notice_in.content,
            deadline_date=notice_in.deadline_date,
            is_pinned=notice_in.is_pinned,
            pdf_filename=notice_in.pdf_filename or "Official_Circular.pdf"
        )
        db.add(db_notice)
        db.commit()
        db.refresh(db_notice)
        return db_notice

    def search_notices_rag(self, db: Session, query: str) -> List[Dict[str, Any]]:
        """
        Retrieval-Augmented Generation helper:
        Searches notices for user queries like 'holiday', 'placement', 'exam deadline'.
        """
        q_lower = query.lower()
        all_notices = db.query(Notice).all()
        matched = []

        keywords = {
            "exam": ["exam", "examination", "form", "submission", "schedule", "admit card"],
            "holiday": ["holiday", "vacation", "break", "closed", "off"],
            "placement": ["placement", "job", "internship", "drive", "recruitment", "company"],
            "event": ["fest", "cultural", "techvista", "hackathon", "event", "sports"],
            "library": ["library", "books", "reading room", "hours"]
        }

        for n in all_notices:
            score = 0
            title_lower = n.title.lower()
            content_lower = n.content.lower()

            for word in q_lower.split():
                if len(word) > 2:
                    if word in title_lower: score += 4
                    if word in content_lower: score += 2

            for group, group_kws in keywords.items():
                if any(k in q_lower for k in group_kws) and any(k in title_lower or k in content_lower for k in group_kws):
                    score += 3

            if score >= 3:
                matched.append({
                    "id": n.id,
                    "title": n.title,
                    "category": n.category,
                    "department": n.department,
                    "content": n.content,
                    "deadline_date": n.deadline_date,
                    "pdf_filename": n.pdf_filename,
                    "score": score
                })

        matched.sort(key=lambda x: x["score"], reverse=True)
        return matched[:3]

    def seed_mock_notices(self, db: Session):
        if db.query(Notice).count() > 0:
            return

        demo_notices = [
            {
                "title": "Final Semester Examination Form Submission Deadline (Even Sem 2026)",
                "category": "Exam",
                "department": "Examination Cell",
                "content": "All students are hereby notified that the final deadline for regular examination form submission is the 15th of next month. Late submissions with a fine of ₹500 will be permitted until the 20th. Submit via the Student ERP Portal.",
                "deadline_date": "15th Next Month",
                "is_pinned": True,
                "pdf_filename": "CIRCULAR_EXAM_2026_04.pdf"
            },
            {
                "title": "Campus Placement Drive 2026: Google, Microsoft & TCS Onboarding",
                "category": "Placement",
                "department": "Training & Placement Cell",
                "content": "Registration for upcoming Tier-1 campus placement drives is now open for 3rd and 4th year B.Tech students. Eligible candidates must verify their aggregate CGPA at the T&P Cell before Friday.",
                "deadline_date": "Friday, 5:00 PM",
                "is_pinned": True,
                "pdf_filename": "PLACEMENT_DRIVE_NOTICE_2026.pdf"
            },
            {
                "title": "Official University Holiday: Republic Day & Mid-Semester Break",
                "category": "Holiday",
                "department": "Registrar Office",
                "content": "The University campus, including all academic blocks and administrative departments, will remain closed on the upcoming Monday for the national holiday. Hostel mess and emergency medical facilities will function normally.",
                "deadline_date": "Next Monday",
                "is_pinned": False,
                "pdf_filename": "HOLIDAY_NOTIFICATION_2026.pdf"
            },
            {
                "title": "Extension of Central Library Operating Hours for Exam Preparation",
                "category": "Academic",
                "department": "Library Services",
                "content": "In view of upcoming mid-term examinations, the Central Library reading halls will remain open until 11:00 PM on all weekdays and Saturdays. High-speed Wi-Fi and digital access terminals are available.",
                "deadline_date": "Throughout Exam Month",
                "is_pinned": False,
                "pdf_filename": "LIBRARY_TIMINGS_2026.pdf"
            },
            {
                "title": "Annual Tech Fest 'TechVista 2026' - Call for Project Submissions",
                "category": "Event",
                "department": "Student Affairs Council",
                "content": "Registration for the annual hackathon and project exhibition is live. Win cash prizes and internship vouchers. Submit your abstract at the TechVista desk in Student Activity Center.",
                "deadline_date": "End of this month",
                "is_pinned": False,
                "pdf_filename": "TECHVISTA_2026_SCHEDULE.pdf"
            }
        ]

        for item in demo_notices:
            notice = Notice(**item)
            db.add(notice)
        db.commit()

notice_service = NoticeService()
