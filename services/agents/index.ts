
import { GoogleGenAI } from "@google/genai";
import { 
    runTrendAnalysisAgent as runTrendAnalysisAgent_internal, 
    runDifferentialDiagnosisAgent as runDifferentialDiagnosisAgent_internal, 
    runEjectionFractionTrendAgent as runEjectionFractionTrendAgent_internal, 
    runArrhythmiaAnalysisAgent as runArrhythmiaAnalysisAgent_internal, 
    runBloodPressureAnalysisAgent as runBloodPressureAnalysisAgent_internal, 
    runCardiacBiomarkerAgent as runCardiacBiomarkerAgent_internal, 
    runEcgAnalysisAgent as runEcgAnalysisAgent_internal,
    runReportComparisonAgentFromHistory as runReportComparisonAgentFromHistory_internal,
    runVitalTrendsAgent as runVitalTrendsAgent_internal
} from './diagnosticAgents';

import { 
    runInterventionalCardiologyAgent as runInterventionalCardiologyAgent_internal, 
    runEpAgent as runEpAgent_internal, 
    runAdvancedHfAgent as runAdvancedHfAgent_internal, 
    runCtaAnalysisAgent as runCtaAnalysisAgent_internal,
    runNeurologyAgent as runNeurologyAgent_internal,
    runOncologyAgent as runOncologyAgent_internal,
    runUniversalSpecialistAgent as runUniversalSpecialistAgent_internal
} from './subspecialtyAgents';

import {
    runGastroenterologyAgent as runGastroenterologyAgent_internal,
    runPulmonologyAgent as runPulmonologyAgent_internal,
    runEndocrinologyAgent as runEndocrinologyAgent_internal,
    runOrthopedicsAgent as runOrthopedicsAgent_internal,
    runDermatologyAgent as runDermatologyAgent_internal,
    runNephrologyAgent as runNephrologyAgent_internal,
    runHematologyAgent as runHematologyAgent_internal,
    runRheumatologyAgent as runRheumatologyAgent_internal,
    runInfectiousDiseaseAgent as runInfectiousDiseaseAgent_internal,
    runPsychiatryAgent as runPsychiatryAgent_internal,
    runUrologyAgent as runUrologyAgent_internal,
    runOphthalmologyAgent as runOphthalmologyAgent_internal,
    runGeriatricsAgent as runGeriatricsAgent_internal
} from './expandedSpecialties';

import { 
    runSmartSummaryAgent as runSmartSummaryAgent_internal,
    runMedicationReviewAgent as runMedicationReviewAgent_internal 
} from './summaryAgents';

import { 
    runTreatmentAdvisorAgent as runTreatmentAdvisorAgent_internal, 
    runGuidelineAdherenceAgent as runGuidelineAdherenceAgent_internal, 
    runMedicationSafetyAgent as runMedicationSafetyAgent_internal,
    runDosageOptimizationAgent as runDosageOptimizationAgent_internal,
    runPrescriptionGeneratorAgent as runPrescriptionGeneratorAgent_internal
} from './treatmentAgents';

import { 
    runHccCodingAgent as runHccCodingAgent_internal,
    runFollowUpCoordinatorAgent as runFollowUpCoordinatorAgent_internal, 
    runRiskStratificationAgent as runRiskStratificationAgent_internal, 
    runClinicalRiskAgent as runClinicalRiskAgent_internal, 
    runReportDisplayAgent as runReportDisplayAgent_internal,
    runGeneralCardiologyQueryAgent as runGeneralCardiologyQueryAgent_internal,
    runGeneralQueryAgent as runGeneralQueryAgent_internal,
    runImageAnalysisAgent as runImageAnalysisAgent_internal,
    runDailyHuddleAgent as runDailyHuddleAgent_internal,
    runSingleReportAnalysisAgent as runSingleReportAnalysisAgent_internal,
    runMultiReportAnalysisAgent as runMultiReportAnalysisAgent_internal,
    runReportComparisonAgent as runReportComparisonAgent_internal,
    runSmartReportAnalysisAgent as runSmartReportAnalysisAgent_internal,
    runMultiModalAnalysisAgent as runMultiModalAnalysisAgent_internal,
    runDeepThinkingAgent as runDeepThinkingAgent_internal,
    runAudioTranscriptionAgent as runAudioTranscriptionAgent_internal,
    generateSpeechAgent as generateSpeechAgent_internal
} from './utilityAgents';

import {
    runClinicalNoteGeneratorAgent as runClinicalNoteGeneratorAgent_internal
} from './documentationAgents';

import {
    runMultiSpecialistReviewAgent as runMultiSpecialistReviewAgent_internal,
    runClinicalDebateAgent as runClinicalDebateAgent_internal
} from './multiAgentSimulation';

export const runTrendAnalysisAgent = runTrendAnalysisAgent_internal;
export const runDifferentialDiagnosisAgent = runDifferentialDiagnosisAgent_internal;
export const runEjectionFractionTrendAgent = runEjectionFractionTrendAgent_internal;
export const runArrhythmiaAnalysisAgent = runArrhythmiaAnalysisAgent_internal;
export const runBloodPressureAnalysisAgent = runBloodPressureAnalysisAgent_internal;
export const runCardiacBiomarkerAgent = runCardiacBiomarkerAgent_internal;
export const runEcgAnalysisAgent = runEcgAnalysisAgent_internal;
export const runReportComparisonAgentFromHistory = runReportComparisonAgentFromHistory_internal;
export const runVitalTrendsAgent = runVitalTrendsAgent_internal;

export const runInterventionalCardiologyAgent = runInterventionalCardiologyAgent_internal;
export const runEpAgent = runEpAgent_internal;
export const runAdvancedHfAgent = runAdvancedHfAgent_internal;
export const runCtaAnalysisAgent = runCtaAnalysisAgent_internal;
export const runNeurologyAgent = runNeurologyAgent_internal;
export const runOncologyAgent = runOncologyAgent_internal;
export const runUniversalSpecialistAgent = runUniversalSpecialistAgent_internal;

export const runGastroenterologyAgent = runGastroenterologyAgent_internal;
export const runPulmonologyAgent = runPulmonologyAgent_internal;
export const runEndocrinologyAgent = runEndocrinologyAgent_internal;
export const runOrthopedicsAgent = runOrthopedicsAgent_internal;
export const runDermatologyAgent = runDermatologyAgent_internal;
export const runNephrologyAgent = runNephrologyAgent_internal;
export const runHematologyAgent = runHematologyAgent_internal;
export const runRheumatologyAgent = runRheumatologyAgent_internal;
export const runInfectiousDiseaseAgent = runInfectiousDiseaseAgent_internal;
export const runPsychiatryAgent = runPsychiatryAgent_internal;
export const runUrologyAgent = runUrologyAgent_internal;
export const runOphthalmologyAgent = runOphthalmologyAgent_internal;
export const runGeriatricsAgent = runGeriatricsAgent_internal;

export const runSmartSummaryAgent = runSmartSummaryAgent_internal;
export const runMedicationReviewAgent = runMedicationReviewAgent_internal;

export const runTreatmentAdvisorAgent = runTreatmentAdvisorAgent_internal;
export const runGuidelineAdherenceAgent = runGuidelineAdherenceAgent_internal;
export const runMedicationSafetyAgent = runMedicationSafetyAgent_internal;
export const runDosageOptimizationAgent = runDosageOptimizationAgent_internal;
export const runPrescriptionGeneratorAgent = runPrescriptionGeneratorAgent_internal;

export const runHccCodingAgent = runHccCodingAgent_internal;
export const runFollowUpCoordinatorAgent = runFollowUpCoordinatorAgent_internal;
export const runRiskStratificationAgent = runRiskStratificationAgent_internal;
export const runClinicalRiskAgent = runClinicalRiskAgent_internal;
export const runReportDisplayAgent = runReportDisplayAgent_internal;
export const runGeneralCardiologyQueryAgent = runGeneralCardiologyQueryAgent_internal;
export const runGeneralQueryAgent = runGeneralQueryAgent_internal;
export const runImageAnalysisAgent = runImageAnalysisAgent_internal;
export const runDailyHuddleAgent = runDailyHuddleAgent_internal;
export const runSingleReportAnalysisAgent = runSingleReportAnalysisAgent_internal;
export const runMultiReportAnalysisAgent = runMultiReportAnalysisAgent_internal;
export const runReportComparisonAgent = runReportComparisonAgent_internal;
export const runSmartReportAnalysisAgent = runSmartReportAnalysisAgent_internal;
export const runMultiModalAnalysisAgent = runMultiModalAnalysisAgent_internal;
export const runDeepThinkingAgent = runDeepThinkingAgent_internal;
export const runAudioTranscriptionAgent = runAudioTranscriptionAgent_internal;
export const generateSpeechAgent = generateSpeechAgent_internal;

export const runClinicalNoteGeneratorAgent = runClinicalNoteGeneratorAgent_internal;

export const runMultiSpecialistReviewAgent = runMultiSpecialistReviewAgent_internal;
export const runClinicalDebateAgent = runClinicalDebateAgent_internal;
