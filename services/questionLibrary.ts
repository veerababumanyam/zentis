export type PatientConditionTrigger = 'hfrEF' | 'atrial fibrillation' | 'hypertension' | 'cad' | 'aortic stenosis' | 'diabetes' | 'ckd';
export type ReportAvailabilityTrigger = 'echo' | 'ecg' | 'labs' | 'holter' | 'cath' | 'cta' | 'device';

export interface Question {
  text: string;
  category: 'Briefing & Summary' | 'Diagnostics' | 'Treatment & Planning' | 'Risk & Safety';
  relevance: {
    conditions?: PatientConditionTrigger[];
    reports?: ReportAvailabilityTrigger[];
  };
}

export const QUESTION_LIBRARY: Question[] = [
    // Briefing & Summary
    { text: "Summarize case", category: 'Briefing & Summary', relevance: {} },
    { text: "Top 3 concerns?", category: 'Briefing & Summary', relevance: {} },
    { text: "Review meds", category: 'Briefing & Summary', relevance: {} },

    // Diagnostics
    { text: "Generate DDx", category: 'Diagnostics', relevance: {} },
    { text: "Compare last two Echos", category: 'Diagnostics', relevance: { reports: ['echo'] } },
    { text: "Compare recent vs. admission labs", category: 'Diagnostics', relevance: { reports: ['labs'] } },
    { text: "Plot BNP & Cr trends", category: 'Diagnostics', relevance: { reports: ['labs'], conditions: ['hfrEF', 'ckd'] } },
    { text: "Plot vital trends", category: 'Diagnostics', relevance: {} },
    { text: "Analyze LVEF trend", category: 'Diagnostics', relevance: { reports: ['echo'], conditions: ['hfrEF'] } },
    { text: "Analyze admission ECG", category: 'Diagnostics', relevance: { reports: ['ecg'], conditions: ['cad'] } },
    { text: "Interpret Holter report", category: 'Diagnostics', relevance: { reports: ['holter'], conditions: ['atrial fibrillation'] } },
    { text: "Analyze home BP logs", category: 'Diagnostics', relevance: { conditions: ['hypertension'] } },
    { text: "Assess AS progression", category: 'Diagnostics', relevance: { reports: ['echo'], conditions: ['aortic stenosis'] } },
    { text: "Analyze cath report for SYNTAX score", category: 'Diagnostics', relevance: { reports: ['cath'], conditions: ['cad'] } },
    { text: "Analyze CTA for CAD-RADS", category: 'Diagnostics', relevance: { reports: ['cta'], conditions: ['cad'] } },
    { text: "Interpret device interrogation", category: 'Diagnostics', relevance: { reports: ['device'] } },
    { text: "Analyze LVAD parameters", category: 'Diagnostics', relevance: { reports: ['device'] } },

    // Treatment & Planning
    { text: "Generate treatment plan", category: 'Treatment & Planning', relevance: {} },
    { text: "Audit GDMT for HFrEF", category: 'Treatment & Planning', relevance: { conditions: ['hfrEF'] } },
    { text: "Suggest next HFrEF med", category: 'Treatment & Planning', relevance: { conditions: ['hfrEF'] } },
    { text: "Optimize dosages", category: 'Treatment & Planning', relevance: {} },
    { text: "Recommend revasc strategy", category: 'Treatment & Planning', relevance: { reports: ['cath', 'cta'], conditions: ['cad'] } },
    { text: "Ablation candidate?", category: 'Treatment & Planning', relevance: { conditions: ['atrial fibrillation'] } },
    { text: "Anticoagulation strategy?", category: 'Treatment & Planning', relevance: { conditions: ['atrial fibrillation'] } },
    { text: "Is patient a candidate for PCSK9i?", category: 'Treatment & Planning', relevance: { conditions: ['cad'] } },

    // Risk & Safety
    { text: "Calc CHA₂DS₂-VASc & HAS-BLED", category: 'Risk & Safety', relevance: { conditions: ['atrial fibrillation'] } },
    { text: "Calc 10-yr ASCVD risk", category: 'Risk & Safety', relevance: {} },
    { text: "Check med contraindications", category: 'Risk & Safety', relevance: {} },
    { text: "Risk of CIN?", category: 'Risk & Safety', relevance: { conditions: ['ckd'] } },
    { text: "Review for HCC coding opportunities", category: 'Risk & Safety', relevance: { conditions: ['diabetes', 'hfrEF', 'ckd'] } },
];
