---
name: flask-opencv-gemini-ocr
description: Builds and debugs Python Flask endpoints, OpenCV image preprocessing pipelines, PyMuPDF/Tesseract fallback, and Google Gemini API structured extraction for university degrees and transcripts. Use when working on api/main.py, api/app_flask.py, api/ocr_service.py, api/gemini_service.py, api/vision_preprocessor.py, PDF/image cleanup, OCR prompts, or JSON validation. Do not use FastAPI or modify Solidity contracts or React UI styling.
---

# Flask + OpenCV + Gemini Academic OCR Skill

## Stack & File Map
- **Framework:** Strictly use **Python with Flask** in `api/main.py` (port `8000`) and `api/app_flask.py` (port `5000`). NEVER use FastAPI.
- **Core Modules:** `api/vision_preprocessor.py` (OpenCV), `api/gemini_service.py` (Gemini Vision multimodal), `api/ocr_service.py` (`USMOcrService`, `AcademicDegreeNER`, `format_for_frontend`), and `api/tessdata/frk.traineddata` (Gothic Fraktur fallback).
- **Zero Persistent Raw Storage:** Process uploaded degrees in memory (`io.BytesIO`) or temporary files purged immediately in a `finally` block.

## Pipeline Protocol
1. **OpenCV Preprocessing (`cv2`):**
   - Convert input image or PyMuPDF (`fitz`) rasterized PDF page to grayscale (`cv2.cvtColor`).
   - Apply denoising (`cv2.fastNlMeansDenoising`) and adaptive thresholding or CLAHE contrast enhancement to sharpen wet stamps, signatures, and folio numbers.
   - Deskew rotated scans before sending to Gemini or Tesseract.
2. **Gemini API & Hybrid Fallback:**
   - Support structured extraction at low temperature (`0.0` - `0.1`) and preserve backward compatibility with `USMOcrService.format_for_frontend` (`fields` + `data` envelope consumed by `OCRExtractor.jsx`), while aligning target structured contracts toward `.agents/skills/flask-opencv-gemini-ocr/references/titulo-json-schema.json`.
   - Maintain resilient fallback to PyMuPDF + Tesseract (`spa`/`frk`) + `AcademicDegreeNER` when Gemini quota/network fails.
3. **Cross-Validation & Verification:**
   - Normalize university and career names against `src/data/venezuelaLocations.js`, compare extracted `cedula_identidad`, `libro`, and `folio` against user metadata, and return confidence scores and discrepancy flags.
   - Verify edits with `.\venv\Scripts\python.exe -m py_compile api\main.py api\app_flask.py api\ocr_service.py`, `.\venv\Scripts\python.exe test_ner_robust.py`, and `.\venv\Scripts\python.exe test_flask_ocr.py`.
