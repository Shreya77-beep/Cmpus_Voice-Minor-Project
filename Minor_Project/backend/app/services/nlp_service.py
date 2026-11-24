import re
import json
import requests
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings
from app.schemas.complaint import ExtractedEntities

class HybridNLPService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY

    def process(self, query: str, preferred_lang: str = "en") -> Tuple[ExtractedEntities, str]:
        """
        Processes student input across English, Hindi, and Bengali.
        Returns (ExtractedEntities, spoken_language_code).
        """
        # Determine language
        lang = self._detect_language(query, preferred_lang)

        # If LLM key configured, attempt LLM parsing
        if self.api_key and self.api_key != "your_gemini_api_key_here":
            llm_result = self._try_llm_extraction(query, lang)
            if llm_result:
                return llm_result, lang

        # Fallback to local deterministic rule & multilingual engine
        return self._rule_based_extraction(query, lang), lang

    def _detect_language(self, text: str, preferred: str = "en") -> str:
        # Check Devanagari script (Hindi)
        if re.search(r"[\u0900-\u097F]", text):
            return "hi"
        # Check Bengali script
        if re.search(r"[\u0980-\u09FF]", text):
            return "bn"
        return preferred or "en"

    def _try_llm_extraction(self, query: str, lang: str) -> Optional[ExtractedEntities]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            system_prompt = (
                "You are an NLP entity and intent extractor for a university campus assistant supporting English, Hindi, and Bengali. "
                "Analyze the student message and output ONLY a valid JSON object with:\n"
                "- intent: ['register_complaint', 'check_status', 'campus_inquiry', 'notice_inquiry', 'emergency', 'chitchat']\n"
                "- category: ['Maintenance', 'IT/Network', 'Hostel', 'Academic', 'Sanitation', 'Security', 'General']\n"
                "- issue: concise summary of the issue (translated to English if in Hindi/Bengali)\n"
                "- location: specific room, floor, building, or area (or null)\n"
                "- priority: ['Low', 'Medium', 'High', 'Critical']\n"
                "- sentiment: ['Neutral', 'Frustrated', 'Urgent', 'Concerned']\n"
                "- urgency_score: integer 0-100\n"
                "- ticket_id: if tracking an ID like 'CV1020', extract it (or null)\n"
                "- confidence: float 0.0 to 1.0\n"
                "Return raw JSON only, no markdown formatting."
            )

            payload = {
                "contents": [{"parts": [{"text": f"{system_prompt}\n\nStudent Message ({lang}): \"{query}\""}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
            }

            resp = requests.post(url, json=payload, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                parsed = json.loads(raw_text)

                return ExtractedEntities(
                    intent=parsed.get("intent", "register_complaint"),
                    category=parsed.get("category", "Maintenance"),
                    issue=parsed.get("issue") or query,
                    location=parsed.get("location") or "Campus Area",
                    priority=parsed.get("priority", "Medium"),
                    sentiment=parsed.get("sentiment", "Neutral"),
                    urgency_score=int(parsed.get("urgency_score", 50)),
                    ticket_id=parsed.get("ticket_id"),
                    confidence=float(parsed.get("confidence", 0.96)),
                    engine_used="llm (Gemini)",
                    detected_language=lang
                )
        except Exception as e:
            print(f"[HybridNLPService] LLM call fallback: {e}")
        return None

    def _rule_based_extraction(self, query: str, lang: str) -> ExtractedEntities:
        q = query.lower().strip()

        # 1. Emergency Detection
        emergency_indicators = [
            "fire", "smoke", "accident", "blood", "ambulance", "short circuit", "fainted", "collapsed", "gas leak",
            "आग", "धुआं", "दुर्घटना", "एम्बुलेंस", "আগুন", "অ্যাম্বুলেন্স", "জরুরি"
        ]
        if any(w in q for w in emergency_indicators):
            return ExtractedEntities(
                intent="emergency",
                category="Security",
                issue=query,
                location=self._extract_location(query),
                priority="Critical",
                sentiment="Urgent",
                urgency_score=99,
                confidence=0.98,
                engine_used="rule-engine",
                detected_language=lang
            )

        # 2. Ticket Status Lookup
        ticket_match = re.search(r"\b(cv\s*[-_]?\s*\d{3,6})\b", q, re.IGNORECASE)
        status_words = ["status", "track", "check", "update", "progress", "resolved", "स्थिति", "ট্র্যাক", "স্ট্যাটাস"]
        if ticket_match or (any(sw in q for sw in status_words) and ("complaint" in q or "ticket" in q or "शिकायत" in q or "অভিযোগ" in q)):
            ticket_id = None
            if ticket_match:
                ticket_id = re.sub(r"[-\s_]", "", ticket_match.group(1)).upper()
            return ExtractedEntities(
                intent="check_status",
                category="General",
                issue="Status check request",
                location="Campus",
                priority="Low",
                sentiment="Neutral",
                urgency_score=20,
                ticket_id=ticket_id,
                confidence=0.92,
                engine_used="rule-engine",
                detected_language=lang
            )

        # 3. College Notice Inquiry (RAG)
        notice_words = ["notice", "circular", "announcement", "holiday", "placement", "vacation", "exam date", "form date", "सूचना", "ছুটি", "বিজ্ঞপ্তি"]
        if any(nw in q for nw in notice_words) and not any(cw in q for cw in ["not working", "broken", "खराब", "কাজ করছে না"]):
            return ExtractedEntities(
                intent="notice_inquiry",
                category="Academic",
                issue=query,
                location="Administration",
                priority="Low",
                sentiment="Neutral",
                urgency_score=30,
                confidence=0.94,
                engine_used="rule-engine",
                detected_language=lang
            )

        # 4. Campus Inquiry / Location FAQ
        inquiry_triggers = ["where is", "how do i", "how to", "timing", "hours", "who is", "what is", "कहाँ है", "কোথায়", "সময়"]
        complaint_indicators = ["not working", "broken", "leak", "dirty", "damaged", "repair", "fix", "stopped", "flickering", "hot", "problem", "खराब", "काम नहीं कर रहा", "কাজ করছে না"]

        if any(it in q for it in inquiry_triggers) and not any(ci in q for ci in complaint_indicators):
            return ExtractedEntities(
                intent="campus_inquiry",
                category="Academic",
                issue=query,
                location=self._extract_location(query),
                priority="Low",
                sentiment="Neutral",
                urgency_score=25,
                confidence=0.90,
                engine_used="rule-engine",
                detected_language=lang
            )

        # 5. Greetings / Chitchat
        greetings = ["hi", "hello", "hey", "नमस्ते", "হ্যালো", "who are you"]
        if q in greetings or (len(q.split()) <= 2 and any(g in q for g in greetings)):
            return ExtractedEntities(
                intent="chitchat",
                category="General",
                issue=None,
                location=None,
                priority="Low",
                sentiment="Neutral",
                urgency_score=10,
                confidence=0.95,
                engine_used="rule-engine",
                detected_language=lang
            )

        # 6. Default to Register Complaint with Sentiment & Urgency
        category = self._detect_category(q)
        location = self._extract_location(query)
        issue = self._extract_issue(query)
        priority, sentiment, urgency_score, factors = self._analyze_sentiment_and_priority(q, location)

        return ExtractedEntities(
            intent="register_complaint",
            category=category,
            issue=issue,
            location=location,
            priority=priority,
            sentiment=sentiment,
            urgency_score=urgency_score,
            urgency_factors=factors,
            confidence=0.92,
            engine_used="rule-engine",
            detected_language=lang
        )

    def _detect_category(self, q: str) -> str:
        if any(w in q for w in ["ac", "air conditioner", "fan", "light", "projector", "bench", "desk", "door", "window", "पंखा", "লাইট"]):
            return "Maintenance"
        if any(w in q for w in ["wifi", "wi-fi", "internet", "computer", "lab pc", "network", "portal", "login", "printer", "इंटरनेट"]):
            return "IT/Network"
        if any(w in q for w in ["water", "tap", "washroom", "toilet", "bathroom", "leak", "leakage", "smell", "dirty", "पानी", "জল"]):
            return "Sanitation"
        if any(w in q for w in ["hostel", "mess", "food", "canteen", "room 1", "room 2", "হস্টেল"]):
            return "Hostel"
        if any(w in q for w in ["exam", "professor", "class", "marks", "attendance", "परीक्षा"]):
            return "Academic"
        return "Maintenance"

    def _extract_location(self, text: str) -> str:
        match = re.search(r"\b(classroom\s+\w+|room\s+\w+|lab\s+\w+|hostel\s+(?:block\s+)?\w+|library|canteen|washroom|auditorium|\d+(?:st|nd|rd|th)?\s+floor)\b", text, re.IGNORECASE)
        if match:
            return match.group(1).title()
        return "Campus Area"

    def _extract_issue(self, text: str) -> str:
        match = re.search(r"\b(ac|projector|fan|light|wifi|wi-fi|water supply|tap|computer)\s+(?:is\s+)?(not working|broken|leaking|damaged|flickering|down|off)\b", text, re.IGNORECASE)
        if match:
            return f"{match.group(1).title()} {match.group(2).lower()}"
        return text.strip()

    def _analyze_sentiment_and_priority(self, q: str, location: str = "") -> Tuple[str, str, int, list]:
        """Calculates Priority, Sentiment, Urgency Score (0-100), and Explainable Factors"""
        score = 40
        sentiment = "Neutral"
        priority = "Medium"
        factors = []

        # 1. Safety Hazards & Life Safety (Highest Urgency)
        hazard_words = ["spark", "smoke", "short circuit", "fire", "danger", "electric shock", "gas leak", "hazard", "ceiling falling"]
        if any(w in q for w in hazard_words):
            score += 55
            sentiment = "Urgent"
            priority = "Critical"
            factors.append("Safety / Electrical Hazard detected (+55)")

        # 2. Critical Utilities Interruption (Water, Power, Sanitation)
        utility_words = ["no water", "water supply", "tank empty", "blackout", "sewage overflow", "toilet blocked", "पानी बंद", "জল নেই"]
        if any(w in q for w in utility_words):
            score += 40
            sentiment = "Urgent"
            priority = "High"
            factors.append("Essential utility breakdown (+40)")

        # 3. Frustrated Tone / Repeated Failure
        frustrated_words = ["again", "constantly", "still not fixed", "third time", "useless", "disaster", "horrible", "unacceptable", "how many times", "बार बार", "আবার"]
        if any(w in q for w in frustrated_words):
            score += 25
            sentiment = "Frustrated"
            priority = "High" if score >= 70 else priority
            factors.append("Repeated occurrence / Student frustration expressed (+25)")

        # 4. Immediate Urgency & Time Pressure
        urgent_adverbs = ["urgent", "immediately", "right now", "emergency", "severe", "critical", "तुरंत", "জরুরি"]
        if any(w in q for w in urgent_adverbs):
            score += 20
            if sentiment == "Neutral": sentiment = "Urgent"
            factors.append("Urgent time-critical adverb specified (+20)")

        # 5. Academic Exam / Classroom Disruption
        academic_urgency = ["exam", "test", "viva", "class in progress", "lecture now", "studying"]
        if any(w in q for w in academic_urgency):
            score += 20
            if sentiment == "Neutral": sentiment = "Concerned"
            factors.append("Impacting scheduled academic / exam activity (+20)")

        # 6. Low Priority Dampeners
        minor_words = ["minor", "slow", "remote battery", "dustbin", "marker", "loose screw"]
        if any(w in q for w in minor_words) and score < 60:
            score -= 15
            priority = "Low"
            factors.append("Routine / non-critical equipment item (-15)")

        # Cap score between 10 and 100
        score = max(10, min(100, score))

        if score >= 90:
            priority = "Critical"
        elif score >= 70:
            priority = "High"
        elif score >= 45:
            priority = "Medium"
        else:
            priority = "Low"

        if not factors:
            factors.append("Standard operational maintenance baseline")

        return priority, sentiment, score, factors

nlp_service = HybridNLPService()
