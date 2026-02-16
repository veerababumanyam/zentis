export type Specialty =
    | "Cardiology"
    | "Neurology"
    | "Oncology"
    | "Gastroenterology"
    | "Pulmonology"
    | "Endocrinology"
    | "Orthopedics"
    | "Dermatology"
    | "Nephrology"
    | "Hematology"
    | "Rheumatology"
    | "Infectious Disease"
    | "Psychiatry"
    | "Urology"
    | "Ophthalmology"
    | "Geriatrics"
    | "Internal Medicine"
    | "General";

export const ALL_SPECIALTIES: Specialty[] = [
    "Cardiology",
    "Neurology",
    "Oncology",
    "Gastroenterology",
    "Pulmonology",
    "Endocrinology",
    "Orthopedics",
    "Dermatology",
    "Nephrology",
    "Hematology",
    "Rheumatology",
    "Infectious Disease",
    "Psychiatry",
    "Urology",
    "Ophthalmology",
    "Geriatrics"
];

export const SPECIALTY_DESCRIPTIONS: Record<Specialty, string> = {
    "Cardiology": "Heart, BP, ECG, Cath, HFrEF, Arrhythmia",
    "Neurology": "Brain, stroke, seizure, headache, EEG, MRI Brain",
    "Oncology": "Cancer, tumor, biopsy, chemo, staging",
    "Gastroenterology": "Stomach, liver, GI, colonoscopy, endoscopy, abdominal pain",
    "Pulmonology": "Lungs, breathing, asthma, COPD, pneumonia, chest x-ray",
    "Endocrinology": "Diabetes, thyroid, hormones, metabolism",
    "Orthopedics": "Bones, joints, fractures, spine, pain",
    "Dermatology": "Skin, rash, lesions",
    "Nephrology": "Kidney, renal, creatinine, dialysis",
    "Hematology": "Blood, anemia, platelets, clotting",
    "Rheumatology": "Joints, autoimmune, lupus, arthritis",
    "Infectious Disease": "Infection, fever, antibiotics, sepsis, culture",
    "Psychiatry": "Depression, anxiety, mood, mental health",
    "Urology": "Prostate, bladder, UTI, kidney stone",
    "Ophthalmology": "Eye, vision, retina, cataract",
    "Geriatrics": "Elderly, frailty, falls, dementia",
    "Internal Medicine": "General complex care, multi-system issues",
    "General": "General health inquiries, vitals, labs overview"
};
