// Tabt Præmie Page - Lost Premium Registration
// Handles form submission and display of lost premium records

document.addEventListener('DOMContentLoaded', async function() {
    let currentUser = null;
    let lostPremiumsData = null;

    // Initialize the page
    await initializePage();

    /**
     * Initialize page - Load user info, data, and setup listeners
     */
    async function initializePage() {
        try {
            // Load current user
            currentUser = await UserLoader.loadUserInfo();
            console.log('Current user loaded:', currentUser);

            // Load existing records
            lostPremiumsData = await loadLostPremiums();
            console.log('Lost premiums data loaded:', lostPremiumsData);

            // Load DB25 codes and initialize autocomplete
            const db25Data = await DB25Loader.loadCodes();
            initializeAutocomplete(db25Data);

            // Setup event listeners
            setupEventListeners();

            // Render the records table
            renderRecordsTable(lostPremiumsData.records);

        } catch (error) {
            console.error('Failed to initialize page:', error);
            showErrorMessage('Kunne ikke indlæse siden. Prøv at genindlæse.');
        }
    }

    /**
     * Initialize DB25 autocomplete
     */
    function initializeAutocomplete(db25Data) {
        const inputElement = document.getElementById('db25_kode_input');
        const hiddenCodeField = document.getElementById('db25_kode');
        const beskrivelseField = document.getElementById('db25_beskrivelse');
        const beskrivelseContainer = document.getElementById('db25-beskrivelse-container');

        const autocomplete = new DB25Autocomplete(inputElement, (selectedItem) => {
            // Callback when user selects an item
            hiddenCodeField.value = selectedItem.code;
            beskrivelseField.value = selectedItem.description;
            beskrivelseContainer.classList.remove('hidden');

            // Trigger validation
            validateForm();
        });

        autocomplete.init(db25Data);
    }

    /**
     * Load lost premiums data from API
     */
    async function loadLostPremiums() {
        try {
            const response = await fetch('/api/lost-premiums');

            if (!response.ok) {
                if (response.status === 404) {
                    // File doesn't exist yet - this is OK, return empty structure
                    console.log('No lost premiums file found, starting fresh');
                    return {
                        metadata: {
                            lastUpdated: new Date().toISOString()
                        },
                        records: []
                    };
                }
                throw new Error(`Server error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to load lost premiums:', error);
            showErrorMessage('Kunne ikke indlæse data');
            return {
                metadata: {
                    lastUpdated: new Date().toISOString()
                },
                records: []
            };
        }
    }

    /**
     * Setup form event listeners
     */
    function setupEventListeners() {
        const form = document.getElementById('lost-premium-form');
        const db25Input = document.getElementById('db25_kode');
        const erhvervInput = document.getElementById('erhverv');
        const praemieInput = document.getElementById('praemie_kr');
        const aarsagSelect = document.getElementById('aarsag');
        const kommentarTextarea = document.getElementById('kommentar');
        const kommentarCounter = document.getElementById('kommentar-counter');

        // Form submit handler
        form.addEventListener('submit', submitLostPremium);

        // Real-time validation on input
        db25Input.addEventListener('input', validateForm);
        erhvervInput.addEventListener('input', validateForm);
        praemieInput.addEventListener('input', validateForm);
        aarsagSelect.addEventListener('change', validateForm);

        // Character counter for kommentar
        kommentarTextarea.addEventListener('input', function() {
            kommentarCounter.textContent = this.value.length;
        });

        // Excel export button
        const exportBtn = document.getElementById('export-excel-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportToExcel);
        }
    }

    /**
     * Validate form and enable/disable submit button
     */
    function validateForm() {
        const db25_kode = document.getElementById('db25_kode').value.trim();
        const erhverv = document.getElementById('erhverv').value.trim();
        const praemie_kr = parseFloat(document.getElementById('praemie_kr').value);
        const aarsag = document.getElementById('aarsag').value;

        const isValid = db25_kode !== '' &&
                        erhverv !== '' &&
                        !isNaN(praemie_kr) &&
                        praemie_kr >= 0 &&
                        aarsag !== '';

        document.getElementById('submit-btn').disabled = !isValid;
        return isValid;
    }

    /**
     * Generate unique ID for record
     */
    function generateUniqueId() {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 9);
        return `lp_${timestamp}_${randomStr}`;
    }

    /**
     * Submit form - Create new lost premium record
     */
    async function submitLostPremium(event) {
        event.preventDefault();

        if (!validateForm()) {
            showErrorMessage('Alle påkrævede felter skal udfyldes korrekt');
            return;
        }

        // Disable submit button during save
        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Gemmer...';

        try {
            // Create new record object
            const newRecord = {
                id: generateUniqueId(),
                db25_kode: document.getElementById('db25_kode').value.trim(),
                db25_beskrivelse: document.getElementById('db25_beskrivelse').value.trim(),
                erhverv: document.getElementById('erhverv').value.trim(),
                praemie_kr: parseFloat(document.getElementById('praemie_kr').value),
                aarsag: document.getElementById('aarsag').value,
                sagsbehandler: currentUser.username,
                kommentar: document.getElementById('kommentar').value.trim(),
                created_at: new Date().toISOString(),
                created_by_display_name: currentUser.displayName
            };

            console.log('Creating new record:', newRecord);

            // Add record to data structure
            lostPremiumsData.records.push(newRecord);

            // Save to API
            const response = await fetch('/api/lost-premiums', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(lostPremiumsData)
            });

            if (!response.ok) {
                throw new Error('Failed to save data');
            }

            console.log('Record saved successfully');

            // Clear form
            document.getElementById('lost-premium-form').reset();
            document.getElementById('db25_kode_input').value = ''; // Clear autocomplete input
            document.getElementById('db25-beskrivelse-container').classList.add('hidden'); // Hide description
            document.getElementById('kommentar-counter').textContent = '0';
            submitBtn.disabled = true;

            // Refresh table
            renderRecordsTable(lostPremiumsData.records);

            // Show success message
            showSuccessMessage('Tabt præmie er registreret succesfuldt');

            // Scroll to top to see success message
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('Failed to save record:', error);
            showErrorMessage('Fejl ved gemning af data. Prøv igen.');

            // Remove the record we tried to add
            lostPremiumsData.records.pop();
        } finally {
            // Re-enable submit button
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Render records table
     */
    function renderRecordsTable(records) {
        const tableBody = document.getElementById('records-table-body');
        const emptyState = document.getElementById('empty-state');

        if (!records || records.length === 0) {
            // Show empty state
            tableBody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        // Hide empty state
        emptyState.classList.add('hidden');

        // Sort records by created_at DESC (newest first)
        const sortedRecords = [...records].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        // Generate table rows
        const rows = sortedRecords.map(record => {
            const date = formatDateForDisplay(record.created_at);
            const praemie = SalgstalUtils.formatCurrency(record.praemie_kr);
            const kommentar = truncateText(record.kommentar || '-', 50);

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-6 text-slate-700 whitespace-nowrap">${date}</td>
                    <td class="py-3 px-6 text-slate-700">${escapeHtml(record.db25_kode)}</td>
                    <td class="py-3 px-6 text-slate-700 text-sm">${escapeHtml(record.db25_beskrivelse || '-')}</td>
                    <td class="py-3 px-6 text-slate-700">${escapeHtml(record.erhverv)}</td>
                    <td class="text-right py-3 px-6 text-slate-700 font-medium whitespace-nowrap">${praemie}</td>
                    <td class="py-3 px-6 text-slate-700">${escapeHtml(record.aarsag)}</td>
                    <td class="py-3 px-6 text-slate-700">${escapeHtml(record.created_by_display_name)}</td>
                    <td class="py-3 px-6 text-slate-600" title="${escapeHtml(record.kommentar || '')}">${escapeHtml(kommentar)}</td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;
    }

    /**
     * Format ISO date for display
     */
    function formatDateForDisplay(isoString) {
        try {
            const date = new Date(isoString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (error) {
            console.error('Failed to format date:', error);
            return '-';
        }
    }

    /**
     * Truncate text with ellipsis
     */
    function truncateText(text, maxLength) {
        if (!text || text === '-') return '-';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show success message
     */
    function showSuccessMessage(message) {
        const successMsg = document.getElementById('success-message');
        const successText = document.getElementById('success-message-text');
        const errorMsg = document.getElementById('error-message');

        // Hide error message if visible
        errorMsg.classList.add('hidden');

        // Show success message
        successText.textContent = message;
        successMsg.classList.remove('hidden');

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            successMsg.classList.add('hidden');
        }, 5000);
    }

    /**
     * Show error message
     */
    function showErrorMessage(message) {
        const errorMsg = document.getElementById('error-message');
        const errorText = document.getElementById('error-message-text');
        const successMsg = document.getElementById('success-message');

        // Hide success message if visible
        successMsg.classList.add('hidden');

        // Show error message
        errorText.textContent = message;
        errorMsg.classList.remove('hidden');
    }

    /**
     * Export records to Excel file
     */
    function exportToExcel() {
        if (!lostPremiumsData.records || lostPremiumsData.records.length === 0) {
            showErrorMessage('Ingen data at eksportere');
            return;
        }

        try {
            // Sort records by date (newest first)
            const sortedRecords = [...lostPremiumsData.records].sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );

            // Prepare data for Excel with formatted values
            const excelData = sortedRecords.map(record => ({
                'Dato': formatDateForExcel(record.created_at),
                'DB25 Kode': record.db25_kode,
                'Branchebeskrivelse': record.db25_beskrivelse || '',
                'Erhverv': record.erhverv,
                'Præmie (kr)': record.praemie_kr,
                'Årsag': record.aarsag,
                'Sagsbehandler': record.created_by_display_name,
                'Kommentar': record.kommentar || ''
            }));

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // Set column widths for better readability
            worksheet['!cols'] = [
                { wch: 18 }, // Dato
                { wch: 12 }, // DB25 Kode
                { wch: 50 }, // Branchebeskrivelse
                { wch: 30 }, // Erhverv
                { wch: 12 }, // Præmie
                { wch: 20 }, // Årsag
                { wch: 20 }, // Sagsbehandler
                { wch: 40 }  // Kommentar
            ];

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Tabte Præmier');

            // Generate filename with current date
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const filename = `tabt_praemier_${today}.xlsx`;

            // Download file
            XLSX.writeFile(workbook, filename);

            console.log(`Exported ${sortedRecords.length} records to ${filename}`);
        } catch (error) {
            console.error('Excel export failed:', error);
            showErrorMessage('Fejl ved eksport til Excel');
        }
    }

    /**
     * Format date for Excel export (DD/MM/YYYY HH:MM)
     */
    function formatDateForExcel(isoString) {
        try {
            const date = new Date(isoString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (error) {
            return '';
        }
    }
});
