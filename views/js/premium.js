document.addEventListener('DOMContentLoaded', () => {
    const APP_STATE = {
        currentUserId: null,
        charts: {
            category: null,
            monthlyTrend: null
        },
        isLoading: false
    };

    const CHART_COLORS = {
        primary: ['#ff6b81', '#00a8ff', '#4cd137', '#fbc531', '#9c88ff', '#ff9ff3', '#54a0ff'],
        revenue: '#28a745',
        expense: '#dc3545'
    };

    // =========================================================================
    // --- DOM ELEMENTS ---
    // =========================================================================
    const DOM = {
        dateFilter: document.getElementById('date-filter'),
        categoryFilter: document.getElementById('category-filter'),
        recordListContainer: document.getElementById('record-list-container'),
        logoutButton: document.getElementById('logout-button'),
        leaderboardContainer: document.getElementById('leaderboard-container'),
        totalExpenses: document.getElementById('total-expenses'),
        totalRevenues: document.getElementById('total-revenues'),
        balance: document.getElementById('balance'),
        categoryChart: document.getElementById('categoryDonutChart'),
        monthlyTrendChart: document.getElementById('monthlyTrendChart'),
        categorySummaryContainer: document.getElementById('category-summary-container'),
        darkModeSwitch: document.getElementById('darkModeSwitch'),
        darkModeStylesheet: document.getElementById('dark-mode-stylesheet')

    };

    // =========================================================================
    // --- UTILITY FUNCTIONS ---
    // =========================================================================
    
    /**
     * Enhanced fetch function with better error handling and loading states
     */
    async function fetchData(url, options = {}) {
        try {
            const defaultOptions = {
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json', 
                    ...options.headers 
                },
            };
            
            const config = { ...defaultOptions, ...options };
            
            if (config.body && typeof config.body !== 'string') {
                config.body = JSON.stringify(config.body);
            }

            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401 || response.status === 403) {
                console.warn('Authentication failed, redirecting to login');
                window.location.href = '/login';
                return null;
            }

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Handle no content responses
            if (response.status === 204) return true;
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error(`API Error [${url}]:`, error.message);
            showNotification(`Failed to load data: ${error.message}`, 'error');
            return null;
        }
    }

      const setDarkMode = (isEnabled) => {
        // Check if elements exist before using them
        if (!DOM.darkModeStylesheet) {
            console.error('Dark mode stylesheet element not found');
            return;
        }

        // Toggle dark mode class on body
        document.body.classList.toggle('dark-mode', isEnabled);
        
        // Enable/disable dark mode stylesheet
        DOM.darkModeStylesheet.disabled = !isEnabled;
        
        // Save preference to localStorage (with error handling)
        try {
            localStorage.setItem('darkMode', isEnabled ? 'enabled' : 'disabled');
        } catch (error) {
            console.warn('Could not save dark mode preference:', error);
        }
        
        // Update chart colors if charts exist
        updateChartColors(isEnabled);
    };

    const updateChartColors = (isDarkMode) => {
        // Only update if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, skipping chart color update');
            return;
        }

        let textColor, gridColor;
        
        if (isDarkMode) {
            // Get CSS custom properties for dark mode
            const bodyStyles = getComputedStyle(document.body);
            textColor = bodyStyles.getPropertyValue('--chart-text-color').trim() || '#ffffff';
            gridColor = bodyStyles.getPropertyValue('--chart-grid-color').trim() || 'rgba(255, 255, 255, 0.1)';
        } else {
            // Light mode colors
            textColor = '#6c757d';
            gridColor = 'rgba(0, 0, 0, 0.1)';
        }

        // Update Chart.js defaults
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;

        // Update existing charts if they exist
        if (APP_STATE.charts.category) {
            APP_STATE.charts.category.update();
        }
        if (APP_STATE.charts.monthlyTrend) {
            APP_STATE.charts.monthlyTrend.update();
        }
    };

    const initDarkMode = () => {
        // Check if dark mode switch exists
        if (!DOM.darkModeSwitch) {
            console.error('Dark mode switch element not found');
            return;
        }

        // Get saved preference with fallback
        let savedMode;
        try {
            savedMode = localStorage.getItem('darkMode');
        } catch (error) {
            console.warn('Could not access localStorage:', error);
            savedMode = null;
        }
        
        // Default to system preference if no saved preference
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isEnabled = savedMode === 'enabled' || (savedMode === null && systemPrefersDark);
        
        // Set initial state
        DOM.darkModeSwitch.checked = isEnabled;
        setDarkMode(isEnabled);

        // Add event listener for toggle
        DOM.darkModeSwitch.addEventListener('change', (e) => {
            setDarkMode(e.target.checked);
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't set a preference
                try {
                    const userPreference = localStorage.getItem('darkMode');
                    if (!userPreference) {
                        DOM.darkModeSwitch.checked = e.matches;
                        setDarkMode(e.matches);
                    }
                } catch (error) {
                    console.warn('Could not check user preference:', error);
                }
            });
        }
    };

    function formatDate(dateString) {
        try {
            if (!dateString) return 'Invalid Date';
            const date = new Date(dateString + 'T00:00:00');
            return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid Date';
        }
    }
    
    function showNotification(message, type = 'success') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification-container');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification-container';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 300px;
            `;
            document.body.appendChild(notification);
        }

        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-success';
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert ${alertClass} alert-dismissible fade show`;
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert">
                <span>&times;</span>
            </button>
        `;
        
        notification.appendChild(alertElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 5000);
    }

   
    function formatCurrency(amount) {
        try {
            const num = parseFloat(amount);
            return isNaN(num) ? '0.00' : num.toFixed(2);
        } catch (error) {
            console.error('Currency formatting error:', error);
            return '0.00';
        }
    }

    function setLoadingState(isLoading) {
        APP_STATE.isLoading = isLoading;
        const buttons = document.querySelectorAll('button:not(.close)');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
        });
    }

    function destroyChart(chartName) {
        if (APP_STATE.charts[chartName]) {
            try {
                APP_STATE.charts[chartName].destroy();
            } catch (error) {
                console.error(`Error destroying ${chartName} chart:`, error);
            }
            APP_STATE.charts[chartName] = null;
        }
    }

  
    function updateCategoryChart(labels, data) {
        if (!DOM.categoryChart) return;
        
        const ctx = DOM.categoryChart.getContext('2d');
        if (!ctx) return;

        destroyChart('category');

        try {
            APP_STATE.charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: CHART_COLORS.primary,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: $${formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    }
                }
            });
            
            DOM.categoryChart.style.display = 'block';
        } catch (error) {
            console.error('Category chart creation error:', error);
            DOM.categoryChart.style.display = 'none';
        }
    }

    async function loadDashboardSummary(filters) {
        try {
            const summary = await fetchData(`/api/records/summary?${filters}`);
            
            if (summary && DOM.totalExpenses && DOM.totalRevenues && DOM.balance) {
                DOM.totalExpenses.textContent = `-$${formatCurrency(summary.totalExpenses)}`;
                DOM.totalRevenues.textContent = `+$${formatCurrency(summary.totalRevenues)}`;
                DOM.balance.textContent = `$${formatCurrency(summary.balance)}`;
                
                // Update balance color based on positive/negative
                const balanceValue = parseFloat(summary.balance);
                DOM.balance.className = balanceValue >= 0 ? 'text-success' : 'text-danger';
            }
        } catch (error) {
            console.error('Dashboard summary loading error:', error);
        }
    }

    /**
     * Load recent records with enhanced error handling
     */
    async function loadRecentRecords(filters) {
        if (!DOM.recordListContainer) return;
        
        try {
            // Show loading state
            DOM.recordListContainer.innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading records...</span>
                    </div>
                </div>
            `;

            const records = await fetchData(`/api/records?${filters}&limit=10`);
            
            if (!records) {
                DOM.recordListContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Could not load records. Please try again.
                    </div>
                `;
                return;
            }

            if (records.length === 0) {
                DOM.recordListContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle mr-2"></i>
                        No records found for the selected filters.
                    </div>
                `;
                return;
            }

            const recordsHtml = records.map(record => {
                const isExpense = record.type === 'expense';
                const amountClass = isExpense ? 'text-danger' : 'text-success';
                const amountSign = isExpense ? '-' : '+';
                const categoryIcon = record.Category?.icon || 'fas fa-question-circle';
                const categoryName = record.Category?.name || 'Uncategorized';

                return `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="${categoryIcon} fa-lg mr-3 text-secondary"></i>
                            <div>
                                <span class="font-weight-bold">${record.name || 'Unnamed Record'}</span>
                                <br>
                                <small class="text-muted">
                                    ${formatDate(record.date)} • ${categoryName}
                                </small>
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="font-weight-bold mr-3 ${amountClass}">
                                ${amountSign}$${formatCurrency(record.amount)}
                            </span>
                            <div class="btn-group">
                                <a href="/edit-record.html?id=${record.id}" 
                                   class="btn btn-sm btn-outline-primary" 
                                   title="Edit Record">
                                    <i class="fas fa-edit"></i>
                                </a>
                                <button class="btn btn-sm btn-outline-danger delete-btn" 
                                        data-id="${record.id}" 
                                        data-name="${record.name || 'this record'}"
                                        title="Delete Record">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            DOM.recordListContainer.innerHTML = `<div class="list-group">${recordsHtml}</div>`;
            
        } catch (error) {
            console.error('Recent records loading error:', error);
            DOM.recordListContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Error loading records: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Load category summary with enhanced error handling
     */
    async function loadCategorySummary(filters) {
        if (!DOM.categorySummaryContainer) return;
        
        try {
            const summary = await fetchData(`/api/records/categories?${filters}`);
            
            destroyChart('category');
            
            if (!summary) {
                DOM.categorySummaryContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Could not load category data.
                    </div>
                `;
                if (DOM.categoryChart) DOM.categoryChart.style.display = 'none';
                return;
            }

            if (summary.length === 0) {
                DOM.categorySummaryContainer.innerHTML = `
                    <div class="text-muted text-center p-3">
                        <i class="fas fa-chart-pie fa-2x mb-2"></i>
                        <p>No expense data available for the selected period.</p>
                    </div>
                `;
                if (DOM.categoryChart) DOM.categoryChart.style.display = 'none';
                return;
            }

            // Update summary list
            const summaryHtml = summary.map(cat => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                    <div class="d-flex align-items-center">
                        <i class="${cat.icon || 'fas fa-question-circle'} mr-2 text-secondary"></i>
                        <span>${cat.name || 'Uncategorized'}</span>
                    </div>
                    <span class="font-weight-bold text-danger">
                        -$${formatCurrency(cat.totalAmount)}
                    </span>
                </div>
            `).join('');

            DOM.categorySummaryContainer.innerHTML = summaryHtml;

            // Update chart
            updateCategoryChart(
                summary.map(c => c.name || 'Uncategorized'), 
                summary.map(c => parseFloat(c.totalAmount) || 0)
            );

        } catch (error) {
            console.error('Category summary loading error:', error);
            if (DOM.categorySummaryContainer) {
                DOM.categorySummaryContainer.innerHTML = `
                    <div class="alert alert-danger">
                        Error loading categories: ${error.message}
                    </div>
                `;
            }
        }
    }

    /**
     * Load monthly trend chart with enhanced error handling
     */
    async function loadMonthlyTrendChart(filters) {
        if (!DOM.monthlyTrendChart) return;
        
        try {
            const trendData = await fetchData(`/api/records/monthly-trend?${filters}`);
            const ctx = DOM.monthlyTrendChart.getContext('2d');
            
            if (!ctx) return;

            destroyChart('monthlyTrend');

            if (!trendData || !trendData.labels || trendData.labels.length === 0) {
                DOM.monthlyTrendChart.style.display = 'none';
                return;
            }

            DOM.monthlyTrendChart.style.display = 'block';

            APP_STATE.charts.monthlyTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trendData.labels,
                    datasets: [
                        {
                            label: 'Total Revenues',
                            data: trendData.revenues || [],
                            borderColor: CHART_COLORS.revenue,
                            backgroundColor: `${CHART_COLORS.revenue}20`,
                            fill: true,
                            tension: 0.4,
                        },
                        {
                            label: 'Total Expenses',
                            data: trendData.expenses || [],
                            borderColor: CHART_COLORS.expense,
                            backgroundColor: `${CHART_COLORS.expense}20`,
                            fill: true,
                            tension: 0.4,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + formatCurrency(value);
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: $${formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                }
            });

        } catch (error) {
            console.error('Monthly trend chart loading error:', error);
            if (DOM.monthlyTrendChart) {
                DOM.monthlyTrendChart.style.display = 'none';
            }
        }
    }

    /**
     * Load leaderboard with enhanced error handling and UI
     */
    async function loadLeaderboard() {
        if (!DOM.leaderboardContainer) return;
        
        try {
            // Show loading state
            DOM.leaderboardContainer.innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading leaderboard...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading leaderboard...</p>
                </div>
            `;

            const leaderboardData = await fetchData('/api/users/leaderboard');

            if (!leaderboardData) {
                DOM.leaderboardContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Could not load leaderboard. Please try again.
                    </div>
                `;
                return;
            }
            
            if (leaderboardData.length === 0) {
                DOM.leaderboardContainer.innerHTML = `
                    <div class="alert alert-info text-center">
                        <i class="fas fa-trophy fa-2x mb-2"></i>
                        <p>Not enough data to display a leaderboard yet.</p>
                        <small class="text-muted">Start adding expense records to see rankings!</small>
                    </div>
                `;
                return;
            }

            const leaderboardHtml = leaderboardData.map((user, index) => {
                const isCurrentUser = user.id === APP_STATE.currentUserId;
                const itemClass = isCurrentUser ? 'list-group-item-primary' : '';
                const rank = index + 1;
                let rankBadge;

                if (rank === 1) {
                    rankBadge = `<span class="badge badge-warning badge-pill"><i class="fas fa-trophy"></i> 1</span>`;
                } else if (rank === 2) {
                    rankBadge = `<span class="badge badge-secondary badge-pill">2</span>`;
                } else if (rank === 3) {
                    rankBadge = `<span class="badge badge-danger badge-pill">3</span>`;
                } else {
                    rankBadge = `<span class="badge badge-light badge-pill">${rank}</span>`;
                }

                const username = user.username || user.name || 'Unknown User';
                const totalExpenses = formatCurrency(user.totalExpenses);

                return `
                    <li class="list-group-item d-flex justify-content-between align-items-center ${itemClass}">
                        <div class="d-flex align-items-center">
                            ${rankBadge}
                            <div class="ml-3">
                                <strong>${username}</strong>
                                ${isCurrentUser ? '<span class="badge badge-primary ml-2">You</span>' : ''}
                            </div>
                        </div>
                        <span class="font-weight-bold text-danger">-$${totalExpenses}</span>
                    </li>
                `;
            }).join('');

            DOM.leaderboardContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-trophy mr-2"></i>
                            Top Spenders
                        </h5>
                    </div>
                    <ul class="list-group list-group-flush">${leaderboardHtml}</ul>
                </div>
            `;

        } catch (error) {
            console.error('Leaderboard loading error:', error);
            if (DOM.leaderboardContainer) {
                DOM.leaderboardContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        Error loading leaderboard: ${error.message}
                    </div>
                `;
            }
        }
    }

    // =========================================================================
    // --- FILTER MANAGEMENT ---
    // =========================================================================
    
    /**
     * Initialize filter dropdowns with error handling
     */
    async function initializeFilters() {
        try {
            // Initialize category filter
            if (DOM.categoryFilter) {
                const categories = await fetchData('/api/records/categories');
                
                DOM.categoryFilter.innerHTML = '<option value="">All Categories</option>';
                
                if (categories && Array.isArray(categories)) {
                    categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.name || 'Unnamed Category';
                        DOM.categoryFilter.appendChild(option);
                    });
                }
            }

            // Initialize date filter with dynamic months
            if (DOM.dateFilter) {
                const currentDate = new Date();
                const months = [];
                
                // Generate last 6 months
                for (let i = 0; i < 6; i++) {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    months.push({ value: `${year}-${month}`, label: monthName });
                }

                DOM.dateFilter.innerHTML = '<option value="">All Time</option>' +
                    months.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
            }

        } catch (error) {
            console.error('Filter initialization error:', error);
            showNotification('Failed to initialize filters', 'warning');
        }
    }

    /**
     * Handle filter changes with debouncing
     */
    let filterTimeout;
    async function handleFilterChange() {
        // Clear previous timeout
        if (filterTimeout) {
            clearTimeout(filterTimeout);
        }

        // Debounce the filter change
        filterTimeout = setTimeout(async () => {
            try {
                setLoadingState(true);

                const params = new URLSearchParams();
                if (DOM.categoryFilter?.value) params.append('categoryId', DOM.categoryFilter.value);
                if (DOM.dateFilter?.value) params.append('date', DOM.dateFilter.value);
                
                const filterString = params.toString();
                
                // Load all data in parallel
                await Promise.all([
                    loadDashboardSummary(filterString),
                    loadRecentRecords(filterString),
                    loadCategorySummary(filterString),
                    loadMonthlyTrendChart(filterString)
                ]);

            } catch (error) {
                console.error('Filter change error:', error);
                showNotification('Error applying filters', 'error');
            } finally {
                setLoadingState(false);
            }
        }, 300); // 300ms debounce
    }

    // =========================================================================
    // --- EVENT HANDLERS ---
    // =========================================================================
    
    /**
     * Handle record deletion with confirmation
     */
    async function handleDeleteRecord(recordId, recordName) {
        if (!recordId) return;

        const confirmMessage = `Are you sure you want to delete "${recordName}"? This action cannot be undone.`;
        
        if (!confirm(confirmMessage)) return;

        try {
            setLoadingState(true);
            
            const result = await fetchData(`/api/records/${recordId}`, { method: 'DELETE' });
            
            if (result) {
                showNotification('Record deleted successfully.', 'success');
                // Refresh all data after deleting
                await handleFilterChange();
                // Also refresh leaderboard as it might be affected
                await loadLeaderboard();
            }
            
        } catch (error) {
            console.error('Delete record error:', error);
            showNotification('Failed to delete record. Please try again.', 'error');
        } finally {
            setLoadingState(false);
        }
    }

    /**
     * Setup all event listeners with error handling
     */
    function setupEventListeners() {
        try {
            // Filter change listeners
            if (DOM.dateFilter) {
                DOM.dateFilter.addEventListener('change', handleFilterChange);
            }
            
            if (DOM.categoryFilter) {
                DOM.categoryFilter.addEventListener('change', handleFilterChange);
            }

            // Logout button
            if (DOM.logoutButton) {
                DOM.logoutButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await fetchData('/api/users/logout', { method: 'POST' });
                        window.location.href = '/login';
                    } catch (error) {
                        console.error('Logout error:', error);
                        // Still redirect even if logout fails
                        window.location.href = '/login';
                    }
                });
            }

            // Record list click handler (for delete buttons)
            if (DOM.recordListContainer) {
                DOM.recordListContainer.addEventListener('click', (e) => {
                    const deleteButton = e.target.closest('.delete-btn');
                    if (deleteButton) {
                        const recordId = deleteButton.dataset.id;
                        const recordName = deleteButton.dataset.name || 'this record';
                        handleDeleteRecord(recordId, recordName);
                    }
                });
            }

            // Global error handler
            window.addEventListener('error', (e) => {
                console.error('Global error:', e.error);
                showNotification('An unexpected error occurred', 'error');
            });

            // Handle unhandled promise rejections
            window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled promise rejection:', e.reason);
                showNotification('An unexpected error occurred', 'error');
            });

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    // =========================================================================
    // --- INITIALIZATION ---
    // =========================================================================
    
    /**
     * Initialize the premium dashboard
     */
    async function initPremiumDashboard() {
        try {
            setLoadingState(true);

            // Fetch current user's profile
            const profile = await fetchData('/api/users/me');
            if (profile) {
                APP_STATE.currentUserId = profile.id;
                console.log('User authenticated:', profile.username || profile.email);
            } else {
                console.error('Failed to load user profile');
                return;
            }

            // Setup event listeners first
            setupEventListeners();

            // Initialize filters
            await initializeFilters();

            // Load initial data
            await Promise.all([
                handleFilterChange(), // This loads summary, records, categories, and trends
                loadLeaderboard()
            ]);

            showNotification('Dashboard loaded successfully!', 'success');

        } catch (error) {
            console.error('Dashboard initialization error:', error);
            showNotification('Failed to initialize dashboard', 'error');
        } finally {
            setLoadingState(false);
        }
    }

    // =========================================================================
    // --- CLEANUP ---
    // =========================================================================
    
    /**
     * Cleanup function for page unload
     */
    window.addEventListener('beforeunload', () => {
        // Destroy charts to prevent memory leaks
        Object.keys(APP_STATE.charts).forEach(chartName => {
            destroyChart(chartName);
        });
    });

    initDarkMode();
    initPremiumDashboard();
});