// Utility functions
function round2Decimals(value) {
    return Math.round(value);
}

function convertToFloat(value) {
    if (value === undefined || value === null) return value;
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
}

function removeFirst8Chars(str) {
    return typeof str === 'string' ? str.slice(8) : str;
}

function removeNumbersAndSpecialChars(input) {
    if (typeof input !== 'string') {
        return ''; // Return empty string for non-string inputs instead of throwing error
    }

    // Use a regular expression to replace all non-alphabetical characters
    return input.replace(/[^a-zA-Z]/g, '');
}

function excelSerialToDate(serial) {
    if (!serial) return '';
    
    // Convert to number if it's a string
    const numSerial = typeof serial === 'string' ? parseFloat(serial) : serial;
    
    // Check if it's a valid number and likely to be a date (Excel serial dates are large numbers)
    if (!isNaN(numSerial) && numSerial > 1000) {
        // Excel's epoch starts at January 1, 1900
        const utcDate = new Date(Date.UTC(1900, 0, numSerial - 2));
        const day = String(utcDate.getUTCDate()).padStart(2, '0');
        const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
        const year = utcDate.getUTCFullYear();
        return `${day}-${month}-${year}`;
    }
    return serial || '';
}

// Process Marketing Consent data
function processMarketingConsent(dfMarketing) {
    console.log("Processing Marketing consent data...", dfMarketing ? dfMarketing.length : 0, "rows");
    
    if (!dfMarketing || !dfMarketing.length) {
        console.log("No Marketing consent data to process");
        return {};
    }

    // Create lookup object
    const marketingConsentLookup = {};
    
    dfMarketing.forEach(row => {
        // Check if CRN exists and is not empty
        if (row.CRN && String(row.CRN).trim() !== '') {
            const crn = String(row.CRN).trim();
            const hasConsent = row.MARKETING && String(row.MARKETING).trim() !== '';
            marketingConsentLookup[crn] = hasConsent;
        }
        // If CRN is empty, use customer name
        else if (row.CUSTOMER_NAME && String(row.CUSTOMER_NAME).trim() !== '') {
            const customerName = String(row.CUSTOMER_NAME).trim().toLowerCase();
            const hasConsent = row.MARKETING && String(row.MARKETING).trim() !== '';
            marketingConsentLookup[customerName] = hasConsent;
        }
    });
    
    console.log("Marketing consent lookup created for", Object.keys(marketingConsentLookup).length, "entries");
    return marketingConsentLookup;
}

// Process Ulykke/Sundhed data
function processUlykkeData(dfUlykke) {
    console.log("Processing Ulykke data...", dfUlykke ? dfUlykke.length : 0, "rows");
    
    if (!dfUlykke || !dfUlykke.length) {
        console.log("No Ulykke data to process");
        return [];
    }

    console.log("First 5 column names in your file:");
    const firstRow = dfUlykke[0];
    for (const key in firstRow) {
        console.log(`Column: "${key}" with value: "${firstRow[key]}"`);
    }
    
    // Debug: Log all column names to identify what's available
    const sampleRow = dfUlykke[0];
    console.log("Available columns:", Object.keys(sampleRow));
    console.log("First row sample:", sampleRow);
    
    // Map expected column names to possible alternatives
    const columnMappings = {
        'År': ['År', 'Ar', 'Year', 'AA', 'Å', 'YEAR'],
        'Produktbeskrivelse': ['Produktbeskrivelse', 'Produkt', 'Product', 'ProductType', 'Type'],
        'Policenummer': ['Policenummer', 'Police', 'PolicyNumber', 'Policy'],
        'Forsikringstager': ['Forsikringstager', 'Forsikringstagernavn', 'PolicyHolder', 'Name', 'Client'],
        'Cvr': ['Cvr', 'CVR', 'BusinessId', 'CompanyId'],
        'Årlig brutto præmie': ['Årlig brutto præmie', 'Præmie', 'Premium', 'GrossPremium', 'AnnualPremium'],
        'Måned': ['Måned', 'Maaned', 'Month', 'RenewalMonth'] // Added mapping for renewal month
    };
    
    // Danish month names mapping from numeric values
    const monthMap = {
        1: 'Januar',
        2: 'Februar',
        3: 'Marts',
        4: 'April',
        5: 'Maj',
        6: 'Juni',
        7: 'Juli',
        8: 'August',
        9: 'September',
        10: 'Oktober',
        11: 'November',
        12: 'December'
    };
    
    // Helper function to find the actual column name based on mappings
    function findColumn(row, mappings) {
        const result = {};
        for (const [expected, alternatives] of Object.entries(mappings)) {
            const foundColumn = alternatives.find(alt => alt in row);
            if (foundColumn) {
                result[expected] = foundColumn;
            } else {
                console.warn(`Could not find a match for expected column: ${expected}`);
            }
        }
        return result;
    }
    
    // Find actual column mappings from the first row
    const actualColumns = findColumn(sampleRow, columnMappings);
    console.log("Actual column mappings:", actualColumns);
    
    // Filter for only the newest year (2025) and exclude Gruppeulykke
    const filteredData = dfUlykke.filter(row => {
        // Use mapped column name for År
        const yearColumn = actualColumns['År'];
        const productColumn = actualColumns['Produktbeskrivelse'];
        
        if (!yearColumn || !productColumn) {
            console.warn("Missing critical columns for filtering");
            return false;
        }
        
        const år = parseInt(String(row[yearColumn]), 10);
        const produkt = String(row[productColumn] || '');
        
        // Debug info
        if (isNaN(år)) {
            console.log(`Invalid year format: "${row[yearColumn]}" in row:`, row);
        }
        
        const include = år === 2025 && !produkt.toLowerCase().includes('gruppeulykke');
        if (!include) {
            console.log(`Excluding: Year=${år}, Product=${produkt}`);
        }
        return include;
    });
    
    console.log("After filtering:", filteredData.length, "rows");
    
    if (filteredData.length === 0) {
        console.log("No valid policies found after filtering");
        return [];
    }
    
    // Transform to match existing structure
    const result = filteredData.map(row => {
        // Use mapped column names
        const policenumberColumn = actualColumns['Policenummer'];
        const productColumn = actualColumns['Produktbeskrivelse'];
        const nameColumn = actualColumns['Forsikringstager'];
        const cvrColumn = actualColumns['Cvr'];
        const premiumColumn = actualColumns['Årlig brutto præmie'];
        const monthColumn = actualColumns['Måned']; // Added month column
        
        // Parse premium
        let årsPræmie = premiumColumn ? row[premiumColumn] || '' : '';
        if (typeof årsPræmie === 'string') {
            årsPræmie = årsPræmie.replace(/\./g, '').replace(/,/g, '.').replace(/kr\./g, '').trim();
            årsPræmie = parseFloat(årsPræmie) || 0;
        }
        
        // Convert numeric month to Danish month name
        let hovedforfald = '';
        if (monthColumn && row[monthColumn] !== undefined && row[monthColumn] !== null) {
            // Convert to number if it's a string
            const monthNum = typeof row[monthColumn] === 'string' ? 
                parseInt(row[monthColumn], 10) : row[monthColumn];
            
            // Use the monthMap to get Danish month name
            if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                hovedforfald = monthMap[monthNum];
            }
        }
        
        const newRow = {
            Policenummer: policenumberColumn ? row[policenumberColumn] || '' : '',
            Produkt: productColumn ? row[productColumn] || '' : '',
            Forsikringstager_Navn: nameColumn ? (row[nameColumn] || '').toLowerCase() : '',
            original_name_format: nameColumn ? row[nameColumn] || '' : '', // Preserve original name format
            Forsikringstager_CVR: cvrColumn ? row[cvrColumn] || 'no cvr' : 'no cvr',
            Årspræmie: round2Decimals(årsPræmie),
            Hovedforfald: hovedforfald, // Use the converted month name
            Betalingsfrekvens: '', // Not available in source
            REG_NR: '',
            Sagsbehandler: '', // Not available in source
            Status: 'Active', // Assuming active by default
            Arbejdsområde: '',
            DB_KODE: '',
            Antal_ansatte: '',
        };
        
        return newRow;
    });
    
    console.log("Processed", result.length, "Ulykke/Sundhed policies");
    return result;
}

// Function to determine the main renewal date for a customer
function determineMainRenewalDate(policies) {
    // First, filter out policies with no Hovedforfald
    const policiesWithRenewalDate = policies.filter(p => 
        p.Hovedforfald && typeof p.Hovedforfald === 'string' && p.Hovedforfald.trim() !== '');
    
    // If no policies have renewal dates, return empty string
    if (policiesWithRenewalDate.length === 0) {
        return '';
    }
    
    // If customer has only one policy with a renewal date, use that
    if (policiesWithRenewalDate.length === 1) {
        return policiesWithRenewalDate[0].Hovedforfald;
    }
    
    // Count frequency of each renewal date
    const dateCounts = policiesWithRenewalDate.reduce((counts, policy) => {
        const date = policy.Hovedforfald;
        counts[date] = (counts[date] || 0) + 1;
        return counts;
    }, {});
    
    // Find the most frequent date(s)
    let maxCount = 0;
    let mostFrequentDates = [];
    
    for (const [date, count] of Object.entries(dateCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostFrequentDates = [date];
        } else if (count === maxCount) {
            mostFrequentDates.push(date);
        }
    }
    
    // If there's only one most frequent date, return it
    if (mostFrequentDates.length === 1) {
        return mostFrequentDates[0];
    }
    
    // Tiebreaker 1: Earliest Oprettelsesdato
    // Filter policies to only include those with one of the most frequent dates
    const candidatePolicies = policiesWithRenewalDate.filter(p => 
        mostFrequentDates.includes(p.Hovedforfald));
    
    // Separate policies with and without creation dates
    const policiesWithDate = candidatePolicies.filter(p => 
        p.Oprettelses_Dato && typeof p.Oprettelses_Dato === 'string' && p.Oprettelses_Dato.trim() !== '');
    
    // If we have any policies with creation dates, use those for the tiebreaker
    if (policiesWithDate.length > 0) {
        // Sort by Oprettelsesdato (parse dates for comparison)
        const sortedByCreationDate = [...policiesWithDate].sort((a, b) => {
            const dateA = a.Oprettelses_Dato.split('-').reverse().join('-');
            const dateB = b.Oprettelses_Dato.split('-').reverse().join('-');
            return dateA.localeCompare(dateB);
        });
        
        const earliestDate = sortedByCreationDate[0].Oprettelses_Dato;
        
        // Find all policies with this earliest creation date
        const policiesWithEarliestDate = policiesWithDate.filter(p => 
            p.Oprettelses_Dato === earliestDate);
        
        // If only one policy has the earliest date, return its renewal date
        if (policiesWithEarliestDate.length === 1) {
            return policiesWithEarliestDate[0].Hovedforfald;
        }
        
        // Tiebreaker 2: Highest premium among policies with earliest creation date
        return [...policiesWithEarliestDate]
            .sort((a, b) => (b.Årspræmie || 0) - (a.Årspræmie || 0))[0].Hovedforfald;
    }
    
    // If no policies have creation dates, use premium as the tiebreaker for all candidate policies
    // Make sure there is at least one policy with a premium value
    const policiesWithPremium = candidatePolicies.filter(p => 
        p.Årspræmie !== undefined && p.Årspræmie !== null && p.Årspræmie !== '');
    
    if (policiesWithPremium.length > 0) {
        return [...policiesWithPremium]
            .sort((a, b) => (b.Årspræmie || 0) - (a.Årspræmie || 0))[0].Hovedforfald;
    }
    
    // Last resort: just return the first policy's Hovedforfald if we have no better criteria
    return candidatePolicies[0].Hovedforfald;
}

// Main data processing function
function processData(dfAXA, dfN, dfK, dfUlykke, dfMarketing) {
    // Check for valid input data
    if (!dfAXA || !Array.isArray(dfAXA) || !dfN || !Array.isArray(dfN) || 
        !dfK || !Array.isArray(dfK)) {
        console.error("Invalid input data:", 
            { axaLength: dfAXA?.length, naersikringLength: dfN?.length, kundeLength: dfK?.length });
        return [];
    }

    const LB_medarbejdere = ["flfa_lb", "jlar_lb", "mapk_lb", "naas_lb", "rovi_lb","adrb_lb"];

    let replacements_sagsbehandler = {
        "flemmingfalkengaard": "flfa_lb",
        "nilsaaskilde": "naas_lb",
        "ronjastterauvikjr": "rovi_lb",
        "jakobnymandlarsen": "jlar_lb",
        "kevinfitzgeraldfratrdt": "kevfit",
        "mariapskesen": "mapk_lb",
    };

    // Process Nærsikring data
    dfN = dfN.map(row => ({
        ...row,
        original_name_format: row.Navnelabel ? removeFirst8Chars(row.Navnelabel) : '', // Preserve original name format
        Navnelabel: row.Navnelabel ? removeFirst8Chars(row.Navnelabel).toLowerCase() : '',
        'CVRnr.': row['CVRnr.'] || 'no cvr',
        Produkt: "Arbejdsskadeforsikring",
        REG_NR: "",
        Sagsbehandler: row.Provisionsmodtager1 ? 
            removeNumbersAndSpecialChars(row.Provisionsmodtager1).toLowerCase().replace(
                /flemmingfalkengaard|nilsaaskilde|ronjastterauvikjr|jakobnymandlarsen|kevinfitzgeraldfratrdt|mariapskesen/g, 
                (matched) => replacements_sagsbehandler[matched]) : '',
        DB_KODE: row['DB25-Erhverv'] && row['DB25-Nr'] ? `${row['DB25-Erhverv']} - ${row['DB25-Nr']}` : '',
        Status: "Active",
    }));

    // Process AXA data - Include all new columns
    dfAXA = dfAXA.map(row => ({
        ...row, // Keep all original fields
        original_name_format: row.FORSIKRINGSTAGER_NAVN || '', // Preserve original name format
        FORSIKRINGSTAGER_NAVN: (row.FORSIKRINGSTAGER_NAVN || '').toLowerCase(),
        FORSIKRINGSTAGER_CVR: row.FORSIKRINGSTAGER_CVR || 'no cvr',
        BETALINGSTERMIN: {
            "Annual (no fee)": "1 ÅR",
            "Quarterly (8% additional fee)": "3 MD",
            "Half-yearly (5% additional fee)": "6 MD",
            "Monthly": "1 MD"
        }[row.BETALINGSTERMIN] || row.BETALINGSTERMIN,
        DREJEDATO_MAANED: {
            "January": "Januar",
            "February": "Februar",
            "March": "Marts",
            "May": "Maj",
            "June": "Juni",
            "July": "Juli",
            "October": "Oktober"
        }[row.DREJEDATO_MAANED] || row.DREJEDATO_MAANED,
        Selvrisiko: "",
        Arbejdsområde: "",
        POLICE_NR: row.POLICE_NR ? 
            convertToFloat(String(row.POLICE_NR).replace(/^1031170000/, '')) : '',
        AARLIG_PRAEMIE: row.AARLIG_PRAEMIE ? round2Decimals(row.AARLIG_PRAEMIE) : 0
    }));

    // Create new Policedata with all fields from AXA data
    const axaData = dfAXA.map(row => ({
        Policenummer: row.POLICE_NR,
        Produkt: row.PRODUKT === "HDI Produkt SME" ? row.MASTER_POLICE_NAVN : row.PRODUKT,
        Forsikringstager_Navn: row.FORSIKRINGSTAGER_NAVN,
        original_name_format: row.original_name_format, // Keep the original format
        Forsikringstager_CVR: row.FORSIKRINGSTAGER_CVR,
        Årspræmie: row.AARLIG_PRAEMIE,
        Hovedforfald: row.DREJEDATO_MAANED,
        Betalingsfrekvens: row.BETALINGSTERMIN,
        REG_NR: row.REG_NR,
        Sagsbehandler: row.SAGSBEHANDLER,
        Status: row.STATUS,
        Arbejdsområde: row.Arbejdsområde,
        DB_KODE: row.DB_KODE,
        Antal_ansatte: "",
        Master_Police_Navn: row.MASTER_POLICE_NAVN,
        "Dato for gennemgang": "",
        // New fields from AXA data
        Saelger: row.SAELGER,
        Brand: row.BRAND,
        Medlemsgruppe: row.MEDLEMSGRUPPE,
        Org_ID: row.ORG_ID,
        Oprettelses_Dato: row.OPRETTELSES_DATO,
        Police_Ikraft_Dato: row.POLICE_IKRAFT_DATO,
        Naeste_Drejedato: row.NAESTE_DREJEDATO,
        Opsigelses_Dato: row.OPSIGELSES_DATO,
        Ekstern_Police_Nr: row.EKSTERN_POLICE_NR,
        Ekstern_Kunde_Nr: row.EKSTERN_KUNDE_NR,
        Master_Police_ID: row.MASTER_POLICE_ID,
        Fire_Sum: row.FIRE_SUM,
        Water_Sum: row.WATER_SUM,
        Theft_Sum: row.THEFT_SUM,
        BI_Sum: row.BI_SUM,
        Square_Meters: row.SQUARE_METERS,
        Insured_Location: row.INSURED_LOCATION,
        Turnover: row.TURNOVER,
        Employee_Category: row.EMPLOYEE_CATEGORY
    }));

    const naersikringData = dfN.map(row => ({
        Policenummer: row['Policenr.'],
        Produkt: row.Produkt,
        Forsikringstager_Navn: row.Navnelabel,
        original_name_format: row.original_name_format, // Keep the original format
        Forsikringstager_CVR: row['CVRnr.'],
        Årspræmie: row['Årspræmie (Police)'],
        Hovedforfald: row.Hovedforfald,
        Betalingsfrekvens: row.Frekvens,
        REG_NR: row.REG_NR,
        Sagsbehandler: row.Sagsbehandler,
        Status: row.Status,
        Arbejdsområde: row.Arbejdsområde,
        DB_KODE: row.DB_KODE,
        Antal_ansatte: row["Antal heltidsansatte ialt"],
        // Empty values for AXA-specific fields
        Saelger: "",
        Brand: "",
        Medlemsgruppe: "",
        Org_ID: "",
        Oprettelses_Dato: "",
        Police_Ikraft_Dato: "",
        Naeste_Drejedato: "",
        Opsigelses_Dato: "",
        Ekstern_Police_Nr: "",
        Ekstern_Kunde_Nr: "",
        Master_Police_ID: "",
        Fire_Sum: "",
        Water_Sum: "",
        Theft_Sum: "",
        BI_Sum: "",
        Square_Meters: "",
        Insured_Location: "",
        Turnover: "",
        Employee_Category: "",
        Master_Police_Navn: "",
    }));

    // Process and add Ulykke data if available
    const ulykkeBaseData = dfUlykke ? processUlykkeData(dfUlykke) : [];
    
    // Add empty fields for AXA-specific columns to Ulykke data
    const ulykkeData = ulykkeBaseData.map(row => ({
        ...row,
        Saelger: "",
        Brand: "",
        Medlemsgruppe: "",
        Org_ID: "",
        Oprettelses_Dato: "",
        Police_Ikraft_Dato: "",
        Naeste_Drejedato: "",
        Opsigelses_Dato: "",
        Ekstern_Police_Nr: "",
        Ekstern_Kunde_Nr: "",
        Master_Police_ID: "",
        Fire_Sum: "",
        Water_Sum: "",
        Theft_Sum: "",
        BI_Sum: "",
        Square_Meters: "",
        Insured_Location: "",
        Turnover: "",
        Employee_Category: "",
        Master_Police_Navn: "",
    }));

    console.log("AXA Policies:", axaData.length);
    console.log("Nærsikring Policies:", naersikringData.length);
    console.log("Ulykke/Sundhed Policies:", ulykkeData.length);

    // Combine all data sources
    let Policedata = [...axaData, ...naersikringData, ...ulykkeData];

    console.log("Total combined policies before filtering inactive and new:", Policedata.length);

    // Filter out inactive and new policies
    Policedata = Policedata.filter(row => {
        // Case-insensitive check for status
        const status = row.Status && row.Status.toLowerCase();
        return !(status === 'inactive' || status === 'new');
    });

    console.log("Total combined policies after filtering inactive and new:", Policedata.length);

    // Process customer data to create lookup maps for CPR and CVR by name
    const cprByName = {};
    const cvrByName = {};
    const originalFormatByName = {}; 
    const addressByName = {}; // New mapping for addresses
        
    if (dfK && Array.isArray(dfK)) {
        dfK.forEach(row => {
            // Check if we have a name
            if (row.NAME) {
                const name = row.NAME.toLowerCase();
                const originalFormat = row.NAME; // Preserve original format
                
                // Map CPR by name if SSN exists
                if (row.SSN) {
                    cprByName[name] = row.SSN;
                }
                
                // Map CVR by name if CRN exists
                if (row.CRN) {
                    cvrByName[name] = row.CRN;
                }
                
                // Map original format by lowercase name
                originalFormatByName[name] = originalFormat;
                
                // Format address information
                if (row.ADDRESS1) {
                    // Format: "ADDRESS1, POSTAL_CODE CITY"
                    const address1 = row.ADDRESS1 || '';
                    const postalCode = row.POSTAL_CODE || '';
                    const city = row.CITY || '';
                    
                    // Only create address if at least ADDRESS1 is available
                    if (address1.trim() !== '') {
                        let formattedAddress = address1;
                        
                        // Add postal code and city if available
                        if (postalCode.trim() !== '' || city.trim() !== '') {
                            formattedAddress += ', ' + [postalCode, city].filter(Boolean).join(' ');
                        }
                        
                        addressByName[name] = formattedAddress;
                    }
                }
            }
        });
    }

    console.log("Created CPR lookup for", Object.keys(cprByName).length, "customers");
    console.log("Created CVR lookup for", Object.keys(cvrByName).length, "customers");
    console.log("Created name format lookup for", Object.keys(originalFormatByName).length, "customers");
    console.log("Created address lookup for", Object.keys(addressByName).length, "customers");

    // Prepare selected customer data for matching
    const dfKSelected = dfK.map(row => ({
        CRN: (row.CRN || '').toString(),
        SSN: (row.SSN || '').toString(),
        NAME: (row.NAME || ''),
        NAME_LOWER: (row.NAME || '').toLowerCase(), // Add lowercase version
        "MOBILE_PHONE": row.MOBILE_PHONE || '',
        "PRIMARY_EMAIL": row.PRIMARY_EMAIL || '' // Add email field
    }));

    Policedata = Policedata.map(row => {
        // FIX: Added null check before calling toString()
        const cvr = row.Forsikringstager_CVR || 'no cvr';
        const cvrStr = typeof cvr === 'string' ? cvr : cvr.toString();
        const name = row.Forsikringstager_Navn ? row.Forsikringstager_Navn.toLowerCase() : '';
        
        // Find matching customer row
        const matchingKRow = dfKSelected.find(kRow => kRow.CRN === cvrStr || 
            (cvrStr === 'no cvr' && kRow.NAME_LOWER === name));
        
        // Determine CVR_CPR value with multiple fallbacks
        let identifierValue = '';
        
        // First try: Use existing CVR if available
        if (cvrStr !== 'no cvr') {
            identifierValue = cvrStr;
        } 
        // Second try: Get CPR from customer data
        else if (matchingKRow && matchingKRow.SSN) {
            identifierValue = matchingKRow.SSN;
        }
        // Third try: Look up CPR by name
        else if (name && cprByName[name]) {
            identifierValue = cprByName[name];
        }
        // Fourth try: Look up CVR by name
        else if (name && cvrByName[name]) {
            identifierValue = cvrByName[name];
        }
        
        // Get the properly formatted name with priority order
        let formattedName = row.original_name_format;
        
        if (!formattedName && matchingKRow) {
            formattedName = matchingKRow.NAME;
        } else if (!formattedName && originalFormatByName[name]) {
            formattedName = originalFormatByName[name];
        } else if (!formattedName) {
            formattedName = name;
        }
        
        // Get the address with priority order
        let kunde_address = '';
        
        // First try: Get address from customer data if matched by CVR/name
        if (matchingKRow && matchingKRow.ADDRESS1) {
            const address1 = matchingKRow.ADDRESS1 || '';
            const postalCode = matchingKRow.POSTAL_CODE || '';
            const city = matchingKRow.CITY || '';
            
            if (address1.trim() !== '') {
                kunde_address = address1;
                if (postalCode.trim() !== '' || city.trim() !== '') {
                    kunde_address += ', ' + [postalCode, city].filter(Boolean).join(' ');
                }
            }
        } 
        // Second try: Look up address by name
        else if (name && addressByName[name]) {
            kunde_address = addressByName[name];
        }
        
        return {
            ...row,
            // Store the determined identifier value
            CVR_CPR: identifierValue,
            navn_formateret: formattedName,
            kunde_address: kunde_address,
            "Telefon mobil": matchingKRow && matchingKRow.MOBILE_PHONE ? 
                convertToFloat(matchingKRow.MOBILE_PHONE.replace(/\s/g, '')) : null,
            "Email": matchingKRow && matchingKRow.PRIMARY_EMAIL ? 
                matchingKRow.PRIMARY_EMAIL : null // Add email field
        };
    });

    // Add number of policies per CVR/CPR/name
    const identifierCounts = Policedata.reduce((acc, row) => {
        // Use CVR_CPR field if available, otherwise use name
        const identifier = row.CVR_CPR || row.Forsikringstager_Navn;
        acc[identifier] = (acc[identifier] || 0) + 1;
        return acc;
    }, {});

    Policedata = Policedata.map(row => {
        const identifier = row.CVR_CPR || row.Forsikringstager_Navn;
        return {
            ...row,
            Antal_Policer: identifierCounts[identifier] || 1  // Default to 1 if not found
        };
    });

    // Group policies by customer identifier
    const policiesByIdentifier = Policedata.reduce((groups, policy) => {
        const identifier = policy.CVR_CPR || policy.Forsikringstager_Navn;
        if (!groups[identifier]) groups[identifier] = [];
        groups[identifier].push(policy);
        return groups;
    }, {});

    // Determine main renewal date for each customer
    const mainRenewalDateByIdentifier = {};
    for (const [identifier, policies] of Object.entries(policiesByIdentifier)) {
        mainRenewalDateByIdentifier[identifier] = determineMainRenewalDate(policies);
    }

    // Apply main renewal date to all policies
    Policedata = Policedata.map(row => {
        const identifier = row.CVR_CPR || row.Forsikringstager_Navn;
        return {
            ...row,
            Hovedforfald_Kunde: mainRenewalDateByIdentifier[identifier] || ''
        };
    });

    function convertIfNumeric(value) {
        if (value === undefined || value === null) return '';
        if (/^\d+$/.test(String(value))) {
          return parseInt(value, 10);
        } else {
          return value;
        }
    }

    // Reorder columns with all new fields included
    Policedata = Policedata.map(row => ({
        CVR_CPR: convertIfNumeric(row.CVR_CPR),
        Forsikringstager_Navn: row.Forsikringstager_Navn || '',
        navn_formateret: row.navn_formateret || '',
        kunde_address: row.kunde_address || '',  // Add the address field here
        Policenummer: row.Policenummer || '',
        Antal_Policer: row.Antal_Policer || 0,
        Produkt: row.Produkt || '',
        Årspræmie: row.Årspræmie || 0,
        Hovedforfald: row.Hovedforfald || '',
        Hovedforfald_Kunde: row.Hovedforfald_Kunde || '',
        Betalingsfrekvens: row.Betalingsfrekvens || '',
        REG_NR: row.REG_NR || '',
        Sagsbehandler: row.Sagsbehandler || '',
        Status: row.Status || '',
        Arbejdsområde: row.Arbejdsområde || '',
        DB_KODE: row.DB_KODE || '',
        Antal_ansatte: row.Antal_ansatte || '',
        Telefon_Mobil: row["Telefon mobil"] || '',
        Email: row.Email || '',
        // Format date fields
        Saelger: row.Saelger || "",
        Brand: row.Brand || "",
        Medlemsgruppe: row.Medlemsgruppe || "",
        Org_ID: row.Org_ID || "",
        Oprettelses_Dato: excelSerialToDate(row.Oprettelses_Dato),
        Police_Ikraft_Dato: excelSerialToDate(row.Police_Ikraft_Dato),
        Naeste_Drejedato: excelSerialToDate(row.Naeste_Drejedato),
        Opsigelses_Dato: excelSerialToDate(row.Opsigelses_Dato),
        Ekstern_Police_Nr: row.Ekstern_Police_Nr || "",
        Ekstern_Kunde_Nr: row.Ekstern_Kunde_Nr || "",
        Master_Police_ID: row.Master_Police_ID || "",
        Master_Police_Navn: row.Master_Police_Navn || "",
        Fire_Sum: row.Fire_Sum || "",
        Water_Sum: row.Water_Sum || "",
        Theft_Sum: row.Theft_Sum || "",
        BI_Sum: row.BI_Sum || "",
        Square_Meters: row.Square_Meters || "",
        Insured_Location: (row.Insured_Location && row.Insured_Location.length >= 6) ? row.Insured_Location : "",
        Turnover: row.Turnover || "",
        Employee_Category: row.Employee_Category || ""
    }));

    return Policedata;
}

// Function to handle file upload
function handleFileUpload(file, callback) {
    console.log("Handling file upload:", file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            console.log("Excel file sheets:", workbook.SheetNames);
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                console.error("No sheets found in Excel file");
                callback([]);
                return;
            }
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            if (!worksheet) {
                console.error("Worksheet not found");
                callback([]);
                return;
            }
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            console.log("Extracted data:", file.name, jsonData.length, "rows");
            callback(jsonData);
        } catch (error) {
            console.error("Error processing Excel file:", error);
            alert(`Error processing file ${file.name}: ${error.message}`);
            callback([]);
        }
    };
    
    reader.onerror = function(e) {
        console.error("FileReader error:", e);
        alert(`Error reading file ${file.name}`);
        callback([]);
    };
    
    reader.readAsArrayBuffer(file);
}

// Function to save data as JSON
function saveDataAsJSON(data) {
    // Check if data is valid
    if (!data) {
        console.error("No valid data to save");
        alert("No valid data to save as JSON");
        return;
    }

    // Handle both array format (original) and object format (structured)
    let hasValidData = false;
    if (Array.isArray(data) && data.length > 0) {
        hasValidData = true;
    } else if (data.customers && Array.isArray(data.customers) && data.customers.length > 0) {
        hasValidData = true;
    }

    if (!hasValidData) {
        console.error("No valid data to save");
        alert("No valid data to save as JSON");
        return;
    }
    
    try {
        // Convert data to JSON string with pretty formatting
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with current date
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        a.download = `Servicekoncept_${day}${month}${year}.json`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error("Error saving JSON file:", error);
        alert(`Error saving JSON file: ${error.message}`);
    }
}

// Helper function to determine marketing consent
function getMarketingConsent(policy, marketingConsentLookup) {
    // First try to match by CVR/CPR
    if (policy.CVR_CPR && String(policy.CVR_CPR).trim() !== '') {
        const cvrKey = String(policy.CVR_CPR).trim();
        if (marketingConsentLookup.hasOwnProperty(cvrKey)) {
            return marketingConsentLookup[cvrKey];
        }
    }
    
    // Then try to match by formatted name (case-insensitive)
    if (policy.navn_formateret && String(policy.navn_formateret).trim() !== '') {
        const nameKey = String(policy.navn_formateret).trim().toLowerCase();
        if (marketingConsentLookup.hasOwnProperty(nameKey)) {
            return marketingConsentLookup[nameKey];
        }
    }
    
    // Default to false if no match found
    return false;
}

// Function to transform data into structured customer-based JSON
function createStructuredCustomerData(data, dfMarketing) {
    console.log("createStructuredCustomerData called with data length:", data ? data.length : "undefined");
    
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.log("Invalid data input to createStructuredCustomerData");
        return { customers: [], metadata: { total_customers: 0, total_policies: 0 } };
    }

    console.log("Sample data item:", data[0]);
    
    // Process marketing consent data
    const marketingConsentLookup = processMarketingConsent(dfMarketing);

    try {
        // Group policies by customer name
        const customerGroups = data.reduce((groups, policy) => {
            const customerKey = policy.Forsikringstager_Navn || 'unknown';
            if (!groups[customerKey]) groups[customerKey] = [];
            groups[customerKey].push(policy);
            return groups;
        }, {});

        console.log("Customer groups created:", Object.keys(customerGroups).length, "customers");

        // Transform each customer group
        const customers = Object.entries(customerGroups).map(([customerName, policies]) => {
            const firstPolicy = policies[0]; // Use first policy for customer details
            
            // Calculate summary statistics
            const totalPolicies = policies.length;
            const totalAnnualPremium = policies.reduce((sum, p) => sum + (p.Årspræmie || 0), 0);
            const mainRenewalDate = firstPolicy.Hovedforfald_Kunde || '';
            
            // Find the most common case handler
            const handlerCounts = policies.reduce((counts, p) => {
                const handler = p.Sagsbehandler || 'unknown';
                counts[handler] = (counts[handler] || 0) + 1;
                return counts;
            }, {});
            const mostCommonHandler = Object.entries(handlerCounts)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

            // Clean policy data and consolidate Arbejdsskadeforsikring policies
            const cleanPolicies = [];
            const arbejdsskadeGroups = {};

            // First, separate Arbejdsskadeforsikring from other policies
            policies.forEach(policy => {
                if (policy.Produkt === "Arbejdsskadeforsikring") {
                    const policyNumber = policy.Policenummer;
                    if (!arbejdsskadeGroups[policyNumber]) {
                        arbejdsskadeGroups[policyNumber] = [];
                    }
                    arbejdsskadeGroups[policyNumber].push(policy);
                } else {
                    // Non-Arbejdsskadeforsikring policies - keep as they are
                    cleanPolicies.push({
                        policy_number: policy.Policenummer,
                        product: policy.Produkt,
                        annual_premium: policy.Årspræmie,
                        renewal_date: policy.Hovedforfald,
                        payment_frequency: policy.Betalingsfrekvens,
                        reg_nr: policy.REG_NR,
                        case_handler: policy.Sagsbehandler,
                        status: policy.Status,
                        work_area: policy.Arbejdsområde,
                        db_code: policy.DB_KODE,
                        number_of_employees: policy.Antal_ansatte,
                        // AXA specific fields
                        seller: policy.Saelger,
                        brand: policy.Brand,
                        member_group: policy.Medlemsgruppe,
                        org_id: policy.Org_ID,
                        creation_date: policy.Oprettelses_Dato,
                        policy_effective_date: policy.Police_Ikraft_Dato,
                        next_renewal_date: policy.Naeste_Drejedato,
                        cancellation_date: policy.Opsigelses_Dato,
                        external_policy_nr: policy.Ekstern_Police_Nr,
                        external_customer_nr: policy.Ekstern_Kunde_Nr,
                        master_policy_id: policy.Master_Policy_ID,
                        master_policy_name: policy.Master_Police_Navn,
                        fire_sum: policy.Fire_Sum,
                        water_sum: policy.Water_Sum,
                        theft_sum: policy.Theft_Sum,
                        bi_sum: policy.BI_Sum,
                        square_meters: policy.Square_Meters,
                        insured_location: policy.Insured_Location,
                        turnover: policy.Turnover,
                        employee_category: policy.Employee_Category
                    });
                }
            });

            // Process Arbejdsskadeforsikring groups
            Object.entries(arbejdsskadeGroups).forEach(([policyNumber, groupPolicies]) => {
                // Use the first policy as the base
                const basePolicy = groupPolicies[0];
                
                // Calculate totals
                const totalEmployees = groupPolicies.reduce((sum, p) => {
                    const employees = parseFloat(p.Antal_ansatte) || 0;
                    return sum + employees;
                }, 0);
                
                const totalPremium = groupPolicies.reduce((sum, p) => {
                    return sum + (p.Årspræmie || 0);
                }, 0);
        
                // Create work areas array
                const workAreas = groupPolicies.map(p => ({
                    area: p.Arbejdsområde || '',
                    employees: parseFloat(p.Antal_ansatte) || 0
                }));
                
                // Create consolidated policy
                const consolidatedPolicy = {
                    policy_number: basePolicy.Policenummer,
                    product: basePolicy.Produkt,
                    annual_premium: Math.round(totalPremium),
                    renewal_date: basePolicy.Hovedforfald,
                    payment_frequency: basePolicy.Betalingsfrekvens,
                    reg_nr: basePolicy.REG_NR,
                    case_handler: basePolicy.Sagsbehandler,
                    status: basePolicy.Status,
                    work_area: "", // Empty since it's now consolidated
                    db_code: basePolicy.DB_KODE,
                    number_of_employees: totalEmployees,
                    work_areas: workAreas, // New array with work area breakdown
                    // AXA specific fields (use base policy values)
                    seller: basePolicy.Saelger,
                    brand: basePolicy.Brand,
                    member_group: basePolicy.Medlemsgruppe,
                    org_id: basePolicy.Org_ID,
                    creation_date: basePolicy.Oprettelses_Dato,
                    policy_effective_date: basePolicy.Police_Ikraft_Dato,
                    next_renewal_date: basePolicy.Naeste_Drejedato,
                    cancellation_date: basePolicy.Opsigelses_Dato,
                    external_policy_nr: basePolicy.Ekstern_Police_Nr,
                    external_customer_nr: basePolicy.Ekstern_Kunde_Nr,
                    master_policy_id: basePolicy.Master_Policy_ID,
                    master_policy_name: basePolicy.Master_Police_Navn,
                    fire_sum: basePolicy.Fire_Sum,
                    water_sum: basePolicy.Water_Sum,
                    theft_sum: basePolicy.Theft_Sum,
                    bi_sum: basePolicy.BI_Sum,
                    square_meters: basePolicy.Square_Meters,
                    insured_location: basePolicy.Insured_Location,
                    turnover: basePolicy.Turnover,
                    employee_category: basePolicy.Employee_Category
                };
                
                cleanPolicies.push(consolidatedPolicy);
            });

            return {
                customer_name: customerName,
                customer_details: {
                    cvr_cpr: firstPolicy.CVR_CPR || '',
                    formatted_name: firstPolicy.navn_formateret || '',
                    address: firstPolicy.kunde_address || '',
                    phone: firstPolicy.Telefon_Mobil || '',
                    email: firstPolicy.Email || '',
                    marketing_consent: getMarketingConsent(firstPolicy, marketingConsentLookup)
                },
                summary: {
                    total_policies: cleanPolicies.length, // Updated to use cleanPolicies length
                    total_annual_premium: Math.round(totalAnnualPremium),
                    main_renewal_date: mainRenewalDate,
                    most_common_case_handler: mostCommonHandler
                },
                policies: cleanPolicies
            };
        });

        console.log("Customers transformed:", customers.length);

        // Sort customers by total annual premium (descending)
        customers.sort((a, b) => b.summary.total_annual_premium - a.summary.total_annual_premium);

        // Count policies by source
        const axaPolicies = data.filter(p => p.Saelger || p.Brand).length;
        const naersikringPolicies = data.filter(p => p.Produkt === "Arbejdsskadeforsikring").length;
        const ulykkePolicies = data.filter(p => 
            p.Produkt && !p.Saelger && !p.Brand && p.Produkt !== "Arbejdsskadeforsikring").length;

        // Create final structure
        const result = {
            customers: customers,
            metadata: {
                total_customers: customers.length,
                total_policies: data.length,
                export_date: new Date().toISOString(),
                processing_summary: {
                    axa_policies: axaPolicies,
                    naersikring_policies: naersikringPolicies,
                    ulykke_policies: ulykkePolicies
                }
            }
        };

        console.log("Final result structure:", result);
        return result;

    } catch (error) {
        console.error("Error in createStructuredCustomerData:", error);
        return { customers: [], metadata: { total_customers: 0, total_policies: 0 } };
    }
}

// Main function to initialize the application
function main() {
    let dfAXA, dfN, dfK, dfUlykke, dfMarketing;
    let processedData = [];
    let hasProcessed = false;
    let isProcessing = false;
    
    const fileInputs = {
        'fileAXA': document.getElementById('fileAXA'),
        'fileN': document.getElementById('fileN'),
        'fileK': document.getElementById('fileK'),
        'fileUlykke': document.getElementById('fileUlykke'),
        'fileMarketing': document.getElementById('fileMarketing')
    };

    const processButton = document.getElementById('processButton');
    const downloadButton = document.getElementById('downloadButton');

    function updateButtonStates() {
        const requiredFilesUploaded = Boolean(dfAXA && dfN && dfK);
        
        // Process Button State
        processButton.disabled = !requiredFilesUploaded || isProcessing;
        if (isProcessing) {
            processButton.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Behandler...';
            processButton.classList.remove('bg-gray-400', 'bg-green-600', 'hover:bg-green-700');
            processButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else if (!requiredFilesUploaded) {
            processButton.textContent = 'Mangler filer';
            processButton.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-gray-900', 'hover:bg-gray-800', 'bg-blue-600', 'hover:bg-blue-700');
            processButton.classList.add('bg-gray-400', 'cursor-not-allowed');
        } else if (hasProcessed) {
            processButton.textContent = 'Færdig!';
            processButton.classList.remove('bg-gray-400', 'bg-gray-900', 'hover:bg-gray-800', 'cursor-not-allowed', 'bg-blue-600', 'hover:bg-blue-700');
            processButton.classList.add('bg-green-600', 'hover:bg-green-700');
        } else {
            processButton.textContent = 'Processér Data';
            processButton.classList.remove('bg-gray-400', 'bg-green-600', 'hover:bg-green-700', 'cursor-not-allowed', 'bg-blue-600', 'hover:bg-blue-700');
            processButton.classList.add('bg-gray-900', 'hover:bg-gray-800');
        }

        // Download button state
        downloadButton.disabled = processedData.length === 0;
        if (processedData.length === 0) {
            downloadButton.classList.remove('bg-gray-900', 'hover:bg-gray-800');
            downloadButton.classList.add('bg-gray-400', 'cursor-not-allowed');
            downloadButton.textContent = 'Processér først data';
        } else {
            downloadButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
            downloadButton.classList.add('bg-gray-900', 'hover:bg-gray-800');
            downloadButton.textContent = 'Download JSON';
        }
    }

    Object.entries(fileInputs).forEach(([key, input]) => {
        // Skip if element doesn't exist
        if (!input) {
            console.error(`Element with ID '${key}' not found`);
            return;
        }
        
        input.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const label = document.getElementById(`label${key.replace('file', '')}`);
                if (label) {
                    label.textContent = file.name;
                    label.classList.remove('text-gray-500');
                    label.classList.add('text-green-600');
                }
    
                handleFileUpload(file, function(data) {
                    switch(key) {
                        case 'fileAXA': dfAXA = data; break;
                        case 'fileN': dfN = data; break;
                        case 'fileK': dfK = data; break;
                        case 'fileUlykke': dfUlykke = data; break;
                        case 'fileMarketing': dfMarketing = data; break;
                    }
                    hasProcessed = false; // Reset processed state when new files are uploaded
                    updateButtonStates();
                });
            }
        });
    });

    processButton.addEventListener('click', async function() {
        if (!processButton.disabled && !isProcessing) {
            isProcessing = true;
            updateButtonStates();
            
            // Wrap process in setTimeout to allow UI to update
            setTimeout(() => {
                try {
                    processedData = processData(dfAXA, dfN, dfK, dfUlykke, dfMarketing);
                    hasProcessed = true;
                    if (processedData.length === 0) {
                        alert('Ingen data blev genereret. Kontroller venligst dine input filer.');
                    }
                } catch (error) {
                    console.error('Processing error:', error);
                    alert('Der opstod en fejl under behandlingen af data: ' + error.message);
                } finally {
                    isProcessing = false;
                    updateButtonStates();
                }
            }, 50);
        }
    });

    downloadButton.addEventListener('click', function() {
        if (!downloadButton.disabled && processedData.length > 0) {
            try {
                // Transform data into structured format
                const structuredData = createStructuredCustomerData(processedData, dfMarketing);
                saveDataAsJSON(structuredData);
            } catch (error) {
                console.error('Error during JSON download:', error);
                alert('Der opstod en fejl under download af JSON-filen: ' + error.message);
            }
        }
    });

    // Initial button state update
    updateButtonStates();
    
    // Add error handling for XLSX library loading
    if (typeof XLSX === 'undefined') {
        console.error('XLSX library not loaded');
        alert('XLSX biblioteket kunne ikke indlæses. Genindlæs venligst siden.');
    }
}

// Initialize the application when the document is loaded
document.addEventListener('DOMContentLoaded', main);