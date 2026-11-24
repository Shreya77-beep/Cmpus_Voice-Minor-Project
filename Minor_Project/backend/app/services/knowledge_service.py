import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from app.core.config import settings

class KnowledgeService:
    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or settings.FAQ_DATA_PATH
        self.faq_list: List[Dict[str, Any]] = []
        self.load_faq_data()

    def load_faq_data(self):
        try:
            if self.data_path.exists():
                with open(self.data_path, "r", encoding="utf-8") as f:
                    self.faq_list = json.load(f)
            else:
                self.faq_list = []
        except Exception as e:
            print(f"[KnowledgeService] Warning: Failed to load FAQ data: {e}")
            self.faq_list = []

    def find_best_answer(self, user_query: str) -> Optional[Dict[str, Any]]:
        if not self.faq_list:
            return None

        query_lower = user_query.lower()
        best_match = None
        highest_score = 0

        for item in self.faq_list:
            score = 0
            question_lower = item.get("question", "").lower()
            keywords = item.get("keywords", [])

            # Check direct question overlap
            for word in query_lower.split():
                if len(word) > 2 and word in question_lower:
                    score += 2

            # Check keyword tags
            for kw in keywords:
                if kw.lower() in query_lower:
                    score += 3

            if score > highest_score:
                highest_score = score
                best_match = item

        # Match threshold
        if highest_score >= 3 and best_match:
            return {
                "question": best_match.get("question"),
                "answer": best_match.get("answer"),
                "category": best_match.get("category"),
                "match_score": highest_score
            }

        return None

knowledge_service = KnowledgeService()
