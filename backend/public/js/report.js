document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('authToken');
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    // Set up auth links
    loginLink.style.display = 'none';
    logoutLink.style.display = 'inline';
    
    // Add logout functionality
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login.html';
    });
    
    // Format selector
    const formatOptions = document.querySelectorAll('.report-format-option');
    const reportFormatInput = document.getElementById('reportFormat');
    
    formatOptions.forEach(option => {
        option.addEventListener('click', function() {
            formatOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            reportFormatInput.value = this.dataset.format;
            
            // Show appropriate preview based on format
            updatePreview(this.dataset.format);
        });
    });
    
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('startDate').value = formatDateForInput(thirtyDaysAgo);
    document.getElementById('endDate').value = formatDateForInput(today);
    
    // Load categories
    loadCategories();
    
    // Report form submission
    const reportForm = document.getElementById('reportForm');
    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        generateReport();
    });
    
    // Initialize report history
    loadRecentReports();
    
    // Set up refresh button
    document.getElementById('refreshReportsBtn').addEventListener('click', loadRecentReports);
    
    // Initialize date input change listeners
    document.getElementById('startDate').addEventListener('change', updatePreview);
    document.getElementById('endDate').addEventListener('change', updatePreview);
    document.getElementById('categoryFilter').addEventListener('change', updatePreview);
    document.getElementById('reportTitle').addEventListener('input', updatePreview);
    
    // Initial preview update
    updatePreview('pdf');
});

// Load categories for the filter dropdown
async function loadCategories() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/spending/summary', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const categoryFilter = document.getElementById('categoryFilter');
            
            // Clear existing options except the "All Categories" option
            while (categoryFilter.options.length > 1) {
                categoryFilter.remove(1);
            }
            
            // Add categories from API
            if (data.categories && data.categories.length > 0) {
                data.categories.forEach(categoryName => {
                    const option = document.createElement('option');
                    option.value = getCategoryIdFromName(categoryName);
                    option.textContent = categoryName;
                    categoryFilter.appendChild(option);
                });
            } else {
                // Fallback to dummy data if no categories available
                const dummyCategories = [
                    { id: 1, name: "Groceries" },
                    { id: 2, name: "Electronics" },
                    { id: 3, name: "Clothing & Accessories" },
                    { id: 4, name: "Food & Dining" },
                    { id: 5, name: "Household Items" }
                ];
                
                dummyCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categoryFilter.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Failed to load categories. Please try again later.');
    }
}

// Helper function to get category ID from name (simple mapping)
function getCategoryIdFromName(categoryName) {
    const categoryMap = {
        "Groceries": 1,
        "Electronics": 2,
        "Clothing & Accessories": 3,
        "Food & Dining": 4,
        "Household Items": 5,
        "Health & Beauty": 6,
        "Office Supplies": 7,
        "Entertainment": 8,
        "Transportation": 9,
        "Services": 10,
        "Others": 11
    };
    
    return categoryMap[categoryName] || 11; // Default to "Others" if not found
}

// Generate the report
async function generateReport() {
    try {
        // Show loading overlay
        document.getElementById('loadingOverlay').style.display = 'flex';
        
        // Clear previous results and errors
        document.getElementById('reportResults').innerHTML = '';
        document.getElementById('reportResults').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Get form data
        const formData = new FormData(document.getElementById('reportForm'));
        const formObject = {};
        formData.forEach((value, key) => { formObject[key] = value });
        
        // Add AI insights toggle
        const aiToggle = document.getElementById('enableAiInsights');
        if (aiToggle) {
            formObject.includeAiInsights = aiToggle.checked ? 'true' : 'false';
        }
        
        console.log('Generating report with data:', formObject);
        
        // Send request
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:3000/api/reports/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formObject)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to generate report');
        }
        
        if (result.success) {
            // Handle different report formats
            if (formObject.reportFormat === 'pdf') {
                displayPDFResults(result);
            } else if (formObject.reportFormat === 'csv') {
                displayCSVResults(result);
            } else if (formObject.reportFormat === 'excel') {
                displayExcelResults(result);
            } else if (formObject.reportFormat === 'json') {
                displayJSONResults(result);
            }

            // Update report history
            loadRecentReports();
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showError(error.message || 'Failed to generate report. Please try again later.');
    } finally {
        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';
    }
 }
 
// Display PDF download link
function displayPDFResults(result) {
    const reportResults = document.getElementById('reportResults');
    reportResults.style.display = 'block';

    reportResults.innerHTML = `
        <div class="report-success">
            <div class="success-icon">
                <i class="bi bi-check-circle"></i>
            </div>
            <h3>PDF Report Generated Successfully!</h3>
            <p>Your PDF report is ready to download.</p>
            <div class="mt-4">
                <a href="${result.reportUrl}" class="btn btn-primary" target="_blank">
                    <i class="bi bi-download"></i> Download PDF Report
                </a>
                <a href="${result.reportUrl}" class="btn btn-outline-secondary ms-2" target="_blank">
                    <i class="bi bi-eye"></i> View PDF
                </a>
            </div>
            <div class="mt-3 small text-muted">
                Generated on: ${new Date().toLocaleString()}
            </div>
        </div>
    `;
}

// Display CSV download link
function displayCSVResults(result) {
    const reportResults = document.getElementById('reportResults');
    reportResults.style.display = 'block';

    reportResults.innerHTML = `
        <div class="report-success">
            <div class="success-icon">
                <i class="bi bi-check-circle"></i>
            </div>
            <h3>CSV Report Generated Successfully!</h3>
            <p>Your CSV file is ready to download and can be opened in Excel, Google Sheets, or Numbers.</p>
            <div class="mt-4">
                <a href="${result.reportUrl}" class="btn btn-primary" download>
                    <i class="bi bi-download"></i> Download CSV File
                </a>
            </div>
            <div class="mt-3 small text-muted">
                Generated on: ${new Date().toLocaleString()}<br>
                Format: Comma-Separated Values (.csv)
            </div>
        </div>
    `;
}

// Display Excel download link
function displayExcelResults(result) {
    const reportResults = document.getElementById('reportResults');
    reportResults.style.display = 'block';

    reportResults.innerHTML = `
        <div class="report-success">
            <div class="success-icon">
                <i class="bi bi-check-circle"></i>
            </div>
            <h3>Excel Report Generated Successfully!</h3>
            <p>Your Excel workbook is ready with multiple formatted sheets including Summary, Categories, Top Stores, Top Items, and Monthly Trends.</p>
            <div class="mt-4">
                <a href="${result.reportUrl}" class="btn btn-primary" download>
                    <i class="bi bi-download"></i> Download Excel Workbook
                </a>
            </div>
            <div class="mt-3 small text-muted">
                Generated on: ${new Date().toLocaleString()}<br>
                Format: Microsoft Excel (.xlsx)
            </div>
        </div>
    `;
}

// Display JSON data preview
function displayJSONResults(result) {
    const reportResults = document.getElementById('reportResults');
    reportResults.style.display = 'block';
    
    const formattedJson = JSON.stringify(result.reportData, null, 2);
    
    reportResults.innerHTML = `
        <div class="card">
            <div class="card-header">
                <span>JSON Report Data</span>
                <button class="btn btn-sm btn-outline-secondary" onclick="copyJsonToClipboard()">
                    <i class="bi bi-clipboard"></i> Copy JSON
                </button>
            </div>
            <div class="card-body">
                <pre style="max-height: 500px; overflow-y: auto;">${formattedJson}</pre>
            </div>
        </div>
    `;
    
    // Add the JSON to a hidden element for copying
    const jsonDataElement = document.createElement('div');
    jsonDataElement.id = 'jsonData';
    jsonDataElement.style.display = 'none';
    jsonDataElement.textContent = formattedJson;
    reportResults.appendChild(jsonDataElement);
}

// Copy JSON data to clipboard
function copyJsonToClipboard() {
    const jsonData = document.getElementById('jsonData').textContent;
    navigator.clipboard.writeText(jsonData).then(() => {
        alert('JSON data copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy JSON data:', err);
        alert('Failed to copy JSON data. Please try again.');
    });
}

// Load recent reports from the API
async function loadRecentReports() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/reports/recent', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.reports && data.reports.length > 0) {
            // Display the reports
            const recentReportsList = document.getElementById('recentReportsList');
            
            let htmlContent = '<ul class="list-group list-group-flush">';
            
            data.reports.forEach(report => {
                const reportDate = new Date(report.created).toLocaleDateString();
                const reportTime = new Date(report.created).toLocaleTimeString();
                const reportSize = report.size ? `${report.size} KB` : 'Unknown size';
                
                htmlContent += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <div>${report.name.replace(/\.pdf$/, '')}</div>
                            <small class="text-muted">${reportDate} at ${reportTime}</small>
                        </div>
                        <div>
                            <a href="${report.path}" class="btn btn-sm btn-outline-primary me-1" target="_blank">
                                <i class="bi bi-eye"></i>
                            </a>
                            <a href="${report.path}" class="btn btn-sm btn-outline-secondary" download>
                                <i class="bi bi-download"></i>
                            </a>
                        </div>
                    </li>
                `;
            });
            
            htmlContent += '</ul>';
            recentReportsList.innerHTML = htmlContent;
        } else {
            // No reports found
            document.getElementById('recentReportsList').innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-folder"></i> No recent reports
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent reports:', error);
        document.getElementById('recentReportsList').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Failed to load recent reports
            </div>
        `;
    }
}

// Update the report preview based on current form values
function updatePreview(format) {
    // Get current values
    const reportTitle = document.getElementById('reportTitle').value || 'Spending Analysis Report';
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const categoryFilter = document.getElementById('categoryFilter');
    const selectedCategory = categoryFilter.options[categoryFilter.selectedIndex].text;
    
    // Format dates for display
    const formattedStartDate = formatDateForDisplay(startDate);
    const formattedEndDate = formatDateForDisplay(endDate);
    
    // Create preview based on selected format
    if (typeof format !== 'string') {
        // If called from an event listener, get the current format
        format = document.getElementById('reportFormat').value;
    }
    
    // Update preview in the report results area
    const reportResults = document.getElementById('reportResults');
    
    if (format === 'pdf') {
        // Create a PDF-like preview
        reportResults.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>Report Preview</span>
                </div>
                <div class="card-body">
                    <div class="preview-container">
                        <div class="preview-header">
                            <h3>${reportTitle}</h3>
                            <p>Date Range: ${formattedStartDate} to ${formattedEndDate}</p>
                            <p>Category: ${selectedCategory}</p>
                        </div>
                        
                        <div class="preview-section">
                            <h5>Summary (Preview)</h5>
                            <p>This section will show totals, averages, and key metrics from your spending data.</p>
                        </div>
                        
                        <div class="preview-section">
                            <h5>Category Breakdown (Preview)</h5>
                            <table class="preview-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>% of Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Category 1</td>
                                        <td>$XXX.XX</td>
                                        <td>XX%</td>
                                    </tr>
                                    <tr>
                                        <td>Category 2</td>
                                        <td>$XXX.XX</td>
                                        <td>XX%</td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="text-center text-muted">Preview only - actual report will contain your data</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="preview-section">
                            <h5>Top Stores (Preview)</h5>
                            <p>This section will list your most visited stores and spending at each.</p>
                        </div>
                        
                        <div class="preview-section">
                            <h5>Monthly Trend (Preview)</h5>
                            <p>This section will show your spending trend over the selected period.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (format === 'json') {
        // Create a JSON preview
        const jsonPreview = {
            reportInfo: {
                title: reportTitle,
                dateRange: {
                    start: startDate,
                    end: endDate
                },
                category: selectedCategory,
                format: "json"
            },
            summary: {
                totalSpent: "X,XXX.XX",
                receiptCount: "XX",
                avgTransaction: "XX.XX"
            },
            categories: [
                { name: "Category 1", amount: "XXX.XX", percentage: "XX%" },
                { name: "Category 2", amount: "XXX.XX", percentage: "XX%" }
            ],
            stores: [
                { name: "Store 1", visits: "X", totalSpent: "XXX.XX" },
                { name: "Store 2", visits: "X", totalSpent: "XXX.XX" }
            ],
            monthly: [
                { month: "YYYY-MM", totalSpent: "XXX.XX" }
            ]
        };
        
        reportResults.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span>JSON Preview</span>
                </div>
                <div class="card-body">
                    <div class="preview-container">
                        <pre style="max-height: 400px; overflow-y: auto;">${JSON.stringify(jsonPreview, null, 2)}</pre>
                        <p class="text-center text-muted mt-3">Preview only - actual report will contain your data</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    reportResults.style.display = 'block';
}

// Helper function to show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Helper function to format date for input field (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to format date for display (Month DD, YYYY)
function formatDateForDisplay(dateString) {
    if (!dateString) return 'Not specified';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Helper function to format currency
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '$0.00';
    return '$' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
