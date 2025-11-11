"use client"
import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/auth-context"
import { API_BASE_URL } from "../config/api"
import {
  BarChart as LucideBarChart,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  PieChart as LucidePieChart,
  RefreshCw,
  Wallet
} from "lucide-react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Transaction {
  receipt_id: number
  receipt_date: string
  store_name: string
  amount: number
  category_id: number
  category_name: string
  category_amount: number
}

interface CategoryData {
  name: string
  value: number
  color: string
}

interface TimeSeriesData {
  name: string
  amount: number
}

// UTILITY FUNCTIONS (Outside component)
const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const showSuccessMessage = (message: string): void => {
  const alertContainer = document.createElement('div');
  alertContainer.className = 'alert alert-success alert-dismissible fade show position-fixed';
  alertContainer.style.top = '20px';
  alertContainer.style.right = '20px';
  alertContainer.style.zIndex = '9999';
  alertContainer.role = 'alert';
  alertContainer.innerHTML = `
    <strong>Success!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.appendChild(alertContainer);
  
  setTimeout(() => {
    alertContainer.remove();
  }, 5000);
};

const showErrorMessage = (message: string): void => {
  const alertContainer = document.createElement('div');
  alertContainer.className = 'alert alert-danger alert-dismissible fade show position-fixed';
  alertContainer.style.top = '20px';
  alertContainer.style.right = '20px';
  alertContainer.style.zIndex = '9999';
  alertContainer.role = 'alert';
  alertContainer.innerHTML = `
    <strong>Error!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.appendChild(alertContainer);
  
  setTimeout(() => {
    alertContainer.remove();
  }, 5000);
};

export default function SpendingAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalSpending, setTotalSpending] = useState(0)
  const [avgTransaction, setAvgTransaction] = useState(0)
  const [transactionCount, setTransactionCount] = useState(0)
  const [budget, setBudget] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState('last_month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [storeOptions, setStoreOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false)
  
  const { token, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Color palette for charts
  const CHART_COLORS = [
    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
    '#5a5c69', '#6610f2', '#6f42c1', '#fd7e14', '#20c9a6'
  ];

  // Simple report generation function
  const generateReport = async (): Promise<void> => {
    setIsGeneratingReport(true);
    setReportError(null);
    
    try {
      console.log('Generating report...');
      
      const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dateRange: dateRange,
          startDate: dateRange === 'custom' ? startDate : '',
          endDate: dateRange === 'custom' ? endDate : '',
          stores: selectedStores,
          categories: selectedCategories
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Backend Response:', data);
      
      // Check if backend response is successful
      if (data.success && data.reportUrl) {
        // Make sure URL is complete
        let downloadUrl = data.reportUrl;
        if (downloadUrl.startsWith('/')) {
          downloadUrl = `${API_BASE_URL}${downloadUrl}`;
        }
        
        console.log('Opening report URL:', downloadUrl);
        
        // Direct download/view
        window.open(downloadUrl, '_blank');
        showSuccessMessage('Report opened successfully');
      } else {
        throw new Error(data.message || 'No download URL in response');
      }
      
    } catch (error) {
      console.error('Report error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate report';
      setReportError(message);
      showErrorMessage(message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handle export with different formats
  const handleExport = async (format: 'pdf' | 'csv' | 'excel' | 'json'): Promise<void> => {
    setIsGeneratingReport(true);
    setReportError(null);

    try {
      console.log(`Exporting report as ${format}...`);

      const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportTitle: 'Spending Analysis Report',
          startDate: dateRange === 'custom' ? startDate : null,
          endDate: dateRange === 'custom' ? endDate : null,
          categoryId: selectedCategories.length === 1 ? selectedCategories[0] : null,
          reportFormat: format
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} report: ${response.status}`);
      }

      const data = await response.json();
      console.log('Backend Response:', data);

      if (data.success) {
        if (format === 'json') {
          // Open JSON in new window
          const jsonWindow = window.open('', '_blank');
          if (jsonWindow) {
            jsonWindow.document.write('<pre>' + JSON.stringify(data.reportData, null, 2) + '</pre>');
            jsonWindow.document.title = 'Spending Analysis - JSON Export';
          }
          showSuccessMessage('JSON data opened in new window');
        } else if (data.reportUrl) {
          // Download file for PDF, CSV, Excel
          let downloadUrl = data.reportUrl;
          if (downloadUrl.startsWith('/')) {
            downloadUrl = `${API_BASE_URL}${downloadUrl}`;
          }

          console.log('Downloading from:', downloadUrl);

          // Create temporary link and trigger download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = downloadUrl.split('/').pop() || `report.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          showSuccessMessage(`${format.toUpperCase()} report downloaded successfully`);
        } else {
          throw new Error('No download URL in response');
        }
      } else {
        throw new Error(data.message || 'Unknown error occurred');
      }

    } catch (error) {
      console.error('Export error:', error);
      const message = error instanceof Error ? error.message : `Failed to export ${format.toUpperCase()} report`;
      setReportError(message);
      showErrorMessage(message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    fetchInitialData()
  }, [isAuthenticated, navigate])
  
  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/spending/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch spending data");
      }
  
      const data = await response.json();
  
      if (data.success) {
        // SAFE CHECKS: Ensure data properties exist and are arrays
        setStoreOptions(Array.isArray(data.stores) ? data.stores : []);
        setCategoryOptions(Array.isArray(data.categories) ? data.categories : []);
        setBudget(data.budget || null);
        
        // CRITICAL FIX: Ensure transactions is always an array
        const transactionData = Array.isArray(data.transactions) ? data.transactions : [];
        setTransactions(transactionData);
        
        // Calculate summary stats with safe data
        calculateSummaryStats(transactionData);
      } else {
        throw new Error(data.message || "Failed to load spending data");
      }
    } catch (error) {
      console.error('fetchInitialData error:', error);
      setError(error instanceof Error ? error.message : "Failed to load spending data");
      
      // Set safe defaults on error
      setTransactions([]);
      setStoreOptions([]);
      setCategoryOptions([]);
      setTotalSpending(0);
      setTransactionCount(0);
      setAvgTransaction(0);
    } finally {
      setIsLoading(false);
    }
  };
  
  const applyFilters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('dateRange', dateRange);
      
      if (dateRange === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      if (selectedStores.length > 0) {
        selectedStores.forEach(store => params.append('stores', store));
      }
      
      if (selectedCategories.length > 0) {
        selectedCategories.forEach(category => params.append('categories', category));
      }
      
      const response = await fetch(`${API_BASE_URL}/api/spending/filtered?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch filtered spending data");
      }
  
      const data = await response.json();
  
      if (data.success) {
        // CRITICAL FIX: Ensure transactions is always an array
        const transactionData = Array.isArray(data.transactions) ? data.transactions : [];
        setTransactions(transactionData);
        calculateSummaryStats(transactionData);
      } else {
        throw new Error(data.message || "Failed to load filtered spending data");
      }
    } catch (error) {
      console.error('applyFilters error:', error);
      setError(error instanceof Error ? error.message : "Failed to load filtered spending data");
      
      // Set safe defaults on error
      setTransactions([]);
    } finally {
      setIsLoading(false);
      setShowFilters(false);
    }
  };
  
  const calculateSummaryStats = (transactionData: Transaction[]) => {
    // SAFE CHECK: Ensure transactionData is an array
    if (!Array.isArray(transactionData)) {
      console.warn('calculateSummaryStats: transactionData is not an array:', transactionData);
      setTotalSpending(0);
      setTransactionCount(0);
      setAvgTransaction(0);
      return;
    }
  
    let total = 0;
    const uniqueReceipts = new Set();
    
    transactionData.forEach(item => {
      if (item && item.amount !== undefined && item.receipt_id !== undefined) {
        total += parseFloat(item.amount.toString());
        uniqueReceipts.add(item.receipt_id);
      }
    });
    
    const count = uniqueReceipts.size;
    const average = count > 0 ? total / count : 0;
    
    setTotalSpending(total);
    setTransactionCount(count);
    setAvgTransaction(average);
  };
  
  const saveBudget = async () => {
    try {
      const budgetAmount = parseFloat(budgetInput)
      
      if (isNaN(budgetAmount) || budgetAmount <= 0) {
        throw new Error("Please enter a valid budget amount")
      }
      
      const response = await fetch(`${API_BASE_URL}/api/spending/budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: budgetAmount })
      })

      if (!response.ok) {
        throw new Error("Failed to set budget")
      }

      const data = await response.json()

      if (data.success) {
        setBudget(data.budget)
        setShowBudgetModal(false)
      } else {
        throw new Error(data.message || "Failed to set budget")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to set budget")
    }
  }
  
  // Get data for pie chart
  const getCategoryChartData = (): CategoryData[] => {
    // SAFE CHECK: Ensure transactions is an array
    if (!Array.isArray(transactions)) {
      console.warn('getCategoryChartData: transactions is not an array:', transactions);
      return [];
    }
  
    const categoryData: Record<string, number> = {};
    
    transactions.forEach(item => {
      // SAFE CHECK: Ensure item and required properties exist
      if (item && item.category_name && item.category_amount !== undefined) {
        const categoryName = item.category_name;
        const amount = parseFloat(item.category_amount?.toString() || '0');
        
        if (categoryData[categoryName]) {
          categoryData[categoryName] += amount;
        } else {
          categoryData[categoryName] = amount;
        }
      }
    });
    
    return Object.entries(categoryData).map(([name, value], index) => ({
      name,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  };
  
  // Get data for time series chart
  const getTimeSeriesData = (): TimeSeriesData[] => {
    // SAFE CHECK: Ensure transactions is an array
    if (!Array.isArray(transactions)) {
      console.warn('getTimeSeriesData: transactions is not an array:', transactions);
      return [];
    }
  
    const timeData: Record<string, number> = {};
    
    transactions.forEach(item => {
      // SAFE CHECK: Ensure item and required properties exist
      if (!item || !item.receipt_date || item.amount === undefined) {
        return; // Skip invalid items
      }
      
      let dateKey;
      try {
        const date = new Date(item.receipt_date);
        
        // Format date key based on date range
        if (dateRange === 'last_year') {
          // Group by month for year view
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // Group by day for shorter ranges
          dateKey = item.receipt_date.substring(0, 10);
        }
        
        const amount = parseFloat(item.amount?.toString() || '0');
        
        if (timeData[dateKey]) {
          timeData[dateKey] += amount;
        } else {
          timeData[dateKey] = amount;
        }
      } catch (error) {
        console.warn('Error processing date for item:', item, error);
      }
    });
    
    // Sort by date and return
    return Object.entries(timeData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, amount]) => ({
        name: dateRange === 'last_year' 
          ? new Date(name).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
          : formatDate(name),
        amount
      }));
  };
  
  // Get recent transactions for the table
  const getRecentTransactions = () => {
    // SAFE CHECK: Ensure transactions is an array
    if (!Array.isArray(transactions)) {
      console.warn('getRecentTransactions: transactions is not an array:', transactions);
      return [];
    }
  
    // Group by receipt
    const receiptMap = new Map();
    
    transactions.forEach(transaction => {
      // SAFE CHECK: Ensure transaction and required properties exist
      if (transaction && 
          transaction.receipt_id !== undefined && 
          transaction.receipt_date) {
        
        if (!receiptMap.has(transaction.receipt_id) || 
            new Date(receiptMap.get(transaction.receipt_id).receipt_date) < new Date(transaction.receipt_date)) {
          receiptMap.set(transaction.receipt_id, transaction);
        }
      }
    });
    
    // Sort by date (most recent first)
    return Array.from(receiptMap.values())
    .sort((a, b) => {
      try {
        return new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime();
      } catch (error) {
        console.warn('Error sorting transactions by date:', error);
        return 0;
      }
    })
    .slice(0, 5); // Get only most recent 5 transactions
  };
  
  // Calculate budget progress
  const getBudgetProgress = () => {
    if (!budget) return 0
    return Math.min(100, (totalSpending / budget) * 100)
  }
  
  // Determine the budget status color
  const getBudgetColor = () => {
    const progress = getBudgetProgress()
    if (progress > 90) return 'danger'
    if (progress > 70) return 'warning'
    return 'success'
  }

  const setDatePreset = (days: number) => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);
    
    setDateRange('custom');
    setStartDate(formatDateForInput(startDate));
    setEndDate(formatDateForInput(today));
    
    // Auto-apply filters after setting dates
    setTimeout(() => {
      applyFilters();
    }, 100);
  };
  
  const setLast7Days = () => setDatePreset(7);
  const setLast30Days = () => setDatePreset(30);
  const setLast90Days = () => setDatePreset(90);
  
  const setThisMonth = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setDateRange('custom');
    setStartDate(formatDateForInput(startOfMonth));
    setEndDate(formatDateForInput(today));
    
    setTimeout(() => {
      applyFilters();
    }, 100);
  };
  
  const setLastMonth = () => {
    const today = new Date();
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setDateRange('custom');
    setStartDate(formatDateForInput(lastMonthStart));
    setEndDate(formatDateForInput(lastMonthEnd));
    
    setTimeout(() => {
      applyFilters();
    }, 100);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Spending Analysis</h1>
        <div className="d-flex gap-2">
          <div className="dropdown">
            <button
              className="btn btn-primary btn-sm dropdown-toggle d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <Download size={16} />
              <span>Export Report</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><h6 className="dropdown-header">Export Format</h6></li>
              <li>
                <button className="dropdown-item" onClick={() => handleExport('pdf')}>
                  <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                  PDF Report
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={() => handleExport('csv')}>
                  <i className="bi bi-filetype-csv text-success me-2"></i>
                  CSV Export
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={() => handleExport('excel')}>
                  <i className="bi bi-file-earmark-excel text-success me-2"></i>
                  Excel Workbook
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" onClick={() => handleExport('json')}>
                  <i className="bi bi-filetype-json text-warning me-2"></i>
                  JSON Data
                </button>
              </li>
            </ul>
          </div>
          <button onClick={fetchInitialData} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <p className="mb-0">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title text-muted">Total Spending</h5>
                  <h2 className="display-6 fw-bold mb-0">{formatCurrency(totalSpending)}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title text-muted">Average Transaction</h5>
                  <h2 className="display-6 fw-bold mb-0">{formatCurrency(avgTransaction)}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title text-muted">Transaction Count</h5>
                  <h2 className="display-6 fw-bold mb-0">{transactionCount}</h2>
                </div>
              </div>
            </div>
          </div>
          
          {/* Budget Status */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Budget Status</h5>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setBudgetInput(budget ? budget.toString() : '')
                    setShowBudgetModal(true)
                  }}
                >
                  Set Budget
                </button>
              </div>
              
              {budget ? (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span>{formatCurrency(totalSpending)}</span>
                    <span>Budget: {formatCurrency(budget)}</span>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div 
                      className={`progress-bar bg-${getBudgetColor()}`} 
                      role="progressbar" 
                      style={{ width: `${getBudgetProgress()}%` }} 
                      aria-valuenow={getBudgetProgress()} 
                      aria-valuemin={0} 
                      aria-valuemax={100}
                    />
                  </div>
                  <div className="text-end mt-1">
                    <small className="text-muted">{Math.round(getBudgetProgress())}% of budget used</small>
                  </div>
                </>
              ) : (
                <div className="alert alert-info mb-0">
                  No budget set. Click "Set Budget" to establish a spending limit.
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="d-flex flex-wrap gap-2 mb-4">
            <button 
              className="btn btn-outline-primary d-flex align-items-center gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>{showFilters ? 'Hide Filters' : 'Filter Options'}</span>
            </button>
            <button 
              className="btn btn-outline-success d-flex align-items-center gap-2"
              onClick={generateReport}
              disabled={isGeneratingReport}
            >
              <Download size={18} />
              <span>{isGeneratingReport ? 'Generating...' : 'Download Report'}</span>
              {isGeneratingReport && (
                <div className="spinner-border spinner-border-sm ms-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
            </button>
          </div>

          {/* Simple error display */}
          {reportError && (
            <div className="alert alert-danger mt-2">
              {reportError}
            </div>
          )}
          
          {/* Filters */}
          {showFilters && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Filter Options</h5>
                
                {/* Quick Date Range Presets */}
                <div className="mb-4">
                  <label className="form-label small text-muted">Quick Date Ranges:</label>
                  <div className="d-flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm"
                      onClick={setLast7Days}
                    >
                      📅 Last 7 Days
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm"
                      onClick={setLast30Days}
                    >
                      📆 Last 30 Days
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm"
                      onClick={setLast90Days}
                    >
                      📋 Last 90 Days
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={setThisMonth}
                    >
                      ✅ This Month
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={setLastMonth}
                    >
                      ❌ Last Month
                    </button>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }}>
                  <div className="row g-3">
                    {/* Date Range */}
                    <div className="col-md-4">
                      <label htmlFor="dateRange" className="form-label">Date Range</label>
                      <select 
                        id="dateRange" 
                        className="form-select"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                      >
                        <option value="last_2_weeks">Last 2 Weeks</option>
                        <option value="last_month">Last Month</option>
                        <option value="last_year">Last Year</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    
                    {/* Custom Date Range */}
                    {dateRange === 'custom' && (
                      <>
                        <div className="col-md-4">
                          <label htmlFor="startDate" className="form-label">Start Date</label>
                          <input 
                            type="date" 
                            id="startDate" 
                            className="form-control"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label htmlFor="endDate" className="form-label">End Date</label>
                          <input 
                            type="date" 
                            id="endDate" 
                            className="form-control"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Stores */}
                    <div className="col-md-6">
                      <label htmlFor="storeSelect" className="form-label">Stores</label>
                      <select 
                        id="storeSelect" 
                        className="form-select" 
                        multiple
                        value={selectedStores}
                        onChange={(e) => {
                          const options = e.target.options;
                          const values = [];
                          for (let i = 0; i < options.length; i++) {
                            if (options[i].selected) {
                              values.push(options[i].value);
                            }
                          }
                          setSelectedStores(values);
                        }}
                        style={{ height: '120px' }}
                      >
                        {storeOptions.map((store, index) => (
                          <option key={index} value={store}>{store}</option>
                        ))}
                      </select>
                      <small className="form-text text-muted">Hold Ctrl/Cmd to select multiple</small>
                    </div>
                    
                    {/* Categories */}
                    <div className="col-md-6">
                      <label htmlFor="categorySelect" className="form-label">Categories</label>
                      <select 
                        id="categorySelect" 
                        className="form-select" 
                        multiple
                        value={selectedCategories}
                        onChange={(e) => {
                          const options = e.target.options;
                          const values = [];
                          for (let i = 0; i < options.length; i++) {
                            if (options[i].selected) {
                              values.push(options[i].value);
                            }
                          }
                          setSelectedCategories(values);
                        }}
                        style={{ height: '120px' }}
                      >
                        {categoryOptions.map((category, index) => (
                          <option key={index} value={category}>{category}</option>
                        ))}
                      </select>
                      <small className="form-text text-muted">Hold Ctrl/Cmd to select multiple</small>
                    </div>
                    
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary">Apply Filters</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Charts */}
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header d-flex align-items-center gap-2">
                  <LucidePieChart size={16} />
                  <span>Spending by Category</span>
                </div>
                <div className="card-body">
                  {transactions.length > 0 ? (
                    <>
                      {/* Pie Chart Implementation */}
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={getCategoryChartData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {getCategoryChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <Wallet size={32} className="text-muted mb-3" />
                      <p>No category data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header d-flex align-items-center gap-2">
                  <LucideBarChart size={16} />
                  <span>Spending Over Time</span>
                </div>
                <div className="card-body">
                  {transactions.length > 0 ? (
                    <>
                      {/* Bar Chart Implementation */}
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={getTimeSeriesData()}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `${value}`} />
                          <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                          <Bar dataKey="amount" fill="#4e73df" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <Wallet size={32} className="text-muted mb-3" />
                      <p>No time series data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Recent Transactions</h5>
            </div>
            <div className="card-body">
              {transactions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Store</th>
                        <th>Category</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRecentTransactions().map((transaction, index) => (
                        <tr key={index}>
                          <td>{formatDate(transaction.receipt_date)}</td>
                          <td>{transaction.store_name}</td>
                          <td>
                            <span className="badge bg-primary bg-opacity-10 text-primary">
                              {transaction.category_name}
                            </span>
                          </td>
                          <td className="text-end">{formatCurrency(parseFloat(transaction.amount.toString()))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <Wallet size={36} className="text-muted mb-3" />
                  <h3 className="h5 mb-2">No transactions found</h3>
                  <p className="text-muted">Try changing your filters or scan more receipts.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Set Budget</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowBudgetModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <form id="budget-form">
                  <div className="mb-3">
                    <label htmlFor="budget-input" className="form-label">Budget Amount ($)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="budget-input" 
                      min="0" 
                      step="0.01" 
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      required 
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowBudgetModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={saveBudget}
                >
                  Save Budget
                </button>
              </div>
            </div>        
          </div>          
        </div>            
      )}
    </div>
  )
}