/**
 * Levenshtein Distance Algorithm
 * Calcula la distancia de edición entre dos strings
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const m = s1.length;
    const n = s2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }

    // Fill the DP table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],      // deletion
                    dp[i][j - 1],      // insertion
                    dp[i - 1][j - 1]   // substitution
                );
            }
        }
    }

    return dp[m][n];
};

/**
 * Calculate similarity percentage between two strings
 * Retorna un valor 0-100 donde 100 es coincidencia exacta
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 100;
    
    return Math.round(((maxLength - distance) / maxLength) * 100);
};
