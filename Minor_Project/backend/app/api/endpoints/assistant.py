from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.schemas.complaint import UserInputRequest, AssistantResponse, ComplaintCreate, ComplaintOut
from app.services.nlp_service import nlp_service
from app.services.complaint_service import complaint_service
from app.services.knowledge_service import knowledge_service
from app.services.notice_service import notice_service

router = APIRouter()

@router.post("/process", response_model=AssistantResponse)
def process_user_voice_or_text(
    payload: UserInputRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Bind student identity from verified server session (never trust client-supplied identity)
    actor_student_id = current_user.student_id or current_user.username
    actor_name = current_user.full_name
    actor_department = current_user.department_name or "Computer Science & Engineering"
    actor_contact = current_user.contact or "+91 98765 43210"

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
    if payload.dry_run:
        if lang == "hi":
            spoken_reply = f"विश्लेषण पूर्ण: श्रेणी {extracted.category}, तात्कालिकता {extracted.urgency_score} में से 100।"
            display_reply = f"AI विश्लेषण पूर्ण: श्रेणी `{extracted.category}`, प्राथमिकता `{extracted.priority}`, तात्कालिकता `{extracted.urgency_score}/100`।"
        elif lang == "bn":
            spoken_reply = f"বিশ্লেষণ সম্পন্ন: বিভাগ {extracted.category}, জরুরিতা {extracted.urgency_score} / 100।"
            display_reply = f"AI বিশ্লেষণ সম্পন্ন: বিভাগ `{extracted.category}`, অগ্রাধিকার `{extracted.priority}`, জরুরিতা `{extracted.urgency_score}/100`।"
        else:
            spoken_reply = f"Analyzed issue under {extracted.category} with urgency {extracted.urgency_score} out of 100."
            display_reply = f"AI Analysis Complete: Category `{extracted.category}`, Priority `{extracted.priority}`, Urgency `{extracted.urgency_score}/100`."
    elif intent == "emergency":
        new_complaint = complaint_service.create_complaint(
            db=db,
            complaint_in=ComplaintCreate(
                title="EMERGENCY ALERT: " + query[:40],
                category=extracted.category or "Security",
                issue=extracted.issue or "Emergency incident reported",
                location=extracted.location or "Campus Area",
                priority="Critical",
                raw_query=query,
                student_id=actor_student_id,
                student_name=actor_name,
                student_department=actor_department,
                student_contact=actor_contact,
                sentiment="Urgent",
                urgency_score=99
            )
        )
        t_out = ComplaintOut.model_validate(new_complaint)
        t_out.timeline = complaint_service.get_timeline(new_complaint)
        ticket_record = t_out

        if lang == "hi":
            spoken_reply = f"आपातकालीन शिकायत दर्ज कर ली गई है। टिकट संख्या {ticket_record.ticket_id} है। सुरक्षा दल को सूचित कर दिया गया है।"
            display_reply = f"🚨 **गंभीर आपातकाल दर्ज** (टिकट `{ticket_record.ticket_id}`)। कैंपस सुरक्षा और आपातकालीन टीमों को सूचित कर दिया गया है।"
        elif lang == "bn":
            spoken_reply = f"জরুরি অভিযোগ নথিভুক্ত করা হয়েছে। আপনার টিকিট নম্বর {ticket_record.ticket_id}। নিরাপত্তা দলকে জানানো হয়েছে।"
            display_reply = f"🚨 **জরুরি অবস্থা নথিভুক্ত হয়েছে** (টিকিট `{ticket_record.ticket_id}`)। ক্যাম্পাস নিরাপত্তা ও জরুরি দলকে সতর্ক করা হয়েছে।"
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
                display_reply = (
                    f"📢 **संबंधित विश्वविद्यालय सूचना मिली:**\n\n"
                    f"**{top_n['title']}**\n"
                    f"• **विभाग:** {top_n['department']} | **श्रेणी:** {top_n['category']}\n"
                    f"• **अंतिम तिथि / दिनांक:** `{top_n.get('deadline_date', 'उपलब्ध')}`\n\n"
                    f"{top_n['content']}\n\n"
                    f"📄 *संलग्न दस्तावेज़: {top_n.get('pdf_filename', 'Official_Notice.pdf')}*"
                )
            elif lang == "bn":
                spoken_reply = f"বিশ্ববিদ্যালয় বিজ্ঞপ্তি: {top_n['title']}। শেষ তারিখ {top_n.get('deadline_date', 'শীঘ্রই')}।"
                display_reply = (
                    f"📢 **সংশ্লিষ্ট বিশ্ববিদ্যালয় বিজ্ঞপ্তি পাওয়া গেছে:**\n\n"
                    f"**{top_n['title']}**\n"
                    f"• **বিভাগ:** {top_n['department']} | **ধরণ:** {top_n['category']}\n"
                    f"• **শেষ তারিখ / দিন:** `{top_n.get('deadline_date', 'প্রযোজ্য')}`\n\n"
                    f"{top_n['content']}\n\n"
                    f"📄 *সংযুক্ত নথি: {top_n.get('pdf_filename', 'Official_Notice.pdf')}*"
                )
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
            if lang == "hi":
                spoken_reply = "मैंने हाल की विश्वविद्यालय सूचनाओं की जांच की, लेकिन इस प्रश्न से संबंधित कोई सक्रिय परिपत्र नहीं मिला।"
                display_reply = "ℹ️ आपके प्रश्न से मेल खाने वाली कोई हालिया सूचना कॉलेज सूचना पट्ट पर नहीं मिली।"
            elif lang == "bn":
                spoken_reply = "সাম্প্রতিক বিশ্ববিদ্যালয় বিজ্ঞপ্তি পরীক্ষা করা হয়েছে, কিন্তু এই প্রশ্নের সাথে সম্পর্কিত কোনো সক্রিয় বিজ্ঞপ্তি পাওয়া যায়নি।"
                display_reply = "ℹ️ আপনার অনুসন্ধানের সাথে মেলে এমন কোনো সাম্প্রতিক বিজ্ঞপ্তি কলেজ নোটিশ বোর্ডে পাওয়া যায়নি।"
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
                student_id=actor_student_id,
                student_name=actor_name,
                student_department=actor_department,
                student_contact=actor_contact,
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
                display_reply = (
                    f"✅ **शिकायत सफलतापूर्वक दर्ज हो गई!**\n\n"
                    f"- **टिकट आईडी:** `{ticket_record.ticket_id}`\n"
                    f"- **श्रेणी:** {ticket_record.category}\n"
                    f"- **स्थान:** {ticket_record.location}\n"
                    f"- **प्राथमिकता:** {ticket_record.priority} | **भाव:** {ticket_record.sentiment}\n"
                    f"- **स्थिति:** `{ticket_record.status}`"
                )
            elif lang == "bn":
                spoken_reply = f"আপনার অভিযোগ সফলভাবে নিবন্ধিত হয়েছে। আপনার অভিযোগ আইডি {ticket_record.ticket_id}।"
                display_reply = (
                    f"✅ **অভিযোগ সফলভাবে নথিভুক্ত হয়েছে!**\n\n"
                    f"- **টিকিট আইডি:** `{ticket_record.ticket_id}`\n"
                    f"- **বিভাগ:** {ticket_record.category}\n"
                    f"- **অবস্থান:** {ticket_record.location}\n"
                    f"- **অগ্রাধিকার:** {ticket_record.priority} | **মনোভাব:** {ticket_record.sentiment}\n"
                    f"- **অবস্থা:** `{ticket_record.status}`"
                )
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
            if found and current_user.role == UserRole.STUDENT.value and found.student_id != actor_student_id:
                found = None
                spoken_reply = f"Ticket {extracted.ticket_id} is not registered under your account."
                display_reply = f"🔒 Ticket `{extracted.ticket_id}` does not belong to your signed-in student account."
            elif found:
                t_out = ComplaintOut.model_validate(found)
                t_out.timeline = complaint_service.get_timeline(found)
                ticket_record = t_out

                if lang == "hi":
                    spoken_reply = f"शिकायत {found.ticket_id} वर्तमान में {found.status} स्थिति में है।"
                    display_reply = (
                        f"🔍 **{found.ticket_id} की वर्तमान स्थिति**\n\n"
                        f"- **समस्या:** {found.issue}\n"
                        f"- **स्थान:** {found.location}\n"
                        f"- **स्थिति:** `{found.status}`\n"
                        f"- **नियुक्त तकनीशियन:** {found.assigned_technician or 'समीक्षाधीन'}\n"
                        f"- **टिप्पणी:** {found.admin_notes or 'तकनीशियन टीम भेजी गई'}"
                    )
                elif lang == "bn":
                    spoken_reply = f"অভিযোগ {found.ticket_id} বর্তমানে {found.status} অবস্থায় আছে।"
                    display_reply = (
                        f"🔍 **{found.ticket_id} এর বর্তমান অবস্থা**\n\n"
                        f"- **সমস্যা:** {found.issue}\n"
                        f"- **অবস্থান:** {found.location}\n"
                        f"- **অবস্থা:** `{found.status}`\n"
                        f"- **নিযুক্ত টেকনিশিয়ান:** {found.assigned_technician or 'পর্যালোচনাধীন'}\n"
                        f"- **নোট:** {found.admin_notes or 'টেকনিশিয়ান পাঠানো হয়েছে'}"
                    )
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
                if lang == "hi":
                    spoken_reply = f"मुझे टिकट संख्या {extracted.ticket_id} नहीं मिली। कृपया संख्या की जांच करें।"
                    display_reply = f"❌ टिकट आईडी `{extracted.ticket_id}` डेटाबेस में नहीं मिली।"
                elif lang == "bn":
                    spoken_reply = f"টিকিট নম্বর {extracted.ticket_id} পাওয়া যায়নি। অনুগ্রহ করে নম্বরটি পরীক্ষা করুন।"
                    display_reply = f"❌ টিকিট আইডি `{extracted.ticket_id}` ডাটাবেসে পাওয়া যায়নি।"
                else:
                    spoken_reply = f"I could not find ticket {extracted.ticket_id}. Please check the number."
                    display_reply = f"❌ Ticket ID `{extracted.ticket_id}` was not found in the database."
        else:
            if lang == "hi":
                spoken_reply = "कृपया स्थिति जानने के लिए अपनी टिकट संख्या बताएं, जैसे CV1020।"
                display_reply = "कृपया एक टिकट आईडी बताएं (जैसे *\"CV1020 की स्थिति\"*)।"
            elif lang == "bn":
                spoken_reply = "অগ্রগতি জানতে অনুগ্রহ করে আপনার টিকিট নম্বর বলুন, যেমন CV1020।"
                display_reply = "অনুগ্রহ করে একটি টিকিট আইডি উল্লেখ করুন (যেমন *\"CV1020 স্ট্যাটাস\"*)।"
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
            if lang == "hi":
                spoken_reply = "मुझे हैंडबुक में यह विभाग नहीं मिला। कृपया छात्र कल्याण प्रकोष्ठ से संपर्क करें।"
                display_reply = "इस प्रश्न के लिए सत्यापित विवरण नहीं मिल सका। कृपया प्रशासनिक ब्लॉक कमरा 102 में छात्र सहायता डेस्क से संपर्क करें।"
            elif lang == "bn":
                spoken_reply = "হ্যান্ডবুকে এই নির্দিষ্ট বিভাগটি পাওয়া যায়নি। অনুগ্রহ করে ছাত্র কল্যাণ সেলে যোগাযোগ করুন।"
                display_reply = "এই নির্দিষ্ট প্রশ্নের জন্য যাচাইকৃত তথ্য পাওয়া যায়নি। অনুগ্রহ করে অ্যাডমিন ব্লক রুম ১০২-এ স্টুডেন্ট অ্যাফেয়ার্স ডেস্কে যোগাযোগ করুন।"
            else:
                spoken_reply = "I couldn't locate that specific department in the handbook. Please contact the Student Affairs Cell."
                display_reply = "I could not locate verified details for that specific query. Please consult the Student Affairs desk in Admin Block Room 102."

    else:
        if lang == "hi":
            spoken_reply = "नमस्ते! मैं कैम्पसवॉइस हूँ। आप मुझसे समस्या दर्ज करवा सकते हैं या कॉलेज की सूचनाएँ पूछ सकते हैं।"
            display_reply = (
                "👋 **CampusVoice में आपका स्वागत है!**\n\n"
                "आप **English**, **हिंदी**, या **বাংলা** में बोलकर या लिखकर पूछ सकते हैं:\n"
                "- *\"कमरा 301 का प्रोजेक्टर काम नहीं कर रहा है\"*\n"
                "- *\"क्या कोई नई परीक्षा सूचना आई है?\"*\n"
                "- *\"टिकट CV1020 की स्थिति क्या है?\"*"
            )
        elif lang == "bn":
            spoken_reply = "নমস্কার! আমি ক্যাম্পাসভয়েস। আপনি সমস্যা জানাতে পারেন বা নোটিশ সম্পর্কে জানতে পারেন।"
            display_reply = (
                "👋 **CampusVoice-এ স্বাগতম!**\n\n"
                "আপনি **English**, **हिंदी**, অথবা **বাংলায়** কথা বলে বা লিখে জানতে পারেন:\n"
                "- *\"রুম ৩০১-এর প্রজেক্টর কাজ করছে না\"*\n"
                "- *\"নতুন কোনো পরীক্ষার বিজ্ঞপ্তি আছে কি?\"*\n"
                "- *\"টিকিট CV1020-এর অবস্থা কী?\"*"
            )
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


@router.post("/preview", response_model=AssistantResponse)
def preview_ai_triage(
    payload: UserInputRequest,
    db: Session = Depends(get_db)
):
    """
    Public read-only live AI triage and circular preview for the landing simulator.
    Runs the real HybridNLPService & Notice RAG engine without writing tickets or exposing PII.
    """
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    extracted, lang = nlp_service.process(query, preferred_lang=payload.language or "en")
    intent = extracted.intent
    notices_found = None
    faq_data = None

    if intent == "notice_inquiry":
        notices = notice_service.search_notices_rag(db, query)
        notices_found = notices
        if notices:
            top = notices[0]
            spoken_reply = f"{top['title']} ({top.get('deadline_date', 'Active')})."
            display_reply = f"{top['title']} — {top['content'][:160]}"
        elif lang == "hi":
            spoken_reply = "कोई मिलता-जुलता विश्वविद्यालय परिपत्र नहीं मिला।"
            display_reply = "उस कीवर्ड से संबंधित कोई सक्रिय परिपत्र नहीं मिला।"
        elif lang == "bn":
            spoken_reply = "অনুরূপ কোনো বিশ্ববিদ্যালয় বিজ্ঞপ্তি পাওয়া যায়নি।"
            display_reply = "এই বিষয়ে কোনো সক্রিয় বিজ্ঞপ্তি পাওয়া যায়নি।"
        else:
            spoken_reply = "No matching university circular found."
            display_reply = "No active circular matched that keyword."
    elif intent == "campus_inquiry":
        best_faq = knowledge_service.find_best_answer(query)
        faq_data = best_faq
        if best_faq:
            spoken_reply = best_faq["answer"]
        elif lang == "hi":
            spoken_reply = "कृपया प्रशासनिक ब्लॉक कमरा 102 में छात्र सहायता डेस्क से संपर्क करें।"
        elif lang == "bn":
            spoken_reply = "অনুগ্রহ করে প্রশাসনিক ব্লক রুম ১০২-এ স্টুডেন্ট অ্যাফেয়ার্স ডেস্কে যোগাযোগ করুন।"
        else:
            spoken_reply = "Consult Student Affairs desk in Admin Block Room 102."
        display_reply = spoken_reply
    else:
        if lang == "hi":
            spoken_reply = f"{extracted.location} पर {extracted.category} समस्या की पहचान की गई है। तात्कालिकता स्कोर {extracted.urgency_score} में से 100 है।"
            display_reply = (
                f"{extracted.location} पर {extracted.category} समस्या पहचानी गई। "
                f"तात्कालिकता स्कोर: {extracted.urgency_score}/100 ({extracted.priority} प्राथमिकता, भाव: {extracted.sentiment})।"
            )
        elif lang == "bn":
            spoken_reply = f"{extracted.location}-এ {extracted.category} সমস্যা শনাক্ত হয়েছে। জরুরি স্কোর ১০০-এর মধ্যে {extracted.urgency_score}।"
            display_reply = (
                f"{extracted.location}-এ {extracted.category} সমস্যা শনাক্ত হয়েছে। "
                f"জরুরি স্কোর: {extracted.urgency_score}/100 ({extracted.priority} অগ্রাধিকার, অনুভূতি: {extracted.sentiment})।"
            )
        else:
            spoken_reply = f"Detected {extracted.category} issue at {extracted.location} with urgency {extracted.urgency_score} out of 100 ({extracted.priority})."
            display_reply = (
                f"Detected {extracted.category} issue at {extracted.location}. "
                f"Urgency score: {extracted.urgency_score}/100 ({extracted.priority} priority, {extracted.sentiment} sentiment). "
                f"Engine: {extracted.engine_used}."
            )

    return AssistantResponse(
        spoken_response=spoken_reply,
        display_text=display_reply,
        intent=intent,
        language=lang,
        extracted_data=extracted,
        ticket=None,
        faq_data=faq_data,
        notices_found=notices_found,
    )


@router.get("/faqs")
def get_campus_faqs():
    """Return institutional FAQ directory loaded from backend campus handbook data."""
    return knowledge_service.faq_list
