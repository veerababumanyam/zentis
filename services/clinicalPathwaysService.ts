import type { Patient } from '../types';
import { QUESTION_LIBRARY, PatientConditionTrigger, ReportAvailabilityTrigger } from './questionLibrary';

const getPatientContext = (patient: Patient): { conditions: Set<PatientConditionTrigger>, reports: Set<ReportAvailabilityTrigger> } => {
    const conditions = new Set<PatientConditionTrigger>();
    const reports = new Set<ReportAvailabilityTrigger>();

    const history = patient.medicalHistory.map(h => h.description.toLowerCase()).join(' ');
    if (history.includes('hfref') || history.includes('heart failure')) conditions.add('hfrEF');
    if (history.includes('atrial fibrillation') || history.includes('afib')) conditions.add('atrial fibrillation');
    if (history.includes('hypertension')) conditions.add('hypertension');
    if (history.includes('coronary artery disease') || history.includes('cad') || history.includes('stemi')) conditions.add('cad');
    if (history.includes('aortic stenosis')) conditions.add('aortic stenosis');
    if (history.includes('diabetes')) conditions.add('diabetes');
    if (history.includes('ckd') || history.includes('chronic kidney disease')) conditions.add('ckd');

    patient.reports.forEach(report => {
        const type = report.type.toLowerCase();
        if (type.includes('echo')) reports.add('echo');
        if (type.includes('ecg')) reports.add('ecg');
        if (type.includes('lab')) reports.add('labs');
        if (report.title.toLowerCase().includes('holter')) reports.add('holter');
        if (type.includes('cath')) reports.add('cath');
        if (type.includes('cta')) reports.add('cta');
        if (type.includes('device')) reports.add('device');
    });

    return { conditions, reports };
};

export const getNextQuestions = (patient: Patient, questionHistory: string[] = []): string[] => {
    if (!patient) return [];
    
    const { conditions, reports } = getPatientContext(patient);
    const asked = new Set(questionHistory.map(q => q.toLowerCase()));

    const scoredQuestions = QUESTION_LIBRARY
        .filter(q => !asked.has(q.text.toLowerCase()))
        .map(question => {
            let score = 1; // Base score for all questions
            if (question.relevance.conditions) {
                for (const cond of question.relevance.conditions) {
                    if (conditions.has(cond)) score += 5;
                }
            }
            if (question.relevance.reports) {
                for (const rep of question.relevance.reports) {
                    if (reports.has(rep)) score += 5;
                }
            }
            // Boost initial summary questions for a new chat
            if (questionHistory.length < 2 && question.category === 'Briefing & Summary') {
                score += 10;
            }
            return { text: question.text, score };
        });

    return scoredQuestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(q => q.text);
};
