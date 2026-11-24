# 📊 CampusVoice Dataset Strategy & Guide

For a College/Campus Voice Assistant, **there is no single public dataset that has your exact college campus buildings, departments, and specific issues**. 

Instead, real-world and academic minor/major projects use a **3-Tier Dataset Strategy**:

---

## 1. The 3-Tier Dataset Strategy

| Tier | Purpose | Format | How We Get It |
|---|---|---|---|
| **Tier 1: Intent & Entity Dataset** | Teaches the AI to classify intent (`register_complaint`, `campus_inquiry`, `check_status`, `emergency`) and extract entities (`Category`, `Location`, `Issue`, `Priority`). | JSON / CSV / Spacy Format | Seeded synthetically (100–300 utterances) + augmented with public intent benchmarks. |
| **Tier 2: Campus Knowledge Base (FAQ)** | Provides accurate answers to campus queries (Exam dates, office locations, department timings, fees). | `campus_faq.json` or Vector DB | Curated from typical university handbooks / student guides. |
| **Tier 3: Historical Complaints (Mock Data)** | Tests the database, ticket generation, and status tracking (e.g. `CV1001` to `CV1050`). | SQLite / CSV | Generated mock records with various statuses (`Pending`, `In Progress`, `Resolved`). |

---

## 2. Recommended Public Benchmark Datasets (For Reference & Academic Literature)

When writing your project report or paper, you can cite these well-known open-source benchmarks:

1. **SNIPS Voice Platform Dataset**:
   - *Why:* Benchmark for Voice-to-Intent classification and slot-filling.
   - *Link / Source:* HuggingFace `snips_built_in_intents` / PapersWithCode.
2. **CLINC150 Intent Classification Dataset**:
   - *Why:* Contains 150 intent classes including utilities, complaints, and out-of-scope utterances.
   - *Link / Source:* HuggingFace `clinc_oos`.
3. **Consumer Complaint Database (CFPB)**:
   - *Why:* Real-world complaint texts with categories and priority/urgency patterns.
   - *Link / Source:* Data.gov / Kaggle.
4. **MultiWOZ (Multi-Domain Wizard-of-Oz)**:
   - *Why:* Multi-turn dialogue dataset for task-oriented conversational agents.

---

## 3. How We Will Build Your Dataset

We have already created initial seed files:
1. `backend/data/datasets/campus_intents.json`: Labeled intents and slot examples.
2. `backend/data/campus_faq.json`: Verified campus Q&A covering exams, departments, library, and IT.

We can also generate 200+ realistic student variations (including short slang, voice typos, and urgency words) using a Python dataset generator script.
