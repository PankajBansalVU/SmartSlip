// Report generation integration for spending analysis page
document.addEventListener('DOMContentLoaded', function() {
    // Add Generate Report button to the page
    addGenerateReportButton();
    
    // Set up the report modal functionality
    setupReportModal();
});

// Function to add Generate Report button
function addGenerateReportButton() {
    // Create the button in the filters section
    const filtersSection = document.querySelector('.filters .row');
    if (!filtersSection) return;
    
    // Create a new column for the report button
    const buttonCol = document.createElement('div');
    buttonCol.className = 'col-md-12 mt-3';
    buttonCol.innerHTML = `
        <button class="btn btn-outline-success w-100" id="generateReportBtn" data-bs-toggle="modal" data-bs-target="#reportModal">
            <i class="bi bi-file-earmark-text"></i> Generate Report
        </button>
    `;
    
    // Append the button to the filters section
    filtersSection.appendChild(buttonCol);
    
    // Alternative: Add to key metrics section
    const keyMetricsSection = document.querySelector('.row.g-3.mb-4');
    if (keyMetricsSection) {
        const reportIconBtn = document.createElement('div');
        reportIconBtn.className = 'position-fixed bottom-0 end-0 m-4';
        reportIconBtn.innerHTML = `
            <button class="btn btn-success btn-lg rounded-circle shadow" 
                    id="floatingReportBtn" 
                    data-bs-toggle="modal" 
                    data-bs-target="#reportModal"
                    style="width: 60px; height: 60px;">
                <i class="bi bi-file-earmark-text"></i>
            </button>
        `;
        document.body.appendChild(reportIconBtn);
    }
}

// Function to set up the report modal
function setupReportModal() {
    // Create the modal structure
    const modalHTML = `
        <div class="modal fade" id="reportModal" tabindex="-1" aria-labelledby="reportModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="reportModalLabel">Generate Spending Report</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="quickReportForm">
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <label for="reportTitle" class="form-label">Report Title</label>
                                    <input type="text" class="form-control" id="reportTitle" name="reportTitle" value="Spending Analysis Report">
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="startDate" class="form-label">Start Date</label>
                                    <input type="date" class="form-control" id="reportStartDate" name="startDate">
                                </div>
                                <div class="col-md-6">
                                    <label for="endDate" class="form-label">End Date</label>
                                    <input type="date" class="form-control" id="reportEndDate" name="endDate">
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="reportCategoryFilter" class="form-label">Category Filter</label>
                                    <select class="form-select" id="reportCategoryFilter" name="categoryId">
                                        <option value="" selected>All Categories</option>
                                        <!-- Will be populated dynamically -->
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="reportTemplate" class="form-label">Report Template</label>
                                    <select class="form-select" id="reportTemplate" name="reportTemplate">
                                        <option value="standard" selected>Standard</option>
                                        <option value="executive">Executive</option>
                                        <option value="minimal">Minimal</option>
                                        <option value="detailed">Detailed</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-12">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="includeAiInsights" name="includeAiInsights" value="true" checked>
                                        <label class="form-check-label" for="includeAiInsights">Include AI Insights</label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-outline-primary" id="configureAdvancedReportBtn">Advanced Options</button>
                        <button type="button" class="btn btn-success" id="generateReportFromModalBtn">
                            <i class="bi bi-file-earmark-text"></i> Generate PDF Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Loading Overlay -->
        <div id="reportLoadingOverlay" class="spinner-overlay" style="display: none;">
            <div class="overlay-content">
                <div class="spinner-border text-success mb-3" role="status">
                    <span class="visually-hidden">Generating report...</span>
                </div>
                <p>Generating your report...</p>
            </div>
        </div>
    `;
    
    // Add the modal to the document body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Sync the date range from the main filters to the report modal
    const mainStartDate = document.getElementById('startDate');
    const mainEndDate = document.getElementById('endDate');
    const mainCategoryFilter = document.getElementById('categoryFilterBtn');
    
    // Set the report modal dates when it's opened
    document.getElementById('reportModal').addEventListener('show.bs.modal', function() {
        const reportStartDate = document.getElementById('reportStartDate');
        const reportEndDate = document.getElementById('reportEndDate');
        
        // Set dates if main filters have values
        if (mainStartDate && mainStartDate.value) {
            reportStartDate.value = mainStartDate.value;
        } else {
            // Default to last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            reportStartDate.value = formatDateForInput(thirtyDaysAgo);
        }
        
        if (mainEndDate && mainEndDate.value) {
            reportEndDate.value = mainEndDate.value;
        } else {
            reportEndDate.value = formatDateForInput(new Date());
        }
        
        // Populate category dropdown
        populateReportCategories();
    });
    
    // Set up the generate report button in the modal
    document.getElementById('generateReportFromModalBtn').addEventListener('click', function() {
        generateReportFromModal();
    });
    
    // Set up the advanced options button
    document.getElementById('configureAdvancedReportBtn').addEventListener('click', function() {
        // Save current selections
        const formData = new FormData(document.getElementById('quickReportForm'));
        const params = new URLSearchParams();
        
        for (const [key, value] of formData.entries()) {
            params.append(key, value);
        }
        
        // Redirect to the full report page with parameters
        window.location.href = `/report.html?${params.toString()}`;
    });
}

// Function to populate categories in the report modal
function populateReportCategories() {
    const categorySelect = document.getElementById('reportCategoryFilter');
    if (!categorySelect) return;
    
    // Clear existing options except the first one
    while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
    }
    
    // Check if we have a category menu to copy from
    const categoryMenu = document.getElementById('categoryFilterMenu');
    if (categoryMenu && categoryMenu.children.length > 0) {
        // Copy categories from the main filter
        Array.from(categoryMenu.children).forEach(li => {
            const a = li.querySelector('a');
            if (a && a.dataset.value !== 'all') {
                const option = document.createElement('option');
                option.value = a.dataset.value;
                option.textContent = a.textContent;
                categorySelect.appendChild(option);
            }
        });
    } else {
        // Fetch categories from API
        fetchCategories().then(categories => {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        });
    }
}

// Function to fetch categories from the API
async function fetchCategories() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/spending/summary', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.categories) {
            return data.categories.map(name => ({
                id: getCategoryIdFromName(name),
                name: name
            }));
        }
        
        // Return default categories if API call fails
        return defaultCategories();
    } catch (error) {
        console.error('Error fetching categories:', error);
        return defaultCategories();
    }
}

// Function to generate the report from the modal
async function generateReportFromModal() {
    try {
        // Show loading overlay
        document.getElementById('reportLoadingOverlay').style.display = 'flex';
        
        // Get form data
        const formData = new FormData(document.getElementById('quickReportForm'));
        const reportParams = {};
        
        formData.forEach((value, key) => {
            reportParams[key] = value;
        });
        
        // Set report format
        reportParams.reportFormat = 'pdf';
        
        // Generate the report
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/reports/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportParams)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close the modal
            const reportModal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
            reportModal.hide();
            
            // Show success message
            showReportSuccessMessage(result.reportUrl);
        } else {
            throw new Error(result.message || 'Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showReportErrorMessage(error.message);
    } finally {
        // Hide loading overlay
        document.getElementById('reportLoadingOverlay').style.display = 'none';
    }
}

// Function to show a success message after report generation
function showReportSuccessMessage(reportUrl) {
    // Create a success toast or alert
    const successAlert = document.createElement('div');
    successAlert.className = 'position-fixed top-0 end-0 p-3';
    successAlert.style.zIndex = '1050';
    
    successAlert.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-success text-white">
                <i class="bi bi-check-circle me-2"></i>
                <strong class="me-auto">Report Generated</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                <p>Your report has been generated successfully!</p>
                <div class="mt-2 pt-2 border-top">
                    <a href="${reportUrl}" class="btn btn-primary btn-sm" target="_blank">View Report</a>
                    <a href="${reportUrl}" class="btn btn-outline-secondary btn-sm" download>Download</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(successAlert);
    
    // Remove the alert after 10 seconds
    setTimeout(() => {
        successAlert.remove();
    }, 10000);
    
    // Allow manual closing
    const closeButton = successAlert.querySelector('.btn-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            successAlert.remove();
        });
    }
}

// Function to show an error message
function showReportErrorMessage(message) {
    // Create an error toast or alert
    const errorAlert = document.createElement('div');
    errorAlert.className = 'position-fixed top-0 end-0 p-3';
    errorAlert.style.zIndex = '1050';
    
    errorAlert.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-danger text-white">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong class="me-auto">Error</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                <p>Failed to generate report: ${message}</p>
                <div class="mt-2 pt-2 border-top">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="toast">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(errorAlert);
    
    // Remove the alert after 10 seconds
    setTimeout(() => {
        errorAlert.remove();
    }, 10000);
    
    // Allow manual closing
    const closeButton = errorAlert.querySelector('.btn-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            errorAlert.remove();
        });
    }
}

// Helper function to format date for input field (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get category ID from name
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

// Helper function to provide default categories if API fails
function defaultCategories() {
    return [
        { id: 1, name: "Groceries" },
        { id: 2, name: "Electronics" },
        { id: 3, name: "Clothing & Accessories" },
        { id: 4, name: "Food & Dining" },
        { id: 5, name: "Household Items" },
        { id: 6, name: "Health & Beauty" },
        { id: 7, name: "Office Supplies" },
        { id: 8, name: "Entertainment" },
        { id: 9, name: "Transportation" },
        { id: 10, name: "Services" },
        { id: 11, name: "Others" }
    ];
}