// Advisors Tab Handler
// This script handles the advisors tab functionality

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the advisors tab
    let advisorsInitialized = false;
    let accessControlData = null;
    let currentUser = null;
    let advisorsAuthData = null;
    let selectedAdvisor = null;
    let advisorSalesChart = null;
    let selectedAdvisorCompany = 'hdi-axa';
    let selectedAdvisorProductMonth = 'all'; // Month filter for advisor product table
    let selectedAdvisorCustomerYear = 2025; // Year filter for customer statistics
    
    // Use shared utilities from SalgstalUtils
    const getSalesDate = SalgstalUtils.getSalesDate;
    const formatCurrency = SalgstalUtils.formatCurrency;
    const getMonthYear = SalgstalUtils.getMonthYear;
    const parseDate = SalgstalUtils.parseDate;
    const mapSagsbehandlerToInitials = SalgstalUtils.mapSagsbehandlerToInitials;
    const filterMigratedSales = SalgstalUtils.filterMigratedSales;
    const mapProductName = SalgstalUtils.mapProductName;

    // Image path helper for advisor profiles
    function getImagePath(advisorId) {
        const mapping = {
            'flfa_lb': 'FLFA',
            'jlar_lb': 'JLAR',
            'rovi_lb': 'ROVI',
            'naas_lb': 'NAAS',
            'mapk_lb': 'MAPK',
            'kevfit': 'KEVF',
            'adrb': 'ADRB'
        };
        const fileName = mapping[advisorId] || advisorId.toUpperCase();
        return `../assets/images/Profilbilleder/${fileName}.jpg`;
    }

    // Generate initials from name
    function getInitials(name) {
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
    }





    // Initialize advisors page
    async function initializeAdvisors() {
        if (advisorsInitialized) return;

        advisorsInitialized = true;

        console.log('Advisors page initialized');

        try {
            // Load sales data
            console.log('Loading sales data...');
            await DataLoader.loadAll();
            console.log('Sales data loaded');

            // Load both auth data (for advisor list) and access control
            await Promise.all([
                loadAuthData(),
                loadAccessControl()
            ]);

            // Check user access and show appropriate UI
            await checkUserAccess();

            // Setup event listeners for advisor selection
            setupAdvisorSelectionListeners();
        } catch (error) {
            console.error('Error initializing advisors page:', error);
        }
    }

    // Initialize immediately on page load
    initializeAdvisors();
    
    // Load authentication data from JSON file
    async function loadAuthData() {
        try {
            const response = await fetch('../data/advisors_auth_json_file.json');
            if (!response.ok) {
                throw new Error('Could not load advisors auth data');
            }
            advisorsAuthData = await response.json();
            console.log('Advisors auth data loaded');
        } catch (error) {
            console.error('Error loading advisors auth data:', error);
            // Fallback data if file not found
            advisorsAuthData = {
                manager_code: "leder2025",
                advisors: [
                    {id: "flfa_lb", name: "Flemming F."},
                    {id: "jlar_lb", name: "Jakob N. L."},
                    {id: "rovi_lb", name: "Ronja S. V."},
                    {id: "naas_lb", name: "Nils A."},
                    {id: "mapk_lb", name: "Maria P."},
                    {id: "kevfit", name: "Kevin F."},
                    {id: "adrb", name: "Andreas D."}
                ]
            };
            console.log('Using fallback auth data');
        }
    }

    // Load access control data from JSON file
    async function loadAccessControl() {
        try {
            const response = await fetch('../data/advisors_access.json');
            if (!response.ok) {
                throw new Error('Could not load access control data');
            }
            accessControlData = await response.json();
            console.log('Access control data loaded:', accessControlData);
        } catch (error) {
            console.error('Error loading access control data:', error);
            // Fallback: deny all access if file not found
            accessControlData = { allowed_users: [] };
        }
    }

    // Check if current user has access to advisors page
    async function checkUserAccess() {
        try {
            // Load current user from server
            currentUser = await UserLoader.loadUserInfo();
            console.log('Current user:', currentUser.username);

            // Check if user is in allowed list
            const hasAccess = accessControlData.allowed_users.includes(currentUser.username);
            console.log('User has access:', hasAccess);

            if (hasAccess) {
                // Show advisor selection
                document.getElementById('advisor-selection-section').classList.remove('hidden');
                populateAdvisorDropdown();
            } else {
                // Show access denied
                document.getElementById('advisor-access-denied-section').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error checking user access:', error);
            // On error, deny access
            document.getElementById('advisor-access-denied-section').classList.remove('hidden');
        }
    }
    
    // Set up event listeners for advisor selection
    function setupAdvisorSelectionListeners() {
        const advisorSelect = document.getElementById('advisor-select');

        if (!advisorSelect) {
            console.error('Advisor select element not found');
            return;
        }

        // Advisor selection change
        advisorSelect.addEventListener('change', handleAdvisorSelection);

        // Add event listeners for advisor product month filter buttons
        document.querySelectorAll('.advisor-product-month-filter-btn').forEach(button => {
            button.addEventListener('click', function() {
                selectedAdvisorProductMonth = this.getAttribute('data-month');

                // Update button styles
                document.querySelectorAll('.advisor-product-month-filter-btn').forEach(btn => {
                    setAdvisorProductMonthButtonInactive(btn);
                });
                setAdvisorProductMonthButtonActive(this);

                // Update period text
                updateAdvisorProductPeriodText();

                // Update the product table
                updateAdvisorProductTable();

                console.log('Advisor product month filter changed to:', selectedAdvisorProductMonth);
            });
        });

        // Add event listeners for advisor customer year filter buttons
        document.querySelectorAll('.advisor-customer-year-filter-btn').forEach(button => {
            button.addEventListener('click', function() {
                selectedAdvisorCustomerYear = parseInt(this.getAttribute('data-year'));

                // Update button styles
                document.querySelectorAll('.advisor-customer-year-filter-btn').forEach(btn => {
                    btn.classList.remove('bg-slate-800', 'text-white');
                    btn.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
                });
                this.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
                this.classList.add('bg-slate-800', 'text-white');

                // Update year text
                const yearText = document.getElementById('advisor-customer-year-text');
                if (yearText) {
                    yearText.textContent = selectedAdvisorCustomerYear;
                }

                // Update customer statistics
                updateAdvisorCustomerStats();

                console.log('Advisor customer year filter changed to:', selectedAdvisorCustomerYear);
            });
        });
    }
    
    
    // Populate the advisor dropdown with available advisors
    function populateAdvisorDropdown() {
        const advisorSelect = document.getElementById('advisor-select');
        
        if (!advisorSelect || !advisorsAuthData) {
            console.error('Advisor select or auth data not available');
            return;
        }
        
        // Clear existing options (except the first placeholder)
        advisorSelect.innerHTML = '<option value="">Vælg rådgiver...</option>';

        // Filter to only show advisors (raadgiver !== false)
        const activeAdvisors = advisorsAuthData.advisors.filter(advisor => advisor.raadgiver !== false);

        // Add advisor options with background images
        activeAdvisors.forEach(advisor => {
            const option = document.createElement('option');
            option.value = advisor.id;
            option.textContent = advisor.name;
            
            // Try to add background image (note: limited browser support)
            const imagePath = getImagePath(advisor.id);
            option.style.backgroundImage = `url('${imagePath}')`;
            option.style.backgroundSize = 'cover';
            option.style.backgroundPosition = 'center';
            option.style.paddingLeft = '30px';
            option.style.minHeight = '24px';
            
            // Fallback styling if image doesn't load
            const initials = getInitials(advisor.name);
            option.setAttribute('data-initials', initials);
            
            advisorSelect.appendChild(option);
        });
        
        // Add custom styling to select for better image display
        advisorSelect.style.backgroundRepeat = 'no-repeat';
        advisorSelect.style.backgroundPosition = '8px center';
        advisorSelect.style.backgroundSize = '20px 20px';
        advisorSelect.style.paddingLeft = '35px';

        console.log('Advisor dropdown populated with', activeAdvisors.length, 'advisors');
    }
    
    // Handle advisor selection
    function handleAdvisorSelection() {
        const advisorSelect = document.getElementById('advisor-select');
        const selectedAdvisorInfo = document.getElementById('selected-advisor-info');
        const selectedAdvisorName = document.getElementById('selected-advisor-name');
        const selectedAdvisorImage = document.getElementById('selected-advisor-image');
        const selectedAdvisorInitials = document.getElementById('selected-advisor-initials');
        const dataSection = document.getElementById('advisor-data-section');
        const currentAdvisorDisplay = document.getElementById('current-advisor-display');
        
        if (!advisorSelect) return;
        
        const selectedId = advisorSelect.value;
        
        if (selectedId && advisorsAuthData) {
            // Find selected advisor
            selectedAdvisor = advisorsAuthData.advisors.find(advisor => advisor.id === selectedId);
            
            if (selectedAdvisor) {
                // Show selected advisor info
                if (selectedAdvisorInfo && selectedAdvisorName) {
                    selectedAdvisorName.textContent = selectedAdvisor.name;
                    selectedAdvisorInfo.classList.remove('hidden');
                    
                    // Handle profile image loading with fallback
                    const imagePath = getImagePath(selectedAdvisor.id);
                    const initials = getInitials(selectedAdvisor.name);
                    
                    if (selectedAdvisorImage && selectedAdvisorInitials) {
                        // Hide both initially
                        selectedAdvisorImage.classList.add('hidden');
                        selectedAdvisorInitials.classList.add('hidden');
                        
                        // Create new image to test if it loads
                        const testImg = new Image();
                        
                        testImg.onload = function() {
                            // Image loaded successfully - show image, hide initials
                            selectedAdvisorImage.src = imagePath;
                            selectedAdvisorImage.alt = selectedAdvisor.name;
                            selectedAdvisorImage.classList.remove('hidden');
                            selectedAdvisorInitials.classList.add('hidden');
                            
                            // Update select background to match selected advisor
                            advisorSelect.style.backgroundImage = `url('${imagePath}')`;
                            
                            console.log(`Profile image loaded for ${selectedAdvisor.name}`);
                        };
                        
                        testImg.onerror = function() {
                            // Image failed to load - show initials, hide image
                            selectedAdvisorInitials.textContent = initials;
                            selectedAdvisorInitials.classList.remove('hidden');
                            selectedAdvisorImage.classList.add('hidden');
                            
                            // Update select background to show initials style
                            advisorSelect.style.backgroundImage = 'none';
                            advisorSelect.style.backgroundColor = '#475569';
                            advisorSelect.style.color = 'white';
                            
                            console.log(`Profile image not found for ${selectedAdvisor.name}, using initials: ${initials}`);
                        };
                        
                        // Start loading test
                        testImg.src = imagePath;
                    }
                }
                
                // Show data section
                if (dataSection) {
                    dataSection.classList.remove('hidden');
                }
                
                console.log('Selected advisor:', selectedAdvisor);

                // Initialize chart filters and update chart
                initializeAdvisorChartCompanyFilters();
                updateAdvisorSalesChart();
                initializeAdvisorProductMonthFilters();
                updateAdvisorProductTable();
                initializeAdvisorCustomerYearFilters();
                updateAdvisorCustomerStats();
                
            }
        } else {
            // No advisor selected - reset UI
            if (selectedAdvisorInfo) {
                selectedAdvisorInfo.classList.add('hidden');
            }
            if (dataSection) {
                dataSection.classList.add('hidden');
            }
            
            // Reset select styling
            if (advisorSelect) {
                advisorSelect.style.backgroundImage = 'none';
                advisorSelect.style.backgroundColor = '';
                advisorSelect.style.color = '';
            }
            
            selectedAdvisor = null;
        }
    }
    
    
    // OLD TAB-BASED CODE - No longer needed for standalone page
    // Initialization now happens automatically on DOMContentLoaded above
    
    // Initialize advisor company filters for chart
    function initializeAdvisorChartCompanyFilters() {
        const buttons = document.querySelectorAll('.advisor-chart-company-filter-btn');

        if (buttons.length === 0) {
            console.log('Advisor chart company filter buttons not found');
            return;
        }

        buttons.forEach(button => {
            const company = button.dataset.company;

            // Set initial active state
            if (company === selectedAdvisorCompany) {
                setAdvisorChartButtonActive(button, company);
            } else {
                setAdvisorChartButtonInactive(button);
            }

            // Add click event
            button.addEventListener('click', function() {
                selectedAdvisorCompany = company;

                // Update all buttons
                buttons.forEach(btn => {
                    if (btn.dataset.company === selectedAdvisorCompany) {
                        setAdvisorChartButtonActive(btn, selectedAdvisorCompany);
                    } else {
                        setAdvisorChartButtonInactive(btn);
                    }
                });

                // Update Nærsikring info text
                updateAdvisorNaersikringInfoText();

                // Refresh chart
                updateAdvisorSalesChart();
            });
        });

        // Initial call to set the correct info text state
        updateAdvisorNaersikringInfoText();
    }

    // Initialize advisor product month filters
    function initializeAdvisorProductMonthFilters() {
        const buttons = document.querySelectorAll('.advisor-product-month-filter-btn');

        if (buttons.length === 0) {
            console.log('Advisor product month filter buttons not found');
            return;
        }

        buttons.forEach(button => {
            const month = button.dataset.month;

            // Set initial active state (default is 'all')
            if (month === selectedAdvisorProductMonth) {
                setAdvisorProductMonthButtonActive(button);
            } else {
                setAdvisorProductMonthButtonInactive(button);
            }
        });

        // Set initial period text
        updateAdvisorProductPeriodText();

        console.log('Advisor product month filters initialized');
    }

    function initializeAdvisorCustomerYearFilters() {
        const buttons = document.querySelectorAll('.advisor-customer-year-filter-btn');

        if (buttons.length === 0) {
            console.log('Advisor customer year filter buttons not found');
            return;
        }

        buttons.forEach(button => {
            const year = parseInt(button.dataset.year);

            // Set initial active state (default is 2025)
            if (year === selectedAdvisorCustomerYear) {
                button.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
                button.classList.add('bg-slate-800', 'text-white');
            } else {
                button.classList.remove('bg-slate-800', 'text-white');
                button.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
            }
        });

        console.log('Advisor customer year filters initialized');
    }

    function setAdvisorChartButtonActive(button, company) {
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

    function setAdvisorChartButtonInactive(button) {
        button.className = 'advisor-chart-company-filter-btn px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50';
    }

    function setAdvisorProductMonthButtonActive(button) {
        button.classList.remove('border-slate-300', 'text-slate-600', 'bg-white', 'hover:bg-slate-50');
        button.classList.add('border-slate-800', 'text-white', 'bg-slate-800', 'hover:bg-slate-900');
    }

    function setAdvisorProductMonthButtonInactive(button) {
        button.classList.remove('border-slate-800', 'text-white', 'bg-slate-800', 'hover:bg-slate-900');
        button.classList.add('border-slate-300', 'text-slate-600', 'bg-white', 'hover:bg-slate-50');
    }

    function updateAdvisorNaersikringInfoText() {
        const infoText = document.getElementById('advisor-naersikring-info-text');

        if (selectedAdvisorCompany === 'nærsikring') {
            infoText.classList.remove('hidden');
        } else {
            infoText.classList.add('hidden');
        }
    }

    function updateAdvisorProductPeriodText() {
        const periodText = document.getElementById('advisor-product-period-text');
        if (!periodText) return;

        const monthNames = {
            '1': 'Januar 2025',
            '2': 'Februar 2025',
            '3': 'Marts 2025',
            '4': 'April 2025',
            '5': 'Maj 2025',
            '6': 'Juni 2025',
            '7': 'Juli 2025',
            '8': 'August 2025',
            '9': 'September 2025',
            '10': 'Oktober 2025',
            '11': 'November 2025',
            '12': 'December 2025'
        };

        if (selectedAdvisorProductMonth === 'all') {
            periodText.textContent = 'Hele 2025';
        } else {
            periodText.textContent = monthNames[selectedAdvisorProductMonth] || 'Hele 2025';
        }
    }

    // Update advisor sales chart
    function updateAdvisorSalesChart() {
        if (!selectedAdvisor) {
            console.log('No advisor selected, cannot update chart');
            return;
        }

        // Check if data is available (from dashboard.js)
        if (typeof data === 'undefined') {
            console.log('Sales data not yet loaded, cannot update advisor chart');
            return;
        }

        console.log('Updating advisor sales chart for:', selectedAdvisor.name, 'Company filter:', selectedAdvisorCompany);

        // Filter data by selected company (same logic as dashboard)
        let filteredByCompany;
        if (selectedAdvisorCompany === 'hdi-axa') {
            // HDI + AXA only, exclude Nærsikring
            filteredByCompany = data.filter(item =>
                item.MASTER_POLICE_NAVN &&
                (item.MASTER_POLICE_NAVN.startsWith("HDI") ||
                (!item.MASTER_POLICE_NAVN.startsWith("Nærsikring")))
            );
        } else if (selectedAdvisorCompany === 'alle') {
            // All companies: HDI + AXA + Nærsikring
            filteredByCompany = data;
        } else if (selectedAdvisorCompany === 'hdi') {
            filteredByCompany = data.filter(item =>
                item.MASTER_POLICE_NAVN && item.MASTER_POLICE_NAVN.startsWith("HDI")
            );
        } else if (selectedAdvisorCompany === 'axa') {
            filteredByCompany = data.filter(item =>
                item.MASTER_POLICE_NAVN &&
                !item.MASTER_POLICE_NAVN.startsWith("HDI") &&
                !item.MASTER_POLICE_NAVN.startsWith("Nærsikring")
            );
        } else if (selectedAdvisorCompany === 'nærsikring') {
            filteredByCompany = data.filter(item =>
                item.MASTER_POLICE_NAVN && item.MASTER_POLICE_NAVN.startsWith("Nærsikring")
            );
        }

        // Apply migrated sales filter (using function from dashboard.js)
        const filteredData = filterMigratedSales(filteredByCompany);

        // Filter by selected advisor
        const advisorFilteredData = filteredData.filter(item => {
            const rawAdvisor = item.SAGSBEHANDLER || '';
            const mappedAdvisor = mapSagsbehandlerToInitials(rawAdvisor);
            return mappedAdvisor === selectedAdvisor.id;
        });

        // Filter by 2025 data only
        const salesData2025 = advisorFilteredData.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            const year = new Date(salesDate).getFullYear();
            return year === 2025;
        });

        console.log('Filtered advisor data count:', salesData2025.length);

        // Group data by month
        const salesByMonth = {};

        salesData2025.forEach(item => {
            const salesDate = getSalesDate(item);

            if (!salesDate || salesDate.trim() === '') return;

            const monthYear = getMonthYear(salesDate);
            if (!monthYear) return;

            if (!salesByMonth[monthYear]) {
                salesByMonth[monthYear] = {
                    count: 0,
                    premium: 0
                };
            }

            salesByMonth[monthYear].count++;
            salesByMonth[monthYear].premium += Number(item.AARLIG_PRAEMIE) || 0;
        });

        // Create full year month list for 2025
        const currentYear = 2025;
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

        // Calculate summary metrics
        const totalSales = actualSalesData.reduce((sum, value) => sum + value, 0);
        const monthsWithSales = actualSalesData.filter(value => value > 0).length;
        const avgMonthlySales = monthsWithSales > 0 ? totalSales / monthsWithSales : 0;

        // Find best month
        const maxSales = Math.max(...actualSalesData);
        const bestMonthIndex = actualSalesData.indexOf(maxSales);
        const bestMonth = maxSales > 0 ? labels[bestMonthIndex] : '-';

        // Update summary cards
        document.getElementById('advisor-total-sales').textContent = formatCurrency(totalSales);
        document.getElementById('advisor-avg-monthly-sales').textContent = formatCurrency(avgMonthlySales);
        document.getElementById('advisor-best-month').textContent = bestMonth;

        // Get colors based on selected company
        let barColor;

        switch(selectedAdvisorCompany) {
            case 'hdi':
                barColor = 'rgba(37, 99, 235, 0.8)';
                break;
            case 'axa':
                barColor = 'rgba(239, 68, 68, 0.8)';
                break;
            case 'nærsikring':
                barColor = 'rgba(34, 197, 94, 0.8)';
                break;
            case 'hdi-axa':
                barColor = 'rgba(71, 85, 105, 0.8)';
                break;
            case 'alle':
                barColor = 'rgba(147, 51, 234, 0.8)';
                break;
            default:
                barColor = 'rgba(71, 85, 105, 0.8)';
        }

        // Determine chart title
        let chartTitle;
        switch(selectedAdvisorCompany) {
            case 'hdi':
                chartTitle = `${selectedAdvisor.name} - HDI Salg 2025`;
                break;
            case 'axa':
                chartTitle = `${selectedAdvisor.name} - AXA Salg 2025`;
                break;
            case 'nærsikring':
                chartTitle = `${selectedAdvisor.name} - Nærsikring Salg 2025`;
                break;
            case 'hdi-axa':
                chartTitle = `${selectedAdvisor.name} - HDI+AXA Salg 2025`;
                break;
            case 'alle':
                chartTitle = `${selectedAdvisor.name} - Alle Salg 2025`;
                break;
            default:
                chartTitle = `${selectedAdvisor.name} - Salg 2025`;
        }

        // Update chart title in header
        document.getElementById('advisor-chart-title').textContent = chartTitle;

        // Create or update chart
        const ctx = document.getElementById('advisor-sales-chart').getContext('2d');

        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Månedlige Salg',
                        data: actualSalesData,
                        backgroundColor: barColor,
                        borderColor: barColor.replace('0.8', '1'),
                        borderWidth: 1,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
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
                        display: false
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
                                return 'Salg: ' + formatCurrency(context.raw || 0);
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
            }
        };

        if (advisorSalesChart) {
            advisorSalesChart.destroy();
        }
        advisorSalesChart = new Chart(ctx, chartConfig);
    }

    // Update advisor product distribution table
    function updateAdvisorProductTable() {
        if (!selectedAdvisor) {
            console.log('No advisor selected, cannot update product table');
            return;
        }

        // Check if data is available (from dashboard.js)
        if (typeof data === 'undefined' || typeof nonConvertedData === 'undefined' || typeof afvisteData === 'undefined') {
            console.log('Sales data not yet loaded, cannot update advisor product table');
            return;
        }

        console.log('=== UPDATEADVISORPRODUCTTABLE START ===');
        console.log('Selected advisor:', selectedAdvisor.name);
        console.log('Selected month:', selectedAdvisorProductMonth);

        // Filter data by selected advisor (all companies)
        const advisorFilteredData = data.filter(item => {
            const rawAdvisor = item.SAGSBEHANDLER || '';
            const mappedAdvisor = mapSagsbehandlerToInitials(rawAdvisor);
            return mappedAdvisor === selectedAdvisor.id;
        });

        const advisorFilteredNonConverted = nonConvertedData.filter(item => {
            const rawAdvisor = item.SAGSBEHANDLER || '';
            const mappedAdvisor = mapSagsbehandlerToInitials(rawAdvisor);
            return mappedAdvisor === selectedAdvisor.id;
        });

        const advisorFilteredAfviste = afvisteData.filter(item => {
            const rawAdvisor = item.SAGSBEHANDLER || '';
            const mappedAdvisor = mapSagsbehandlerToInitials(rawAdvisor);
            return mappedAdvisor === selectedAdvisor.id;
        });

        console.log('Advisor filtered counts:', {
            converted: advisorFilteredData.length,
            nonConverted: advisorFilteredNonConverted.length,
            afviste: advisorFilteredAfviste.length
        });

        // Filter by 2025 only
        const salesData2025 = advisorFilteredData.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            const date = parseDate(salesDate);
            if (!date) return false;
            return date.getFullYear() === 2025;
        });

        const nonConvertedData2025 = advisorFilteredNonConverted.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            const date = parseDate(salesDate);
            if (!date) return false;
            return date.getFullYear() === 2025;
        });

        const afvisteData2025 = advisorFilteredAfviste.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            const date = parseDate(salesDate);
            if (!date) return false;
            return date.getFullYear() === 2025;
        });

        console.log('2025 filtered counts:', {
            converted: salesData2025.length,
            nonConverted: nonConvertedData2025.length,
            afviste: afvisteData2025.length
        });

        // Apply migrated sales filter (using function from dashboard.js)
        const salesDataNoMigrated = filterMigratedSales(salesData2025);
        const nonConvertedDataNoMigrated = filterMigratedSales(nonConvertedData2025);
        const afvisteDataNoMigrated = filterMigratedSales(afvisteData2025);

        console.log('After migrated filter:', {
            converted: salesDataNoMigrated.length,
            nonConverted: nonConvertedDataNoMigrated.length,
            afviste: afvisteDataNoMigrated.length
        });

        // Filter by month
        let filteredSales, filteredNonConverted, filteredAfviste;
        
        if (selectedAdvisorProductMonth === 'all') {
            // No month filter - use all data
            filteredSales = salesDataNoMigrated;
            filteredNonConverted = nonConvertedDataNoMigrated;
            filteredAfviste = afvisteDataNoMigrated;
        } else {
            // Filter by specific month
            const targetMonth = parseInt(selectedAdvisorProductMonth);
            
            filteredSales = salesDataNoMigrated.filter(item => {
                const salesDate = getSalesDate(item);
                if (!salesDate || salesDate.trim() === '') return false;
                const date = parseDate(salesDate);
                if (!date) return false;
                return (date.getMonth() + 1) === targetMonth;
            });
            
            filteredNonConverted = nonConvertedDataNoMigrated.filter(item => {
                const salesDate = getSalesDate(item);
                if (!salesDate || salesDate.trim() === '') return false;
                const date = parseDate(salesDate);
                if (!date) return false;
                return (date.getMonth() + 1) === targetMonth;
            });
            
            filteredAfviste = afvisteDataNoMigrated.filter(item => {
                const salesDate = getSalesDate(item);
                if (!salesDate || salesDate.trim() === '') return false;
                const date = parseDate(salesDate);
                if (!date) return false;
                return (date.getMonth() + 1) === targetMonth;
            });
        }

        console.log('After month filter:', {
            converted: filteredSales.length,
            nonConverted: filteredNonConverted.length,
            afviste: filteredAfviste.length,
            selectedMonth: selectedAdvisorProductMonth
        });

        // Aggregate data by product
        const productStats = {};

        // Count converted
        filteredSales.forEach(item => {
            const product = mapProductName(item.MASTER_POLICE_NAVN);
            if (!productStats[product]) {
                productStats[product] = {
                    converted: 0,
                    nonConverted: 0,
                    rejected: 0,
                    totalPremium: 0,
                    premiumCount: 0
                };
            }
            productStats[product].converted++;

            // Track premium for average calculation
            const premium = item.AARLIG_PRAEMIE;
            if (premium && premium !== '') {
                const premiumValue = parseFloat(String(premium).replace(/[^0-9.-]/g, ''));
                if (!isNaN(premiumValue) && premiumValue > 0) {
                    productStats[product].totalPremium += premiumValue;
                    productStats[product].premiumCount++;
                }
            }
        });

        // Count non-converted
        filteredNonConverted.forEach(item => {
            const product = mapProductName(item.MASTER_POLICE_NAVN);
            if (!productStats[product]) {
                productStats[product] = {
                    converted: 0,
                    nonConverted: 0,
                    rejected: 0,
                    totalPremium: 0,
                    premiumCount: 0
                };
            }
            productStats[product].nonConverted++;
        });

        // Count rejected
        filteredAfviste.forEach(item => {
            const product = mapProductName(item.MASTER_POLICE_NAVN);
            if (!productStats[product]) {
                productStats[product] = {
                    converted: 0,
                    nonConverted: 0,
                    rejected: 0,
                    totalPremium: 0,
                    premiumCount: 0
                };
            }
            productStats[product].rejected++;
        });

        console.log('Product stats:', productStats);

        // Build table rows
        const tableBody = document.getElementById('advisor-product-table-body');
        if (!tableBody) {
            console.error('Advisor product table body not found');
            return;
        }
        
        tableBody.innerHTML = '';

        // Get all unique products from all three datasets
        const allProducts = new Set([
            ...Object.keys(productStats)
        ]);

        // Sort products by total antal tilbud descending
        const sortedProducts = Array.from(allProducts).sort((a, b) => {
            const statsA = productStats[a] || { converted: 0, nonConverted: 0, rejected: 0 };
            const statsB = productStats[b] || { converted: 0, nonConverted: 0, rejected: 0 };
            
            const totalA = statsA.converted + statsA.nonConverted + statsA.rejected;
            const totalB = statsB.converted + statsB.nonConverted + statsB.rejected;
            
            return totalB - totalA; // Descending order by total
        });

        // --- NY KODE START: Initialize total variables ---
        let sumTotalOffers = 0;
        let sumNonConverted = 0;
        let sumRejected = 0;
        let sumConverted = 0;
        let sumTotalPremium = 0;
        
        // Variables specifically for hitrate calculation (excluding Arbejdsskadeforsikring)
        let hitrateNumerator = 0;
        let hitrateDenominator = 0;
        // --- NY KODE SLUT ---

        sortedProducts.forEach(product => {
            const stats = productStats[product] || { converted: 0, nonConverted: 0, rejected: 0, totalPremium: 0, premiumCount: 0 };
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-100 hover:bg-slate-50';

            const total = stats.converted + stats.nonConverted + stats.rejected;

            // --- Accumulate totals ---
            sumTotalOffers += total;
            sumNonConverted += stats.nonConverted;
            sumRejected += stats.rejected;
            sumConverted += stats.converted;
            sumTotalPremium += stats.totalPremium;

            // Add to hitrate calculation ONLY if not Arbejdsskadeforsikring
            if (product !== 'Arbejdsskadeforsikring') {
                hitrateNumerator += stats.converted;
                hitrateDenominator += total;
            }

            // Calculate average premium
            let avgPremium = '-';
            if (stats.premiumCount > 0) {
                const avgValue = stats.totalPremium / stats.premiumCount;
                avgPremium = formatCurrency(avgValue);
            }

            // Calculate hitrate (blank for Arbejdsskadeforsikring)
            let hitrate = '';
            if (product !== 'Arbejdsskadeforsikring') {
                if (total > 0) {
                    const hitratePercent = Math.round((stats.converted / total) * 100);
                    hitrate = hitratePercent + '%';
                } else {
                    hitrate = '-';
                }
            }

            // Display values for non-converted and rejected (or "-" if no data)
            const displayTotal = total > 0 ? total : '-';
            const displayConverted = stats.converted > 0 ? stats.converted : '-';
            const displayNonConverted = stats.nonConverted > 0 ? stats.nonConverted : '-';
            const displayRejected = stats.rejected > 0 ? stats.rejected : '-';

            row.innerHTML = `
                <td class="py-3 px-4 text-slate-900">${product}</td>
                <td class="py-3 px-4 text-right text-slate-900">${displayTotal}</td>
                <td class="py-3 px-4 text-right text-slate-900">${displayNonConverted}</td>
                <td class="py-3 px-4 text-right text-slate-900">${displayRejected}</td>
                <td class="py-3 px-4 text-right text-slate-900">${displayConverted}</td>
                <td class="py-3 px-4 text-right text-slate-900">${avgPremium}</td>
                <td class="py-3 px-4 text-right text-slate-900 font-semibold">${hitrate}</td>
            `;

            tableBody.appendChild(row);
        });

        // Add Total Row ---
        const totalRow = document.createElement('tr');
        // Styling: Bold text, light gray background (bg-slate-100), top border
        totalRow.className = 'border-t-2 border-slate-300 bg-slate-100 font-bold';

        // Calculate Total Average Premium
        let totalAvgPremium = 0;
        if (sumConverted > 0) {
            totalAvgPremium = sumTotalPremium / sumConverted;
        }

        // Calculate Total Hitrate (Excluding Arbejdsskadeforsikring)
        let totalHitrate = '';
        if (hitrateDenominator > 0) {
            const hitratePercent = Math.round((hitrateNumerator / hitrateDenominator) * 100);
            totalHitrate = hitratePercent + '%';
        } else {
            totalHitrate = '-';
        }

        // Prepare display values (show '-' if 0)
        const displaySumTotal = sumTotalOffers > 0 ? sumTotalOffers : '-';
        const displaySumNonConverted = sumNonConverted > 0 ? sumNonConverted : '-';
        const displaySumRejected = sumRejected > 0 ? sumRejected : '-';
        const displaySumConverted = sumConverted > 0 ? sumConverted : '-';
        const displayTotalAvgPremium = sumConverted > 0 ? formatCurrency(totalAvgPremium) : '-';

        totalRow.innerHTML = `
            <td class="py-3 px-4 text-slate-900">Total</td>
            <td class="py-3 px-4 text-right text-slate-900">${displaySumTotal}</td>
            <td class="py-3 px-4 text-right text-slate-900">${displaySumNonConverted}</td>
            <td class="py-3 px-4 text-right text-slate-900">${displaySumRejected}</td>
            <td class="py-3 px-4 text-right text-slate-900">${displaySumConverted}</td>
            <td class="py-3 px-4 text-right text-slate-900">${displayTotalAvgPremium}</td>
            <td class="py-3 px-4 text-right text-slate-900">${totalHitrate}</td>
        `;

        tableBody.appendChild(totalRow);

        console.log('=== UPDATEADVISORPRODUCTTABLE END ===');
    }

    // Update advisor customer statistics
    function updateAdvisorCustomerStats() {
        console.log('=== UPDATEADVISORCUSTOMERSTATS START ===');
        
        if (!selectedAdvisor) {
            console.log('No advisor selected');
            return;
        }
        
        console.log('Calculating customer stats for advisor:', selectedAdvisor, 'year:', selectedAdvisorCustomerYear);
        
        // Helper function to get unique customer identifier
        function getCustomerIdentifier(item) {
            // Convert CVR to string first (it might be a number)
            const cvrRaw = item.FORSIKRINGSTAGER_CVR;
            const cvr = cvrRaw ? String(cvrRaw).trim() : '';
            if (cvr && cvr !== '') {
                return 'CVR:' + cvr;
            }
            // Convert name to string as well
            const nameRaw = item.FORSIKRINGSTAGER_NAVN;
            const name = nameRaw ? String(nameRaw).trim() : '';
            return 'NAME:' + name;
        }
        
        // Check if data is available (from dashboard.js)
        if (typeof data === 'undefined' || typeof nonConvertedData === 'undefined' || typeof afvisteData === 'undefined') {
            console.log('Sales data not yet loaded, cannot update customer stats');
            return;
        }
        
        // Get all data arrays
        const allConvertedData = data || [];
        const allNonConvertedData = nonConvertedData || [];
        const allAfvisteData = afvisteData || [];
        
        console.log('Total data loaded:', {
            converted: allConvertedData.length,
            nonConverted: allNonConvertedData.length,
            afviste: allAfvisteData.length
        });
        
        // Filter data by selected advisor (using the same logic as other functions)
        const advisorFilteredConverted = allConvertedData.filter(item => {
            const mappedAdvisor = mapSagsbehandlerToInitials(item.SAGSBEHANDLER);
            return mappedAdvisor === selectedAdvisor.id;
        });
        
        const advisorFilteredNonConverted = allNonConvertedData.filter(item => {
            const mappedAdvisor = mapSagsbehandlerToInitials(item.SAGSBEHANDLER);
            return mappedAdvisor === selectedAdvisor.id;
        });
        
        const advisorFilteredAfviste = allAfvisteData.filter(item => {
            const mappedAdvisor = mapSagsbehandlerToInitials(item.SAGSBEHANDLER);
            return mappedAdvisor === selectedAdvisor.id;
        });
        
        console.log('Advisor filtered data:', {
            converted: advisorFilteredConverted.length,
            nonConverted: advisorFilteredNonConverted.length,
            afviste: advisorFilteredAfviste.length
        });
        
        // Apply migrated sales filter
        const convertedNoMigrated = filterMigratedSales(advisorFilteredConverted);
        const nonConvertedNoMigrated = filterMigratedSales(advisorFilteredNonConverted);
        const afvisteNoMigrated = filterMigratedSales(advisorFilteredAfviste);
        
        console.log('After migrated filter:', {
            converted: convertedNoMigrated.length,
            nonConverted: nonConvertedNoMigrated.length,
            afviste: afvisteNoMigrated.length
        });
        
        // Filter by selected year
        const convertedInYear = convertedNoMigrated.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            const date = parseDate(salesDate);
            if (!date) return false;
            return date.getFullYear() === selectedAdvisorCustomerYear;
        });
        
        const nonConvertedInYear = nonConvertedNoMigrated.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            const date = parseDate(salesDate);
            if (!date) return false;
            return date.getFullYear() === selectedAdvisorCustomerYear;
        });
        
        const afvisteInYear = afvisteNoMigrated.filter(item => {
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return false;
            const date = parseDate(salesDate);
            if (!date) return false;
            return date.getFullYear() === selectedAdvisorCustomerYear;
        });
        
        console.log('Filtered by year ' + selectedAdvisorCustomerYear + ':', {
            converted: convertedInYear.length,
            nonConverted: nonConvertedInYear.length,
            afviste: afvisteInYear.length
        });

        // METRIC 1: New Customers in Selected Year
        // Need to look at ALL converted data (all years) for this advisor to find first acceptance
        const allAdvisorConverted = filterMigratedSales(advisorFilteredConverted);
        
        // Build a map of customer -> first acceptance date
        const customerFirstAcceptance = new Map();
        allAdvisorConverted.forEach(item => {
            const customerId = getCustomerIdentifier(item);
            if (!customerId || customerId === 'NAME:' || customerId === 'CVR:') return;
            
            const salesDate = getSalesDate(item);
            if (!salesDate || salesDate.trim() === '') return;
            const date = parseDate(salesDate);
            if (!date) return;
            
            if (!customerFirstAcceptance.has(customerId) || date < customerFirstAcceptance.get(customerId)) {
                customerFirstAcceptance.set(customerId, date);
            }
        });
        
        // Count how many customers have their first acceptance in selected year
        let newCustomersCount = 0;
        customerFirstAcceptance.forEach((firstDate, customerId) => {
            if (firstDate.getFullYear() === selectedAdvisorCustomerYear) {
                newCustomersCount++;
            }
        });
        
        console.log('New customers in ' + selectedAdvisorCustomerYear + ':', newCustomersCount);
        
        // METRIC 2: Hit Rate Per Customer
        // Unique customers with at least 1 acceptance / Total unique customers with any offer
        const customersWithAcceptance = new Set();
        convertedInYear.forEach(item => {
            const customerId = getCustomerIdentifier(item);
            if (customerId && customerId !== 'NAME:' && customerId !== 'CVR:') {
                customersWithAcceptance.add(customerId);
            }
        });
        
        const allCustomers = new Set();
        [...convertedInYear, ...nonConvertedInYear, ...afvisteInYear].forEach(item => {
            const customerId = getCustomerIdentifier(item);
            if (customerId && customerId !== 'NAME:' && customerId !== 'CVR:') {
                allCustomers.add(customerId);
            }
        });
        
        const hitRate = allCustomers.size > 0 
            ? Math.round((customersWithAcceptance.size / allCustomers.size) * 100) 
            : 0;
        
        console.log('Hit rate calculation:', {
            customersWithAcceptance: customersWithAcceptance.size,
            totalCustomers: allCustomers.size,
            hitRate: hitRate + '%'
        });
        
        // METRIC 3: Average Customers With Acceptance Per Month (until last completed month)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 1-12
        
        // Determine how many months to count
        let monthsToCount;
        if (selectedAdvisorCustomerYear < currentYear) {
            // Past year - count all 12 months
            monthsToCount = 12;
        } else if (selectedAdvisorCustomerYear === currentYear) {
            // Current year - count until last completed month
            monthsToCount = currentMonth - 1;
            if (monthsToCount < 1) monthsToCount = 1; // At least count current month if it's January
        } else {
            // Future year - count 0
            monthsToCount = 0;
        }
        
        // Declare variable before if statement to avoid scope issues
        let avgCustomersPerMonth = 0;
        
        if (monthsToCount > 0) {
            const customersPerMonth = [];
            for (let month = 1; month <= monthsToCount; month++) {
                const customersInMonth = new Set();
                convertedInYear.forEach(item => {
                    const salesDate = getSalesDate(item);
                    if (!salesDate || salesDate.trim() === '') return;
                    const date = parseDate(salesDate);
                    if (!date) return;
                    
                    if (date.getMonth() + 1 === month) {
                        const customerId = getCustomerIdentifier(item);
                        if (customerId && customerId !== 'NAME:' && customerId !== 'CVR:') {
                            customersInMonth.add(customerId);
                        }
                    }
                });
                customersPerMonth.push(customersInMonth.size);
            }
            
            const totalCustomers = customersPerMonth.reduce((sum, count) => sum + count, 0);
            avgCustomersPerMonth = monthsToCount > 0 ? (totalCustomers / monthsToCount) : 0;
            
            console.log('Average customers per month:', {
                monthsToCount: monthsToCount,
                customersPerMonth: customersPerMonth,
                average: avgCustomersPerMonth.toFixed(1)
            });
        }
        
        // METRIC 4: Average Policies Per Customer
        const totalPolicies = convertedInYear.length;
        const avgPoliciesPerCustomer = customersWithAcceptance.size > 0 
            ? (totalPolicies / customersWithAcceptance.size) 
            : 0;
        
        console.log('Average policies per customer:', {
            totalPolicies: totalPolicies,
            uniqueCustomers: customersWithAcceptance.size,
            average: avgPoliciesPerCustomer.toFixed(1)
        });
        
        // METRIC 5: Average Premium Per Customer
        let totalPremium = 0;
        let premiumCount = 0;
        convertedInYear.forEach(item => {
            const premium = item.AARLIG_PRAEMIE;
            if (premium && premium !== '') {
                const premiumValue = parseFloat(String(premium).replace(/[^0-9.-]/g, ''));
                if (!isNaN(premiumValue) && premiumValue > 0) {
                    totalPremium += premiumValue;
                    premiumCount++;
                }
            }
        });
        
        const avgPremiumPerCustomer = customersWithAcceptance.size > 0 
            ? (totalPremium / customersWithAcceptance.size) 
            : 0;
        
        console.log('Average premium per customer:', {
            totalPremium: totalPremium,
            uniqueCustomers: customersWithAcceptance.size,
            average: avgPremiumPerCustomer
        });

        // Update the UI with calculated metrics
        const newCustomersElement = document.getElementById('advisor-new-customers');
        const hitrateElement = document.getElementById('advisor-customer-hitrate');
        const avgCustomersPerMonthElement = document.getElementById('advisor-avg-customers-per-month');
        const avgPoliciesElement = document.getElementById('advisor-avg-policies-per-customer');
        const avgPremiumElement = document.getElementById('advisor-avg-premium-per-customer');
        
        if (newCustomersElement) {
            newCustomersElement.textContent = newCustomersCount;
        }
        
        if (hitrateElement) {
            hitrateElement.textContent = hitRate + '%';
        }
        
        if (avgCustomersPerMonthElement) {
            if (monthsToCount > 0) {
                avgCustomersPerMonthElement.textContent = avgCustomersPerMonth.toFixed(1);
            } else {
                avgCustomersPerMonthElement.textContent = '-';
            }
        }
        
        // Update the month label
        const monthLabelElement = document.getElementById('advisor-avg-customers-month-label');
        if (monthLabelElement) {
            if (monthsToCount > 0 && selectedAdvisorCustomerYear === currentYear) {
                // Show which month we calculated until (last completed month)
                const monthNames = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 
                                   'juli', 'august', 'september', 'oktober', 'november', 'december'];
                const lastMonth = monthsToCount; // monthsToCount is currentMonth - 1
                monthLabelElement.textContent = ' - indtil ' + monthNames[lastMonth - 1];
            } else if (monthsToCount === 12) {
                // Full year - show all months
                monthLabelElement.textContent = '';
            } else {
                monthLabelElement.textContent = '';
            }
        }
        
        if (avgPoliciesElement) {
            if (customersWithAcceptance.size > 0) {
                avgPoliciesElement.textContent = avgPoliciesPerCustomer.toFixed(1);
            } else {
                avgPoliciesElement.textContent = '-';
            }
        }
        
        if (avgPremiumElement) {
            if (customersWithAcceptance.size > 0) {
                avgPremiumElement.textContent = formatCurrency(avgPremiumPerCustomer);
            } else {
                avgPremiumElement.textContent = '-';
            }
        }
        
        console.log('=== UPDATEADVISORCUSTOMERSTATS END ===');
    }


});