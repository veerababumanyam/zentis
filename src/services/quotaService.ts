
const QUOTA_STORAGE_KEY = 'zentis_api_quota';
const DEFAULT_DAILY_LIMIT = 1500; // Free tier: 1500 requests/day

export interface ApiQuotaState {
    todayCalls: number;
    todayTokens: number;
    lastResetDate: string; // YYYY-MM-DD
    dailyLimit: number;
    lastCallTimestamp: number;
}

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

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
function getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get the timestamp for midnight tonight (when quota resets)
 */
function getResetTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
}

/**
 * Load quota state from localStorage
 */
function loadState(): ApiQuotaState {
    try {
        const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('[QuotaService] Failed to load from localStorage:', error);
    }
    return {
        todayCalls: 0,
        todayTokens: 0,
        lastResetDate: getTodayDate(),
        dailyLimit: DEFAULT_DAILY_LIMIT,
        lastCallTimestamp: 0
    };
}

/**
 * Save quota state to localStorage
 */
function saveState(state: ApiQuotaState): void {
    try {
        localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('[QuotaService] Failed to save to localStorage:', error);
    }
}

/**
 * Reset quota if date has changed
 */
function resetIfNeeded(state: ApiQuotaState): ApiQuotaState {
    const today = getTodayDate();
    if (state.lastResetDate !== today) {
        return {
            ...state,
            todayCalls: 0,
            todayTokens: 0,
            lastResetDate: today
        };
    }
    return state;
}

/**
 * Check if quota should trigger a warning based on percentage
 */
function shouldWarn(percentage: number, previousWarnings: number[]): { shouldWarn: boolean; newWarnings: number[] } {
    const warningThresholds = [50, 75, 90, 100];
    const newWarnings = warningThresholds.filter(threshold => percentage >= threshold && !previousWarnings.includes(threshold));
    return {
        shouldWarn: newWarnings.length > 0,
        newWarnings
    };
}

/**
 * Get current quota summary
 */
export function getQuotaSummary(): QuotaSummary {
    let state = loadState();
    state = resetIfNeeded(state);
    saveState(state);

    const percentage = Math.min(100, Math.round((state.todayCalls / state.dailyLimit) * 100));
    const callsRemaining = Math.max(0, state.dailyLimit - state.todayCalls);

    // Estimate if we're on pace to exceed (simple heuristic: if >50% used before noon)
    const now = new Date();
    const hour = now.getHours();
    const onPaceToExceed = percentage > 50 && hour < 12;

    return {
        callsUsed: state.todayCalls,
        callsLimit: state.dailyLimit,
        callsRemaining,
        tokensUsed: state.todayTokens,
        tokensLimit: state.dailyLimit * 1000, // Rough estimate
        percentage,
        resetsAt: getResetTime(),
        onPaceToExceed
    };
}

/**
 * Record an API call
 * @param tokensUsed - Optional token count from response
 * @returns Quota summary after recording
 */
export function recordApiCall(tokensUsed?: number): QuotaSummary {
    let state = loadState();
    state = resetIfNeeded(state);

    state.todayCalls += 1;
    state.todayTokens += tokensUsed || 0;
    state.lastCallTimestamp = Date.now();

    saveState(state);
    return getQuotaSummary();
}

/**
 * Check if quota allows making a new API call
 * @returns Object with { allowed: boolean, reason?: string, warning?: string }
 */
export function checkQuotaBeforeCall(): { allowed: boolean; reason?: string; warning?: string; quota: QuotaSummary } {
    const quota = getQuotaSummary();

    if (quota.percentage >= 100) {
        return {
            allowed: false,
            reason: `Daily API quota exceeded (${quota.callsUsed}/${quota.callsLimit} calls used). Resets at ${new Date(quota.resetsAt).toLocaleTimeString()}.`,
            quota
        };
    }

    if (quota.percentage >= 90) {
        return {
            allowed: true,
            warning: `Warning: ${quota.percentage}% of daily API quota used. Only ${quota.callsRemaining} calls remaining today.`,
            quota
        };
    }

    if (quota.percentage >= 75) {
        return {
            allowed: true,
            warning: `${quota.percentage}% of daily API quota used.`,
            quota
        };
    }

    if (quota.onPaceToExceed) {
        return {
            allowed: true,
            warning: `On pace to exceed daily quota early. ${quota.callsRemaining} calls remaining.`,
            quota
        };
    }

    return { allowed: true, quota };
}

/**
 * Clear quota data (for testing or manual reset)
 */
export function clearQuotaData(): void {
    try {
        localStorage.removeItem(QUOTA_STORAGE_KEY);
    } catch (error) {
        console.error('[QuotaService] Failed to clear quota data:', error);
    }
}

/**
 * Set custom daily limit
 */
export function setDailyLimit(limit: number): void {
    let state = loadState();
    state = resetIfNeeded(state);
    state.dailyLimit = limit;
    saveState(state);
}
