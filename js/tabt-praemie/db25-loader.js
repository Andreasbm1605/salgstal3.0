// DB25 Loader - Loads and caches DB25 codes from CSV file
// Singleton module for loading DB25 codes from the CSV file

const DB25Loader = {
    cache: null,
    lastLoaded: null,

    /**
     * Load DB25 codes from CSV file
     * @returns {Promise<Array>} Array of {code, description} objects
     */
    async loadCodes() {
        // Return cached data if available
        if (this.cache) {
            console.log('DB25 codes loaded from cache');
            return this.cache;
        }

        try {
            console.log('Loading DB25 codes from CSV...');

            // Fetch CSV file
            const response = await fetch('../data/db25 koder lol.csv');

            if (!response.ok) {
                throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
            }

            const text = await response.text();

            // Parse CSV
            const codes = this.parseCSV(text);

            console.log(`Successfully loaded ${codes.length} DB25 codes`);

            // Cache the results
            this.cache = codes;
            this.lastLoaded = new Date().toISOString();

            return codes;

        } catch (error) {
            console.error('Failed to load DB25 codes:', error);
            // Return empty array on error to allow graceful degradation
            return [];
        }
    },

    /**
     * Parse CSV text into array of code objects
     * @param {string} text - Raw CSV text
     * @returns {Array} Array of {code, description} objects
     */
    parseCSV(text) {
        const codes = [];

        // Remove BOM (Byte Order Mark) if present
        const cleanText = text.replace(/^\uFEFF/, '');

        // Split into lines
        const lines = cleanText.split(/\r?\n/);

        // Skip header row (line 0) and parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Split by semicolon
            const parts = line.split(';');

            if (parts.length >= 2) {
                const code = parts[0].trim();
                const description = parts[1].trim();

                // Only add if both code and description exist
                if (code && description) {
                    codes.push({
                        code: code,
                        description: description
                    });
                }
            }
        }

        return codes;
    },

    /**
     * Clear cache (useful for testing or refresh)
     */
    clearCache() {
        this.cache = null;
        this.lastLoaded = null;
        console.log('DB25 cache cleared');
    }
};
