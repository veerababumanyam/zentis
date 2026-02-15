const ANALYSIS_CACHE_PREFIX = 'analysis_cache_';
const BRIEFING_CACHE_PREFIX = 'briefing_cache_';

export const getReportAnalysis = (reportId: string): string | null => {
  try {
    return localStorage.getItem(`${ANALYSIS_CACHE_PREFIX}${reportId}`);
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return null;
  }
};

export const setReportAnalysis = (reportId: string, analysis: string): void => {
  try {
    localStorage.setItem(`${ANALYSIS_CACHE_PREFIX}${reportId}`, analysis);
  } catch (error) {
    console.error("Failed to write to localStorage:", error);
  }
};

export const getBriefing = (patientId: string): string | null => {
  try {
    return localStorage.getItem(`${BRIEFING_CACHE_PREFIX}${patientId}`);
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return null;
  }
};

export const setBriefing = (patientId: string, briefing: string): void => {
  try {
    localStorage.setItem(`${BRIEFING_CACHE_PREFIX}${patientId}`, briefing);
  } catch (error) {
    console.error("Failed to write to localStorage:", error);
  }
};