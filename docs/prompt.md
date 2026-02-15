INSPIRATION & STYLE
Linear.app Dark Mode: High contrast, sophisticated, developer-focused
Mayo Clinic / Cleveland Clinic: Authoritative, clinical, trustworthy
Sci-Fi Interfaces (The Expanse): Data-dense, precise, functional
Overall mood: High-End Medical AI, Clinical Intelligence, Precision Medicine.

PAGES TO CREATE
Landing Page (Hero, Features, Tech Stack, Footer)
Clinical Dashboard (Patient Overview, Alerts, Activity)
Live Assistant (Interactive Patient Session, Voice/Chat)
Report Viewer (Detailed Analysis, DICOM, Metrics)
Onboarding (User Profile, Specialty Setup)
Architect Profile (Creator Bio)

COLORS (Use these EXACT values everywhere)
Page background: #050508 (Darkest - deep space black)
Primary Gold: #D4AF37 (Metallic Gold/Brass - for key actions and highlights)
Primary Dark: #B4941F (Darker Gold - for hover states)
Surface: #1E1E2E (Dark Blue-Grey - for cards and sidebars)
Surface Alt: #0F0F13 (Near Black - for secondary backgrounds)
Text Primary: #FFFFFF (White - for headings and main text)
Text Secondary: #94A3B8 (Slate 400 - for labels and descriptions)
Borders: #2C2C35 (Subtle dark border)
Success: #10B981 (Emerald 500)
Warning: #F59E0B (Amber 500)
Error: #EF4444 (Red 500)

TYPOGRAPHY
Font family: "Inter", system-ui, sans-serif
Hero headline: 4rem, font-weight 700, letter-spacing -0.02em, line-height 1.1
Section titles: 2.25rem, font-weight 600
Card titles: 1.25rem, font-weight 600
Body text: 1rem, font-weight 400, line-height 1.6
Labels: 0.75rem, font-weight 500, uppercase, letter-spacing 0.05em
Monospace: "JetBrains Mono", monospace (for code/data values)

SPACING SYSTEM
Section padding: 80px vertical
Container: max-width 1400px (wide for dashboard data)
Card padding: 24px
Grid gaps: 16px, 24px
Border radius: 8px (sharp, professional look)

PAGE 1: LANDING PAGE
SECTION 1: HERO
Height: 90vh
Background: #050508 with subtle radial gradient glow (#D4AF37 at 5% opacity)
Content:
- Headline: "Clinical Intelligence Reimagined."
- Subheadline: "Advanced AI diagnostics and real-time patient analysis for modern cardiology."
- CTA Button: "Launch Platform" (Gold background, Black text)
- Visual: Abstract visualization of a heart rhythm or neural network nodes.

SECTION 2: FEATURES
Layout: 3-column grid
Cards:
1. "Automated Reporting": Generate comprehensive clinical reports in seconds.
2. "Clinical Debate": AI agents debating differential diagnoses.
3. "Real-time Analysis": Live voice transcription and medical entity extraction.
Style: Surface background (#1E1E2E), thin border (#2C2C35), Gold icon.

SECTION 3: TECH STACK
Layout: Row of logos or tech badges
Content: Python, FastAPI, React, TensorRT, DICOM, FHIR.
Style: Muted grayscale logos, hover to color.

PAGE 2: CLINICAL DASHBOARD
Layout: Sidebar navigation (left), Main content area.
Sidebar: Icons for Dashboard, Patients, Reports, Settings. Gold active state.
Main Area:
- Header: "Welcome back, Dr. [Name]" with date and quick stats.
- Top Row: Key Metrics (Patients Seen, Critical Alerts, Pending Reports).
- Middle Section: "Patient Alert List" - Table with columns: Patient Name, ID, Risk Level (High/Med/Low), Last Visit, Action.
- Bottom Section: "Recent Activity" - Feed of recent AI analyses and generated reports.

PAGE 3: LIVE ASSISTANT (Patient Interaction)
Layout: 3-Column Split View (High density)
Left Column (20%): "Patient Context"
- Pulse/Timeline: Vertical timeline of recent medical events.
- Risk Factors: List of key risks (e.g., Hypertension, AFib history).
- Current Meds: Compact list.

Center Column (50%): "Interaction"
- Mode Toggle: Voice / Chat.
- Transcription Area: Real-time scrolling text of the conversation.
- Waveform Visualizer: Audio reactive visual for voice input.
- Input: Text area and Microphone button (Gold).

Right Column (30%): "AI Insights"
- "Real-time Suggestions": AI suggesting questions to ask based on transcript.
- "Detected Entities": Medical terms extracted live (Symptoms, Medications).
- "Action Items": Checklist of orders/referrals generated from the conversation.

PAGE 4: REPORT VIEWER
Layout: Header with patient info, Two-column detail view.
Header: Patient Name, DOB, MRN. Actions: "Edit", "Sign & Export", "Print".
Left Column (Document):
- The generated report text (Subjective, Objective, Assessment, Plan).
- Editable markdown or rich text editor.
Right Column (Evidence/Data):
- "Evidence Basis": Links to guidelines (ACC/AHA) referenced in the report.
- "Data Snapshots": Thumbnails of ECGS, Echo loops, or vitals graphs used for the assessment.
- "Confidence Score": AI confidence meter for specific diagnoses.

PAGE 5: ONBOARDING
Layout: Centered Card on dark background.
Steps:
1. User Profile: Name, Credentials (MD, DO, NP), Specialty.
2. Hospital/Clinic Association.
3. Preference Setup: Report style (Brief vs. Detailed), Default Dashboard View.
Style: Progress bar in Gold. Clean form inputs with borders.

PAGE 6: ARCHITECT PROFILE
Layout: Single column, focused reading experience.
Content:
- Photo/Avatar of the creator.
- Bio: "Built by [Name], aiming to bridge the gap between clinical expertise and artificial intelligence."
- Philosophy: Statement on "Human-in-the-loop" AI.
- Contact/Social Links.
