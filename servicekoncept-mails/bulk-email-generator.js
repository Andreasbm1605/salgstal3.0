// Global variables

let jsonData = null;

let filteredCustomers = [];

// File System Access API helper functions
let directoryHandle = null;

function showProgress() {
    document.getElementById('progressContainer').classList.remove('hidden');
}

function hideProgress() {
    document.getElementById('progressContainer').classList.add('hidden');
}

function updateProgress(current, total, details = '') {
    const percentage = (current / total) * 100;
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `${current} / ${total}`;
    if (details) {
        document.getElementById('progressDetails').textContent = details;
    }
}

async function selectFolderForSaving() {
    try {
        directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Folder selection was cancelled');
        } else {
            throw new Error(`Error selecting folder: ${error.message}`);
        }
    }
}

async function saveHtmlFile(filename, content) {
    if (!directoryHandle) {
        throw new Error('No folder selected');
    }
    
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

async function saveJsFile(cvrList, customerNames) {
    if (!directoryHandle) {
        throw new Error('No folder selected');
    }
    
    // Format today's date as DDMMYYYY
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}${month}${year}`;
    
    // Create JS file content with both constants
    const jsContent = `const GENERATED_EMAILS = ${JSON.stringify(cvrList, null, 2)};\n\nconst CUSTOMER_NAMES = ${JSON.stringify(customerNames, null, 2)};`;
    
    // Save the file
    const filename = `servicekoncept_mails_${dateStr}.js`;
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(jsContent);
    await writable.close();
    
    return filename;
}

// Populate the sent emails sidebar
function populateSentEmailsList() {
    const sentEmailsList = document.getElementById('sentEmailsList');
    if (!sentEmailsList) return;
    
    try {
        if (typeof SENT_EMAILS !== 'undefined' && Array.isArray(SENT_EMAILS) && SENT_EMAILS.length > 0) {
            sentEmailsList.innerHTML = SENT_EMAILS.map(email => 
                `<div class="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">${email}</div>`
            ).join('');
        } else {
            sentEmailsList.innerHTML = '<div class="text-xs text-gray-500 italic">Ingen emails sendt endnu</div>';
        }
    } catch (error) {
        console.error('Error loading sent emails list:', error);
        sentEmailsList.innerHTML = '<div class="text-xs text-red-500 italic">Fejl ved indlæsning af liste</div>';
    }
}

// Format number with thousand separators and currency
function formatCurrency(value) {
    if (!value) return value;
    
    // Convert to number if it's a string
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    
    // Check if valid number
    if (isNaN(num)) return value;
    
    // Format with dots as thousand separator
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr.';
}

// Initialize when DOM is loaded

document.addEventListener('DOMContentLoaded', function() {

    const jsonFileInput = document.getElementById('jsonFile');

    const migrationFilter = document.getElementById('migrationFilter');

    const generateButton = document.getElementById('generateButton');

    const errorMessage = document.getElementById('errorMessage');

    const jsonLabel = document.getElementById('jsonLabel');

    const statistics = document.getElementById('statistics');

    const totalCustomers = document.getElementById('totalCustomers');

    const filteredCustomersSpan = document.getElementById('filteredCustomers');

    const progressContainer = document.getElementById('progressContainer');

    const progressBar = document.getElementById('progressBar');

    const progressText = document.getElementById('progressText');

    

    // Single email elements

    const cvrInput = document.getElementById('cvrInput');

    const singleGenerateButton = document.getElementById('singleGenerateButton');

    const singleErrorMessage = document.getElementById('singleErrorMessage');

    const excludeSentFilter = document.getElementById('excludeSentFilter');

    const marketingConsentFilter = document.getElementById('marketingConsentFilter');

    const emailLimitInput = document.getElementById('emailLimitInput');

    const includeJsListFilter = document.getElementById('includeJsListFilter');

    const excludeNoEmailFilter = document.getElementById('excludeNoEmailFilter');


    // Handle JSON file upload

    jsonFileInput.addEventListener('change', function(e) {

        if (e.target.files.length > 0) {

            const file = e.target.files[0];

            jsonLabel.textContent = file.name;

            jsonLabel.classList.remove('text-gray-500');

            jsonLabel.classList.add('text-green-600');



            const reader = new FileReader();

            reader.onload = function(event) {

                try {

                    jsonData = JSON.parse(event.target.result);

                    console.log('JSON loaded successfully:', jsonData.customers ? jsonData.customers.length : 0, 'customers');

                    updateFilteredCustomers();

                    updateButtonState();

                    updateSingleButtonState();

                    showStatistics();

                } catch (error) {

                    console.error('Error parsing JSON:', error);

                    showError('Fejl ved læsning af JSON fil');

                    jsonData = null;

                    hideStatistics();

                }

            };

            reader.readAsText(file);

        }

    });



    // Handle filter changes

    migrationFilter.addEventListener('change', function() {

        if (jsonData) {

            updateFilteredCustomers();

            updateButtonState();

        }

    });

    // Handle exclude sent filter changes
    excludeSentFilter.addEventListener('change', function() {
        if (jsonData) {
            updateFilteredCustomers();
            updateButtonState();
        }
    });

    // Handle marketing consent filter changes
    marketingConsentFilter.addEventListener('change', function() {
        if (jsonData) {
            updateFilteredCustomers();
            updateButtonState();
        }
    });

    // Handle exclude no email filter changes
    excludeNoEmailFilter.addEventListener('change', function() {
        if (jsonData) {
            updateFilteredCustomers();
            updateButtonState();
        }
    });

    // Handle email limit input changes
    emailLimitInput.addEventListener('input', function() {
        if (jsonData) {
            updateButtonState();
        }
    });

    // Handle generate button

    generateButton.addEventListener('click', generateBulkEmails);



    // Handle single email functionality

    cvrInput.addEventListener('input', updateSingleButtonState);

    singleGenerateButton.addEventListener('click', generateSingleEmail);



    // Update filtered customers based on current filters

    function updateFilteredCustomers() {
        if (!jsonData || !jsonData.customers) {
            filteredCustomers = [];
            return;
        }

        filteredCustomers = jsonData.customers.filter(customer => {
            // Apply migration filter if checked
            if (migrationFilter.checked) {
                if (!hasMigratedPolicies(customer)) {
                    return false;
                }
            }
            
            // Apply exclude sent filter if checked
            if (excludeSentFilter.checked) {
                try {
                    const customerCvr = customer.customer_details.cvr_cpr;
                    if (typeof SENT_EMAILS !== 'undefined' && Array.isArray(SENT_EMAILS) && 
                        SENT_EMAILS.includes(String(customerCvr))) {
                        return false; // Exclude this customer
                    }
                } catch (error) {
                    console.error('Error checking sent emails list:', error);
                    // If there's an error, don't exclude the customer
                }
            }
            
            // Apply marketing consent filter
            const marketingConsentValue = marketingConsentFilter.value;
            if (marketingConsentValue !== 'alle') {
                try {
                    const marketingConsent = customer.customer_details.marketing_consent;
                    if (marketingConsentValue === 'med') {
                        // Only include customers with explicit consent (true)
                        if (marketingConsent !== true) {
                            return false;
                        }
                    } else if (marketingConsentValue === 'uden') {
                        // Only include customers without consent (false or empty/undefined)
                        if (marketingConsent === true) {
                            return false;
                        }
                    }
                } catch (error) {
                    console.error('Error checking marketing consent:', error);
                    // If there's an error, don't exclude the customer
                }
            }

            // Apply exclude no email filter if checked
            if (excludeNoEmailFilter.checked) {
                try {
                    const email = customer.customer_details.email;
                    // Exclude if email is missing, empty, or null
                    if (!email || email.trim() === '') {
                        return false;
                    }
                } catch (error) {
                    console.error('Error checking email:', error);
                }
            }

            return true;
        });

        // Update statistics
        totalCustomers.textContent = jsonData.customers.length;
        filteredCustomersSpan.textContent = filteredCustomers.length;
    }



    // Check if customer has migrated policies

    function hasMigratedPolicies(customer) {

        if (!customer.policies || !Array.isArray(customer.policies)) {

            return false;

        }



        return customer.policies.some(policy => {

            return policy.master_policy_name && 

                   policy.master_policy_name.endsWith('MIG PROD');

        });

    }



    // Update button state

    // Update button state
    function updateButtonState() {
        const hasJson = jsonData !== null;
        const hasCustomers = filteredCustomers.length > 0;
        
        // Get the email limit value
        const emailLimit = emailLimitInput.value.trim();
        const limitNumber = emailLimit ? parseInt(emailLimit) : null;
        
        // Calculate how many emails will actually be generated
        const emailsToGenerate = limitNumber && limitNumber < filteredCustomers.length 
            ? limitNumber 
            : filteredCustomers.length;
        
        generateButton.disabled = !hasJson || !hasCustomers;
        
        if (hasJson && filteredCustomers.length === 0) {
            generateButton.textContent = 'Ingen kunder matcher filtrene';
        } else {
            generateButton.textContent = `Gem Alle Emails (${emailsToGenerate} kunder)`;
        }
    }



    // Show/hide statistics

    function showStatistics() {

        statistics.classList.remove('hidden');

    }



    function hideStatistics() {

        statistics.classList.add('hidden');

    }



    // Show error message

    function showError(message) {

        errorMessage.textContent = message;

        errorMessage.classList.remove('hidden');

        setTimeout(() => {

            errorMessage.classList.add('hidden');

        }, 5000);

    }

    // Clean policy number for specific insurance types only
    function cleanPolicyNumberIfNeeded(policyNumber, productName) {
        if (!policyNumber || !productName) return policyNumber;
        
        const productLower = productName.toLowerCase();
        const shouldClean = productLower.includes('sundhed') || 
                        productLower.includes('ulykke') || 
                        productLower.includes('gruppeulykke');
        
        if (!shouldClean) return policyNumber;
        
        let cleaned = policyNumber;
        
        // Remove first 8 characters if string is long enough
        if (cleaned.length > 8) {
            cleaned = cleaned.substring(8);
        }
        
        // Remove last 4 characters if they match "/xxx" pattern
        if (cleaned.length > 4 && cleaned.match(/\/\w{3}$/)) {
            cleaned = cleaned.substring(0, cleaned.length - 4);
        }
        
        return cleaned;
    }


    // Generate bulk emails
    async function generateBulkEmails() {
        if (filteredCustomers.length === 0) {
            showError('Ingen kunder at generere emails for');
            return;
        }

        // Check email limit
        const emailLimit = emailLimitInput.value.trim();
        const limitNumber = emailLimit ? parseInt(emailLimit) : null;
        
        // Validate limit
        if (limitNumber && limitNumber > filteredCustomers.length) {
            showError('Number of mails generated exceeds number of available customers');
            return;
        }
        
        // Select customers to process
        let customersToProcess;
        if (limitNumber && limitNumber < filteredCustomers.length) {
            // Randomly select N customers
            const shuffled = [...filteredCustomers].sort(() => 0.5 - Math.random());
            customersToProcess = shuffled.slice(0, limitNumber);
        } else {
            // Process all filtered customers
            customersToProcess = filteredCustomers;
        }

        try {
            generateButton.disabled = true;
            
            // First, select the folder where files will be saved
            try {
                await selectFolderForSaving();
            } catch (error) {
                showError(error.message);
                generateButton.disabled = false;
                return;
            }
            
            showProgress();
            let processed = 0;
            const generatedCvrList = [];
            const generatedCustomerNames = [];

            for (const customer of customersToProcess) {
                try {
                    // Filter active policies for this customer
                    const activePolicies = customer.policies.filter(p => 
                        p.status && p.status.toLowerCase() === 'active'
                    );

                    // Generate HTML email for this customer
                    const emailHtml = generateEmailHtml(customer, activePolicies);
                    
                    // Save file directly to selected folder
                    const cvr = customer.customer_details.cvr_cpr || 'unknown';
                    const filename = `forsikringsoverblik_${cvr}.html`;
                    
                    updateProgress(processed + 1, customersToProcess.length, `Saving ${filename}...`);
                    await saveHtmlFile(filename, emailHtml);

                    generatedCvrList.push(String(cvr));
                    generatedCustomerNames.push(customer.customer_details.formatted_name || '');

                    processed++;
                    updateProgress(processed, customersToProcess.length, `Saved ${filename}`);

                    // Small delay to prevent browser freezing
                    if (processed % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }

                } catch (error) {
                    console.error(`Error processing customer ${customer.customer_details?.cvr_cpr}:`, error);
                    hideProgress();
                    showError(`Error saving file for customer ${customer.customer_details?.cvr_cpr}: ${error.message}`);
                    generateButton.disabled = false;
                    return; // Stop completely on any error
                }
            }

            // Save JS list if checkbox is checked
            if (includeJsListFilter.checked && generatedCvrList.length > 0) {
                try {
                    updateProgress(processed, customersToProcess.length, 'Saving JS list...');
                    const jsFilename = await saveJsFile(generatedCvrList, generatedCustomerNames);
                    updateProgress(processed, customersToProcess.length, `Saved ${jsFilename}`);
                } catch (error) {
                    console.error('Error saving JS file:', error);
                    showError(`Error saving JS file: ${error.message}`);
                }
            }

            hideProgress();
            generateButton.disabled = false;
            
            // Show success message
            const successDiv = document.getElementById('errorMessage');
            successDiv.textContent = `Successfully saved ${processed} email files!`;
            successDiv.className = 'mt-4 p-3 bg-green-100 text-green-700 rounded-md';
            successDiv.classList.remove('hidden');
            setTimeout(() => {
                successDiv.classList.add('hidden');
                successDiv.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded-md hidden';
            }, 5000);
            
        } catch (error) {
            console.error('Error generating bulk emails:', error);
            showError('Fejl ved generering af emails');
            hideProgress();
            generateButton.disabled = false;
        }
    }



    // Clean product name by removing unwanted prefixes and suffixes

    function cleanProductName(productName) {

        if (!productName) return productName;

        

        let cleanName = productName;

        

        // Remove "HDI - " prefix

        if (cleanName.startsWith('HDI - ')) {

            cleanName = cleanName.substring(6);

        }

        

        // Remove " SME" suffix

        if (cleanName.endsWith(' SME')) {

            cleanName = cleanName.substring(0, cleanName.length - 4);

        }

        

        // Remove " - MIG PROD" suffix

        if (cleanName.endsWith(' - MIG PROD')) {

            cleanName = cleanName.substring(0, cleanName.length - 11);

        }

        

        return cleanName;

    }



    // Generate email HTML (exact copy from copy-email-generator.js)

    function generateEmailHtml(customer, policies) {
        const details = customer.customer_details;
        
        // Generate metadata for the email
        const emailAddress = details.email || 'No email available';
        const cvrCpr = details.cvr_cpr || 'No CVR/CPR';
        const subject = "Det er tid til at tjekke dine erhvervsforsikringer";
        const generatedAt = new Date().toISOString();
        
        let html = `<!-- 
    Email: ${emailAddress}
    Subject: ${subject}
    CVR/CPR: ${cvrCpr}
    Generated: ${generatedAt}
    -->
    <!DOCTYPE html>

    <html lang="da">

    <head>

        <meta charset="UTF-8">

        <title>Forsikringsoverblik - ${details.formatted_name}</title>

    </head>

    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Georgia, serif;">
    <!--[if mso]>
    <style type="text/css">
    body, table, td {font-family: Georgia, serif; !important;}
    </style>
    <![endif]-->

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">

            <tr>

                <td align="center">

                    <table width="800" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 800px;">

                        

                        <!-- Logo section -->

                        <tr>

                            <td style="background-color: #ffffff; padding: 30px 20px; text-align: center;">

                                <img src="${IMAGES.LB_LOGO}" alt="LB Erhverv Logo" width="120" height="120" style="width: 120px; height: 120px; max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />

                            </td>

                        </tr>

                        

                        <!-- Main content -->

                        <tr>

                            <td style="background-color: #ffffff; padding: 0 120px 20px 120px;">

                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;">Hej ${details.formatted_name}</p>
                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;"><strong>Er din virksomhed stadig korrekt forsikret?</strong></p>
                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;">Nyt kontor? Ændret omsætning? Flere ansatte? Nye maskiner eller et større lager? Når der sker ændringer i virksomheden, er det vigtigt, at forsikringerne følger med, så du altid har de dækninger, du har brug for.</p>
                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;"><strong>Her er oversigten over dine forsikringer</strong></p>
                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;">Her kan du se, hvilke oplysninger vi har registreret om din virksomhed og dine forsikringer. Vi beder dig om at gennemgå oversigten og sikre, at alle de informationer, vi har registreret, er korrekte.</p>
                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;"><strong>Har du spørgsmål eller ændringer?</strong></p>
                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;">Hvis der er sket noget nyt, eller du har brug for hjælp, er du altid velkommen til at kontakte os. Ring til LB Erhverv på 33 48 51 00 – eller svar blot på denne mail, så hjælper vi dig videre.</p>
                                <p style="font-size: 12pt; color: #333; line-height: 1.6; margin: 0 0 15px 0;">

                                    <br>Venlig hilsen<br><br>

                                    Jeppe Madsen<br>

                                    Afdelingschef, LB Erhverv<br><br>

                                </p>
                            </td>

                        </tr>

                        

                        <!-- Generel info om din virksomhed -->

                        <tr>

                            <td style="background-color: #ffffff; padding: 0 120px 20px 120px;">

                                <h2 style="font-size: 18pt; font-weight: bold; color: #333; margin: 0 0 15px 0;">Generel info om din virksomhed</h2>

                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="background-color: #ffffff; padding: 20px; border-radius: 5px;">

                                    <p style="margin: 5px 0; color: #333; font-size: 12pt;"><strong>CVR/CPR:</strong> ${details.cvr_cpr}</p>`;

                                    

                                if (details.address) {

                                    html += `<p style="margin: 5px 0; color: #333; font-size: 12pt;"><strong>Adresse:</strong> ${details.address}</p>`;

                                }

                                if (details.phone) {

                                    html += `<p style="margin: 5px 0; color: #333; font-size: 12pt;"><strong>Telefon:</strong> ${details.phone}</p>`;

                                }

                                if (details.email) {

                                    html += `<p style="margin: 5px 0; color: #333; font-size: 12pt;"><strong>E-mail:</strong> ${details.email}</p>`;

                                }

                                

                                // Find omsætning og branche fra policies

                                const policyWithTurnover = policies.find(p => p.turnover && p.turnover !== '');

                                const policyWithBranch = policies.find(p => p.employee_category && p.employee_category !== '');

                                

                                if (policyWithTurnover && policyWithTurnover.turnover) {

                                    html += `<p style="margin: 5px 0; color: #333; font-size: 12pt;"><strong>Årlig omsætning:</strong> ${formatCurrency(policyWithTurnover.turnover)}</p>`;

                                }



                                html += `                        </td>
                                    </tr>
                                </table>

                            </td>

                        </tr>

                        

                        <!-- Policy details -->

                        <tr>

                            <td style="background-color: #ffffff; padding: 0 120px 20px 120px;">

                                <h2 style="font-size: 18pt; font-weight: bold; color: #333; margin: 0 0 15px 0;">Overblik over dine policer</h2>
                            </td>
                        </tr>`;



            // Separate Sundhedsforsikring and Ulykkesforsikring from other policies
            const sundhedsPolicies = policies.filter(policy => 
                policy.product && policy.product.toLowerCase().includes('sundhed'));
            const ulykkePolicies = policies.filter(policy => 
                policy.product && policy.product.toLowerCase().includes('ulykke') && 
                !policy.product.toLowerCase().includes('gruppeulykke'));
            const otherPolicies = policies.filter(policy => {
                if (!policy.product) return true;
                const productLower = policy.product.toLowerCase();
                return !productLower.includes('sundhed') && 
                    (!productLower.includes('ulykke') || productLower.includes('gruppeulykke'));
            });

            // Process other policies (existing logic)
            otherPolicies.forEach(policy => {
                html += `
                        <tr>
                            <td style="padding: 0 80px 15px 80px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="background-color: #f5f5f5; padding: 15px 55px; border-radius: 5px;">
                        <div style="font-weight: bold; color: #000562; margin-bottom: 10px; font-size: 16pt;">${cleanProductName(policy.product)}</div>
                        <div style="font-size: 12pt; color: #333; margin-bottom: 10px;"><strong>Policenummer:</strong> ${cleanPolicyNumberIfNeeded(policy.policy_number, policy.product)}</div>
                        <div style="font-size: 12pt; color: #333; line-height: 1.5;">`;

                // Show specific information based on product type
                const productLower = policy.product.toLowerCase();
                
                if (productLower.includes('bil')) {
                    // Bilforsikring - kun registreringsnummer
                    if (policy.reg_nr) {
                        html += `<p style="margin: 5px 0;"><strong>Registreringsnummer:</strong> ${policy.reg_nr}</p>`;
                    }
                } 
                else if (productLower.includes('arbejdsskade')) {
                    // Arbejdsskadeforsikring - antal ansatte og arbejdsområder
                    if (policy.number_of_employees) {
                        html += `<p style="margin: 5px 0;"><strong>Antal ansatte:</strong> ${policy.number_of_employees}</p>`;
                    }
                    if (policy.work_areas && policy.work_areas.length > 0) {
                        html += `<p style="margin: 5px 0;"><strong>Arbejdsområder:</strong></p>`;
                        policy.work_areas.forEach(area => {
                            if (area.area) {
                                html += `<p style="margin: 2px 0 2px 20px;">• ${area.area} (${area.employees} ansatte)</p>`;
                            }
                        });
                    }
                }
                else if (productLower.includes('bygning')) {
                    // Bygningsforsikring - bygningsareal og forsikringssted
                    if (policy.square_meters) {
                        html += `<p style="margin: 5px 0;"><strong>Bygningsareal:</strong> ${policy.square_meters} m²</p>`;
                    }
                    if (policy.insured_location) {
                        html += `<p style="margin: 5px 0;"><strong>Forsikringssted:</strong> ${policy.insured_location}</p>`;
                    }
                }
                else if (productLower.includes('løsøre')) {
                    // Løsøreforsikring - forsikringssted og summer
                    if (policy.insured_location) {
                        html += `<p style="margin: 5px 0;"><strong>Forsikringssted:</strong> ${policy.insured_location}</p>`;
                    }
                    html += `<p style="margin: 5px 0;"><strong>Løsøre forsikret med følgende summer:</strong></p>`;
                    if (policy.fire_sum) {
                        html += `<p style="margin: 2px 0 2px 20px;">• Branddækning: ${formatCurrency(policy.fire_sum)}</p>`;
                    }
                    if (policy.water_sum) {
                        html += `<p style="margin: 2px 0 2px 20px;">• Vandskadedækning: ${formatCurrency(policy.water_sum)}</p>`;
                    }
                    if (policy.theft_sum) {
                        html += `<p style="margin: 2px 0 2px 20px;">• Tyveridækning: ${formatCurrency(policy.theft_sum)}</p>`;
                    }
                    if (policy.bi_sum) {
                        html += `<p style="margin: 2px 0 2px 20px;">• Driftstabsdækning: ${formatCurrency(policy.bi_sum)}</p>`;
                    }
                }
                else if (productLower.includes('retshjælp')) {
                    // Retshjælpsforsikring - antal ansatte
                    if (policy.number_of_employees) {
                        html += `<p style="margin: 5px 0;"><strong>Antal ansatte:</strong> ${policy.number_of_employees}</p>`;
                    }
                }

                html += `                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>`;
            });

            // Process Sundhedsforsikring policies (new consolidated logic)
            if (sundhedsPolicies.length > 0) {
                html += `
                        <tr>
                            <td style="padding: 0 80px 15px 80px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="background-color: #f5f5f5; padding: 15px 55px; border-radius: 5px;">
                        <div style="font-weight: bold; color: #000562; margin-bottom: 10px; font-size: 16pt;">Sundhedsforsikringer</div>
                        <div style="font-size: 12pt; color: #333; line-height: 1.5;">`;
                
                // Show policy numbers
                sundhedsPolicies.forEach(p => {
                    html += `<p style="margin: 5px 0;"><strong>Policenummer:</strong> ${cleanPolicyNumberIfNeeded(p.policy_number, p.product)}</p>`;
                });
                
                // Count adults and children based on premium
                const adults = sundhedsPolicies.filter(p => (p.annual_premium || 0) > 2000).length;
                const children = sundhedsPolicies.filter(p => (p.annual_premium || 0) < 1000).length;
                
                if (adults > 0) {
                    html += `<p style="margin: 5px 0;"><strong>Antal voksne forsikret:</strong> ${adults}</p>`;
                }
                if (children > 0) {
                    html += `<p style="margin: 5px 0;"><strong>Antal børn forsikret:</strong> ${children}</p>`;
                }

                html += `                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>`;
            }

            // Process Ulykkesforsikring policies (consolidated logic)
            if (ulykkePolicies.length > 0) {
                html += `
                        <tr>
                            <td style="padding: 0 80px 15px 80px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="background-color: #f5f5f5; padding: 15px 55px; border-radius: 5px;">
                        <div style="font-weight: bold; color: #000562; margin-bottom: 10px; font-size: 16pt;">Ulykkesforsikringer</div>
                        <div style="font-size: 12pt; color: #333; line-height: 1.5;">`;
                
                // Show policy numbers
                ulykkePolicies.forEach(p => {
                    html += `<p style="margin: 5px 0;"><strong>Policenummer:</strong> ${cleanPolicyNumberIfNeeded(p.policy_number, p.product)}</p>`;
                });
                
                // Count adults and children based on premium (same logic as Sundhed)
                const adults = ulykkePolicies.filter(p => (p.annual_premium || 0) > 2000).length;
                const children = ulykkePolicies.filter(p => (p.annual_premium || 0) < 1000).length;
                
                if (adults > 0) {
                    html += `<p style="margin: 5px 0;"><strong>Antal voksne forsikret:</strong> ${adults}</p>`;
                }
                if (children > 0) {
                    html += `<p style="margin: 5px 0;"><strong>Antal børn forsikret:</strong> ${children}</p>`;
                }
                
                html += `                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>`;
            }



            html += `


                        <!-- Contact section -->

                        <tr>

                            <td style="background-color: #ffffff; padding: 0 120px 20px 120px;">

                                

                            </td>

                        </tr>

                        

                        <!-- Footer -->

                        <tr>

                            <td style="background-color: #f5f5f5; padding: 30px 20px; text-align: center;">

                                <div style="font-size: 24pt; font-weight: bold; color: #333; margin-bottom: 10px;">LB Erhverv</div>

                                <div style="font-size: 12pt; color: #666; margin-bottom: 20px;">En del af LB Forsikring</div>

                                

                                <table width="80%" cellpadding="0" cellspacing="0" style="border: 0; margin: 0 auto;">

                                    <tr>

                                        <td width="33.33%" style="padding: 10px; text-align: center;">

                                            <a href="https://mit.lberhverv.dk/miterhverv" style="text-decoration: none;">

                                                <img src="${IMAGES.MIT_ERHVERV}" alt="Mit Erhverv" width="140" height="76" style="width: 140px; height: auto; max-width: 140px; display: block; margin: 0 auto; border: 0;" />

                                            </a>

                                        </td>

                                        <td width="33.33%" align="center" style="padding: 10px;">

                                            <a href="https://lberhverv.dk/kontakt" style="text-decoration: none;">

                                                <img src="${IMAGES.KONTAKT}" alt="Kontakt" width="140" height="76" style="width: 140px; height: auto; max-width: 140px; display: block; margin: 0 auto; border: 0;" />

                                            </a>

                                        </td>

                                        <td width="33.33%" align="center" style="padding: 10px;">

                                            <a href="https://lberhverv.dk/" style="text-decoration: none;">

                                                <img src="${IMAGES.LB_ERHVERV_FOOTER}" alt="LB Erhverv" width="140" height="76" style="width: 140px; height: auto; max-width: 140px; display: block; margin: 0 auto; border: 0;" />

                                            </a>

                                        </td>

                                    </tr>

                                </table>

                                

                                <div style="font-size: 12pt; color: #666; margin: 15px 0; line-height: 1.4;">

                                    Der tages forbehold for eventuelle fejl og mangelfulde informationer, 

                                    priser og betingelser om vores produkter og dækninger.

                                </div>

                                

                                <div style="font-size: 12pt; color: #666; margin: 10px 0;">

                                    LB Erhverv | En del af LB Forsikring A/S | Amerika Plads 15 | 2100 København Ø | 

                                    lberhverv.dk | cvr-nr. 16 50 08 36

                                </div>

                                

                                <div style="font-size: 12pt; margin-top: 20px;">

                                    <a href="mailto:erhverv@lb.dk?subject=Afmeld&body=Hej%20LB%20Erhverv%2C%0A%0AJeg%20vil%20gerne%20afmeldes%20jeres%20emails.%0A%0AP%C3%A5%20forh%C3%A5nd%20tak." style="color: #000562; text-decoration: none;">

                                        Afmeld mail, klik her.

                                    </a>

                                </div>

                            </td>

                        </tr>

                    </table>

                </td>

            </tr>

        </table>

    </body>

    </html>`;



        return html;

    }


    // Single email functionality

    function updateSingleButtonState() {

        const hasJson = jsonData !== null;

        const hasCvr = cvrInput.value.trim() !== '';

        singleGenerateButton.disabled = !hasJson || !hasCvr;

    }



    function showSingleError(message) {

        singleErrorMessage.textContent = message;

        singleErrorMessage.classList.remove('hidden');

        setTimeout(() => {

            singleErrorMessage.classList.add('hidden');

        }, 5000);

    }



    function generateSingleEmail() {

        const cvr = cvrInput.value.trim();

        

        // Find customer by CVR

        const customer = jsonData.customers.find(c => 

            c.customer_details.cvr_cpr == cvr || 

            c.customer_details.cvr_cpr === parseInt(cvr)

        );



        if (!customer) {

            showSingleError('Kan ikke finde CVR nummer i data');

            return;

        }



        // Filter active policies

        const activePolicies = customer.policies.filter(p => 

            p.status && p.status.toLowerCase() === 'active'

        );



        // Generate HTML email

        const emailHtml = generateEmailHtml(customer, activePolicies);

        

        // Download HTML file

        downloadHtmlFile(emailHtml, `forsikringsoverblik_${cvr}.html`);

    }


    // Download HTML file

    function downloadHtmlFile(content, filename) {

        const blob = new Blob([content], { type: 'text/html' });

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;

        a.download = filename;

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        URL.revokeObjectURL(url);

    }
    
    // Populate sent emails list on page load
    populateSentEmailsList();

});