---
name: flask-opencv-gemini-ocr
description: Builds and debugs Python Flask endpoints, OpenCV image preprocessing pipelines, and Google Gemini API structured extraction for university degrees and transcripts. Use when working on backend routes, PDF/image cleanup, OCR prompts, or JSON validation. Do not use FastAPI or modify Solidity contracts.
---

# Flask + OpenCV + Gemini Academic OCR Skill

## Stack Invariants
- **Framework:** Strictly use **Python with Flask** (`Blueprint`, `request`, `jsonify`). NEVER use FastAPI.
- **Zero Persistent Raw Storage:** Process uploaded degrees in memory (`io.BytesIO`) or temporary files purged immediately after hashing and IPFS pinning.

## Pipeline Protocol
1. **OpenCV Preprocessing (`cv2`):**
   - Convert input image/PDF page to grayscale (`cv2.cvtColor`).
   - Apply denoising (`cv2.fastNlMeansDenoising`) and adaptive thresholding or CLAHE contrast enhancement to sharpen physical wet stamps, signatures, and folio numbers.
   - Deskew rotated scans before sending to Gemini.
2. **Gemini API Structured Extraction:**
   - Enforce JSON response conforming strictly to `.agents/skills/flask-opencv-gemini-ocr/references/titulo-json-schema.json`.
   - Set low temperature (`0.0` - `0.1`) to prevent hallucination of registry numbers, folios, or dates.
3. **Cross-Validation:**
   - Compare extracted `cedula_identidad`, `libro`, and `folio` against the user request metadata and return a confidence score and discrepancy array.

