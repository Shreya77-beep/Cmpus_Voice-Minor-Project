from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.complaint import UserInputRequest, AssistantResponse, ComplaintCreate, ComplaintOut
from app.services.nlp_service import nlp_service
from app.services.complaint_service import complaint_service
from app.services.knowledge_service import knowledge_service
from app.services.notice_service import notice_service

router = APIRouter()

@router.post("/process", response_model=AssistantResponse)
def process_user_voice_or_text(
    payload: UserInputRequest,
    db: Session = Depends(get_db)
):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Step 1: Hybrid Multilingual NLP
    extracted, lang = nlp_service.process(query, preferred_lang=payload.language or "en")
    intent = extracted.intent

    ticket_record = None
    faq_data = None
    notices_found = None
    spoken_reply = ""
    display_reply = ""

    # Check for Duplicate issue
    duplicate_ticket = None
    if intent == "register_complaint":
        duplicate_ticket = complaint_service.check_duplicate(
            db=db,
            category=extracted.category or "Maintenance",
            location=extracted.location or "Campus Area",
            issue=extracted.issue or query
        )
        if duplicate_ticket:
            extracted.duplicate_detected = True
            extracted.duplicate_of_ticket = duplicate_ticket.ticket_id

    # Step 2: Intent-specific handling
    if intent == "emergency":
        new_complaint = complaint_service.create_complaint(
            db=db,
            complaint_in=ComplaintCreate(
                title="EMERGENCY ALERT: " + query[:40],
                category=extracted.category or "Security",
                issue=extracted.issue or "Emergency incident reported",
                location=extracted.location or "Campus Area",
                priority="Critical",
                raw_query=query,
                student_id=payload.student_id,
                student_name=payload.student_name,
                student_department=payload.student_department,
                sentiment="Urgent",
                urgency_score=99
            )
        )
        t_out = ComplaintOut.model_validate(new_complaint)
        t_out.timeline = complaint_service.get_timeline(new_complaint)
        ticket_record = t_out

        if lang == "hi":
            spoken_reply = f"आपातकालीन शिकायत दर्ज कर ली गई है। टिकट संख्या {ticket_record.ticket_id} है। सुरक्षा दल को सूचित कर दिया गया है।"
        elif lang == "bn":
            spoken_reply = f"জরুরি অভিযোগ নথিভুক্ত করা হয়েছে। আপনার টিকিট নম্বর {ticket_record.ticket_id}। নিরাপত্তা দলকে জানানো হয়েছে।"
        else:
            spoken_reply = f"Emergency registered under ticket {ticket_record.ticket_id}. Security and medical support have been dispatched."

        display_reply = f"🚨 **CRITICAL EMERGENCY LOGGED** (Ticket `{ticket_record.ticket_id}`). Campus security and emergency teams have been alerted."

    elif intent == "notice_inquiry":
        notices = notice_service.search_notices_rag(db, query)
        notices_found = notices
        if notices:
            top_n = notices[0]
            if lang == "hi":
                spoken_reply = f"विश्वविद्यालय सूचना: {top_n['title']}। अंतिम तिथि {top_n.get('deadline_date', 'शीघ्र')} है।"
            elif lang == "bn":
                spoken_reply = f"বিশ্ববিদ্যালয় বিজ্ঞপ্তি: {top_n['title']}। শেষ তারিখ {top_n.get('deadline_date', 'শীঘ্রই')}।"
            else:
                spoken_reply = f"Official Notice found: {top_n['title']}. Deadline is {top_n.get('deadline_date', 'as per circular')}."

            display_reply = (
                f"📢 **Relevant University Notice Found:**\n\n"
                f"**{top_n['title']}**\n"
                f"• **Department:** {top_n['department']} | **Category:** {top_n['category']}\n"
                f"• **Deadline / Date:** `{top_n.get('deadline_date', 'N/A')}`\n\n"
                f"{top_n['content']}\n\n"
                f"📄 *Attached Document: {top_n.get('pdf_filename', 'Official_Notice.pdf')}*"
            )
        else:
            spoken_reply = "I checked the recent university notices, but did not find an active circular matching that query."
            display_reply = "ℹ️ No recent notices matching your query were found on the college notice board."

    elif intent == "register_complaint":
        new_complaint = complaint_service.create_complaint(
            db=db,
            complaint_in=ComplaintCreate(
                title=extracted.issue[:60] if extracted.issue else query[:60],
                category=extracted.category or "Maintenance",
                issue=extracted.issue or query,
                location=extracted.location or "Campus Area",
                priority=extracted.priority or "Medium",
                raw_query=query,
                student_id=payload.student_id,
                student_name=payload.student_name,
                student_department=payload.student_department,
                sentiment=extracted.sentiment,
                urgency_score=extracted.urgency_score
            )
        )
        t_out = ComplaintOut.model_validate(new_complaint)
        t_out.timeline = complaint_service.get_timeline(new_complaint)
        ticket_record = t_out

        if duplicate_ticket:
            if lang == "hi":
                spoken_reply = f"आपकी शिकायत आईडी {ticket_record.ticket_id} है। इसी स्थान के लिए पूर्व सक्रिय टिकट {duplicate_ticket.ticket_id} मौजूद है, जिसे इसके साथ जोड़ दिया गया है।"
            elif lang == "bn":
                spoken_reply = f"আপনার অভিযোগ আইডি {ticket_record.ticket_id}। একই স্থানে পূর্ববর্তী টিকিট {duplicate_ticket.ticket_id} এর সাথে যুক্ত করা হয়েছে।"
            else:
                spoken_reply = f"Your complaint is registered as {ticket_record.ticket_id}. Note: An active complaint {duplicate_ticket.ticket_id} was already open for this area, so we linked both tickets."

            display_reply = (
                f"✅ **Complaint Registered (Linked to Active Issue)**\n\n"
                f"- **Ticket ID:** `{ticket_record.ticket_id}`\n"
                f"- **Existing Linked Ticket:** `{duplicate_ticket.ticket_id}`\n"
                f"- **Category:** {ticket_record.category} | **Location:** {ticket_record.location}\n"
                f"- **Priority:** {ticket_record.priority} (Urgency: {ticket_record.urgency_score}/100)\n"
                f"⚠️ *Duplicate Detection: Technicians are already addressing this equipment.*"
            )
        else:
            if lang == "hi":
                spoken_reply = f"आपकी शिकायत सफलतापूर्वक दर्ज कर ली गई है। आपका टिकट नंबर {ticket_record.ticket_id} है।"
            elif lang == "bn":
                spoken_reply = f"আপনার অভিযোগ সফলভাবে নিবন্ধিত হয়েছে। আপনার অভিযোগ আইডি {ticket_record.ticket_id}।"
            else:
                spoken_reply = f"Your complaint has been registered successfully. Your complaint ID is {ticket_record.ticket_id}."

            display_reply = (
                f"✅ **Complaint Registered Successfully!**\n\n"
                f"- **Ticket ID:** `{ticket_record.ticket_id}`\n"
                f"- **Category:** {ticket_record.category}\n"
                f"- **Location:** {ticket_record.location}\n"
                f"- **Priority:** {ticket_record.priority} | **Sentiment:** {ticket_record.sentiment}\n"
                f"- **Status:** `{ticket_record.status}`"
            )

    elif intent == "check_status":
        if extracted.ticket_id:
            found = complaint_service.get_by_ticket_id(db, extracted.ticket_id)
            if found:
                t_out = ComplaintOut.model_validate(found)
                t_out.timeline = complaint_service.get_timeline(found)
                ticket_record = t_out

                if lang == "hi":
                    spoken_reply = f"शिकायत {found.ticket_id} वर्तमान में {found.status} स्थिति में है।"
                elif lang == "bn":
                    spoken_reply = f"অভিযোগ {found.ticket_id} বর্তমানে {found.status} অবস্থায় আছে।"
                else:
                    spoken_reply = f"Complaint {found.ticket_id} regarding {found.issue} is currently {found.status}."

                display_reply = (
                    f"🔍 **Status Update for {found.ticket_id}**\n\n"
                    f"- **Issue:** {found.issue}\n"
                    f"- **Location:** {found.location}\n"
                    f"- **Current Status:** `{found.status}`\n"
                    f"- **Assigned Technician:** {found.assigned_technician or 'Under Review'}\n"
                    f"- **Notes:** {found.admin_notes or 'Technician team dispatched'}"
                )
            else:
                spoken_reply = f"I could not find ticket {extracted.ticket_id}. Please check the number."
                display_reply = f"❌ Ticket ID `{extracted.ticket_id}` was not found in the database."
        else:
            spoken_reply = "Please state your ticket number, like CV1020, to check its progress."
            display_reply = "Please specify a Ticket ID (e.g. *\"Status of CV1020\"*)."

    elif intent == "campus_inquiry":
        best_faq = knowledge_service.find_best_answer(query)
        if best_faq:
            faq_data = best_faq
            spoken_reply = best_faq["answer"]
            display_reply = f"ℹ️ **{best_faq['question']}**\n\n{best_faq['answer']}"
        else:
            spoken_reply = "I couldn't locate that specific department in the handbook. Please contact the Student Affairs Cell."
            display_reply = "I could not locate verified details for that specific query. Please consult the Student Affairs desk in Admin Block Room 102."

    else:
        if lang == "hi":
            spoken_reply = "नमस्ते! मैं कैम्पसवॉइस हूँ। आप मुझसे समस्या दर्ज करवा सकते हैं या कॉलेज की सूचनाएँ पूछ सकते हैं।"
        elif lang == "bn":
            spoken_reply = "নমস্কার! আমি ক্যাম্পাসভয়েস। আপনি সমস্যা জানাতে পারেন বা নোটিশ সম্পর্কে জানতে পারেন।"
        else:
            spoken_reply = "Hello! I am CampusVoice, your smart campus assistance and grievance assistant."

        display_reply = (
            "👋 **Welcome to CampusVoice!**\n\n"
            "You can speak naturally in **English**, **हिंदी**, or **বাংলা**:\n"
            "- *\"The projector in Room 301 isn't working\"*\n"
            "- *\"Are there any new examination notices?\"*\n"
            "- *\"What is the status of ticket CV1020?\"*\n"
            "- *\"When is the next holiday?\"*"
        )

    return AssistantResponse(
        spoken_response=spoken_reply,
        display_text=display_reply,
        intent=intent,
        language=lang,
        extracted_data=extracted,
        ticket=ticket_record,
        faq_data=faq_data,
        notices_found=notices_found
    )
