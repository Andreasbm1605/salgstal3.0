// Centralized data loading module with caching support
// Handles loading sales data and goals across all pages

const DataLoader = {
    cache: {
        data: null,
        nonConvertedData: null,
        afvisteData: null,
        salesGoals: null,
        lastLoaded: null,
        metadata: null,
        expiresIn: 5 * 60 * 1000 // 5 minutes cache
    },

    async loadAll() {
        // Check if cache is valid
        if (this.isCacheValid()) {
            console.log('Using cached data');
            return {
                data: this.cache.data,
                nonConvertedData: this.cache.nonConvertedData,
                afvisteData: this.cache.afvisteData,
                salesGoals: this.cache.salesGoals,
                metadata: this.cache.metadata
            };
        }

        try {
            // Load sales goals first
            await this.loadSalesGoals();

            // Load sales data from API
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const db = await response.json();

            // Update cache
            this.cache.data = db.converted || [];
            this.cache.nonConvertedData = db.nonConverted || [];
            this.cache.afvisteData = db.rejected || [];
            this.cache.lastLoaded = Date.now();
            this.cache.metadata = db.metadata;

            // Also set global variables for backward compatibility
            window.data = this.cache.data;
            window.nonConvertedData = this.cache.nonConvertedData;
            window.afvisteData = this.cache.afvisteData;

            console.log('Data loaded successfully:', {
                converted: this.cache.data.length,
                nonConverted: this.cache.nonConvertedData.length,
                rejected: this.cache.afvisteData.length
            });

            return {
                data: this.cache.data,
                nonConvertedData: this.cache.nonConvertedData,
                afvisteData: this.cache.afvisteData,
                salesGoals: this.cache.salesGoals,
                metadata: this.cache.metadata
            };
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    },

    async loadSalesGoals() {
        if (this.cache.salesGoals) {
            console.log('Using cached sales goals');
            return this.cache.salesGoals;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '../data/sales_goals.js';
            script.onload = () => {
                if (typeof sales_goals_data !== 'undefined') {
                    this.cache.salesGoals = sales_goals_data;
                    window.salesGoals = sales_goals_data;
                    console.log('Sales goals loaded from JS file');
                    resolve(sales_goals_data);
                } else {
                    console.warn('sales_goals_data not found, using fallback');
                    this.loadFallbackGoals();
                    resolve(this.cache.salesGoals);
                }
            };
            script.onerror = () => {
                console.warn('Failed to load sales_goals.js, using fallback data');
                this.loadFallbackGoals();
                resolve(this.cache.salesGoals);
            };
            document.body.appendChild(script);
        });
    },

    loadFallbackGoals() {
        const salesGoals = {
            "all": {},
            "hdi": {},
            "axa": {}
        };

        const currentYear = new Date().getFullYear();
        const months = [];
        for (let month = 1; month <= 12; month++) {
            months.push(`${currentYear}-${String(month).padStart(2, '0')}`);
        }

        months.forEach((month, index) => {
            const baseValue = 500000 + (index * 50000);
            salesGoals.hdi[month] = Math.round(baseValue * 0.6);
            salesGoals.axa[month] = Math.round(baseValue * 0.4);
            salesGoals.all[month] = salesGoals.hdi[month] + salesGoals.axa[month];
        });

        this.cache.salesGoals = salesGoals;
        window.salesGoals = salesGoals;
        console.log('Using fallback sales goals data');
    },

    isCacheValid() {
        if (!this.cache.data || !this.cache.lastLoaded) return false;
        return (Date.now() - this.cache.lastLoaded) < this.cache.expiresIn;
    },

    clearCache() {
        this.cache = {
            data: null,
            nonConvertedData: null,
            afvisteData: null,
            salesGoals: null,
            lastLoaded: null,
            metadata: null,
            expiresIn: 5 * 60 * 1000
        };
        console.log('Data cache cleared');
    }
};

// Export for use in other modules
window.DataLoader = DataLoader;
