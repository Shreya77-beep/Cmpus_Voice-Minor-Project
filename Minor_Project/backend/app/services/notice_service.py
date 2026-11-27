import base64
import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, inspect, text
from app.models.notice import Notice
from app.schemas.notice import NoticeCreate


class NoticeService:
    def ensure_schema(self, db: Session):
        engine = db.get_bind()
        insp = inspect(engine)
        if "notices" in insp.get_table_names():
            cols = [c["name"] for c in insp.get_columns("notices")]
            if "attachment_data" not in cols:
                db.execute(text("ALTER TABLE notices ADD COLUMN attachment_data TEXT"))
                db.commit()
            if "attachment_mime" not in cols:
                db.execute(text("ALTER TABLE notices ADD COLUMN attachment_mime VARCHAR(100)"))
                db.commit()

    def get_by_id(self, db: Session, notice_id: int) -> Optional[Notice]:
        return db.query(Notice).filter(Notice.id == notice_id).first()

    def list_notices(self, db: Session, category: Optional[str] = None, search: Optional[str] = None, limit: int = 50) -> List[Notice]:
        query = db.query(Notice)
        if category and category != "All":
            query = query.filter(Notice.category == category)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter((Notice.title.ilike(s)) | (Notice.content.ilike(s)))
        return query.order_by(desc(Notice.is_pinned), desc(Notice.published_date)).limit(limit).all()

    def create_notice(self, db: Session, notice_in: NoticeCreate) -> Notice:
        attachment_data = (notice_in.attachment_data or "").strip() or None
        attachment_mime = (notice_in.attachment_mime or "").strip() or None
        if attachment_data and attachment_data.startswith("data:") and ";base64," in attachment_data:
            header, _b64 = attachment_data.split(";base64,", 1)
            if not attachment_mime and header.startswith("data:"):
                attachment_mime = header[5:]

        db_notice = Notice(
            title=notice_in.title,
            category=notice_in.category,
            department=notice_in.department,
            content=notice_in.content,
            deadline_date=notice_in.deadline_date,
            is_pinned=notice_in.is_pinned,
            pdf_filename=notice_in.pdf_filename or f"{notice_in.title.strip().replace(' ', '_')[:50]}.pdf",
            attachment_data=attachment_data,
            attachment_mime=attachment_mime,
        )
        db.add(db_notice)
        db.commit()
        db.refresh(db_notice)
        return db_notice

    def get_download_payload(self, notice: Notice) -> Tuple[bytes, str, str]:
        """Return (raw_bytes, mime_type, filename) for real attachment or generated PDF."""
        filename = (notice.pdf_filename or f"Circular_{notice.id}.pdf").replace('"', "").replace("\n", "")
        if notice.attachment_data:
            raw = notice.attachment_data
            mime = notice.attachment_mime or "application/pdf"
            if ";base64," in raw:
                header, b64_part = raw.split(";base64,", 1)
                if header.startswith("data:") and not notice.attachment_mime:
                    mime = header[5:]
                return base64.b64decode(b64_part), mime, filename
            return base64.b64decode(raw), mime, filename
        if not filename.lower().endswith(".pdf"):
            filename = f"{filename}.pdf"
        return self._build_circular_pdf(notice), "application/pdf", filename

    def _build_circular_pdf(self, notice: Notice) -> bytes:
        """Pure-Python single/multi-line official PDF 1.4 generator (no external binaries)."""
        import textwrap

        def _pdf_safe(txt: str) -> str:
            cleaned = (txt or "").replace("\u20b9", "Rs.").encode("latin-1", "replace").decode("latin-1")
            return cleaned.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

        pub_str = notice.published_date.strftime("%d %b %Y") if notice.published_date else datetime.datetime.now().strftime("%d %b %Y")
        lines: List[Tuple[int, str, bool]] = [
            (15, "CAMPUSVOICE UNIVERSITY - OFFICIAL CIRCULAR", True),
            (10, f"Reference ID: CV-CIR-{notice.id:04d}   |   Category: {notice.category}   |   Published: {pub_str}", False),
            (10, f"Issuing Department: {notice.department or 'Administration'}", False),
            (10, f"Deadline / Effective Date: {notice.deadline_date or 'Immediate'}", False),
            (10, "-" * 82, False),
            (12, notice.title or "Official Notice", True),
            (10, "", False),
        ]
        for para in (notice.content or "").splitlines():
            wrapped = textwrap.wrap(para.strip(), width=82) if para.strip() else [""]
            for wline in wrapped:
                lines.append((10, wline, False))

        lines.extend([
            (10, "", False),
            (10, "-" * 82, False),
            (9, "Issued digitally via CampusVoice Governance Portal.", False),
        ])

        stream_ops = ["BT"]
        y = 760
        for size, line, bold in lines:
            if y < 55:
                break
            font_tag = "/F2" if bold else "/F1"
            stream_ops.append(f"{font_tag} {size} Tf 1 0 0 1 48 {y} Tm ({_pdf_safe(line)}) Tj")
            y -= max(14, int(size * 1.45))
        stream_ops.append("ET")
        stream_bytes = "\n".join(stream_ops).encode("latin-1")

        objs = [
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
            b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
            b"6 0 obj\n<< /Length " + str(len(stream_bytes)).encode("ascii") + b" >>\nstream\n" + stream_bytes + b"\nendstream\nendobj\n",
        ]

        out = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for obj in objs:
            offsets.append(len(out))
            out.extend(obj)
        xref_pos = len(out)
        out.extend(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode("ascii"))
        for off in offsets[1:]:
            out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
        out.extend(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii"))
        return bytes(out)

    def search_notices_rag(self, db: Session, query: str) -> List[Dict[str, Any]]:
        """
        Retrieval-Augmented Generation helper:
        Searches notices for user queries like 'holiday', 'placement', 'exam deadline'.
        """
        q_lower = query.lower()
        all_notices = db.query(Notice).all()
        matched = []

        keywords = {
            "exam": ["exam", "examination", "form", "submission", "schedule", "admit card", "परीक्षा", "समय-सारिणी", "एग्जाम", "পরীক্ষা", "সময়সূচী"],
            "holiday": ["holiday", "vacation", "break", "closed", "off", "छुट्टी", "अवकाश", "ব্রেক", "ছুটি", "বন্ধ"],
            "placement": ["placement", "job", "internship", "drive", "recruitment", "company", "प्लेसमेंट", "नौकरी", "इंटर्नशिप", "প্লেসমেন্ট", "চাকরি"],
            "event": ["fest", "cultural", "techvista", "hackathon", "event", "sports", "उत्सव", "हैकथॉन", "आयोजन", "উৎসব", "হ্যাকাথন", "অনুষ্ঠান"],
            "library": ["library", "books", "reading room", "hours", "पुस्तकालय", "लाइब्रेरी", "গ্রন্থাগার", "লাইব্রেরি"]
        }

        for n in all_notices:
            score = 0
            title_lower = n.title.lower()
            content_lower = n.content.lower()
            cat_lower = (n.category or "").lower()

            for word in q_lower.split():
                if len(word) > 2:
                    if word in title_lower: score += 4
                    if word in content_lower: score += 2

            for group, group_kws in keywords.items():
                if any(k in q_lower for k in group_kws) and (group in cat_lower or any(k in title_lower or k in content_lower for k in group_kws)):
                    score += 5

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
        if not matched and any(g in q_lower for g in ["notice", "circular", "सूचना", "परिपत्र", "বিজ্ঞপ্তি", "নোটিশ"]):
            for n in sorted(all_notices, key=lambda x: (x.is_pinned, x.id), reverse=True)[:2]:
                matched.append({
                    "id": n.id,
                    "title": n.title,
                    "category": n.category,
                    "department": n.department,
                    "content": n.content,
                    "deadline_date": n.deadline_date,
                    "pdf_filename": n.pdf_filename,
                    "score": 3
                })
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
