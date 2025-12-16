// Tabt Præmie Page - Lost Premium Registration
// Handles form submission and display of lost premium records

document.addEventListener('DOMContentLoaded', async function() {
    let currentUser = null;
    let lostPremiumsData = null;
    let db25Data = null; // Store DB25 codes for reuse
    let createAutocomplete = null; // Autocomplete for create form
    let editAutocomplete = null; // Autocomplete for edit modal
    let recordToDelete = null; // Store record ID for delete confirmation

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
            db25Data = await DB25Loader.loadCodes();
            createAutocomplete = initializeAutocomplete(db25Data);

            // Setup event listeners
            setupEventListeners();

            // Initialize modals
            initializeEditModal();
            initializeDeleteModal();
            initializeKeyboardShortcuts();

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

        const autocomplete = new DB25Autocomplete(
            inputElement,
            'autocomplete-dropdown',  // Pass dropdown element ID
            (selectedItem) => {
                // Callback when user selects an item
                hiddenCodeField.value = selectedItem.code;
                beskrivelseField.value = selectedItem.description;
                beskrivelseContainer.classList.remove('hidden');

                // Trigger validation
                validateForm();
            }
        );

        autocomplete.init(db25Data);
        return autocomplete;
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

        // Event delegation for edit/delete buttons in table
        const tableBody = document.getElementById('records-table-body');
        tableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (editBtn) {
                const recordId = editBtn.dataset.recordId;
                openEditModal(recordId);
            }

            if (deleteBtn) {
                const recordId = deleteBtn.dataset.recordId;
                openDeleteModal(recordId);
            }
        });
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
            // Reload fresh data from server to prevent overwriting changes made by other users
            console.log('Reloading fresh data before creating new record...');
            lostPremiumsData = await loadLostPremiums();

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

            // Add record to FRESH data structure
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
                    <td class="py-3 px-6 text-right whitespace-nowrap">
                        <button class="edit-btn text-slate-600 hover:text-blue-600 transition-colors p-1 mr-2"
                                data-record-id="${record.id}"
                                title="Rediger"
                                aria-label="Rediger række">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button class="delete-btn text-slate-600 hover:text-red-600 transition-colors p-1"
                                data-record-id="${record.id}"
                                title="Slet"
                                aria-label="Slet række">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </td>
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

    // ====================
    // EDIT FUNCTIONALITY
    // ====================

    /**
     * Open edit modal for a specific record
     */
    async function openEditModal(recordId) {
        try {
            // Reload fresh data from server to ensure we have the latest version
            console.log('Reloading fresh data before editing record...');
            lostPremiumsData = await loadLostPremiums();

            // Re-render table to show any changes made by other users
            renderRecordsTable(lostPremiumsData.records);

            // Find the record in FRESH data
            const record = lostPremiumsData.records.find(r => r.id === recordId);
            if (!record) {
                showErrorMessage('Denne record blev slettet af en anden bruger');
                return;
            }

            console.log('Opening edit modal for record:', record);
        } catch (error) {
            console.error('Failed to reload data:', error);
            showErrorMessage('Kunne ikke indlæse seneste data. Prøv igen.');
            return;
        }

        // Find the record for modal population
        const record = lostPremiumsData.records.find(r => r.id === recordId);

        // Destroy previous autocomplete instance if exists
        if (editAutocomplete) {
            editAutocomplete.destroy();
            editAutocomplete = null;
        }

        // Populate form fields
        document.getElementById('editRecordId').value = record.id;
        document.getElementById('editDb25Input').value = `${record.db25_kode} - ${record.db25_beskrivelse}`;
        document.getElementById('editDb25Kode').value = record.db25_kode;
        document.getElementById('editDb25Beskrivelse').value = record.db25_beskrivelse;
        document.getElementById('editErhverv').value = record.erhverv;
        document.getElementById('editPraemie').value = record.praemie_kr;
        document.getElementById('editAarsag').value = record.aarsag;
        document.getElementById('editKommentar').value = record.kommentar || '';
        document.getElementById('editCharCount').textContent = (record.kommentar || '').length;

        // Show beskrivelse container
        document.getElementById('editDb25BeskrivelseContainer').classList.remove('hidden');

        // Create new autocomplete instance for edit modal
        const inputElement = document.getElementById('editDb25Input');
        const hiddenCodeField = document.getElementById('editDb25Kode');
        const beskrivelseField = document.getElementById('editDb25Beskrivelse');
        const beskrivelseContainer = document.getElementById('editDb25BeskrivelseContainer');

        editAutocomplete = new DB25Autocomplete(
            inputElement,
            'editDb25Dropdown',  // Pass correct dropdown ID for modal
            (selectedItem) => {
                hiddenCodeField.value = selectedItem.code;
                beskrivelseField.value = selectedItem.description;
                beskrivelseContainer.classList.remove('hidden');
                validateEditForm();
            }
        );

        editAutocomplete.init(db25Data);

        // Validate form to enable/disable save button
        validateEditForm();

        // Show modal
        document.getElementById('editModal').classList.remove('hidden');
    }

    /**
     * Close edit modal
     */
    function closeEditModal() {
        // Destroy autocomplete instance
        if (editAutocomplete) {
            editAutocomplete.destroy();
            editAutocomplete = null;
        }

        // Hide modal
        document.getElementById('editModal').classList.add('hidden');

        // Reset form
        document.getElementById('editForm').reset();
        document.getElementById('editDb25BeskrivelseContainer').classList.add('hidden');
    }

    /**
     * Initialize edit modal event listeners
     */
    function initializeEditModal() {
        const modal = document.getElementById('editModal');
        const form = document.getElementById('editForm');
        const closeBtn = document.getElementById('closeEditModal');
        const cancelBtn = document.getElementById('cancelEdit');
        const kommentarTextarea = document.getElementById('editKommentar');
        const charCounter = document.getElementById('editCharCount');

        // Form submit
        form.addEventListener('submit', updateLostPremium);

        // Close button
        closeBtn.addEventListener('click', closeEditModal);

        // Cancel button
        cancelBtn.addEventListener('click', closeEditModal);

        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditModal();
            }
        });

        // Character counter
        kommentarTextarea.addEventListener('input', function() {
            charCounter.textContent = this.value.length;
        });

        // Real-time validation
        const editDb25Kode = document.getElementById('editDb25Kode');
        const editErhverv = document.getElementById('editErhverv');
        const editPraemie = document.getElementById('editPraemie');
        const editAarsag = document.getElementById('editAarsag');

        editDb25Kode.addEventListener('input', validateEditForm);
        editErhverv.addEventListener('input', validateEditForm);
        editPraemie.addEventListener('input', validateEditForm);
        editAarsag.addEventListener('change', validateEditForm);
    }

    /**
     * Validate edit form
     */
    function validateEditForm() {
        const db25_kode = document.getElementById('editDb25Kode').value.trim();
        const erhverv = document.getElementById('editErhverv').value.trim();
        const praemie_kr = parseFloat(document.getElementById('editPraemie').value);
        const aarsag = document.getElementById('editAarsag').value;

        const isValid = db25_kode !== '' &&
                        erhverv !== '' &&
                        !isNaN(praemie_kr) &&
                        praemie_kr >= 0 &&
                        aarsag !== '';

        document.getElementById('saveEdit').disabled = !isValid;
        return isValid;
    }

    /**
     * Update lost premium record
     */
    async function updateLostPremium(event) {
        event.preventDefault();

        if (!validateEditForm()) {
            showErrorMessage('Alle påkrævede felter skal udfyldes korrekt');
            return;
        }

        const recordId = document.getElementById('editRecordId').value;

        // Edge case: Check if record still exists
        const existingRecord = lostPremiumsData.records.find(r => r.id === recordId);
        if (!existingRecord) {
            showErrorMessage('Denne række blev slettet af en anden bruger');
            closeEditModal();
            renderRecordsTable(lostPremiumsData.records);
            return;
        }

        // Disable button and show loading state
        const saveBtn = document.getElementById('saveEdit');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 inline-block mr-2" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gemmer...
        `;

        // Create backup for rollback
        const backup = JSON.parse(JSON.stringify(lostPremiumsData));

        try {
            // Update record in memory
            const recordIndex = lostPremiumsData.records.findIndex(r => r.id === recordId);
            lostPremiumsData.records[recordIndex] = {
                ...existingRecord, // Keep original metadata
                db25_kode: document.getElementById('editDb25Kode').value.trim(),
                db25_beskrivelse: document.getElementById('editDb25Beskrivelse').value.trim(),
                erhverv: document.getElementById('editErhverv').value.trim(),
                praemie_kr: parseFloat(document.getElementById('editPraemie').value),
                aarsag: document.getElementById('editAarsag').value,
                kommentar: document.getElementById('editKommentar').value.trim()
            };

            // Update metadata
            lostPremiumsData.metadata.lastUpdated = new Date().toISOString();

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

            console.log('Record updated successfully');

            // Close modal
            closeEditModal();

            // Refresh table
            renderRecordsTable(lostPremiumsData.records);

            // Show success message
            showSuccessMessage('Ændringer gemt succesfuldt');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('Failed to update record:', error);
            showErrorMessage('Kunne ikke gemme ændringer. Prøv igen.');

            // Rollback changes
            lostPremiumsData = backup;
            renderRecordsTable(lostPremiumsData.records);
        } finally {
            // Reset button
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    // ====================
    // DELETE FUNCTIONALITY
    // ====================

    /**
     * Open delete confirmation modal
     */
    async function openDeleteModal(recordId) {
        try {
            // Reload fresh data from server to ensure record still exists
            console.log('Reloading fresh data before deleting record...');
            lostPremiumsData = await loadLostPremiums();

            // Re-render table to show any changes made by other users
            renderRecordsTable(lostPremiumsData.records);

            // Check if record still exists in FRESH data
            const record = lostPremiumsData.records.find(r => r.id === recordId);
            if (!record) {
                showErrorMessage('Denne record blev allerede slettet af en anden bruger');
                return;
            }

            // Proceed with delete confirmation
            recordToDelete = recordId;
            document.getElementById('deleteModal').classList.remove('hidden');
        } catch (error) {
            console.error('Failed to reload data:', error);
            showErrorMessage('Kunne ikke indlæse seneste data. Prøv igen.');
        }
    }

    /**
     * Close delete modal
     */
    function closeDeleteModal() {
        recordToDelete = null;
        document.getElementById('deleteModal').classList.add('hidden');
    }

    /**
     * Initialize delete modal event listeners
     */
    function initializeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        const cancelBtn = document.getElementById('cancelDelete');
        const confirmBtn = document.getElementById('confirmDelete');

        // Cancel button
        cancelBtn.addEventListener('click', closeDeleteModal);

        // Confirm button
        confirmBtn.addEventListener('click', deleteLostPremium);

        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDeleteModal();
            }
        });
    }

    /**
     * Delete lost premium record
     */
    async function deleteLostPremium() {
        if (!recordToDelete) return;

        // Edge case: Check if record exists
        const recordIndex = lostPremiumsData.records.findIndex(r => r.id === recordToDelete);
        if (recordIndex === -1) {
            showErrorMessage('Række ikke fundet - siden genindlæses');
            setTimeout(() => location.reload(), 2000);
            return;
        }

        // Disable buttons
        const confirmBtn = document.getElementById('confirmDelete');
        const originalText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Sletter...';

        // Create backup for rollback
        const backup = JSON.parse(JSON.stringify(lostPremiumsData));

        try {
            // Remove from array
            lostPremiumsData.records.splice(recordIndex, 1);

            // Update metadata
            lostPremiumsData.metadata.lastUpdated = new Date().toISOString();

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

            console.log('Record deleted successfully');

            // Close modal
            closeDeleteModal();

            // Refresh table
            renderRecordsTable(lostPremiumsData.records);

            // Show success message
            showSuccessMessage('Rækken er slettet');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('Failed to delete record:', error);
            showErrorMessage('Kunne ikke slette række. Prøv igen.');

            // Rollback changes
            lostPremiumsData = backup;
            renderRecordsTable(lostPremiumsData.records);
        } finally {
            // Reset button
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
        }
    }

    // ====================
    // KEYBOARD SHORTCUTS
    // ====================

    /**
     * Initialize keyboard shortcuts
     */
    function initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const editModal = document.getElementById('editModal');
                const deleteModal = document.getElementById('deleteModal');

                if (!editModal.classList.contains('hidden')) {
                    closeEditModal();
                }
                if (!deleteModal.classList.contains('hidden')) {
                    closeDeleteModal();
                }
            }
        });
    }
});
