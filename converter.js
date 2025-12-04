// Quad Excel to Database Converter
// VERSION: 2.1 (Fixed identification logic)

document.addEventListener('DOMContentLoaded', function() {
    let converterInitialized = false;
    
    // File Storage
    const files = {
        'axa': null,
        'axa-nonconverted': null,
        'naersikring': null,
        'afviste': null
    };

    // Sheet Name Storage (Auto-detected index 0)
    const sheetNames = {
        'axa': null,
        'axa-nonconverted': null,
        'naersikring': null,
        'afviste': null
    };
    
    // Status Flags
    const fileStatus = {
        'axa': false,
        'axa-nonconverted': false,
        'naersikring': false,
        'afviste': false
    };
    
    // File Buffers (for processing)
    const fileBuffers = {
        'axa': null,
        'axa-nonconverted': null,
        'naersikring': null,
        'afviste': null
    };

    let worker = null;
    let preparedDatabaseData = null;
    
    function initializeConverter() {
        if (converterInitialized) return;
        
        const dataContent = document.getElementById('data-content');
        if (!dataContent) return;
        
        converterInitialized = true;
        
        // Hide directory section (default behavior)
        const dirSection = document.getElementById('directory-section');
        if(dirSection) dirSection.classList.add('hidden');

        initWorker();
        setupEventListeners();
    }

    // --- FIL IDENTIFIKATION LOGIK (OPDATERET) ---
    function identifyFile(file) {
        // Konverter til små bogstaver for sikker sammenligning
        const name = file.name.toLowerCase();
        console.log("Scanner fil:", name); // Debugging i konsollen (F12)

        // 1. AXA Ikke Konverterede (VIGTIGT: Skal tjekkes FØR "Konverterede")
        // Tjekker specifikt for det navn du oplyste samt variationer
        if (name.includes('ikkekonverteredetilbud') || name.includes('ikkekonverterede') || name.includes('ikke konverterede')) {
            console.log("-> Identificeret som: AXA Ikke Konverterede");
            return 'axa-nonconverted';
        }
        
        // 2. AXA Konverterede
        if (name.includes('konverterede') || name.includes('accepted')) {
            console.log("-> Identificeret som: AXA Konverterede");
            return 'axa';
        }
        
        // 3. Afviste Tilbud
        if (name.includes('afviste') || name.includes('rejected') || name.includes('afvistetilbud')) {
            console.log("-> Identificeret som: Afviste Tilbud");
            return 'afviste';
        }
        
        // 4. Nærsikring (Portefølje)
        if (name.includes('portefølje') || name.includes('naersikring') || name.includes('nærsikring')) {
            console.log("-> Identificeret som: Nærsikring");
            return 'naersikring';
        }
        
        console.log("-> Kunne ikke identificeres");
        return null; // Ukendt fil
    }
    
    // --- UPLOAD TIL DATABASE FUNKTION ---
    async function uploadToDatabase() {
        if (!preparedDatabaseData) {
            showError('Ingen data klar til upload', 'general');
            return;
        }

        const downloadBtn = document.getElementById('download-btn');
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = "Gemmer i database...";
        downloadBtn.disabled = true;
        downloadBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        downloadBtn.classList.add('bg-slate-400');

        try {
            const fullDatabasePayload = {
                converted: preparedDatabaseData.converted,
                nonConverted: preparedDatabaseData.nonConverted,
                rejected: preparedDatabaseData.rejected,
                log: []
            };

            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullDatabasePayload)
            });

            if (response.ok) {
                showSuccessMessage("Data er gemt succesfuldt i databasen!");
                downloadBtn.textContent = "Data Gemt ✓";
                downloadBtn.classList.remove('bg-slate-400');
                downloadBtn.classList.add('bg-slate-500', 'cursor-default');
                if(window.loadData) window.loadData();
            } else {
                throw new Error("Server fejl: " + response.status);
            }

        } catch (error) {
            console.error('Upload error:', error);
            showError('Fejl: ' + error.message, 'general');
            downloadBtn.textContent = originalText;
            downloadBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            downloadBtn.classList.remove('bg-slate-400');
            downloadBtn.disabled = false;
        }
    }

    function showSuccessMessage(message) {
        const successMessage = document.getElementById('success-message');
        if (successMessage) {
            const p = successMessage.querySelector('p');
            if(p) p.textContent = message;
            successMessage.classList.remove('hidden');
            setTimeout(() => successMessage.classList.add('hidden'), 5000);
        } else {
            alert(message);
        }
    }

    // --- WORKER LOGIK ---
    const workerScript = `
        self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        
        self.onmessage = function(e) {
            const { action, data } = e.data;
            if (action === 'readFile') readExcelFile(data.fileData, data.fileType);
            else if (action === 'convertData') convertData(data);
        };
        
        function readExcelFile(fileData, fileType) {
            try {
                self.postMessage({ status: 'reading-started', fileType: fileType });
                // Read just to get sheet names
                const workbook = XLSX.read(new Uint8Array(fileData).buffer, { type: 'array', bookSheets: true });
                self.postMessage({ 
                    status: 'reading-complete',
                    fileType: fileType,
                    sheetNames: workbook.SheetNames
                });
            } catch (error) {
                self.postMessage({ status: 'error', fileType: fileType, message: error.message });
            }
        }
        
        function convertData(data) {
            try {
                const { axaFileData, axaNonConvertedFileData, naersikringFileData, afvisteFileData,
                        axaSheetName, axaNonConvertedSheetName, naersikringSheetName, afvisteSheetName } = data;
                
                self.postMessage({ status: 'converting-started' });
                
                let convertedResult = [];
                let nonConvertedResult = [];
                let afvisteResult = [];
                
                // 1. PROCESS AXA CONVERTED
                if (axaFileData) {
                    self.postMessage({ status: 'converting-axa-started' });
                    const wb = XLSX.read(new Uint8Array(axaFileData).buffer, { type: 'array', cellDates: true });
                    const json = XLSX.utils.sheet_to_json(wb.Sheets[axaSheetName], { header: 1 });
                    const headers = json[0] || [];
                    for (let i = 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row || row.length === 0) continue;
                        const obj = {};
                        for (let j = 0; j < headers.length; j++) {
                            if (headers[j]) obj[headers[j]] = row[j] !== undefined ? row[j] : null;
                        }
                        convertedResult.push(obj);
                    }
                    self.postMessage({ status: 'converting-axa-complete' });
                }
                
                // 2. PROCESS AXA NON-CONVERTED
                if (axaNonConvertedFileData) {
                    self.postMessage({ status: 'converting-axa-nonconverted-started' });
                    const wb = XLSX.read(new Uint8Array(axaNonConvertedFileData).buffer, { type: 'array', cellDates: true });
                    const json = XLSX.utils.sheet_to_json(wb.Sheets[axaNonConvertedSheetName], { header: 1 });
                    const headers = json[0] || [];
                    for (let i = 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row || row.length === 0) continue;
                        const obj = {};
                        for (let j = 0; j < headers.length; j++) {
                            if (headers[j]) obj[headers[j]] = row[j] !== undefined ? row[j] : null;
                        }
                        nonConvertedResult.push(obj);
                    }
                    self.postMessage({ status: 'converting-axa-nonconverted-complete' });
                }
                
                // 3. PROCESS NÆRSIKRING
                if (naersikringFileData) {
                    self.postMessage({ status: 'converting-naersikring-started' });
                    const wb = XLSX.read(new Uint8Array(naersikringFileData).buffer, { type: 'array', cellDates: true });
                    const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[naersikringSheetName]);
                    
                    const transformed = rawJson.map(row => {
                         const navnelabel = row['Navnelabel'] || row['navnelabel'] || '';
                         const db25Erhverv = row['DB25-Erhverv'] || '';
                         const db25Nr = row['DB25-Nr'] || '';
                         const dbKode = db25Erhverv && db25Nr ? \`\${db25Erhverv} - \${db25Nr}\` : '';
                         let ikraftDate = row['Ikrafttrædelse'] || '';
                         
                         return {
                            'PRODUKT': 'Arbejdsskadeforsikring',
                            'SAELGER': row['Selskab'] || '',
                            'POLICE_NR': row['Policenr.'] || row['Policenr'] || '',
                            'FORSIKRINGSTAGER_NAVN': navnelabel.substring(7) || navnelabel,
                            'FORSIKRINGSTAGER': navnelabel.substring(0, 7),
                            'FORSIKRINGSTAGER_CVR': row['CVRnr.'] || row['CVRnr'] || '',
                            'AARLIG_PRAEMIE': row['Årspræmie'] || 0,
                            'TILBUD_START_DATO': ikraftDate,
                            'SAGSBEHANDLER': row['Provisionsmodtager1'] || '',
                            'EKSTERN_KUNDE_NR': row['Kundenr. andet selskab'] || '',
                            'DB_KODE': dbKode,
                            'MASTER_POLICE_NAVN': 'Nærsikring - Arbejdsskadeforsikring'
                        };
                    });
                    convertedResult = convertedResult.concat(transformed);
                    self.postMessage({ status: 'converting-naersikring-complete' });
                }

                // 4. PROCESS AFVISTE
                if (afvisteFileData) {
                    self.postMessage({ status: 'converting-afviste-started' });
                    const wb = XLSX.read(new Uint8Array(afvisteFileData).buffer, { type: 'array', cellDates: true });
                    const json = XLSX.utils.sheet_to_json(wb.Sheets[afvisteSheetName]); 
                    afvisteResult = afvisteResult.concat(json); 
                    self.postMessage({ status: 'converting-afviste-complete' });
                }
                
                // Finalize
                self.postMessage({ 
                    status: 'converting-complete', 
                    data: {
                        converted: convertedResult,
                        nonConverted: nonConvertedResult,
                        rejected: afvisteResult
                    }
                });
                
            } catch (error) {
                self.postMessage({ status: 'error', message: error.message });
            }
        }
    `;
    
    function initWorker() {
        const workerBlob = new Blob([workerScript], { type: 'text/javascript' });
        worker = new Worker(URL.createObjectURL(workerBlob));
        worker.onmessage = handleWorkerMessage;
    }
    
    // Setup Event Listeners
    function setupEventListeners() {
        const convertBtn = document.getElementById('convert-btn');
        const downloadBtn = document.getElementById('download-btn');
        
        // MASTER DROP ZONE LISTENERS
        const dropZone = document.getElementById('master-drop-zone');
        const fileInput = document.getElementById('master-file-input');
        const selectBtn = document.getElementById('master-file-select-btn');

        if(selectBtn && fileInput) {
            selectBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => handleMasterFiles(e.target.files));
        }
        
        if(dropZone) {
            dropZone.addEventListener('dragover', (e) => { 
                e.preventDefault(); 
                dropZone.classList.add('border-slate-600', 'bg-slate-100'); 
            });
            dropZone.addEventListener('dragleave', (e) => { 
                e.preventDefault(); 
                dropZone.classList.remove('border-slate-600', 'bg-slate-100'); 
            });
            dropZone.addEventListener('drop', (e) => { 
                e.preventDefault(); 
                dropZone.classList.remove('border-slate-600', 'bg-slate-100');
                if(e.dataTransfer.files.length) handleMasterFiles(e.dataTransfer.files);
            });
        }

        // Convert Button
        if (convertBtn) convertBtn.addEventListener('click', startConversion);
        
        // Save Button (Redirect to database)
        if (downloadBtn) {
            // Remove old listeners by cloning
            const newDownloadBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
            
            newDownloadBtn.textContent = "Gem data til Database";
            newDownloadBtn.addEventListener('click', uploadToDatabase);
        }
    }

    // --- MAIN FILE HANDLING LOGIC ---
    function handleMasterFiles(fileList) {
        // Reset error messages
        const errorDiv = document.getElementById('master-error-message');
        errorDiv.classList.add('hidden');

        let invalidFiles = 0;

        Array.from(fileList).forEach(file => {
            if (!file.name.match(/\.(xlsx|xls)$/i)) {
                invalidFiles++;
                return;
            }

            const type = identifyFile(file);
            
            if (type) {
                // Save File
                files[type] = file;
                
                // Update UI immediately to "Loading/Reading"
                updateFileStatusUI(type, file.name, 'loading');

                // Read File to get sheet name (and validate)
                const reader = new FileReader();
                reader.onload = (e) => {
                    fileBuffers[type] = e.target.result; // Store buffer for conversion
                    worker.postMessage({ 
                        action: 'readFile', 
                        data: { fileData: e.target.result, fileType: type }
                    });
                };
                reader.readAsArrayBuffer(file);

            } else {
                // File recognized as Excel, but filename doesn't match rules
                showMasterError(`Filen "${file.name}" kunne ikke identificeres. Tjek filnavnet.`);
            }
        });

        if (invalidFiles > 0) {
            showMasterError(`${invalidFiles} fil(er) blev ignoreret (ikke Excel filer).`);
        }
    }

    function updateFileStatusUI(type, filename, status) {
        // type: 'axa', 'axa-nonconverted', 'naersikring', 'afviste'
        const card = document.getElementById(`status-card-${type}`);
        const iconDiv = document.getElementById(`icon-${type}`);
        const nameP = document.getElementById(`filename-${type}`);

        if (!card || !iconDiv || !nameP) return;

        nameP.textContent = filename;
        nameP.title = filename; // Tooltip for long names

        if (status === 'loading') {
            card.className = "rounded-lg border border-blue-200 p-4 bg-blue-50 transition-colors duration-300";
            iconDiv.innerHTML = '<span class="text-blue-500 text-xs font-bold">...</span>'; // Simple loader
        } else if (status === 'ready') {
            card.className = "rounded-lg border border-green-200 p-4 bg-green-50 transition-colors duration-300 shadow-sm";
            // Green Checkmark
            iconDiv.innerHTML = `<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            iconDiv.classList.remove('text-slate-300');
        }
    }

    function showMasterError(msg) {
        const errorDiv = document.getElementById('master-error-message');
        if (errorDiv) {
            errorDiv.querySelector('p').textContent = msg;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        } else {
            alert(msg);
        }
    }

    function startConversion() {
        // Validate all 4 files are present
        const missing = Object.keys(fileStatus).filter(key => !fileStatus[key]);
        if (missing.length > 0) {
            showMasterError("Mangler filer før konvertering kan starte.");
            return;
        }

        const convertBtn = document.getElementById('convert-btn');
        convertBtn.disabled = true;
        convertBtn.textContent = "Arbejder...";

        worker.postMessage({
            action: 'convertData',
            data: {
                axaFileData: fileBuffers['axa'],
                axaNonConvertedFileData: fileBuffers['axa-nonconverted'],
                naersikringFileData: fileBuffers['naersikring'],
                afvisteFileData: fileBuffers['afviste'],
                
                // Use auto-detected Sheet 0 for all
                axaSheetName: sheetNames['axa'],
                axaNonConvertedSheetName: sheetNames['axa-nonconverted'],
                naersikringSheetName: sheetNames['naersikring'],
                afvisteSheetName: sheetNames['afviste']
            }
        });
    }

    function handleWorkerMessage(e) {
        const { status, fileType, message, data, sheetNames: foundSheets } = e.data;
        
        if (status === 'reading-complete') {
            // Auto-select first sheet
            if (foundSheets && foundSheets.length > 0) {
                sheetNames[fileType] = foundSheets[0];
                fileStatus[fileType] = true;
                updateFileStatusUI(fileType, files[fileType].name, 'ready');
                checkAllFilesReady();
            } else {
                showMasterError(`Ingen ark fundet i ${files[fileType].name}`);
            }
        }
        
        if (status === 'converting-complete') {
            preparedDatabaseData = data;
            
            // Show stats
            document.getElementById('converted-count').textContent = `${data.converted.length} (AXA + Nærsikring)`;
            document.getElementById('nonconverted-count').textContent = data.nonConverted.length;
            document.getElementById('afviste-count').textContent = data.rejected.length;
            document.getElementById('data-summary').classList.remove('hidden');
            
            // Enable save
            const dlBtnContainer = document.getElementById('download-btn-container');
            const dlBtn = document.getElementById('download-btn');
            dlBtnContainer.classList.remove('hidden');
            dlBtn.disabled = false;
            dlBtn.textContent = "Gem Data til Database";
            dlBtn.classList.remove('bg-slate-500', 'cursor-default');
            dlBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            
            // Hide progress bars visual
            const mergeBar = document.getElementById('merge-progress-bar');
            if(mergeBar) mergeBar.style.width = '100%';

            // Reset convert button
            const convertBtn = document.getElementById('convert-btn');
            convertBtn.textContent = "Konvertering Færdig";
            
            showSuccessMessage("Konvertering færdig. Klar til at gemme i database.");
        }
        
        if (status === 'error') showMasterError(`${fileType ? fileType + ': ' : ''}${message}`);
        
        // Progress Bars (Visual only)
        if(status === 'converting-started') {
            ['axa', 'axa-nonconverted', 'naersikring', 'afviste', 'merge'].forEach(t => {
                const el = document.getElementById(t + '-converting-progress-container');
                if(el) {
                    el.classList.remove('hidden');
                    const bar = document.getElementById(t + '-converting-progress-bar');
                    if(bar) setTimeout(() => bar.style.width = '100%', Math.random() * 1500);
                }
            });
        }
    }
    
    function checkAllFilesReady() {
        const allReady = Object.values(fileStatus).every(val => val === true);
        const btn = document.getElementById('convert-btn');
        if(!btn) return;
        
        btn.disabled = !allReady;
        if(allReady) {
            btn.classList.remove('bg-slate-300', 'cursor-not-allowed');
            btn.classList.add('bg-slate-800', 'hover:bg-slate-900', 'cursor-pointer');
            btn.textContent = "Konverter til JavaScript";
        }
    }

    function showError(msg, type) {
        showMasterError(msg);
    }

    // Auto-init logic
    checkAndInitializeConverter();
    function checkAndInitializeConverter() {
        const content = document.getElementById('data-content');
        if (content && !content.classList.contains('hidden')) setTimeout(initializeConverter, 100);
    }
    document.addEventListener('dataTabShown', () => setTimeout(initializeConverter, 100));
    document.getElementById('nav-data')?.addEventListener('click', () => setTimeout(checkAndInitializeConverter, 200));
});