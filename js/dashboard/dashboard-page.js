// Global functions that need to be accessible from other files (like advisors.js)
window.dashboardFunctions = window.dashboardFunctions || {};

document.addEventListener('DOMContentLoaded', function() {
    // Variables
    let salesGoals = {};
    let goalChart = null;
    let selectedCompany = 'hdi-axa';
    let selectedMonth = 'all';
    let loadedDataSource = "";
    let selectedCompanyAdvisor = 'hdi-axa';
    let selectedYear = '2025';
    let excludeMigratedSales = true;
    // List of allowed sagsbehandlere
    const allowedHandlers = ['flfa_lb', 'jlar_lb', 'rovi_lb', 'naas_lb', 'mapk_lb', 'kevfit', 'adrb'];
    
    // DOM Elements
    const dataSourceInfo = document.getElementById('data-source-info');
    const totalSalesYTDElement = document.getElementById('total-sales-ytd');
    const totalGoalFulfillmentElement = document.getElementById('total-goal-fulfillment');
    const avgMonthlySalesElement = document.getElementById('avg-monthly-sales');
    const projectedFulfillmentElement = document.getElementById('projected-fulfillment');
    
    // Navigation handled by shared/navigation.js
    
    // Use shared utilities from SalgstalUtils
    const getSalesDate = SalgstalUtils.getSalesDate;
    const formatCurrency = SalgstalUtils.formatCurrency;
    const getMonthYear = SalgstalUtils.getMonthYear;
    const formatDateForFilename = SalgstalUtils.formatDateForFilename;
    const mapSagsbehandlerToInitials = SalgstalUtils.mapSagsbehandlerToInitials;

    // Filter function that respects the excludeMigratedSales setting
    function filterMigratedSales(dataArray) {
        return SalgstalUtils.filterMigratedSales(dataArray, excludeMigratedSales);
    }
    
    // Sales goals and data loading handled by DataLoader

    function updateNaersikringInfoText() {
        const infoText = document.getElementById('naersikring-info-text');
        
        if (selectedCompany === 'nærsikring') {
            infoText.classList.remove('hidden');
        } else {
            infoText.classList.add('hidden');
        }
    }

    // mapSagsbehandlerToInitials is now imported from SalgstalUtils
    
    // Load data using DataLoader
    async function loadData() {
        const dataSourceInfo = document.getElementById('data-source-info');
        dataSourceInfo.textContent = "Henter data fra database...";

        try {
            // Use DataLoader to load all data and sales goals
            const result = await DataLoader.loadAll();

            // Store in local variables and global window
            window.data = result.data;
            window.nonConvertedData = result.nonConvertedData;
            window.afvisteData = result.afvisteData;
            salesGoals = result.salesGoals;

            // Update info text
            let statusText = ``;

            // Check for last updated timestamp
            if (result.metadata && result.metadata.lastUpdated) {
                const lastUpdated = new Date(result.metadata.lastUpdated);
                const options = {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                };
                const formattedDate = lastUpdated.toLocaleDateString('da-DK', options);
                statusText += ` — Opdateret: ${formattedDate}`;
            }

            dataSourceInfo.textContent = statusText;
            dataSourceInfo.classList.remove('text-red-600');

            // Initialize dashboard
            initializeDashboard();

        } catch (error) {
            console.error("Javascript fejl under opstart:", error);
            dataSourceInfo.textContent = `FEJL: ${error.message}`;
            dataSourceInfo.classList.add('text-red-600');
        }
    }
    
    function initializeDashboard() {
        // Set up company filter buttons
        initializeCompanyFilters();
        
        // Set up month filter buttons
        initializeMonthFilters();

        // Set up advisor company filter buttons
        initializeAdvisorCompanyFilters();

        // Set up year filter buttons
        initializeYearFilters();
        
        // NEW: Set up migrated sales toggle
        initializeMigratedSalesToggle();
        
        // Update goal comparison chart
        updateGoalComparisonChart();
        
        // Update product table
        updateProductTable();

        // Update advisor table
        updateAdvisorTable();
    }

    function initializeMigratedSalesToggle() {
        const checkbox = document.getElementById('exclude-migrated-checkbox');
        
        if (!checkbox) {
            console.error('Migrated sales checkbox not found');
            return;
        }
        
        // Set initial state
        checkbox.checked = excludeMigratedSales;
        
        // Add event listener
        checkbox.addEventListener('change', function() {
            excludeMigratedSales = this.checked;
            
            console.log('Migrated sales exclusion changed to:', excludeMigratedSales);
            
            // Update all dashboard components
            updateGoalComparisonChart();
            updateProductTable();
            updateAdvisorTable();
        });
    }
    
    function initializeCompanyFilters() {
        const buttons = document.querySelectorAll('.company-filter-btn');
        
        buttons.forEach(button => {
            const company = button.dataset.company;
            
            // Set initial active state
            if (company === selectedCompany) {
                setButtonActive(button, company);
            } else {
                setButtonInactive(button);
            }
            
            // Add click event
            button.addEventListener('click', function() {
                selectedCompany = company;
                
                // Update all buttons
                buttons.forEach(btn => {
                    if (btn.dataset.company === selectedCompany) {
                        setButtonActive(btn, selectedCompany);
                    } else {
                        setButtonInactive(btn);
                    }
                });
                
                // Update Nærsikring info text
                updateNaersikringInfoText();
                
                // Refresh chart
                updateGoalComparisonChart();
            });
        });
        
        // Initial call to set the correct info text state
        updateNaersikringInfoText();
    }
    
    function initializeMonthFilters() {
        const buttons = document.querySelectorAll('.month-filter-btn');
        
        buttons.forEach(button => {
            const month = button.dataset.month;
            
            // Set initial active state
            if (month === selectedMonth) {
                setMonthButtonActive(button);
            } else {
                setMonthButtonInactive(button);
            }
            
            // Add click event
            button.addEventListener('click', function() {
                selectedMonth = month;
                
                // Update all buttons
                buttons.forEach(btn => {
                    if (btn.dataset.month === selectedMonth) {
                        setMonthButtonActive(btn);
                    } else {
                        setMonthButtonInactive(btn);
                    }
                });
                
                // Refresh table
                updateProductTable();
            });
        });
    }
    
    function setButtonActive(button, company) {
        button.classList.remove('border-slate-300', 'text-slate-600', 'bg-white', 'hover:bg-slate-50');
        
        if (company === 'hdi') {
            button.classList.add('border-blue-600', 'text-white', 'bg-blue-600', 'hover:bg-blue-700');
        } else if (company === 'axa') {
            button.classList.add('border-red-600', 'text-white', 'bg-red-600', 'hover:bg-red-700');
        } else if (company === 'nærsikring') {
            button.classList.add('border-green-600', 'text-white', 'bg-green-600', 'hover:bg-green-700');
        } else if (company === 'hdi-axa') {
            button.classList.add('border-slate-800', 'text-white', 'bg-slate-800', 'hover:bg-slate-900');
        } else if (company === 'alle') {
            button.classList.add('border-purple-600', 'text-white', 'bg-purple-600', 'hover:bg-purple-700');
        } else {
            button.classList.add('border-slate-800', 'text-white', 'bg-slate-800', 'hover:bg-slate-900');
        }
    }
    
    function setButtonInactive(button) {
        button.className = 'company-filter-btn px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50';
    }
    
    function setMonthButtonActive(button) {
        button.classList.remove('border-slate-300', 'text-slate-600', 'bg-white', 'hover:bg-slate-50');
        button.classList.add('border-slate-800', 'text-white', 'bg-slate-800', 'hover:bg-slate-900');
    }

    function setMonthButtonInactive(button) {
        button.className = 'month-filter-btn px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50';
    }

    function initializeAdvisorCompanyFilters() {
        const buttons = document.querySelectorAll('.advisor-company-filter-btn');
        
        buttons.forEach(button => {
            const company = button.dataset.company;
            
            // Set initial active state
            if (company === selectedCompanyAdvisor) {
                setAdvisorCompanyButtonActive(button, company);
            } else {
                setAdvisorCompanyButtonInactive(button);
            }
            
            // Add click event
            button.addEventListener('click', function() {
                selectedCompanyAdvisor = company;
                
                // Update all buttons
                buttons.forEach(btn => {
                    if (btn.dataset.company === selectedCompanyAdvisor) {
                        setAdvisorCompanyButtonActive(btn, selectedCompanyAdvisor);
                    } else {
                        setAdvisorCompanyButtonInactive(btn);
                    }
                });
                
                // Refresh advisor table
                updateAdvisorTable();
            });
        });
    }

    function setAdvisorCompanyButtonActive(button, company) {
        button.classList.remove('border-slate-300', 'text-slate-600', 'bg-white', 'hover:bg-slate-50');
        
        if (company === 'hdi') {
            button.classList.add('border-blue-600', 'text-white', 'bg-blue-600', 'hover:bg-blue-700');
        } else if (company === 'axa') {
            button.classList.add('border-red-600', 'text-white', 'bg-red-600', 'hover:bg-red-700');
        } else if (company === 'nærsikring') {
            button.classList.add('border-green-600', 'text-white', 'bg-green-600', 'hover:bg-green-700');
        } else {
            button.classList.add('border-slate-800', 'text-white', 'bg-slate-800', 'hover:bg-slate-900');
        }
    }

    function setAdvisorCompanyButtonInactive(button) {
        button.className = 'advisor-company-filter-btn px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50';
    }

    function initializeYearFilters() {
        const buttons = document.querySelectorAll('.year-filter-btn');
        
        buttons.forEach(button => {
            const year = button.dataset.year;
            
            // Set initial active state
            if (year === selectedYear) {
                setYearButtonActive(button);
            } else {
                setYearButtonInactive(button);
            }
            
            // Add click event
            button.addEventListener('click', function() {
                selectedYear = year;
                
                // Update all buttons
                buttons.forEach(btn => {
                    if (btn.dataset.year === selectedYear) {
                        setYearButtonActive(btn);
                    } else {
                        setYearButtonInactive(btn);
                    }
                });
                
                // Refresh advisor table
                updateAdvisorTable();
            });
        });
    }

    function setYearButtonActive(button) {
        button.classList.remove('border-slate-300', 'text-slate-600', 'bg-white', 'hover:bg-slate-50');
        button.classList.add('border-slate-800', 'text-white', 'bg-slate-800', 'hover:bg-slate-900');
    }

    function setYearButtonInactive(button) {
        button.className = 'year-filter-btn px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50';
    }

    function updateAdvisorTable() {
        console.log("=== UPDATEADVISORTABLE START ===");
        console.log("Selected company:", selectedCompanyAdvisor);
        console.log("Selected year:", selectedYear);
        
        // Filter data by selected company (same logic as goal comparison chart)
        let filteredByCompany;
        if (selectedCompanyAdvisor === 'hdi-axa') {
            // HDI + AXA only, exclude Nærsikring
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && 
                (item.MASTER_POLICE_NAVN.startsWith("HDI") || 
                (!item.MASTER_POLICE_NAVN.startsWith("Nærsikring")))
            );
        } else if (selectedCompanyAdvisor === 'hdi') {
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && item.MASTER_POLICE_NAVN.startsWith("HDI")
            );
        } else if (selectedCompanyAdvisor === 'axa') {
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && 
                !item.MASTER_POLICE_NAVN.startsWith("HDI") && 
                !item.MASTER_POLICE_NAVN.startsWith("Nærsikring")
            );
        } else if (selectedCompanyAdvisor === 'nærsikring') {
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && item.MASTER_POLICE_NAVN.startsWith("Nærsikring")
            );
        } else if (selectedCompanyAdvisor === 'alle') {
            // All data including HDI + AXA + Nærsikring
            filteredByCompany = data;
        }
        
        // NEW: Apply migrated sales filter
        const filteredData = filterMigratedSales(filteredByCompany);
        
        console.log("Data counts after company filter:", filteredByCompany.length);
        console.log("Data counts after migrated sales filter:", filteredData.length, "(excludeMigratedSales:", excludeMigratedSales + ")");
        
        // Filter by selected year
        const salesDataForYear = filteredData.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') {
                return false;
            }
            const year = new Date(salesDate).getFullYear();
            return year === parseInt(selectedYear);
        });
        
        console.log(`Data count for ${selectedCompanyAdvisor} in ${selectedYear}:`, salesDataForYear.length);
        
        // Group data by month and advisor
        const advisorStats = {};
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
        
        // Initialize advisor stats for all months
        months.forEach(month => {
            advisorStats[month] = {};
            allowedHandlers.forEach(handler => {
                advisorStats[month][handler] = { count: 0, premium: 0 };
            });
            advisorStats[month]['andre'] = { count: 0, premium: 0 };
        });
        
        // Process sales data
        salesDataForYear.forEach(item => {
            const salesDate = getSalesDate(item);
            const monthYear = getMonthYear(salesDate);
            
            if (!monthYear) return;
            
            const month = monthYear.split('-')[1];
            const rawAdvisor = item.SAGSBEHANDLER || '';
            const mappedAdvisor = mapSagsbehandlerToInitials(rawAdvisor);
            const premium = Number(item.AARLIG_PRAEMIE) || 0;
            
            console.log(`Processing: ${rawAdvisor} → ${mappedAdvisor}, Premium: ${premium}`);
            
            if (allowedHandlers.includes(mappedAdvisor)) {
                advisorStats[month][mappedAdvisor].count++;
                advisorStats[month][mappedAdvisor].premium += premium;
            } else {
                advisorStats[month]['andre'].count++;
                advisorStats[month]['andre'].premium += premium;
            }
        });
        
        // Calculate totals for each advisor (vertical totals)
        const advisorTotals = {};
        allowedHandlers.forEach(handler => {
            advisorTotals[handler] = 0;
        });
        advisorTotals['andre'] = 0;
        
        months.forEach(month => {
            allowedHandlers.forEach(handler => {
                advisorTotals[handler] += advisorStats[month][handler].premium;
            });
            advisorTotals['andre'] += advisorStats[month]['andre'].premium;
        });
        
        // Build table
        const tableBody = document.getElementById('advisor-table-body');
        tableBody.innerHTML = '';
        
        months.forEach((month, index) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-100 hover:bg-slate-50';
            
            let rowHTML = `<td class="py-3 px-2 text-slate-900 font-medium whitespace-nowrap">${monthNames[index]}</td>`;
            
            // Calculate monthly total (horizontal total)
            let monthlyTotal = 0;
            
            // Add columns for each allowed handler (in the same order as headers)
            allowedHandlers.forEach(handler => {
                const stats = advisorStats[month][handler];
                rowHTML += `<td class="py-3 px-2 text-right text-slate-900 whitespace-nowrap">${formatCurrency(stats.premium)}</td>`;
                monthlyTotal += stats.premium;
            });
            
            // Add "andre" column
            const andreStats = advisorStats[month]['andre'];
            rowHTML += `<td class="py-3 px-2 text-right text-slate-900 whitespace-nowrap">${formatCurrency(andreStats.premium)}</td>`;
            monthlyTotal += andreStats.premium;
            
            // Add monthly total column with gray background
            rowHTML += `<td class="py-3 px-2 text-right text-slate-900 font-semibold bg-slate-100 whitespace-nowrap">${formatCurrency(monthlyTotal)}</td>`;
            
            row.innerHTML = rowHTML;
            tableBody.appendChild(row);
        });
        
        // Add totals row at the bottom
        const totalsRow = document.createElement('tr');
        totalsRow.className = 'border-t-2 border-slate-300 bg-slate-100';
        
        let totalsHTML = `<td class="py-3 px-2 text-slate-900 font-bold whitespace-nowrap">Total</td>`;
        
        // Calculate grand total
        let grandTotal = 0;
        
        // Add total for each advisor
        allowedHandlers.forEach(handler => {
            totalsHTML += `<td class="py-3 px-2 text-right text-slate-900 font-semibold whitespace-nowrap">${formatCurrency(advisorTotals[handler])}</td>`;
            grandTotal += advisorTotals[handler];
        });
        
        // Add total for "andre"
        totalsHTML += `<td class="py-3 px-2 text-right text-slate-900 font-semibold whitespace-nowrap">${formatCurrency(advisorTotals['andre'])}</td>`;
        grandTotal += advisorTotals['andre'];
        
        // Add grand total
        totalsHTML += `<td class="py-3 px-2 text-right text-slate-900 font-bold whitespace-nowrap">${formatCurrency(grandTotal)}</td>`;
        
        totalsRow.innerHTML = totalsHTML;
        tableBody.appendChild(totalsRow);
        
        console.log("Final advisor stats:", advisorStats);
        console.log("Advisor totals:", advisorTotals);
        console.log("Grand total:", grandTotal);
        console.log("=== UPDATEADVISORTABLE END ===");
    }
    

    function filterDataByMonth(data, month) {
        if (month === 'all') return data;
        
        return data.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            
            const monthYear = getMonthYear(salesDate);
            if (!monthYear) return false;
            
            const itemMonth = monthYear.split('-')[1];
            return itemMonth === month;
        });
    }

    // Function to map MASTER_POLICE_NAVN to simplified product names
    function mapProductName(masterPoliceName) {
        window.dashboardFunctions.mapProductName = mapProductName;

        if (!masterPoliceName) return 'Ukendt';
        
        // Bilforsikring
        if (masterPoliceName === 'LB Master Bil - Pakke' || masterPoliceName === 'LB Master Bil - MIG PROD') {
            return 'Bilforsikring';
        }
        
        // Løsøreforsikring
        if (masterPoliceName === 'LB Master Løsøre - Pakke' || masterPoliceName === 'LB Master Løsøre - MIG PROD') {
            return 'Løsøreforsikring';
        }
        
        // Erhvervsansvar (note: "Erhversansvar" without 'v' in the data)
        if (masterPoliceName === 'LB Master Erhversansvar - Pakke' || masterPoliceName === 'LB Master Erhversansvar - MIG PROD') {
            return 'Erhvervsansvar';
        }
        
        // Bygning
        if (masterPoliceName === 'LB Master Bygning - Pakke' || masterPoliceName === 'LB Master Bygning - MIG PROD') {
            return 'Bygning';
        }
        
        // Retshjælp
        if (masterPoliceName === 'LB Master Retshjælp - Pakke' || masterPoliceName === 'LB Master Retshjælp - MIG PROD') {
            return 'Retshjælp';
        }
        
        // Trailer
        if (masterPoliceName === 'LB Master Trailer - Pakke' || masterPoliceName === 'LB Master Trailer - MIG PROD') {
            return 'Trailer';
        }
        
        // Nøgleperson
        if (masterPoliceName === 'HDI - Nøgleperson' || masterPoliceName === 'HDI - Nøgleperson - MIG PROD') {
            return 'Nøgleperson';
        }
        
        // Prof. ansvar
        if (masterPoliceName === 'HDI - Professionel ansvarsforsikring') {
            return 'Prof. ansvar';
        }
        
        // Prof. ansvar IT
        if (masterPoliceName === 'HDI - Professionel ansvarsforsikring- IT') {
            return 'Prof. ansvar IT';
        }
        
        // Netbank
        if (masterPoliceName === 'HDI - Netbankforsikring') {
            return 'Netbank';
        }
        
        // Bestyrelsesansvar
        if (masterPoliceName === 'HDI - Bestyrelsesansvar') {
            return 'Bestyrelsesansvar';
        }
        
        // Erhvervsrejse Årsrejse
        if (masterPoliceName === 'HDI - Erhvervsrejse Årsrejse') {
            return 'Erhvervsrejse Årsrejse';
        }
        
        // Erhvervsrejse indiviuel
        if (masterPoliceName === 'HDI - Erhvervsrejse individuel') {
            return 'Erhvervsrejse individuel';
        }
        // Kollektiv Ulykke (note: "ulykkeforsikring" not "ulykkesforsikring")
        if (masterPoliceName === 'HDI - Kollektiv ulykkeforsikring') {
            return 'Kollektiv Ulykke';
        }
        
        // Arbejdsskadeforsikring
        if (masterPoliceName === 'Nærsikring - Arbejdsskadeforsikring') {
            return 'Arbejdsskadeforsikring';
        }
        
        // Return original name if no mapping found
        return masterPoliceName;
    }

    // Find updateProductTable function and replace it with this version that includes detailed logging

    function updateProductTable() {
        console.log("=== UPDATEPRODUCTTABLE START ===");
        console.log("Total datasets:", {
            data: data.length,
            nonConvertedData: nonConvertedData.length,
            afvisteData: afvisteData.length
        });
        
        // Log samples from each dataset to understand structure
        console.log("Sample from data (converted):", data.slice(0, 2));
        console.log("Sample from nonConvertedData:", nonConvertedData.slice(0, 2));
        console.log("Sample from afvisteData:", afvisteData.slice(0, 2));
        
        // Filter data by 2025 first, then by selected month
        console.log("=== FILTERING DATA BY YEAR 2025 ===");
        
        const salesData2025 = data.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') {
                console.log("Filtered out data item (no date):", item.PRODUKT);
                return false;
            }
            const year = new Date(salesDate).getFullYear();
            const is2025 = year === 2025;
            if (!is2025) {
                console.log("Filtered out data item (not 2025):", { PRODUKT: item.PRODUKT, date: salesDate, year: year });
            }
            return is2025;
        });
        
        const nonConvertedData2025 = nonConvertedData.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') {
                console.log("Filtered out nonConverted item (no date):", item.PRODUKT);
                return false;
            }
            const year = new Date(salesDate).getFullYear();
            const is2025 = year === 2025;
            if (!is2025) {
                console.log("Filtered out nonConverted item (not 2025):", { PRODUKT: item.PRODUKT, date: salesDate, year: year });
            }
            return is2025;
        });
        
        const afvisteData2025 = afvisteData.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') {
                console.log("Filtered out afviste item (no date):", item.PRODUKT);
                return false;
            }
            const year = new Date(salesDate).getFullYear();
            const is2025 = year === 2025;
            if (!is2025) {
                console.log("Filtered out afviste item (not 2025):", { PRODUKT: item.PRODUKT, date: salesDate, year: year });
            }
            return is2025;
        });
        
        console.log("Data counts before migrated sales filter:", {
            salesData2025: salesData2025.length,
            nonConvertedData2025: nonConvertedData2025.length,
            afvisteData2025: afvisteData2025.length
        });
        
        // NEW: Apply migrated sales filter to all three datasets
        const salesDataNoMigrated = filterMigratedSales(salesData2025);
        const nonConvertedDataNoMigrated = filterMigratedSales(nonConvertedData2025);
        const afvisteDataNoMigrated = filterMigratedSales(afvisteData2025);
        
        console.log("Data counts after migrated sales filter:", {
            salesDataNoMigrated: salesDataNoMigrated.length,
            nonConvertedDataNoMigrated: nonConvertedDataNoMigrated.length,
            afvisteDataNoMigrated: afvisteDataNoMigrated.length,
            excludeMigratedSales: excludeMigratedSales
        });
        
        // Then filter by selected month
        const filteredSales = filterDataByMonth(salesDataNoMigrated, selectedMonth);
        const filteredNonConverted = filterDataByMonth(nonConvertedDataNoMigrated, selectedMonth);
        const filteredAfviste = filterDataByMonth(afvisteDataNoMigrated, selectedMonth);
        
        console.log("Data counts after month filter:", {
            filteredSales: filteredSales.length,
            filteredNonConverted: filteredNonConverted.length,
            filteredAfviste: filteredAfviste.length,
            selectedMonth: selectedMonth
        });
        
        // Log sample products from each dataset
        console.log("Sample products from filteredSales:", 
            filteredSales.slice(0, 3).map(item => ({ 
                PRODUKT: item.PRODUKT, 
                SAELGER: item.SAELGER,
                TILBUD_START_DATO: item.TILBUD_START_DATO,
                KONVERTERINGS_DATO: item.KONVERTERINGS_DATO,
                MASTER_POLICE_NAVN: item.MASTER_POLICE_NAVN
            }))
        );
        
        console.log("Sample products from filteredNonConverted:", 
            filteredNonConverted.slice(0, 3).map(item => ({ 
                PRODUKT: item.PRODUKT,
                SAELGER: item.SAELGER,
                TILBUD_START_DATO: item.TILBUD_START_DATO,
                KONVERTERINGS_DATO: item.KONVERTERINGS_DATO,
                MASTER_POLICE_NAVN: item.MASTER_POLICE_NAVN
            }))
        );
        
        console.log("Sample products from filteredAfviste:", 
            filteredAfviste.slice(0, 3).map(item => ({ 
                PRODUKT: item.PRODUKT,
                SAELGER: item.SAELGER,
                TILBUD_START_DATO: item.TILBUD_START_DATO,
                KONVERTERINGS_DATO: item.KONVERTERINGS_DATO,
                MASTER_POLICE_NAVN: item.MASTER_POLICE_NAVN
            }))
        );
        
        // Group data by mapped product name
        const productStats = {};

        // Count converted sales
        filteredSales.forEach(item => {
            const product = mapProductName(item.MASTER_POLICE_NAVN);
            
            if (!productStats[product]) {
                productStats[product] = {
                    converted: 0,
                    nonConverted: 0,
                    rejected: 0,
                    totalPremium: 0
                };
            }
            productStats[product].converted++;
            productStats[product].totalPremium += Number(item.AARLIG_PRAEMIE) || 0;
        });
        
        console.log("After counting converted sales:", JSON.parse(JSON.stringify(productStats)));
        
        // Count non-converted
        filteredNonConverted.forEach(item => {
            const product = mapProductName(item.MASTER_POLICE_NAVN);
            if (!productStats[product]) {
                productStats[product] = {
                    converted: 0,
                    nonConverted: 0,
                    rejected: 0,
                    totalPremium: 0
                };
            }
            productStats[product].nonConverted++;
        });
        
        console.log("After counting non-converted:", JSON.parse(JSON.stringify(productStats)));
        
        // Count rejected
        filteredAfviste.forEach(item => {
            const product = mapProductName(item.MASTER_POLICE_NAVN);
            if (!productStats[product]) {
                productStats[product] = {
                    converted: 0,
                    nonConverted: 0,
                    rejected: 0,
                    totalPremium: 0
                };
            }
            productStats[product].rejected++;
        });
        
        console.log("After counting rejected:", JSON.parse(JSON.stringify(productStats)));
        
        // Build table rows
        const tableBody = document.getElementById('product-table-body');
        tableBody.innerHTML = '';
        
        // Sort products by total premium (descending)
        const sortedProducts = Object.entries(productStats)
            .sort(([,a], [,b]) => b.totalPremium - a.totalPremium);
        
        console.log("=== HITRATE CALCULATIONS ===");

        // Initialize total variables for sum row
        let sumConverted = 0;
        let sumTotalPremium = 0;

        // Variables for hitrate calculation (excluding Arbejdsskadeforsikring)
        let hitrateNumerator = 0;
        let hitrateDenominator = 0;

        sortedProducts.forEach(([product, stats]) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-100 hover:bg-slate-50';
            
            const avgPremium = stats.converted > 0 ? stats.totalPremium / stats.converted : 0;
            
            // Calculate hitrate (blank for Arbejdsskadeforsikring)
            let hitrate = '';
            if (product !== 'Arbejdsskadeforsikring') {
                // Only include converted (accepted) and rejected (declined) offers, exclude nonConverted (open offers)
                const total = stats.converted + stats.nonConverted + stats.rejected;
                
                console.log(`Product: ${product}`, {
                    converted: stats.converted,
                    nonConverted: stats.nonConverted,
                    rejected: stats.rejected,
                    total: total,
                    note: 'Hitrate calculation includes all offers (converted + nonConverted + rejected)'
                });
                
                if (total > 0) {
                    const hitratePercent = Math.round((stats.converted / total) * 100);
                    hitrate = hitratePercent + '%';
                    
                    console.log(`${product} hitrate calculation:`, {
                        converted: stats.converted,
                        rejected: stats.rejected,
                        total: total,
                        percentage: (stats.converted / total) * 100,
                        rounded: hitratePercent,
                        note: 'Accepted / (Accepted + Open + Declined)'
                    });
                } else {
                    console.log(`${product}: Total is 0, no hitrate calculated`);
                }
            } else {
                console.log(`${product}: Skipped hitrate calculation (Arbejdsskadeforsikring)`);
            }
            
            row.innerHTML = `
                <td class="py-3 px-4 text-slate-900">${product}</td>
                <td class="py-3 px-4 text-right text-slate-900">${stats.converted}</td>
                <td class="py-3 px-4 text-right text-slate-900">${formatCurrency(stats.totalPremium)}</td>
                <td class="py-3 px-4 text-right text-slate-900">${formatCurrency(avgPremium)}</td>
                <td class="py-3 px-4 text-right text-slate-900">${hitrate}</td>
            `;

            // Accumulate totals for sum row
            sumConverted += stats.converted;
            sumTotalPremium += stats.totalPremium;

            // Add to hitrate calculation ONLY if not Arbejdsskadeforsikring
            if (product !== 'Arbejdsskadeforsikring') {
                const total = stats.converted + stats.nonConverted + stats.rejected;
                hitrateNumerator += stats.converted;
                hitrateDenominator += total;
            }

            tableBody.appendChild(row);
        });

        // Add Total Row
        const totalRow = document.createElement('tr');
        totalRow.className = 'border-t-2 border-slate-300 bg-slate-100 font-bold';

        // Calculate Total Average Premium
        let totalAvgPremium = 0;
        if (sumConverted > 0) {
            totalAvgPremium = sumTotalPremium / sumConverted;
        }

        // Calculate Total Hitrate (excluding Arbejdsskadeforsikring)
        let totalHitrate = '';
        if (hitrateDenominator > 0) {
            const hitratePercent = Math.round((hitrateNumerator / hitrateDenominator) * 100);
            totalHitrate = hitratePercent + '%';
        } else {
            totalHitrate = '-';
        }

        // Prepare display values (show '-' if 0)
        const displaySumConverted = sumConverted > 0 ? sumConverted : '-';
        const displayTotalPremium = sumTotalPremium > 0 ? formatCurrency(sumTotalPremium) : '-';
        const displayTotalAvgPremium = sumConverted > 0 ? formatCurrency(totalAvgPremium) : '-';

        totalRow.innerHTML = `
            <td class="py-3 px-4 text-slate-900">Total</td>
            <td class="py-3 px-4 text-right text-slate-900">${displaySumConverted}</td>
            <td class="py-3 px-4 text-right text-slate-900">${displayTotalPremium}</td>
            <td class="py-3 px-4 text-right text-slate-900">${displayTotalAvgPremium}</td>
            <td class="py-3 px-4 text-right text-slate-900">${totalHitrate}</td>
        `;

        tableBody.appendChild(totalRow);

        console.log("=== UPDATEPRODUCTTABLE END ===");
    }

    
    function updateGoalComparisonChart() {
        // Filter data based on selected company
        let filteredByCompany;
        if (selectedCompany === 'hdi-axa') {
            // HDI + AXA only, exclude Nærsikring
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && 
                (item.MASTER_POLICE_NAVN.startsWith("HDI") || 
                (!item.MASTER_POLICE_NAVN.startsWith("Nærsikring")))
            );
        } else if (selectedCompany === 'alle') {
            // All companies: HDI + AXA + Nærsikring
            filteredByCompany = data;
        } else if (selectedCompany === 'hdi') {
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && item.MASTER_POLICE_NAVN.startsWith("HDI")
            );
        } else if (selectedCompany === 'axa') {
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && 
                !item.MASTER_POLICE_NAVN.startsWith("HDI") && 
                !item.MASTER_POLICE_NAVN.startsWith("Nærsikring")
            );
        } else if (selectedCompany === 'nærsikring') {
            filteredByCompany = data.filter(item => 
                item.MASTER_POLICE_NAVN && item.MASTER_POLICE_NAVN.startsWith("Nærsikring")
            );
        }
        
        // NEW: Apply migrated sales filter
        const filteredData = filterMigratedSales(filteredByCompany);
        
        // Group data by month - using the appropriate date field
        const salesByMonth = {};

        filteredData.forEach(item => {
            const salesDate = getSalesDate(item);
            
            // Skip items with empty or invalid sales dates
            if (!salesDate || salesDate.trim() === '') {
                return;
            }
            
            const monthYear = getMonthYear(salesDate);
            
            // Skip items with invalid month/year
            if (!monthYear) {
                return;
            }
            
            if (!salesByMonth[monthYear]) {
                salesByMonth[monthYear] = {
                    count: 0,
                    premium: 0
                };
            }
            
            salesByMonth[monthYear].count++;
            salesByMonth[monthYear].premium += Number(item.AARLIG_PRAEMIE) || 0;
        });
        
        // Get current year and month
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Create full year month list
        const fullYearMonths = [];
        for (let month = 1; month <= 12; month++) {
            fullYearMonths.push(`${currentYear}-${String(month).padStart(2, '0')}`);
        }
        
        // Create chart data
        const labels = fullYearMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const date = new Date(year, parseInt(monthNum) - 1, 1);
            return date.toLocaleDateString('da-DK', { month: 'short' });
        });
        
        const actualSalesData = fullYearMonths.map(month => {
            return salesByMonth[month] ? salesByMonth[month].premium : 0;
        });
        
        const companyGoals = salesGoals[selectedCompany] || {};
        const goalsData = fullYearMonths.map(month => {
            if (selectedCompany === 'hdi-axa') {
                // Combine HDI + AXA goals
                const hdiGoal = salesGoals.hdi[month] || 0;
                const axaGoal = salesGoals.axa[month] || 0;
                return hdiGoal + axaGoal;
            } else if (selectedCompany === 'alle') {
                // Combine HDI + AXA + Nærsikring goals
                const hdiGoal = salesGoals.hdi[month] || 0;
                const axaGoal = salesGoals.axa[month] || 0;
                const naersikringGoal = salesGoals.nærsikring[month] || 0;
                return hdiGoal + axaGoal + naersikringGoal;
            }
            return companyGoals[month] || null;
        });
        
        // Calculate percentage achievement for each month
        const percentageData = fullYearMonths.map((month, index) => {
            const actual = actualSalesData[index] || 0;
            const goal = goalsData[index] || 0;
            
            if (goal === 0 || actual === 0) return 0;
            return Math.round((actual / goal) * 100);
        });
        
        // Calculate summary metrics with pro-rated current month
        const totalSalesFullYear = actualSalesData.reduce((sum, value) => sum + value, 0);

        // For YTD calculations, we need to pro-rate the current month's goal
        let totalSalesYTD, totalGoalsYTD;

        // Get complete months (previous months)
        const completeMonths = currentMonth - 1;

        // Calculate sales for complete months + current partial month
        totalSalesYTD = actualSalesData.slice(0, currentMonth).reduce((sum, value) => sum + value, 0);

        // Calculate goals for complete months
        const completeMonthsGoals = goalsData.slice(0, completeMonths).reduce((sum, value) => sum + (value || 0), 0);

        // Calculate pro-rated goal for current month
        const currentMonthGoal = goalsData[currentMonth - 1] || 0;

        // Get current date to determine how many days into the month we are
        const today = new Date();
        const currentDay = today.getDate();

        // Get total days in current month
        const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();

        // Calculate pro-rated goal for current month
        const proRatedCurrentMonthGoal = currentMonthGoal * (currentDay / daysInCurrentMonth);

        // Total goals YTD = complete months goals + pro-rated current month goal
        totalGoalsYTD = completeMonthsGoals + proRatedCurrentMonthGoal;

        let totalGoalFulfillment = 0;
        if (totalGoalsYTD > 0) {
            totalGoalFulfillment = Math.round((totalSalesYTD / totalGoalsYTD) * 100);
        }
        
        const monthsWithSales = actualSalesData.filter(value => value > 0).length;
        const avgMonthlySales = monthsWithSales > 0 
            ? actualSalesData.reduce((sum, value) => sum + value, 0) / monthsWithSales 
            : 0;
        
        const totalAnnualGoal = goalsData.reduce((sum, value) => sum + (value || 0), 0);
        let annualGoalFulfillment = 0;
        if (totalAnnualGoal > 0) {
            annualGoalFulfillment = Math.round((totalSalesYTD / totalAnnualGoal) * 100);
        }
        
        // Update summary cards
        // Update summary cards
        totalSalesYTDElement.textContent = formatCurrency(totalSalesFullYear); // Brug full year
        totalGoalFulfillmentElement.textContent = `${totalGoalFulfillment}%`; // Brug YTD beregning
        avgMonthlySalesElement.textContent = formatCurrency(avgMonthlySales);
        projectedFulfillmentElement.textContent = `${annualGoalFulfillment}%`;
        
        // Custom plugin to draw percentage inside each bar
        const percentagePlugin = {
            id: 'percentagePlugin',
            afterDatasetsDraw: (chart) => {
                const {ctx, data, chartArea, scales} = chart;
                const dataset = data.datasets[0];
                const meta = chart.getDatasetMeta(0);
                
                ctx.save();
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                meta.data.forEach((bar, index) => {
                    const percentage = percentageData[index];
                    
                    if (percentage > 0) {
                        const position = bar.getCenterPoint();
                        
                        if (percentage > 70) {
                            ctx.fillStyle = 'white';
                        } else {
                            ctx.fillStyle = '#334155';
                        }
                        
                        ctx.fillText(`${percentage}%`, position.x, position.y);
                    }
                });
                
                ctx.restore();
            }
        };
        
        // Get colors based on selected company
        let barColor, lineColor;
        
        switch(selectedCompany) {
            case 'hdi':
                barColor = 'rgba(37, 99, 235, 0.8)';
                lineColor = 'rgb(220, 38, 127)';
                break;
            case 'axa':
                barColor = 'rgba(239, 68, 68, 0.8)';
                lineColor = 'rgb(37, 99, 235)';
                break;
            case 'nærsikring':
                barColor = 'rgba(34, 197, 94, 0.8)';
                lineColor = 'rgb(239, 68, 68)';
                break;
            case 'hdi-axa':
                barColor = 'rgba(71, 85, 105, 0.8)';
                lineColor = 'rgb(220, 38, 127)';
                break;
            case 'alle':
                barColor = 'rgba(147, 51, 234, 0.8)';
                lineColor = 'rgb(220, 38, 127)';
                break;
            default:
                barColor = 'rgba(71, 85, 105, 0.8)';
                lineColor = 'rgb(220, 38, 127)';
        }
        
        // Update legend colors
        document.getElementById('legend-sales-color').style.backgroundColor = barColor.replace('0.8', '1');
        document.getElementById('legend-goals-color').style.backgroundColor = lineColor;
        
        // Determine title
        let chartTitle;
        switch(selectedCompany) {
            case 'hdi':
                chartTitle = `HDI Salg vs. Mål ${currentYear}`;
                break;
            case 'axa':
                chartTitle = `AXA Salg vs. Mål ${currentYear}`;
                break;
            case 'nærsikring':
                chartTitle = `Nærsikring Salg vs. Mål ${currentYear}`;
                break;
            case 'hdi-axa':
                chartTitle = `HDI+AXA Salg vs. Mål ${currentYear}`;
                break;
            case 'alle':
                chartTitle = `Alle Salg vs. Mål ${currentYear}`;
                break;
            default:
                chartTitle = `Salg vs. Mål ${currentYear}`;
        }
        
        // Create or update chart
        const ctx = document.getElementById('goal-chart').getContext('2d');
        
        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Faktiske Salg',
                        data: actualSalesData,
                        backgroundColor: barColor,
                        borderColor: barColor.replace('0.8', '1'),
                        borderWidth: 1,
                        order: 2,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Salgsmål',
                        data: goalsData,
                        type: 'line',
                        backgroundColor: 'rgba(220, 38, 127, 0.2)',
                        borderColor: lineColor,
                        borderWidth: 3,
                        tension: 0.1,
                        pointRadius: 5,
                        pointBackgroundColor: lineColor,
                        spanGaps: true,
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: chartTitle,
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter'
                        },
                        color: '#0f172a'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#334155',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label + ': ' + formatCurrency(context.raw || 0);
                                
                                if (context.datasetIndex === 0 && percentageData[context.dataIndex] > 0) {
                                    return [
                                        label,
                                        `Opfyldelse: ${percentageData[context.dataIndex]}% af mål`
                                    ];
                                }
                                
                                return label;
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e2e8f0'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter'
                            },
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: '#e2e8f0'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'Inter'
                            }
                        }
                    }
                }
            },
            plugins: [percentagePlugin]
        };
        
        if (goalChart) {
            goalChart.destroy();
            goalChart = new Chart(ctx, chartConfig);
        } else {
            goalChart = new Chart(ctx, chartConfig);
        }
    }
    
    // Start the application
    loadData();
});