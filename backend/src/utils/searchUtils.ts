/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Number representing the edit distance
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
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity percentage (0-100)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 100;
    
    return Math.round(((maxLength - distance) / maxLength) * 100);
};

/**
 * Filter items by fuzzy search with minimum similarity threshold
 * @param items Array of items to filter
 * @param searchQuery Search query string
 * @param minSimilarity Minimum similarity percentage (0-100), default 75
 * @param getTextFn Function to extract searchable text from item
 * @returns Filtered and sorted items with similarity scores
 */
export const fuzzyFilterItems = <T>(
    items: T[],
    searchQuery: string,
    minSimilarity: number = 75,
    getTextFn: (item: T) => string
): { item: T; similarity: number }[] => {
    if (!searchQuery || searchQuery.length === 0) {
        return [];
    }

    const results: { item: T; similarity: number }[] = [];

    items.forEach((item) => {
        const text = getTextFn(item).toLowerCase();
        const query = searchQuery.toLowerCase();

        // Check for exact match (contains substring)
        if (text.includes(query)) {
            results.push({ item, similarity: 100 });
            return;
        }

        // Check for fuzzy match
        const similarity = calculateSimilarity(searchQuery, text);
        if (similarity >= minSimilarity) {
            results.push({ item, similarity });
        }
    });

    // Sort by similarity descending (exact matches first, then by similarity)
    return results.sort((a, b) => b.similarity - a.similarity);
};
