'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CHART INSTANCES ---
    let categoryChart;

    // --- DOM ELEMENTS ---
    const dateFilter = document.getElementById('date-filter');
    const categoryFilter = document.getElementById('category-filter');
    const recordListContainer = document.getElementById('record-list-container');
    const logoutButton = document.getElementById('logout-button');
    const upgradeButton = document.getElementById('upgrade-to-premium-btn');

    // =========================================================================
    // --- API & HELPER FUNCTIONS ---
    // =========================================================================

    async function fetchData(url, options = {}) {
        try {
            const defaultOptions = {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...options.headers },
            };
            const config = { ...defaultOptions, ...options };
            if (config.body && typeof config.body !== 'string') {
                config.body = JSON.stringify(config.body);
            }
            const response = await fetch(url, config);
            if (response.status === 401) {
                window.location.href = '/login';
                return null;
            }
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            if (response.status === 204) return true;
            return response.json();
        } catch (error) {
            console.error(`Failed to fetch from ${url}:`, error);
            return null;
        }
    }

    function formatDate(dateString) {
        return new Date(dateString + 'T00:00:00').toLocaleDateString();
    }
    
    function showNotification(message, type = 'success') {
        console.log(`NOTIFICATION (${type}): ${message}`);
        // Replace with a real toast/notification UI
    }

    // =========================================================================
    // --- DATA LOADING & RENDERING (Standard Features) ---
    // =========================================================================

    async function loadDashboardSummary(filters) {
        const summary = await fetchData(`/api/records/summary?${filters}`);
        if (summary) {
            document.getElementById('total-expenses').textContent = `-$${summary.totalExpenses.toFixed(2)}`;
            document.getElementById('total-revenues').textContent = `+$${summary.totalRevenues.toFixed(2)}`;
            document.getElementById('balance').textContent = `$${summary.balance.toFixed(2)}`;
        }
    }

    async function loadRecentRecords(filters) {
        const records = await fetchData(`/api/records?${filters}&limit=10`);
        if (!records) {
            recordListContainer.innerHTML = '<div class="alert alert-warning">Could not load records.</div>';
            return;
        }
        if (records.length === 0) {
            recordListContainer.innerHTML = '<div class="alert alert-info">No records found.</div>';
            return;
        }
        const recordsHtml = records.map(record => {
            const isExpense = record.type === 'expense';
            const amountClass = isExpense ? 'text-danger' : 'text-success';
            const amountSign = isExpense ? '-' : '+';
            const categoryIcon = record.Category?.icon || 'fas fa-question-circle';
            return `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <i class="${categoryIcon} fa-lg mr-3 text-secondary"></i>
                        <span class="font-weight-bold">${record.name}</span>
                        <small class="text-muted ml-2">${formatDate(record.date)}</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="font-weight-bold mr-3 ${amountClass}">${amountSign}$${record.amount}</span>
                        <a href="/edit-record.html?id=${record.id}" class="btn btn-sm btn-outline-primary mr-2"><i class="fas fa-edit"></i></a>
                        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${record.id}" data-name="${record.name}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>`;
        }).join('');
        recordListContainer.innerHTML = `<div class="list-group">${recordsHtml}</div>`;
    }

    async function loadCategorySummary(filters) {
        const summary = await fetchData(`/api/records/categories?${filters}`);
        const container = document.getElementById('category-summary-container');
        if (!summary || !container) return;
        if (categoryChart) categoryChart.destroy();
        if (summary.length === 0) {
            container.innerHTML = '<p class="text-muted">No expense data for charts.</p>';
            document.getElementById('categoryDonutChart').style.display = 'none';
            return;
        }
        document.getElementById('categoryDonutChart').style.display = 'block';
        container.innerHTML = summary.map(cat => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div><i class="${cat.icon} mr-2 text-secondary"></i>${cat.name}</div>
                <span class="font-weight-bold">-$${parseFloat(cat.totalAmount).toFixed(2)}</span>
            </div>`).join('');
        updateCategoryChart(summary.map(c => c.name), summary.map(c => c.totalAmount));
    }

    function updateCategoryChart(labels, data) {
        const ctx = document.getElementById('categoryDonutChart')?.getContext('2d');
        if (!ctx) return;
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: ['#ff6b81', '#00a8ff', '#4cd137', '#fbc531', '#9c88ff'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // =========================================================================
    // --- INITIALIZATION & EVENT LISTENERS ---
    // =========================================================================
    
    /**
     * **CRITICAL CHANGE**: Checks user role and redirects if premium.
     * If not premium, it shows the upgrade button.
     */
    async function checkUserRoleAndRedirect() {
        const profile = await fetchData('/api/users/me');
        console.log('Fetched user profile for role:', profile);
        if (profile && profile.Role && profile.Role.name === 'premium') {
            // User is premium, redirect to the premium dashboard.
            // Using .html is safer if you aren't using a specific server-side route for '/premium'.
            window.location.href = '/premium';
        } else {
            // User is not premium, make sure the upgrade button is visible
            if(upgradeButton) upgradeButton.style.display = 'block';
        }
    }
    
    async function initializeFilters() {
        const categories = await fetchData('/api/records/categories');
        if (categories) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categoryFilter.appendChild(option);
            });
        }
        dateFilter.innerHTML = '<option value="">All Time</option><option value="2025-06">June 2025</option><option value="2025-05">May 2025</option>';
    }

    /**
     * Handles any filter change.
     * THIS FUNCTION HAS BEEN FIXED.
     */
    async function handleFilterChange() {
        // This is a more robust way to build query strings than the previous regex method.
        // It correctly handles cases where one or both filters are empty.
        const params = new URLSearchParams();
        if (categoryFilter.value) {
            params.append('categoryId', categoryFilter.value);
        }
        if (dateFilter.value) {
            params.append('date', dateFilter.value);
        }
        
        const filterString = params.toString();

        loadDashboardSummary(filterString);
        loadRecentRecords(filterString);
        loadCategorySummary(filterString);
    }
    
    async function handleUpgradeClick() {
        const order = await fetchData('/api/payments/create-order', { method: 'POST' });
        if (!order) {
            showNotification('Could not create payment order.', 'error');
            return;
        }
        const options = {
            key: "rzp_test_9WxtwyYeUJJ9NE",
            order_id: order.id,
            handler: async (response) => {
                const result = await fetchData('/api/payments/verify', { method: 'POST', body: response });
                if (result) {
                    showNotification(result.message || 'Payment successful!', 'success');
                    setTimeout(() => window.location.reload(), 1500); // Reload to trigger redirect
                } else {
                    showNotification('Payment verification failed.', 'error');
                }
            },
        };
        new Razorpay(options).open();
    }
    
    async function handleDeleteRecord(recordId) {
        const result = await fetchData(`/api/records/${recordId}`, { method: 'DELETE' });
        if (result) {
            showNotification('Record deleted.', 'success');
            handleFilterChange();
        } else {
            showNotification('Failed to delete record.', 'error');
        }
    }
    
    function setupEventListeners() {
        dateFilter.addEventListener('change', handleFilterChange);
        categoryFilter.addEventListener('change', handleFilterChange);
        if(upgradeButton) upgradeButton.addEventListener('click', handleUpgradeClick);
        
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await fetchData('/api/users/logout', { method: 'POST' });
            window.location.href = '/login';
        });

        recordListContainer.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                if (confirm(`Delete "${deleteButton.dataset.name}"?`)) {
                    handleDeleteRecord(deleteButton.dataset.id);
                }
            }
        });
    }

    async function init() {
        // First, check the user's role. This will redirect if they are premium.
        // The rest of the code will only run for standard users.
        await checkUserRoleAndRedirect();
        
        setupEventListeners();
        await initializeFilters();
        await handleFilterChange();
    }

    init();
});


