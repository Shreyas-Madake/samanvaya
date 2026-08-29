# SAMANVAYA Backend

**SAMANVAYA** is a multilingual clinical medication safety tool for Smart India Hackathon 2026.

It helps doctors identify dangerous interactions between **Allopathy** (modern medicine) and **AYUSH** (Ayurvedic/herbal) medicines.

---

## What You Have Now

A basic **runnable backend skeleton** with:
- FastAPI server
- In-memory storage (no database yet)
- Mock endpoints for the full consultation pipeline
- CORS enabled for frontend development

The server doesn't do real work yet — all responses are hard-coded placeholders. This lets you test the API shape and confirm everything runs before we build the real logic.

---

## How to Install and Run (Windows)

### 1. Navigate to the backend folder
```bash
cd backend
```

### 2. Create a virtual environment
```bash
python -m venv .venv
```

### 3. Activate the virtual environment
```bash
.venv\Scripts\activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Start the server
```bash
uvicorn main:app --reload --port 8000
```

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
```

---

## How to Test

### In your browser:

1. **Health check:**  
   Open http://localhost:8000/health  
   You should see: `{"status": "ok"}`

2. **Interactive API docs:**  
   Open http://localhost:8000/docs  
   This is FastAPI's built-in Swagger UI — you can test all endpoints right in your browser.

### Example flow (using the /docs page or curl):

1. **Create a patient**  
   POST `/patients` with:
   ```json
   {
     "name": "Rajesh Kumar",
     "age": 55,
     "sex": "M"
   }
   ```
   Copy the returned `id`.

2. **Start a consultation**  
   POST `/consult` with:
   ```json
   {
     "patient_id": "<paste the id here>",
     "consent": true
   }
   ```
   Copy the consultation `id`.

3. **Transcribe the consultation**  
   POST `/consult/{id}/transcribe` with:
   ```json
   {
     "text": "Patient complains of headache and fatigue. Currently taking Metformin 500mg twice daily and Fenugreek seeds."
   }
   ```

4. **Extract entities**  
   POST `/consult/{id}/extract`  
   Returns mock symptoms, conditions, medications.

5. **Reconcile medicines**  
   POST `/consult/{id}/reconcile`  
   Returns mock unified medicine profile.

6. **Check interactions**  
   POST `/consult/{id}/check`  
   Returns ONE mock interaction alert (Metformin + Fenugreek).

7. **Approve and save**  
   POST `/consult/{id}/approve`  
   Returns `{"saved": true}`.

8. **Get the full consultation**  
   GET `/consult/{id}`  
   Returns the complete consultation object with all fields.

---

## File Structure

```
backend/
├─ main.py            # FastAPI app with all routes (CORS, endpoints, mock data)
├─ store.py           # In-memory storage (patients and consults dicts)
└─ requirements.txt   # Python dependencies (fastapi, uvicorn, pydantic)
```

---

## What's Next

**Phase 2:** Real interaction engine with a curated knowledge base (interactions.json)  
**Phase 3:** Real clinical entity extractor (rule-based, offline)  
**Phase 4:** FHIR R4 export with DetectedIssue resources  
**Phase 5:** Doctor console frontend

---

## Important Notes

- **All data is lost when you restart the server** (in-memory storage only).
- The mock responses are placeholders — we'll replace them step by step.
- Nothing is "saved" permanently until Phase 4 (FHIR export).
- Interaction verdicts will come from a data file, NEVER from an LLM guessing.

---

Ready to test! Type "next" when you're ready for Phase 2.
