
// Global chart and data variables
let categoryChart, monthlyChart, weeklyPatternChart, storeComparisonChart, heatmapChart;
let allCategories = [];
let selectedCategories = [];
let categoryBudgets = {}; // For storing budget data
const CHART_COLORS = [
    '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
    '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab',
    '#6b9ac4', '#d1a74f', '#e5767a', '#96c5c2', '#7db06f'
];

// Initialize dates: default to 6 months
const initializeDates = () => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    document.getElementById('startDate').valueAsDate = sixMonthsAgo;
    document.getElementById('endDate').valueAsDate = today;
};

// Format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
    }).format(amount);
};

// Format date
const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-AU');
};

// Format month
const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' });
};

// Format percentage
const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
};

// Get Auth Token
const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

// Check if user is authenticated
const checkAuthentication = () => {
    const token = getAuthToken();
    if (!token) {
        alert('Please log in to view your spending analysis.');
        // Redirect to login page if needed
        // window.location.href = '/login.html';
        return false;
    }
    return true;
};

// Show loading spinner
const showLoading = () => {
    document.getElementById('loadingSpinner').style.display = 'flex';
};

// Hide loading spinner
const hideLoading = () => {
    document.getElementById('loadingSpinner').style.display = 'none';
};

// Fetch data with authentication
const fetchData = async (url) => {
    if (!checkAuthentication()) return null;
    
    const token = getAuthToken();
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            alert('Your session has expired. Please log in again.');
            // Redirect to login page if needed
            // window.location.href = '/login.html';
            return null;
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            console.error('API error:', data.message);
            return null;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
};

const setDateRange = (days) => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);
    
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    document.getElementById('startDate').value = formatDateForInput(startDate);
    document.getElementById('endDate').value = formatDateForInput(today);
    
    // Automatically reload data
    loadAllData();
};

// Specific preset functions
const setLast7Days = () => setDateRange(7);
const setLast30Days = () => setDateRange(30);
const setLast90Days = () => setDateRange(90);

const setThisMonth = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    document.getElementById('startDate').value = formatDateForInput(startOfMonth);
    document.getElementById('endDate').value = formatDateForInput(today);
    
    loadAllData();
};

const setLastMonth = () => {
    const today = new Date();
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    document.getElementById('startDate').value = formatDateForInput(lastMonthStart);
    document.getElementById('endDate').value = formatDateForInput(lastMonthEnd);
    
    loadAllData();
};

// Add event listeners for preset buttons (add this to your initialization)
const setupDatePresets = () => {
    // Add event listeners if buttons exist
    const last7DaysBtn = document.getElementById('preset7Days');
    const last30DaysBtn = document.getElementById('preset30Days');
    const last90DaysBtn = document.getElementById('preset90Days');
    const thisMonthBtn = document.getElementById('presetThisMonth');
    const lastMonthBtn = document.getElementById('presetLastMonth');
    
    if (last7DaysBtn) last7DaysBtn.addEventListener('click', setLast7Days);
    if (last30DaysBtn) last30DaysBtn.addEventListener('click', setLast30Days);
    if (last90DaysBtn) last90DaysBtn.addEventListener('click', setLast90Days);
    if (thisMonthBtn) thisMonthBtn.addEventListener('click', setThisMonth);
    if (lastMonthBtn) lastMonthBtn.addEventListener('click', setLastMonth);
};

// Load all data
const loadAllData = async () => {
    showLoading();
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    try {
        // Load category data
        const categoryData = await fetchData(`/api/spending/by-category?startDate=${startDate}&endDate=${endDate}`);
        if (categoryData) {
            createCategoryChart(categoryData);
            updateSummary(categoryData);
            updateTopCategories(categoryData);
            updateBudgetTrackers(categoryData);
            
            // Save all categories for filtering
            allCategories = categoryData.categories.map(cat => cat.category_name);
            updateCategoryFilter();
        }
        
        // Load monthly data
        const monthlyData = await fetchData('/api/spending/by-month');
        if (monthlyData) {
            createMonthlyChart(monthlyData);
            populateMonthSelector(monthlyData);
        }
        
        // Load day of week data
        const dayData = await fetchData(`/api/spending/by-day?startDate=${startDate}&endDate=${endDate}`);
        if (dayData) {
            createWeeklyPatternChart(dayData);
        }
        
        // Load store data
        const storeData = await fetchData(`/api/spending/by-store?startDate=${startDate}&endDate=${endDate}`);
        if (storeData) {
            createStoreComparisonChart(storeData);
        }
        
        // Load heatmap data
        const heatmapData = await fetchData(`/api/spending/heatmap?startDate=${startDate}&endDate=${endDate}`);
        if (heatmapData) {
            createSpendingHeatmap(heatmapData);
        }
        
        // Load top items
        const topItemsData = await fetchData(`/api/spending/top-items?startDate=${startDate}&endDate=${endDate}`);
        if (topItemsData) {
            populateTopItems(topItemsData);
        }
        
        // Generate savings opportunities
        if (categoryData && storeData) {
            generateSavingsOpportunities(categoryData, storeData);
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading spending data. Please try again later.');
    } finally {
        hideLoading();
    }
};

// Create category chart
const createCategoryChart = (data, chartType = 'bar') => {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    let categories = data.categories;
    
    // Filter categories if we have a selection
    if (selectedCategories.length > 0 && selectedCategories[0] !== 'all') {
        categories = categories.filter(cat => selectedCategories.includes(cat.category_name));
    }
    
    const labels = categories.map(cat => cat.category_name);
    const values = categories.map(cat => cat.total_spent);
    const percentages = categories.map(cat => cat.percentage);
    
    if (chartType === 'bar') {
        categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Spending by Category',
                    data: values,
                    backgroundColor: categories.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const percentage = percentages[context.dataIndex];
                                return `${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else if (chartType === 'pie') {
        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: categories.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const percentage = percentages[context.dataIndex];
                                return `${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const meta = chart.getDatasetMeta(0);
                                        const style = meta.controller.getStyle(i);
                                        
                                        return {
                                            text: `${label} (${percentages[i]}%)`,
                                            fillStyle: style.backgroundColor,
                                            strokeStyle: style.borderColor,
                                            lineWidth: style.borderWidth,
                                            hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    }
                }
            }
        });
    }
};

// Create monthly chart
const createMonthlyChart = (data, chartType = 'line') => {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    const months = data.map(item => formatMonth(item.month));
    const values = data.map(item => item.total_spent);
    
    // For stacked chart, we need to fetch additional data
    if (chartType === 'stacked') {
        fetchData('/api/spending/trends').then(trendsData => {
            if (trendsData) {
                createStackedMonthlyChart(ctx, trendsData);
            }
        });
        return;
    }
    
    const chartConfig = {
        type: chartType,
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Spending',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: chartType === 'line'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.raw)
                    }
                }
            }
        }
    };
    
    monthlyChart = new Chart(ctx, chartConfig);
};

// Create weekly pattern chart
const createWeeklyPatternChart = (data) => {
    const ctx = document.getElementById('weeklyPatternChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (weeklyPatternChart) {
        weeklyPatternChart.destroy();
    }
    
    // Sort days of week in correct order
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    data.sort((a, b) => daysOrder.indexOf(a.day_of_week) - daysOrder.indexOf(b.day_of_week));
    
    const days = data.map(day => day.day_of_week);
    const spending = data.map(day => day.total_spent);
    const counts = data.map(day => day.receipt_count);
    
    // Calculate average per day
    const averages = spending.map((spend, i) => counts[i] > 0 ? spend / counts[i] : 0);
    
    weeklyPatternChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Total Spending',
                    data: spending,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Average per Transaction',
                    data: averages,
                    backgroundColor: 'rgba(255, 159, 64, 0)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    type: 'line',
                    yAxisID: 'y1',
                    pointBackgroundColor: 'rgba(255, 159, 64, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Spending'
                    },
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average'
                    },
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.dataset.label === 'Total Spending') {
                                return `Total: ${formatCurrency(context.raw)}`;
                            } else {
                                return `Average: ${formatCurrency(context.raw)}`;
                            }
                        },
                        afterLabel: (context) => {
                            if (context.dataset.label === 'Total Spending') {
                                const day = days[context.dataIndex];
                                const count = counts[context.dataIndex];
                                return `Transactions: ${count}`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
};

// Create stacked monthly chart
const createStackedMonthlyChart = (ctx, trendsData) => {
    // Destroy existing chart if it exists
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Get unique months and categories
    const months = Array.from(new Set(trendsData.map(item => item.month))).sort();
    const allCategoriesInData = new Set();
    
    trendsData.forEach(month => {
        Object.keys(month.categories).forEach(category => {
            allCategoriesInData.add(category);
        });
    });
    
    const categories = Array.from(allCategoriesInData);
    
    // Prepare datasets for each category
    const datasets = categories.map((category, index) => {
        const data = months.map(month => {
            const monthData = trendsData.find(item => item.month === month);
            return monthData && monthData.categories[category] ? monthData.categories[category] : 0;
        });
        
        return {
            label: category,
            data: data,
            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
            borderColor: CHART_COLORS[index % CHART_COLORS.length],
            borderWidth: 1
        };
    });
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(formatMonth),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });
};

// Update summary section
// Update summary section - FIXED VERSION
// Update summary section - FIXED VERSION
const updateSummary = (data) => {
    console.log('Updating summary with data:', data); // Debug log
    
    // Extract data with proper fallbacks
    const { categories = [], totalSpending = 0, transactionCount = 0 } = data;
    
    // Convert to numbers and handle null/undefined values
    const safeTotal = Number(totalSpending) || 0;
    const safeTransactionCount = Number(transactionCount) || 0;
    
    console.log('Safe values:', { safeTotal, safeTransactionCount }); // Debug log
    
    // Update total spending (multiple elements)
    document.getElementById('totalSpending').textContent = formatCurrency(safeTotal);
    document.getElementById('totalSpendingValue').textContent = formatCurrency(safeTotal);
    
    // Update top category
    if (categories.length > 0) {
        const topCat = categories[0];
        const topCategoryName = topCat.category_name || 'Unknown';
        const topCategoryPercentage = Number(topCat.percentage) || 0;
        
        document.getElementById('topCategory').textContent = topCategoryName;
        document.getElementById('topCategoryValue').textContent = topCategoryName;
        document.getElementById('topCategoryPercent').textContent = `${topCategoryPercentage}% of total`;
        document.getElementById('topCategoryPercent').className = 'trend-indicator';
    } else {
        document.getElementById('topCategory').textContent = 'None';
        document.getElementById('topCategoryValue').textContent = '-';
        document.getElementById('topCategoryPercent').textContent = '';
    }
    
    // Update category count
    document.getElementById('categoryCount').textContent = categories.length;
    
    // Calculate average transaction - FIXED to handle division by zero
    let avgTransactionText = 'N/A';
    if (safeTransactionCount > 0 && safeTotal > 0) {
        const avgTransaction = safeTotal / safeTransactionCount;
        avgTransactionText = formatCurrency(avgTransaction);
    } else if (safeTransactionCount === 0) {
        avgTransactionText = 'No transactions';
    } else {
        avgTransactionText = formatCurrency(0);
    }
    
    document.getElementById('avgTransaction').textContent = avgTransactionText;
    
    // Update additional metrics
    document.getElementById('monthlyAverageValue').textContent = formatCurrency(safeTotal / 6); // Assuming 6 month period
    document.getElementById('transactionCountValue').textContent = safeTransactionCount;
    
    // Update date range
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        const formattedStart = formatDate(startDate);
        const formattedEnd = formatDate(endDate);
        document.getElementById('dateRange').textContent = `${formattedStart} - ${formattedEnd}`;
    } else {
        document.getElementById('dateRange').textContent = 'All Time';
    }
};


// Update top categories list
const updateTopCategories = (data) => {
    const { categories } = data;
    const topCategoriesList = document.getElementById('topCategoriesList');
    topCategoriesList.innerHTML = '';
    
    if (categories.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item text-center text-muted';
        li.textContent = 'No data available';
        topCategoriesList.appendChild(li);
        return;
    }
    
    // Calculate total for top 5 categories
    const top5Total = categories.slice(0, 5).reduce((sum, cat) => sum + cat.total_spent, 0);
    document.getElementById('topCategoriesTotal').textContent = formatCurrency(top5Total);
    
    categories.slice(0, 5).forEach((category, index) => {
        const color = CHART_COLORS[index % CHART_COLORS.length];
        const li = document.createElement('li');
        li.className = 'list-group-item';
        
        // Create progress bar
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress top-categories-progress';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.width = `${category.percentage}%`;
        progressBar.style.backgroundColor = color;
        
        progressBarContainer.appendChild(progressBar);
        
        // Create content
        li.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>
                    <span class="category-color" style="background-color: ${color}"></span>
                    ${category.category_name}
                </div>
                <div>
                    <strong>${formatCurrency(category.total_spent)}</strong>
                    <small class="text-muted ms-2">${category.percentage}%</small>
                </div>
            </div>
        `;
        
        // Add progress bar
        li.appendChild(progressBarContainer);
        
        topCategoriesList.appendChild(li);
    });
};

// Update budget trackers
const updateBudgetTrackers = (data) => {
    const { categories } = data;
    const budgetTrackersElement = document.getElementById('budgetTrackers');
    
    // Load budgets from localStorage
    const savedBudgets = localStorage.getItem('categoryBudgets');
    if (savedBudgets) {
        categoryBudgets = JSON.parse(savedBudgets);
    }
    
    // If no budgets set yet, show a message
    if (Object.keys(categoryBudgets).length === 0) {
        budgetTrackersElement.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-piggy-bank"></i> No budgets set yet. Click the edit button to set up your budgets.
            </div>
        `;
        return;
    }
    
    // Clear current budget trackers
    budgetTrackersElement.innerHTML = '';
    
    // Create budget trackers for each category that has a budget
    categories.forEach(category => {
        if (categoryBudgets[category.category_name]) {
            const budget = categoryBudgets[category.category_name];
            const spent = category.total_spent;
            const remaining = budget - spent;
            const percentUsed = (spent / budget) * 100;
            
            const budgetItem = document.createElement('div');
            budgetItem.className = 'mb-3';
            
            const budgetHeader = document.createElement('div');
            budgetHeader.className = 'budget-section';
            budgetHeader.innerHTML = `
                <div>${category.category_name}</div>
                <div>
                    <span class="${remaining < 0 ? 'text-danger' : ''}">${formatCurrency(spent)} of ${formatCurrency(budget)}</span>
                </div>
            `;
            
            const budgetProgress = document.createElement('div');
            budgetProgress.className = 'budget-progress';
            
            const budgetFill = document.createElement('div');
            budgetFill.className = `budget-fill ${percentUsed > 100 ? 'budget-over' : ''}`;
            budgetFill.style.width = `${Math.min(percentUsed, 100)}%`;
            
            budgetProgress.appendChild(budgetFill);
            
            const budgetFooter = document.createElement('div');
            budgetFooter.className = 'd-flex justify-content-between small';
            budgetFooter.innerHTML = `
                <div>${percentUsed > 100 ? 'Over budget!' : `${Math.round(percentUsed)}% used`}</div>
                <div>${remaining < 0 ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}</div>
            `;
            
            budgetItem.appendChild(budgetHeader);
            budgetItem.appendChild(budgetProgress);
            budgetItem.appendChild(budgetFooter);
            
            budgetTrackersElement.appendChild(budgetItem);
        }
    });
};

// Populate top items table
const populateTopItems = (items) => {
    const topItemsTable = document.getElementById('topItemsTable');
    topItemsTable.innerHTML = '';
    
    if (items.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3" class="text-center text-muted">No data available</td>';
        topItemsTable.appendChild(tr);
        return;
    }
    
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td><span class="badge bg-secondary">${item.category_name}</span></td>
            <td class="text-end">${formatCurrency(item.total_spent)}</td>
        `;
        topItemsTable.appendChild(tr);
    });
};

// Generate savings opportunities
const generateSavingsOpportunities = (categoryData, storeData) => {
    const savingsElement = document.getElementById('savingsOpportunities');
    savingsElement.innerHTML = '';
    
    const opportunities = [];
    
    // Look for high spending categories
    if (categoryData.categories.length > 0) {
        const topCategory = categoryData.categories[0];
        if (topCategory.percentage > 40) {
            opportunities.push({
                type: 'category',
                title: `High spending in ${topCategory.category_name}`,
                description: `${topCategory.percentage}% of your spending is in this category. Consider setting a budget to limit expenses here.`,
                savings: formatCurrency(topCategory.total_spent * 0.1) // Assume 10% potential savings
            });
        }
    }
    
    // Look for stores with high average transaction amounts
    if (storeData.length > 0) {
        const highAvgStores = storeData.filter(store => 
            store.visit_count > 1 && 
            store.avg_per_visit > 50 // Arbitrary threshold
        ).sort((a, b) => b.avg_per_visit - a.avg_per_visit);
        
        if (highAvgStores.length > 0) {
            const topStore = highAvgStores[0];
            opportunities.push({
                type: 'store',
                title: `High spending at ${topStore.store_name}`,
                description: `Average of ${formatCurrency(topStore.avg_per_visit)} per visit. Try making a shopping list before visiting to avoid impulse purchases.`,
                savings: formatCurrency(topStore.avg_per_visit * 0.15) // Assume 15% potential savings
            });
        }
    }
    
    // If we have budget overages, add those as opportunities
    const categories = categoryData.categories;
    const budgetOverages = [];
    
    categories.forEach(category => {
        if (categoryBudgets[category.category_name]) {
            const budget = categoryBudgets[category.category_name];
            const spent = category.total_spent;
            
            if (spent > budget) {
                budgetOverages.push({
                    category: category.category_name,
                    amount: spent - budget
                });
            }
        }
    });
    
    if (budgetOverages.length > 0) {
        budgetOverages.sort((a, b) => b.amount - a.amount);
        const topOverage = budgetOverages[0];
        
        opportunities.push({
            type: 'budget',
            title: `Budget exceeded for ${topOverage.category}`,
            description: `You've gone over budget by ${formatCurrency(topOverage.amount)}. Look for ways to reduce spending in this category.`,
            savings: formatCurrency(topOverage.amount)
        });
    }
    
    // Add a general tip if we don't have specific opportunities
    if (opportunities.length === 0) {
        opportunities.push({
            type: 'general',
            title: 'Track your spending regularly',
            description: 'Regular monitoring helps identify patterns and opportunities for savings.',
            savings: null
        });
    }
    
    // Display opportunities
    opportunities.forEach(opportunity => {
        const card = document.createElement('div');
        card.className = 'card mb-2';
        
        let icon = 'lightbulb';
        if (opportunity.type === 'category') icon = 'tag';
        if (opportunity.type === 'store') icon = 'shop';
        if (opportunity.type === 'budget') icon = 'exclamation-triangle';
        
        card.innerHTML = `
            <div class="card-body p-3">
                <h6 class="mb-2">
                    <i class="bi bi-${icon} me-2"></i>
                    ${opportunity.title}
                </h6>
                <p class="card-text small mb-1">${opportunity.description}</p>
                ${opportunity.savings ? `
                <div class="text-end">
                    <small class="text-success fw-bold">Potential savings: ${opportunity.savings}</small>
                </div>
                ` : ''}
            </div>
        `;
        
        savingsElement.appendChild(card);
    });
};

// Update category filter dropdown
const updateCategoryFilter = () => {
    const menu = document.getElementById('categoryFilterMenu');
    menu.innerHTML = '<li><a class="dropdown-item active" href="#" data-value="all">All Categories</a></li>';
    
    allCategories.forEach(category => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item';
        a.href = '#';
        a.setAttribute('data-value', category);
        a.textContent = category;
        li.appendChild(a);
        menu.appendChild(li);
    });
    
    // Add event listeners
    const items = menu.querySelectorAll('.dropdown-item');
    items.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            items.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            e.target.classList.add('active');
            
            // Update button text
            document.getElementById('categoryFilterBtn').textContent = e.target.textContent;
            
            // Update selected categories
            const value = e.target.getAttribute('data-value');
            selectedCategories = value === 'all' ? ['all'] : [value];
            
            // Refresh category chart
            fetchData(`/api/spending/by-category?startDate=${document.getElementById('startDate').value}&endDate=${document.getElementById('endDate').value}`)
                .then(data => {
                    if (data) {
                        createCategoryChart(data, categoryChart && categoryChart.config._config.type === 'pie' ? 'pie' : 'bar');
                    }
                });
        });
    });
};

// Populate month selector for category comparison
const populateMonthSelector = (data) => {
    const menu = document.getElementById('monthSelectorMenu');
    menu.innerHTML = '';
    
    const months = data.map(item => item.month).sort().reverse();
    
    months.forEach(month => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item';
        a.href = '#';
        a.setAttribute('data-value', month);
        a.textContent = formatMonth(month);
        li.appendChild(a);
        menu.appendChild(li);
    });
    
    // Add event listeners
    const items = menu.querySelectorAll('.dropdown-item');
    items.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            items.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            e.target.classList.add('active');
            
            // Update button text
            document.getElementById('monthSelector').textContent = e.target.textContent;
            
            // Fetch and display category comparison
            const month = e.target.getAttribute('data-value');
            const comparisonData = await fetchData(`/api/spending/category-comparison?month=${month}`);
            
            if (comparisonData) {
                displayCategoryComparison(comparisonData);
            }
        });
    });
    
    // Select the most recent month by default if we have data
    if (items.length > 0) {
        items[0].click();
    }
};

// Display category comparison
const displayCategoryComparison = (data) => {
    const comparisonElement = document.getElementById('categoryComparison');
    comparisonElement.innerHTML = '';
    
    const { currentMonth, previousMonth, comparison } = data;
    
    if (comparison.length === 0) {
        comparisonElement.innerHTML = `
            <div class="text-center text-muted py-5">
                No spending data available for this month
            </div>
        `;
        return;
    }
    
    // Find the maximum spending for scaling
    const maxSpending = Math.max(
        ...comparison.map(item => Math.max(item.currentSpent, item.previousSpent))
    );
    
    // Display each category comparison
    comparison.forEach(item => {
        const container = document.createElement('div');
        container.className = 'mb-4';
        
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center mb-1';
        
        let changeIndicator = '';
        if (item.percentChange !== null) {
            const isIncrease = item.difference > 0;
            const changeClass = isIncrease ? 'trend-up' : 'trend-down';
            const changeIcon = isIncrease ? 'arrow-up' : 'arrow-down';
            changeIndicator = `<span class="${changeClass}"><i class="bi bi-${changeIcon}"></i> ${Math.abs(item.percentChange)}%</span>`;
        }
        
        header.innerHTML = `
            <div>${item.category}</div>
            <div>
                ${formatCurrency(item.currentSpent)} 
                ${changeIndicator}
            </div>
        `;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'comparison-bar';
        
        // Current month bar
        const currentBar = document.createElement('div');
        currentBar.className = 'comparison-fill current-fill';
        currentBar.style.width = `${(item.currentSpent / maxSpending) * 100}%`;
        barContainer.appendChild(currentBar);
        
        // Previous month bar (if there was spending)
        if (item.previousSpent > 0) {
            const previousBar = document.createElement('div');
            previousBar.className = 'comparison-fill previous-fill';
            previousBar.style.width = `${(item.previousSpent / maxSpending) * 100}%`;
            barContainer.appendChild(previousBar);
        }
        
        // Add footnote with previous month info
        const footnote = document.createElement('div');
        footnote.className = 'small text-muted d-flex justify-content-between';
        footnote.innerHTML = `
            <div>Previous: ${formatCurrency(item.previousSpent)}</div>
            <div>Difference: ${formatCurrency(item.difference)}</div>
        `;
        
        container.appendChild(header);
        container.appendChild(barContainer);
        container.appendChild(footnote);
        
        comparisonElement.appendChild(container);
    });
};

// Handle budget editing
const setupBudgetEditing = () => {
    const editButton = document.getElementById('editBudgets');
    const saveButton = document.getElementById('saveBudgets');
    const budgetModal = new bootstrap.Modal(document.getElementById('budgetModal'));
    
    // Open modal with current budgets
    editButton.addEventListener('click', () => {
        const budgetFormItems = document.getElementById('budgetFormItems');
        budgetFormItems.innerHTML = '';
        
        // Create form fields for all categories
        allCategories.forEach(category => {
            const currentBudget = categoryBudgets[category] || '';
            
            const formGroup = document.createElement('div');
            formGroup.className = 'mb-3';
            
            formGroup.innerHTML = `
                <label class="form-label">${category}</label>
                <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" min="0" step="0.01" class="form-control category-budget" 
                           data-category="${category}" value="${currentBudget}">
                </div>
            `;
            
            budgetFormItems.appendChild(formGroup);
        });
        
        budgetModal.show();
    });
    
    // Save updated budgets
    saveButton.addEventListener('click', () => {
        const budgetInputs = document.querySelectorAll('.category-budget');
        const newBudgets = {};
        
        budgetInputs.forEach(input => {
            const category = input.getAttribute('data-category');
            const value = parseFloat(input.value);
            
            if (!isNaN(value) && value > 0) {
                newBudgets[category] = value;
            }
        });
        
        // Save to localStorage
        localStorage.setItem('categoryBudgets', JSON.stringify(newBudgets));
        categoryBudgets = newBudgets;
        
        // Update budget trackers
        fetchData(`/api/spending/by-category?startDate=${document.getElementById('startDate').value}&endDate=${document.getElementById('endDate').value}`)
            .then(data => {
                if (data) {
                    updateBudgetTrackers(data);
                }
            });
        
        budgetModal.hide();
    });
};

// Toggle functionality for charts and sections
const setupToggleButtons = () => {
    // Category chart type toggle
    document.getElementById('categoryChartTypeBar').addEventListener('click', () => {
        fetchData(`/api/spending/by-category?startDate=${document.getElementById('startDate').value}&endDate=${document.getElementById('endDate').value}`)
            .then(data => {
                if (data) {
                    createCategoryChart(data, 'bar');
                }
            });
    });
    
    document.getElementById('categoryChartTypePie').addEventListener('click', () => {
        fetchData(`/api/spending/by-category?startDate=${document.getElementById('startDate').value}&endDate=${document.getElementById('endDate').value}`)
            .then(data => {
                if (data) {
                    createCategoryChart(data, 'pie');
                }
            });
    });
    
    // Monthly chart type toggle
    document.getElementById('monthlyChartTypeLine').addEventListener('click', () => {
        fetchData('/api/spending/by-month')
            .then(data => {
                if (data) {
                    createMonthlyChart(data, 'line');
                }
            });
    });
    
    document.getElementById('monthlyChartTypeBar').addEventListener('click', () => {
        fetchData('/api/spending/by-month')
            .then(data => {
                if (data) {
                    createMonthlyChart(data, 'bar');
                }
            });
    });
    
    document.getElementById('monthlyChartTypeStacked').addEventListener('click', () => {
        fetchData('/api/spending/by-month')
            .then(data => {
                if (data) {
                    createMonthlyChart(data, 'stacked');
                }
            });
    });
    
    // Heatmap view toggle
    document.getElementById('toggleHeatmapView').addEventListener('click', () => {
        const gridView = document.getElementById('heatmapGrid');
        const chartView = document.getElementById('heatmapChartView');
        
        if (gridView.style.display === 'none') {
            gridView.style.display = 'flex';
            chartView.style.display = 'none';
        } else {
            gridView.style.display = 'none';
            chartView.style.display = 'block';
        }
    });
    
    // Top items toggle
    document.getElementById('toggleItemsList').addEventListener('click', () => {
        const button = document.getElementById('toggleItemsList');
        const table = document.getElementById('topItemsTable').parentElement;
        
        if (table.style.maxHeight) {
            table.style.maxHeight = null;
            button.innerHTML = '<i class="bi bi-chevron-down"></i>';
        } else {
            table.style.maxHeight = '400px';
            button.innerHTML = '<i class="bi bi-chevron-up"></i>';
        }
    });
};

// Apply filter button
document.getElementById('applyFilter').addEventListener('click', loadAllData);

// Refresh summary button
document.getElementById('refreshSummary').addEventListener('click', () => {
    fetchData(`/api/spending/by-category?startDate=${document.getElementById('startDate').value}&endDate=${document.getElementById('endDate').value}`)
        .then(data => {
            if (data) {
                updateSummary(data);
                updateTopCategories(data);
            }
        });
});

// Initialize the app
(function() {
    // Set initial dates
    initializeDates();
    
    // Load all data
    loadAllData();
    
    // Setup interactive elements
    setupBudgetEditing();
    setupToggleButtons();
    
    // Add event listener for dropdown items
    document.addEventListener('click', function(e) {
        if (e.target.matches('.dropdown-item') || e.target.closest('.dropdown-item')) {
            const button = e.target.closest('.dropdown-item');
            const dropdownItems = button.closest('.dropdown-menu').querySelectorAll('.dropdown-item');
            
            dropdownItems.forEach(item => {
                item.classList.remove('active');
            });
            
            button.classList.add('active');
        }
    });
})();

// Create store comparison chart
const createStoreComparisonChart = (data) => {
    const ctx = document.getElementById('storeComparisonChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (storeComparisonChart) {
        storeComparisonChart.destroy();
    }
    
    // Sort by total spent
    data.sort((a, b) => b.total_spent - a.total_spent);
    
    // Limit to top 10 for better visibility
    const topStores = data.slice(0, 10);
    
    const storeNames = topStores.map(store => store.store_name);
    const totalSpending = topStores.map(store => store.total_spent);
    const avgPerVisit = topStores.map(store => store.avg_per_visit);
    const visitCounts = topStores.map(store => store.visit_count);
    
    storeComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: storeNames,
            datasets: [
                {
                    label: 'Total Spending',
                    data: totalSpending,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Average per Visit',
                    data: avgPerVisit,
                    backgroundColor: 'rgba(255, 99, 132, 0)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    type: 'line',
                    yAxisID: 'y1',
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value, index) => {
                            // Truncate long store names
                            const name = storeNames[index];
                            return name.length > 15 ? name.substring(0, 15) + '...' : name;
                        }
                    }
                },
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                },
                x1: {
                    position: 'top',
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.dataset.label === 'Total Spending') {
                                return `Total: ${formatCurrency(context.raw)}`;
                            } else {
                                return `Average per Visit: ${formatCurrency(context.raw)}`;
                            }
                        },
                        afterLabel: (context) => {
                            const visits = visitCounts[context.dataIndex];
                            return `Visits: ${visits}`;
                        }
                    }
                }
            }
        }
    });
};

// Create spending heatmap
const createSpendingHeatmap = (data) => {
    // Prepare the heatmap data structure
    const heatmapData = {};
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Initialize structure
    daysOfWeek.forEach(day => {
        heatmapData[day] = {};
        for (let hour = 0; hour < 24; hour++) {
            heatmapData[day][hour] = {
                spending: 0,
                count: 0
            };
        }
    });
    
    // Populate data
    data.forEach(item => {
        if (heatmapData[item.day_of_week] && heatmapData[item.day_of_week][item.hour_of_day]) {
            heatmapData[item.day_of_week][item.hour_of_day].spending += item.total_spent;
            heatmapData[item.day_of_week][item.hour_of_day].count += item.receipt_count;
        }
    });
    
    // Find the maximum spending value for scaling
    let maxSpending = 0;
    daysOfWeek.forEach(day => {
        for (let hour = 0; hour < 24; hour++) {
            const cellSpending = heatmapData[day][hour].spending;
            if (cellSpending > maxSpending) {
                maxSpending = cellSpending;
            }
        }
    });
    
    // Create the visual heatmap grid
    const heatmapElement = document.getElementById('spendingHeatmap');
    heatmapElement.innerHTML = '';
    
    daysOfWeek.forEach(day => {
        for (let hour = 0; hour < 24; hour++) {
            const cell = document.createElement('div');
            cell.classList.add('heatmap-cell');
            
            const spending = heatmapData[day][hour].spending;
            const count = heatmapData[day][hour].count;
            
            // Scale intensity based on maximum value
            const intensity = maxSpending > 0 ? spending / maxSpending : 0;
            cell.style.backgroundColor = `rgba(0, 100, 255, ${intensity})`;
            
            // Add tooltip data
            cell.setAttribute('data-day', day);
            cell.setAttribute('data-hour', hour);
            cell.setAttribute('data-spending', spending);
            cell.setAttribute('data-count', count);
            
            // Add hover event to show details
            cell.addEventListener('mouseover', (e) => {
                const target = e.target;
                const day = target.getAttribute('data-day');
                const hour = parseInt(target.getAttribute('data-hour'));
                const spending = parseFloat(target.getAttribute('data-spending'));
                const count = parseInt(target.getAttribute('data-count'));
                
                const hourFormatted = hour === 0 ? '12 AM' : 
                                     hour < 12 ? `${hour} AM` : 
                                     hour === 12 ? '12 PM' : 
                                     `${hour - 12} PM`;
                
                // Show tooltip (could be enhanced with a custom tooltip library)
                target.setAttribute('title', `${day} at ${hourFormatted}\nSpending: ${formatCurrency(spending)}\nTransactions: ${count}`);
            });
            
            heatmapElement.appendChild(cell);
        }
    });
    
    // Create alternative heatmap chart view
    createHeatmapChart(heatmapData, daysOfWeek, maxSpending);
};

// Create heatmap chart view
const createHeatmapChart = (heatmapData, daysOfWeek, maxSpending) => {
    const ctx = document.getElementById('heatmapChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (heatmapChart) {
        heatmapChart.destroy();
    }
    
    // Prepare data for chart
    const chartData = [];
    daysOfWeek.forEach((day, dayIndex) => {
        for (let hour = 0; hour < 24; hour++) {
            chartData.push({
                x: hour,
                y: dayIndex,
                v: heatmapData[day][hour].spending,
                c: heatmapData[day][hour].count
            });
        }
    });
    
    heatmapChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Spending Heatmap',
                data: chartData,
                backgroundColor: (context) => {
                    const value = context.raw.v;
                    const intensity = maxSpending > 0 ? value / maxSpending : 0;
                    return `rgba(0, 100, 255, ${intensity})`;
                },
                pointRadius: 10,
                pointHoverRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: -0.5,
                    max: 23.5,
                    title: {
                        display: true,
                        text: 'Hour of Day'
                    },
                    ticks: {
                        stepSize: 3,
                        callback: (value) => {
                            if (value % 3 === 0) {
                                return value === 0 ? '12am' : 
                                       value < 12 ? `${value}am` : 
                                       value === 12 ? '12pm' : 
                                       `${value - 12}pm`;
                            }
                            return '';
                        }
                    }
                },
                y: {
                    type: 'linear',
                    min: -0.5,
                    max: 6.5,
                    reverse: true,
                    ticks: {
                        callback: (value) => daysOfWeek[value]
                    },
                    title: {
                        display: true,
                        text: 'Day of Week'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const item = context.raw;
                            const day = daysOfWeek[item.y];
                            const hour = item.x;
                            const hourFormatted = hour === 0 ? '12 AM' : 
                                                hour < 12 ? `${hour} AM` : 
                                                hour === 12 ? '12 PM' : 
                                                `${hour - 12} PM`;
                            return [
                                `${day} at ${hourFormatted}`,
                                `Spending: ${formatCurrency(item.v)}`,
                                `Transactions: ${item.c}`
                            ];
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
};

// Export Report Functions
async function exportReport(format) {
    try {
        // Show loading
        document.getElementById('loadingSpinner').style.display = 'flex';

        // Get current filters
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const categoryId = selectedCategories.length === 1 ? selectedCategories[0] : '';

        // Prepare request data
        const requestData = {
            reportTitle: 'Spending Analysis Report',
            startDate: startDate || null,
            endDate: endDate || null,
            categoryId: categoryId || null,
            reportFormat: format
        };

        // Send request to backend
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:3000/api/reports/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to generate report');
        }

        if (result.success) {
            // Handle different formats
            if (format === 'json') {
                // Display JSON in new window
                const jsonWindow = window.open('', '_blank');
                jsonWindow.document.write('<pre>' + JSON.stringify(result.reportData, null, 2) + '</pre>');
                jsonWindow.document.title = 'Spending Analysis - JSON Export';
            } else {
                // Download file (PDF, CSV, Excel)
                const link = document.createElement('a');
                link.href = result.reportUrl;
                link.download = result.reportUrl.split('/').pop();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // Show success toast
            showExportToast(format, result.message);
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Export error:', error);
        showExportToast(format, 'Failed to export: ' + error.message, true);
    } finally {
        // Hide loading
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

function showExportToast(format, message, isError = false) {
    const toast = document.getElementById('exportToast');
    const toastBody = document.getElementById('exportToastBody');
    const toastHeader = toast.querySelector('.toast-header strong');
    const toastIcon = toast.querySelector('.toast-header i');

    if (isError) {
        toastHeader.textContent = 'Export Failed';
        toastIcon.className = 'bi bi-x-circle-fill text-danger me-2';
        toastBody.textContent = message;
    } else {
        toastHeader.textContent = 'Export Successful';
        toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
        toastBody.textContent = message || `Your ${format.toUpperCase()} report has been generated!`;
    }

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Initialize export button listeners
document.addEventListener('DOMContentLoaded', function() {
    // Export button handlers
    document.getElementById('exportPDF')?.addEventListener('click', (e) => {
        e.preventDefault();
        exportReport('pdf');
    });

    document.getElementById('exportCSV')?.addEventListener('click', (e) => {
        e.preventDefault();
        exportReport('csv');
    });

    document.getElementById('exportExcel')?.addEventListener('click', (e) => {
        e.preventDefault();
        exportReport('excel');
    });

    document.getElementById('exportJSON')?.addEventListener('click', (e) => {
        e.preventDefault();
        exportReport('json');
    });
});