// Shared utility functions used across all pages
// This file contains common functionality extracted from dashboard.js and advisors.js

const SalgstalUtils = {
    // Date handling
    getSalesDate(item) {
        if (item.PRODUKT === 'Arbejdsskadeforsikring') {
            return item.TILBUD_START_DATO;
        }

        // For konverterede data: brug KONVERTERINGS_DATO
        if (item.KONVERTERINGS_DATO && item.KONVERTERINGS_DATO.trim() !== '') {
            return item.KONVERTERINGS_DATO;
        }

        // For ikke-konverterede og afviste: brug TILBUD_START_DATO eller andre mulige felter
        if (item.TILBUD_START_DATO && item.TILBUD_START_DATO.trim() !== '') {
            return item.TILBUD_START_DATO;
        }

        // Andre mulige felter for tilbudsdatoer
        if (item.TILBUDS_DATO && item.TILBUDS_DATO.trim() !== '') {
            return item.TILBUDS_DATO;
        }

        if (item.TILBUD_DATO && item.TILBUD_DATO.trim() !== '') {
            return item.TILBUD_DATO;
        }

        console.warn("No valid date found for item:", item);
        return null;
    },

    // Get month and year for grouping
    getMonthYear(dateString) {
        // Return null if dateString is empty, null, or undefined
        if (!dateString || dateString.trim() === '') {
            return null;
        }

        let date;

        // Handle ISO timestamp format (2024-04-10T10:28:48.192Z)
        if (dateString.includes('T')) {
            date = new Date(dateString);
        }
        // Handle period format (2024.03.01)
        else if (dateString.includes('.')) {
            const normalizedDate = dateString.replace(/\./g, '-');
            date = new Date(normalizedDate);
        }
        // Handle standard format (2024-04-10)
        else {
            date = new Date(dateString);
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', dateString);
            return null;
        }

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },

    // Parse date string to Date object
    parseDate(dateString) {
        if (!dateString || dateString.trim() === '') return null;

        let date;

        // Handle ISO timestamp format (2024-04-10T10:28:48.192Z)
        if (dateString.includes('T')) {
            date = new Date(dateString);
        }
        // Handle period format (2024.03.01)
        else if (dateString.includes('.')) {
            const normalizedDate = dateString.replace(/\./g, '-');
            date = new Date(normalizedDate);
        }
        // Handle standard format (2024-04-10)
        else {
            date = new Date(dateString);
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    },

    // Formatting
    formatCurrency(value) {
        return new Intl.NumberFormat('da-DK', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value) + ' kr.';
    },

    // Generate a date string in the format DDMMYYYY for a given date
    formatDateForFilename(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}${month}${year}`;
    },

    // Data filtering
    filterMigratedSales(dataArray, excludeMigrated = true) {
        if (!excludeMigrated) return dataArray;

        return dataArray.filter(item => {
            // Always include Nærsikring data (no migrated sales in Nærsikring)
            if (item.MASTER_POLICE_NAVN && item.MASTER_POLICE_NAVN.startsWith("Nærsikring")) {
                return true;
            }

            // For HDI and AXA: exclude items with "MIG PROD" in MASTER_POLICE_NAVN
            return !item.MASTER_POLICE_NAVN || !item.MASTER_POLICE_NAVN.includes("MIG PROD");
        });
    },

    // Mapping
    mapSagsbehandlerToInitials(sagsbehandler) {
        if (!sagsbehandler) return '';

        const allowedHandlers = ['flfa_lb', 'jlar_lb', 'rovi_lb', 'naas_lb', 'mapk_lb', 'kevfit', 'adrb'];

        // Direct match for initials (regular AXA/HDI data)
        if (allowedHandlers.includes(sagsbehandler)) {
            return sagsbehandler;
        }

        // Mapping for Nærsikring full names with numbers
        const nameMapping = {
            'Flemming Falkengaard': 'flfa_lb',
            'Jakob Nymand Larsen': 'jlar_lb',
            'Kevin Fitzgerald': 'kevfit',
            'Maria Påskesen': 'mapk_lb',
            'Nils Aaskilde': 'naas_lb',
            'Ronja Vikjær Rytter': 'rovi_lb',
            'Andreas Dræby': 'adrb'
        };

        // Check if the sagsbehandler string contains any of the full names
        for (const [fullName, initials] of Object.entries(nameMapping)) {
            if (sagsbehandler.includes(fullName)) {
                return initials;
            }
        }

        // If no match found, return original
        return sagsbehandler;
    },

    // Mapping for product names (if needed)
    mapProductName(masterPoliceName) {
        if (!masterPoliceName) return '';
        // Add any product name mapping logic here if needed
        return masterPoliceName;
    }
};

// Export for use in other modules
window.SalgstalUtils = SalgstalUtils;
