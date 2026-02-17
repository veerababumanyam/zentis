
import { runPharmacistAgent } from './src/services/agents/pharmacistAgent';
import { runNutritionistAgent } from './src/services/agents/nutritionistAgent';
import { GoogleGenAI } from "@google/genai";
import { Patient } from './src/types';

// Mock Patient Data
const mockPatient: Patient = {
    id: "test-patient-1",
    name: "John Doe",
    age: 72,
    gender: "Male",
    weight: 85,
    allergies: ["Penicillin"],
    medicalHistory: [
        { description: "Heart Failure with reduced Ejection Fraction (HFrEF)" },
        { description: "Chronic Kidney Disease (CKD) Stage 3b" },
        { description: "Type 2 Diabetes" }
    ],
    currentStatus: {
        condition: "Decompensated Heart Failure, CKD Exacerbation",
        vitals: "BP 130/80, HR 88, Weight 85kg (up 2kg)",
        medications: [
            "Lisinopril 20mg daily",
            "Spironolactone 25mg daily",
            "Furosemide 40mg twice daily",
            "Metformin 1000mg twice daily",
            "Ibuprofen 400mg as needed for pain" // Intentional interaction for Pharmacist to catch
        ]
    },
    reports: [
        {
            id: "lab-1",
            type: "Lab",
            date: "2023-10-25",
            title: "Comprehensive Metabolic Panel",
            content: "Sodium 135, Potassium 5.8 (High), Creatinine 2.1 (High, eGFR 28), Glucose 180"
        }
    ],
    appointmentTime: "09:00",
    tasks: []
};

// Mock AI Client (We will interpret the prompt to ensure it works, but for this test we can use the real one if env var is set, or a mock)
// For this verification, we want to see if the code runs. We will use a dummy AI if no key is present, but I will try to use the real one if I can properly instantiate it.
// Since I don't have the API key in env vars accessible here easily without inspection, I will mock the response to verify the parsing logic.

// Actually, I can use the real one if I can find the way it is initialized in the app.
// But to be safe and fast, I will mock the generateContent to return a valid JSON string matching the schema.

const mockAi = {
    models: {
        generateContent: async (params: any) => {
            console.log("--- PROMPT SENT TO AI ---");
            console.log(params.contents);
            console.log("-------------------------");

            if (params.contents.includes("Pharmacist")) {
                return {
                    text: JSON.stringify({
                        title: "Pharmacist Review",
                        interactions: [{ drug1: "Lisinopril", drug2: "Spironolactone", severity: "Major", mechanism: "Hyperkalemia risk", management: "Monitor K+" }],
                        dosingAdjustments: [{ drug: "Metformin", currentDose: "1000mg BID", recommendedDose: "500mg daily", reason: "Renal", details: "eGFR < 30" }],
                        deprescribingOpportunities: [{ drug: "Ibuprofen", reason: "NSAID in CKD/HF", recommendation: "Stop immediately" }],
                        costOptimization: [],
                        summary: "Critical alerts for NSAID use in HF/CKD and Metformin dosing."
                    })
                };
            } else if (params.contents.includes("Dietitian")) {
                return {
                    text: JSON.stringify({
                        title: "Nutrition Consult",
                        nutritionalStatus: "At Risk",
                        dietaryRestrictions: [{ type: "Low Sodium", status: "Active", details: "<2g/day" }],
                        deficiencies: [{ nutrient: "B12", level: "Unknown", status: "Risk", recommendation: "Check levels due to Metformin" }],
                        mealPlanSuggestion: "Breakfast: Oatmeal...",
                        educationalContent: "Avoid salt substitutes.",
                        summary: "Patient needs strict low sodium and low potassium diet."
                    })
                };
            }
            return { text: "{}" };
        }
    }
} as unknown as GoogleGenAI;

const runVerification = async () => {
    console.log("Running Pharmacist Agent Verification...");
    const pharmResult = await runPharmacistAgent(mockPatient, "Verify", mockAi);
    console.log("Pharmacist Result:", JSON.stringify(pharmResult, null, 2));

    console.log("\nRunning Nutritionist Agent Verification...");
    const nutrResult = await runNutritionistAgent(mockPatient, "Verify", mockAi);
    console.log("Nutritionist Result:", JSON.stringify(nutrResult, null, 2));
};

runVerification();
