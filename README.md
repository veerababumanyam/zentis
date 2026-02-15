
# Zentis: Next Gen Healthcare Assistant

**The Future of Health is Conversational.**

Zentis is a conversational co-pilot that instantly transforms complex patient data into actionable clinical insights at the point of care. It revolutionizes healthcare workflows through intelligent patient data summarization, multi-modal biomarker detection, and a conversational interface, enabling clinicians to interact naturally with comprehensive patient records.

---

## Tech Stack

-   **Frontend:** React 19, TypeScript, Tailwind CSS
-   **Backend & Infrastructure:** Firebase (Auth, Firestore, Hosting)
-   **AI & Generative UI:** Google Gemini API (`@google/genai`)
    -   *Models:* `gemini-2.5-flash` (Speed), `gemini-3-pro-preview` (Deep Reasoning/Vision), `gemini-2.5-flash-native-audio-preview` (Live)
-   **State Management:** React Hooks (Context API)
-   **Build:** Vite (npm run build)

## Project Structure

-   **/components/**: All React components, organized by feature (Chat, Dashboard, Reports, Live Assistant).
-   **/services/**: Core application logic and AI integration.
    -   **/services/agents/**: Specialized AI agents grouped by domain:
        -   `diagnosticAgents.ts`: Lab trends, differential diagnosis, ECG analysis.
        -   `treatmentAgents.ts`: Guideline adherence, contraindications, dosage optimization.
        -   `subspecialtyAgents.ts`: Deep domain logic for Cardiology, Neurology, Oncology.
        -   `expandedSpecialties.ts`: Broad coverage for GI, Pulm, Endo, etc.
        -   `multiAgentSimulation.ts`: Orchestration for Medical Board reviews and Clinical Debates.
-   **App.tsx**: Main application entry point.

## Getting Started

### Prerequisites

-   A modern web browser (Chrome, Edge, Safari).
-   Node.js and npm installed.
-   Firebase CLI installed (`npm install -g firebase-tools`).
-   A valid Google Gemini API key.

### Configuration & Deployment

1.  **Initialize Environment:**
    Ensure your `.env.local` contains the Zentis Firebase credentials.

2.  **Build the Project:**
    ```bash
    npm run build
    ```

3.  **Deploy to Firebase:**
    ```bash
    firebase deploy
    ```

4.  **Local Development:**
    ```bash
    npm run dev
    ```

---

## Key Features

### 1. Comprehensive Medical Intelligence
Zentis goes beyond general medicine with a unified ecosystem of specialized AI agents, each trained on domain-specific guidelines:
- **Cardiology:** Interventional (SYNTAX), EP (Device Interrogation), Advanced HF (LVAD), CTA (CAD-RADS).
- **Neurology:** Stroke protocols, MRI brain analysis, seizure management.
- **Oncology:** TNM staging, biomarker analysis, treatment protocols.
- **Internal Medicine:** Nephrology, Gastroenterology, Pulmonology, Endocrinology, Infectious Disease, Rheumatology, Hematology, and more.

### 2. Multi-Agent Collaboration
- **Bio-AI Board:** Simulates a multidisciplinary tumor board or complex case review. The system identifies necessary specialists (e.g., Nephrology + Cardiology for Cardiorenal syndrome) and synthesizes a consolidated consensus report.
- **Clinical Critics:** Initiates an adversarial "Grand Rounds" debate where AI agents representing different specialties argue for and against treatment plans to identify blind spots.

### 3. Live Bio-Signal Assistant
A multimodal, real-time monitor that acts as an ambient scribe and diagnostic aid:
- **Audio Biomarkers:** Detects Dyspnea, Dysarthria, Anxiety, and Cough via voice analysis.
- **Visual Biomarkers:** Identifies Cyanosis, Pallor, JVD, Tremors, and Facial Asymmetry via video stream.
- **Smart HUD:** Displays detected signs with confidence levels and correlates them with patient history (e.g., "Tremor detected -> Possible side effect of Albuterol").

### 4. Advanced Diagnostics & Data Analysis
- **Trend Analysis:** Interactive charts for Labs (BNP, Cr, K+), Vitals, and LVEF with predictive outlooks.
- **Image Analysis:** Multimodal interpretation of medical imaging (X-rays, ECGs, CT slices).
- **Report Comparison:** Side-by-side comparison of sequential reports (e.g., Echo vs. Prior Echo) to highlight interval changes.
- **Risk Stratification:** Automated calculation of cardiovascular risk scores (CHA₂DS₂-VASc, HAS-BLED, ASCVD).

### 5. Treatment & Safety
- **GDMT Compliance:** Audits heart failure medications against current guidelines.
- **Contraindication Checker:** Cross-references prescriptions against allergies, conditions, and live lab values (e.g., "Stop Spironolactone due to K+ 5.5").
- **Dosage Optimization:** Suggests titrations based on renal function and vitals.

### 6. Workflow Automation
- **Smart Report Ingestion:** Upload PDF, DICOM, or Images. The AI automatically extracts metadata, generates a summary, and files it into the patient chart.
- **Daily Huddle:** Generates a "morning report" identifying high-risk patients and care gaps.
- **Clinical Note Generation:** Drafts structured SOAP notes based on the chat history, live transcript, and interval data changes.
