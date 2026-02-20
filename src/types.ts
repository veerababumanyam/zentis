
export type UserRole = 'doctor' | 'patient';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    geminiApiKey?: string;
    createdAt: number;
    displayName: string;
    photoURL: string;
    patients?: string[]; // IDs of patients managed by this user (for doctors)
    healthRecordId?: string; // ID of health record (for patients)
    age?: number;
    gender?: 'Male' | 'Female' | 'Other';
}
export interface Report {
    id: string;
    type: 'Lab' | 'ECG' | 'Echo' | 'Imaging' | 'Meds' | 'Cath' | 'Device' | 'HF Device' | 'CTA' | 'DICOM' | 'PDF' | 'Link' | 'Pathology' | 'MRI' | 'Genomics' | 'Procedure' | 'LiveSession';
    date: string; // YYYY-MM-DD
    title: string;
    content: string | { type: 'image'; url: string; } | { type: 'pdf'; url: string; rawText: string; } | { type: 'dicom'; url: string; } | { type: 'link'; url: string; metadata?: any } | { type: 'live_session'; transcript: string; biomarkers: any[] };
    aiSummary?: string;
    keyFindings?: string[];
    unstructuredData?: Record<string, any>; // NEW: For capturing data that doesn't fit into standard schemas
    fileHash?: string; // NEW: SHA-256 hash for duplicate detection
    tags?: string[]; // NEW: e.g. ['processed', 'smart-extracted']
    rawTextForAnalysis?: string | null; // NEW: For AI extraction
    isDeleted?: boolean; // NEW: Soft delete flag
    deletedAt?: number | null; // NEW: Timestamp of deletion
}

export interface VitalsLog {
    date: string; // YYYY-MM-DD
    vitals: string; // e.g., "BP 120/80, HR 70, O2 Sat 98%"
}

export interface MedicalHistoryItem {
    description: string;
    icd10?: string;
}

export interface EmergencyContact {
    name: string;
    relationship?: string;
    phonePrimary: string;
    phoneSecondary?: string;
    address?: string;
    isPrimary?: boolean;
}

export interface InsuranceInfo {
    providerName: string;
    planName?: string;
    policyNumber?: string;
    groupNumber?: string;
    phone?: string;
    effectiveDate?: string; // YYYY-MM-DD
    expiryDate?: string; // YYYY-MM-DD
    notes?: string;
}

export interface PrimaryCarePhysician {
    name: string;
    clinicName?: string;
    phone?: string;
    email?: string;
    address?: string;
    npi?: string;
}

export interface AdvancedDirectives {
    dnr?: boolean; // Do Not Resuscitate
    dni?: boolean; // Do Not Intubate
    polstSummary?: string;
    directiveDocumentUrl?: string;
    lastReviewDate?: string; // YYYY-MM-DD
    notes?: string;
}

export interface PrivacyConsent {
    consentGiven: boolean;
    consentType: 'HIPAA' | 'Marketing' | 'Research' | 'Other';
    consentDate: string; // YYYY-MM-DD
    withdrawnDate?: string; // YYYY-MM-DD
    notes?: string;
}

export interface ClinicalGoals {
    targetWeightKg?: number;
    targetSystolicBp?: number;
    targetDiastolicBp?: number;
    targetHba1c?: number;
    targetLdl?: number;
    otherGoals?: {
        label: string;
        targetDescription: string;
    }[];
}

export interface ClinicalTask {
    id: string;
    text: string;
    isCompleted: boolean;
    createdAt: string;
}

export interface Patient {
    id: string;
    name: string;
    photoURL?: string; // NEW
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    weight: number; // in kg
    allergies: string[];
    medicalHistory: MedicalHistoryItem[];
    criticalAlerts?: string[];
    consolidatedFindings?: string[]; // NEW: Aggregated findings from all reports
    emergencyContacts?: EmergencyContact[];
    insurance?: InsuranceInfo;
    primaryCarePhysician?: PrimaryCarePhysician;
    advancedDirectives?: AdvancedDirectives;
    privacyConsent?: PrivacyConsent;
    clinicalGoals?: ClinicalGoals;
    // Expanded structured history (optional, populated when fetched from sub-collections)
    immunizations?: {
        id?: string;
        vaccineName: string;
        date: string;
        lotNumber?: string;
        manufacturer?: string;
        administeringProvider?: string;
        site?: string;
        route?: string;
        status?: 'completed' | 'pending' | 'declined';
        notes?: string;
    }[];
    familyHistory?: {
        id?: string;
        relativeType: string;
        condition: string;
        icd10?: string;
        ageAtOnset?: number;
        notes?: string;
    }[];
    socialHistory?: {
        id?: string;
        domain: string;
        value: string;
        startDate?: string;
        endDate?: string;
        notes?: string;
    }[];
    appointmentTime: string; // Format 'HH:MM'
    pendingLabs?: string[]; // NEW: For "Result Pending" visual cue
    currentStatus: {
        condition: string;
        conditionIcd10?: string;
        vitals: string;
        medications: string[];
    };
    reports: Report[];
    notes?: string;
    vitalsLog?: VitalsLog[];
    tasks?: ClinicalTask[];
}

export interface SuggestedAction {
    type: 'view_report' | 'generate_prescription';
    label: string;
    reportId?: string;
}

export interface TextMessage {
    id: number;
    sender: 'user' | 'ai';
    type: 'text';
    text: string;
    suggestedAction?: SuggestedAction;
}

export interface ImageMessage {
    id: number;
    sender: 'user';
    type: 'image';
    base64Data: string;
    mimeType: string;
    storageUrl?: string; // Firebase Storage download URL (persisted instead of base64)
    thumbnailBase64?: string; // Small thumbnail for inline preview (~2-5KB)
}

export interface UploadableFile {
    name: string;
    mimeType: string;
    base64Data: string;
    previewUrl: string; // Used for client-side thumbnail rendering
    isLink?: boolean; // NEW: Flag for external links
    sourceUrl?: string; // NEW: The original URL
    storageUrl?: string; // Firebase Storage download URL (persisted instead of base64)
    thumbnailBase64?: string; // Small thumbnail for inline preview (~2-5KB)
}

export interface MultiFileMessage {
    id: number;
    sender: 'user';
    type: 'multi_file';
    text: string;
    files: UploadableFile[];
}

export interface TrendChartDataPoint {
    date: string;
    value: number;
}

export interface TrendChartSeries {
    name: string;
    unit: string;
    data: TrendChartDataPoint[];
    threshold?: { value: number, label: string };
    referenceRange?: { min: number, max: number }; // NEW: For Normal Range shading
}

export interface TrendChartMessage {
    id: number;
    sender: 'ai';
    type: 'trend_chart';
    title: string;
    series: TrendChartSeries[];
    interpretation: string;
    suggestedAction?: SuggestedAction;
}

export interface VitalTrendsMessage {
    id: number;
    sender: 'ai';
    type: 'vital_trends';
    title: string;
    series: TrendChartSeries[];
    interpretation: string;
    suggestedAction?: SuggestedAction;
}

export interface SourceVerification {
    reportId: string;
    quote: string; // Exact text match
}

export type GdmtStatus = 'prescribed' | 'missing' | 'contraindicated';

export interface GdmtChecklistItem {
    status: GdmtStatus;
    drugClass: string;
    details: string;
    verification?: SourceVerification;
}

export interface GdmtChecklistMessage {
    id: number;
    sender: 'ai';
    type: 'gdmt_checklist';
    title: string;
    items: GdmtChecklistItem[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

export type ComparisonChangeType =
    | 'Improved'
    | 'Worsened (Critical)'
    | 'Worsened (Minor)'
    | 'Unchanged'
    | 'New Finding'
    | 'Resolved';

export interface ReportComparisonRow {
    finding: string;
    current: string;
    previous: string;
    change: ComparisonChangeType;
}

export interface ReportComparisonMessage {
    id: number;
    sender: 'ai';
    type: 'report_comparison';
    title: string;
    currentReportDate: string;
    previousReportDate: string;
    table: ReportComparisonRow[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

export type DiagnosisConfidence = 'High' | 'Medium' | 'Low';

export interface DiagnosisItem {
    confidence: DiagnosisConfidence;
    diagnosis: string;
    rationale: string;
    verification?: SourceVerification;
}

export interface DifferentialDiagnosisMessage {
    id: number;
    sender: 'ai';
    type: 'differential_diagnosis';
    title: string;
    diagnoses: DiagnosisItem[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

export interface RiskFactorDetail {
    text: string;
    verification?: SourceVerification;
}

export interface RiskScoreItem {
    name: string;
    score: string;
    riskLevel: 'Low' | 'Borderline' | 'Intermediate' | 'High' | 'Very High';
    description: string;
    details: RiskFactorDetail[];
}

export interface RiskStratificationMessage {
    id: number;
    sender: 'ai';
    type: 'risk_stratification';
    title: string;
    scores: RiskScoreItem[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

export type ContraindicationSeverity = 'Critical' | 'High' | 'Moderate';

export interface ContraindicationItem {
    severity: ContraindicationSeverity;
    drug: string;
    conflict: string;
    rationale: string;
    verification?: SourceVerification;
}

export interface ContraindicationMessage {
    id: number;
    sender: 'ai';
    type: 'contraindication_checker';
    title: string;
    items: ContraindicationItem[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

export type DosageSuggestionStatus = 'Continue' | 'Titrate Up' | 'Titrate Down' | 'Change Advised' | 'Labs Required'; // NEW: Labs Required

export interface DosageOptimizationItem {
    drug: string;
    currentDose: string;
    suggestedDose: string;
    status: DosageSuggestionStatus;
    rationale: string;
    monitoringPlan: string;
}

export interface DosageOptimizationMessage {
    id: number;
    sender: 'ai';
    type: 'dosage_optimization';
    title: string;
    items: DosageOptimizationItem[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

export interface EjectionFractionTrendMessage {
    id: number;
    sender: 'ai';
    type: 'ef_trend';
    title: string;
    data: TrendChartDataPoint[];
    currentLVEF: number;
    annualChange: number;
    prediction: string;
    predictedRisk?: {
        riskLevel: 'Low' | 'Moderate' | 'High';
        percentage: number;
        timeframe: string; // e.g., "6 months"
        rationale: string;
    };
    suggestedAction?: SuggestedAction;
}

export type ArrhythmiaRiskLevel = 'Low' | 'Moderate' | 'High';

export interface ArrhythmiaFinding {
    name: string;
    value: string;
    risk: ArrhythmiaRiskLevel;
    description: string;
}

export interface ArrhythmiaAnalysisMessage {
    id: number;
    sender: 'ai';
    type: 'arrhythmia_analysis';
    title: string;
    findings: ArrhythmiaFinding[];
    recognizedPattern: string;
    riskAssessment: string;
    suggestedAction?: SuggestedAction;
}

export interface BPFinding {
    name: string;
    value: string;
    description: string;
}

export interface BloodPressureAnalysisMessage {
    id: number;
    sender: 'ai';
    type: 'blood_pressure_analysis';
    title: string;
    findings: BPFinding[];
    riskAssessment: string;
    recommendations: string[];
    suggestedAction?: SuggestedAction;
}

export interface BiomarkerTrendPoint {
    date: string;
    value: number;
}

export interface BiomarkerItem {
    name: string;
    unit: string;
    value: string;
    status: 'Normal' | 'Elevated';
    trend: 'Rising' | 'Falling' | 'Stable';
    interpretation: string;
    trendData: BiomarkerTrendPoint[];
}

export interface CardiacBiomarkerMessage {
    id: number;
    sender: 'ai';
    type: 'cardiac_biomarker';
    title: string;
    items: BiomarkerItem[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

export type AiModel = 'speed' | 'accuracy';

export interface ConsultationPayload {
    files: {
        name: string;
        base64Data: string;
        mimeType: string;
    }[];
    prompt: string;
    model: AiModel;
}

export interface HighRiskPatient {
    patientId: string;
    patientName: string;
    riskFactor: string;
    details: string;
}

export interface CareOpportunity {
    patientId: string;
    patientName: string;
    opportunity: string;
    details: string;
}

export interface DailyHuddle {
    summary: string;
    highRiskPatients: HighRiskPatient[];
    careOpportunities: CareOpportunity[];
}

// --- SUB-SPECIALTY AGENT TYPES ---

// 1. Interventional Cardiology
export interface InterventionalCardiologyLesion {
    vessel: string;
    location: string;
    stenosis: string;
    ffr_ifr: string;
    notes: string;
}

export interface InterventionalCardiologyMessage {
    id: number;
    sender: 'ai';
    type: 'interventional_cardiology';
    title: string;
    lesions: InterventionalCardiologyLesion[];
    estimatedSyntaxScore: string;
    recommendation: {
        strategy: 'PCI' | 'CABG' | 'Medical Therapy';
        rationale: string;
        guideline: string;
    };
    summary: string;
    suggestedAction?: SuggestedAction;
}

// 2. Electrophysiology (EP)
export interface EpDeviceSummary {
    therapiesDelivered: string;
    atpDelivered: string;
    shocksDelivered: string;
}

export interface EpArrhythmiaSummary {
    at_afBurden: string;
    vt_ns_Episodes: string;
    vfEpisodes: string;
}

export interface EpDeviceStatus {
    battery: string;
    leadImpedance: string;
    sensing: string;
    pacingThreshold: string;
}

export interface EpDeviceReportMessage {
    id: number;
    sender: 'ai';
    type: 'ep_device_report';
    title: string;
    deviceSummary: EpDeviceSummary;
    arrhythmiaSummary: EpArrhythmiaSummary;
    deviceStatus: EpDeviceStatus;
    aiAssessment: string;
    suggestedAction?: SuggestedAction;
}

// 3. Advanced Heart Failure
export interface AdvancedHeartFailureParameters {
    parameter: string;
    value: string;
    trend: 'Increasing' | 'Decreasing' | 'Stable';
    status: 'Normal' | 'Concerning' | 'Critical';
}

export interface AdvancedHeartFailureMessage {
    id: number;
    sender: 'ai';
    type: 'advanced_heart_failure';
    title: string;
    deviceType: string;
    parameters: AdvancedHeartFailureParameters[];
    aiAssessment: {
        concern: string;
        rationale: string;
        recommendation: string;
    };
    suggestedAction?: SuggestedAction;
}

// 4. CT Angiography
export interface CtaLesion {
    vessel: string;
    segment: string;
    plaqueType: 'Non-calcified' | 'Mixed' | 'Calcified' | 'None';
    stenosisSeverity: 'Minimal' | 'Mild' | 'Moderate' | 'Severe';
    cadRads: string;
}

export interface CtaGraft {
    graftName: string;
    status: 'Patent' | 'Stenosed' | 'Occluded';
    details: string;
}

export interface CtaAnalysisMessage {
    id: number;
    sender: 'ai';
    type: 'cta_analysis';
    title: string;
    calciumScore: {
        score: string;
        interpretation: string;
    };
    lesionAnalysis: CtaLesion[];
    graftAnalysis?: CtaGraft[];
    otherCardiacFindings: string;
    extracardiacFindings: string;
    overallImpression: string;
    recommendations: string[];
    suggestedAction?: SuggestedAction;
}

// 5. Neurology
export interface NeuroFinding {
    region: string; // e.g. "Frontal Lobe", "Basal Ganglia"
    finding: string;
    significance: 'Normal' | 'Abnormal' | 'Critical';
}

export interface NeurologyMessage {
    id: number;
    sender: 'ai';
    type: 'neurology_analysis';
    title: string; // e.g. "MRI Brain Analysis"
    modality: 'MRI' | 'CT' | 'EEG';
    findings: NeuroFinding[];
    impression: string;
    recommendations: string[];
    strokeProtocolStatus?: string; // e.g. "Candidate for tPA"
    suggestedAction?: SuggestedAction;
}

// 6. Oncology
export interface OncologyStaging {
    t: string;
    n: string;
    m: string;
    stage: string;
}

export interface OncologyMessage {
    id: number;
    sender: 'ai';
    type: 'oncology_analysis';
    title: string;
    tumorSite: string;
    histology: string;
    biomarkers: { name: string; status: string }[];
    staging?: OncologyStaging;
    treatmentPlan: string;
    suggestedAction?: SuggestedAction;
}

// 7. Universal / General Specialist Report
export interface UniversalSpecialistMessage {
    id: number;
    sender: 'ai';
    type: 'universal_specialist';
    specialty: string; // e.g., "Gastroenterology", "Dermatology"
    title: string;
    keyFindings: { label: string; value: string; status: 'normal' | 'abnormal' | 'critical' }[];
    clinicalAssessment: string;
    plan: string[];
    suggestedAction?: SuggestedAction;
}


export interface ReportViewerMessage {
    id: number;
    sender: 'ai';
    type: 'report_viewer';
    title: string;
    reportId: string;
}

export interface SmartSummaryHighlight {
    icon: 'alert' | 'labs' | 'meds' | 'vitals' | 'echo';
    text: string;
}

export interface SmartSummaryTableItem {
    metric: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
    verification?: SourceVerification;
}

export interface SmartSummaryMessage {
    id: number;
    sender: 'ai';
    type: 'smart_summary';
    title: string;
    highlights: SmartSummaryHighlight[];
    tables: {
        title: string;
        items: SmartSummaryTableItem[];
    }[];
    narrativeSummary: string;
    suggestedAction?: SuggestedAction;
}

export interface PrescriptionMedication {
    name: string;
    dosage: string;
    frequency: string; // e.g., "Once Daily", "Twice Daily"
    timing: 'Morning' | 'Afternoon' | 'Evening' | 'Bedtime' | 'With Meals' | 'As Needed';
    instructions?: string; // e.g., "Take with food"
}

export interface PrescriptionMessage {
    id: number;
    sender: 'ai';
    type: 'prescription';
    title: string;
    patientName: string;
    date: string; // YYYY-MM-DD
    medications: PrescriptionMedication[];
    doctorInfo: {
        name: string;
        credentials: string;
        contact: string;
    };
    notesToPharmacist?: string;
}

export interface HccCodingItem {
    hccCode: string;
    description: string;
    evidence: string;
    confidence: 'High' | 'Medium' | 'Low';
}

export interface HccCodingMessage {
    id: number;
    sender: 'ai';
    type: 'hcc_coding';
    title: string;
    items: HccCodingItem[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

// --- NEW TYPES FOR MULTI-AGENT BOARD ---

export interface SpecialistReport {
    specialty: string;
    focus: string;
    findings: string;
    recommendations: string[];
}

export interface MultiSpecialistReviewMessage {
    id: number;
    sender: 'ai';
    type: 'multi_specialist_review';
    title: string;
    isLive?: boolean;
    specialistReports: SpecialistReport[];
    consolidatedReport?: {
        summary: string;
        conflicts: string;
        finalPlan: string;
    };
    suggestedAction?: SuggestedAction;
}

export interface DebateParticipant {
    role: string;
    name: string; // e.g. "Dr. Kidney"
    specialty: string; // e.g. "Nephrology"
}

export interface DebateTurn {
    speaker: string; // e.g., "Dr. Nephrologist"
    role: string; // e.g., "Nephrologist"
    text: string;
}

export interface ClinicalDebateMessage {
    id: number;
    sender: 'ai';
    type: 'clinical_debate';
    title: string;
    topic: string;
    participants: DebateParticipant[];
    transcript: DebateTurn[];
    consensus: string | null; // null if not yet reached
    isLive: boolean; // True while agents are still debating
    suggestedAction?: SuggestedAction;
}

// --- CLINICAL DOCUMENTATION TYPES ---

export interface ClinicalNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

export interface MedicationEvent {
    date: string;
    title: string;
    details: string;
}

export type Message =
    | TextMessage
    | ImageMessage
    | MultiFileMessage
    | TrendChartMessage
    | GdmtChecklistMessage
    | ReportComparisonMessage
    | DifferentialDiagnosisMessage
    | RiskStratificationMessage
    | ContraindicationMessage
    | DosageOptimizationMessage
    | EjectionFractionTrendMessage
    | ArrhythmiaAnalysisMessage
    | BloodPressureAnalysisMessage
    | CardiacBiomarkerMessage
    | ReportViewerMessage
    | InterventionalCardiologyMessage
    | EpDeviceReportMessage
    | AdvancedHeartFailureMessage
    | CtaAnalysisMessage
    | SmartSummaryMessage
    | PrescriptionMessage
    | VitalTrendsMessage
    | HccCodingMessage
    | MultiSpecialistReviewMessage
    | ClinicalDebateMessage
    | NeurologyMessage
    | OncologyMessage
    | UniversalSpecialistMessage
    | PsychiatryMessage
    | PharmacistMessage
    | NutritionistMessage;

// --- PSYCHIATRY TYPES ---

export interface MentalStatusExam {
    appearance: string;
    behavior: string;
    speech: string;
    mood: string;
    affect: string;
    thoughtProcess: string;
    thoughtContent: string;
    perception: string;
    insight: string;
    judgment: string;
}

export interface RiskAssessment {
    suicideRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
    homicideRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
    selfHarmRisk: 'Low' | 'Moderate' | 'High';
    rationale: string;
}

export interface PsychiatryFinding {
    category: 'MSE' | 'Risk' | 'Psychosocial' | 'Medical Rule-out';
    finding: string;
    status: 'Normal' | 'Abnormal' | 'Critical';
    details: string;
}

export interface PsychiatryMessage {
    id: number;
    sender: 'ai';
    type: 'psychiatry_analysis';
    title: string;
    mse: MentalStatusExam;
    riskAssessment: RiskAssessment;
    findings: PsychiatryFinding[];
    differentialDiagnosis: string[];
    medicationAnalysis: string;
    plan: string[];
    suggestedAction?: SuggestedAction;
}

// --- PHARMACIST TYPES ---

export interface DrugInteraction {
    drug1: string;
    drug2: string;
    severity: 'Major' | 'Moderate' | 'Minor';
    mechanism: string;
    management: string;
}

export interface DosingAdjustment {
    drug: string;
    currentDose: string;
    recommendedDose: string;
    reason: 'Renal' | 'Hepatic' | 'Age' | 'Weight' | 'Interaction';
    details: string;
}

export interface PharmacistMessage {
    id: number;
    sender: 'ai';
    type: 'pharmacist_analysis';
    title: string;
    interactions: DrugInteraction[];
    dosingAdjustments: DosingAdjustment[];
    deprescribingOpportunities: { drug: string; reason: string; recommendation: string }[];
    costOptimization: { drug: string; suggestion: string; potentialSavings: string }[];
    summary: string;
    suggestedAction?: SuggestedAction;
}

// --- NUTRITIONIST TYPES ---

export interface DietaryRestriction {
    type: 'Low Sodium' | 'Fluid Restriction' | 'Low Potassium' | 'Carbohydrate Controlled' | 'Low Phosphate' | 'Renal' | 'Heart Healthy';
    status: 'Active' | 'Recommended' | 'Contraindicated';
    details: string;
}

export interface NutritionalDeficiency {
    nutrient: string;
    level: string; // e.g., "3.2 mg/dL"
    status: 'Deficient' | 'Insufficiency' | 'Risk';
    recommendation: string;
}

export interface NutritionistMessage {
    id: number;
    sender: 'ai';
    type: 'nutritionist_analysis';
    title: string;
    nutritionalStatus: 'Well-nourished' | 'At Risk' | 'Malnourished';
    dietaryRestrictions: DietaryRestriction[];
    deficiencies: NutritionalDeficiency[];
    mealPlanSuggestion: string;
    educationalContent: string;
    suggestedAction?: SuggestedAction;
}


// --- FEEDBACK & PERSONALIZATION TYPES ---

export interface Feedback {
    id: number;
    messageId: number;
    patientId: string;
    rating: 'good' | 'bad';
    correction?: string;
    timestamp: number;
    originalText: string;
}

export interface AiPersonalizationSettings {
    verbosity: 'concise' | 'default' | 'detailed';
    tone: 'formal' | 'default' | 'collaborative';
    apiKey?: string;
}

// --- UI NOTIFICATION TYPES ---
export interface ToastNotification {
    id: number;
    message: string;
    type: 'error' | 'success' | 'info' | 'warning';
}

// --- API QUOTA TYPES ---

export interface QuotaSummary {
    callsUsed: number;
    callsLimit: number;
    callsRemaining: number;
    tokensUsed: number;
    tokensLimit: number;
    percentage: number;
    resetsAt: string; // ISO timestamp
    onPaceToExceed: boolean;
}

// --- BOARD SETTINGS TYPES ---

export type BoardMode = 'quick' | 'standard' | 'comprehensive';

export interface BoardSettings {
    mode: BoardMode;
    maxSpecialties: number;
    maxDebateTurns: number;
    enableCache: boolean;
    showSettingsOnStart: boolean; // Show modal every time or just first
}
