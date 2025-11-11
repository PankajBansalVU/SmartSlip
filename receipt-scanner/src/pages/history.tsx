import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/auth-context"
import {
  ChevronDown,
  ChevronUp,
  Receipt,
  Edit3,
  Save,
  X,
  Check,
  Trash2,
  Search,
  Filter
} from "lucide-react"

const API_BASE_URL = "http://localhost:3000";

interface ReceiptItem {
  item_id: number
  name: string
  quantity: number
  price: number | string
  total_price: number | string
  category_id: number
  category_name: string
}

interface PendingChanges {
  type: 'receipt' | 'item'
  receiptId?: number
  old: ReceiptType | ReceiptItem
  new: ReceiptType | (ReceiptItem & { receipt_id: number })
}

interface ReceiptType {
  receipt_id: number
  store_name: string
  store_location: string
  receipt_date: string
  total: number | string
  payment_method: string
  items?: ReceiptItem[]
  expanded?: boolean
  created_date?: string
  updated_date?: string
}

// Helper function to safely format numbers
const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined) return '0.00';
  
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed.toFixed(2);
    }
  }
  
  return '0.00';
};

export default function HistoryPage() {
  const [receipts, setReceipts] = useState<ReceiptType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingReceipt, setEditingReceipt] = useState<ReceiptType | null>(null)
  const [editingItem, setEditingItem] = useState<ReceiptItem & { receipt_id: number } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [sortBy, setSortBy] = useState('receipt_date')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingChanges | null>(null)
  const [notification, setNotification] = useState('')
  const [isManagementMode, setIsManagementMode] = useState(false)
  
  const { token, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Simple toast function
  const toast = (props: { variant?: string, title: string, description: string }) => {
    console.log(`${props.title}: ${props.description}`);
    setNotification(`${props.title}: ${props.description}`);
    setTimeout(() => setNotification(''), 3000);
  };

  const fetchReceipts = useCallback(async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`${API_BASE_URL}/receipts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch receipts")
      }

      const data = await response.json()

      if (data.success) {
        setReceipts(
          data.receipts.map((receipt: ReceiptType) => ({
            ...receipt,
            expanded: false,
          })),
        )
      } else {
        throw new Error(data.message || "Failed to load receipts")
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load receipts",
      })
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    fetchReceipts()
  }, [isAuthenticated, navigate, fetchReceipts])

  const toggleReceipt = async (receiptId: number) => {
    setReceipts(prevReceipts => {
      const receipt = prevReceipts.find(r => r.receipt_id === receiptId)

      if (!receipt) return prevReceipts

      // If already expanded, collapse it
      if (receipt.expanded) {
        console.log('Collapsing receipt:', receiptId);
        return prevReceipts.map(r =>
          r.receipt_id === receiptId
            ? { ...r, expanded: false }
            : r
        );
      }

      // If items already loaded, just expand
      if (receipt.items) {
        console.log('Expanding receipt with existing items:', receiptId);
        return prevReceipts.map(r =>
          r.receipt_id === receiptId
            ? { ...r, expanded: true }
            : r
        );
      }

      // Items not loaded yet, expand and fetch
      console.log('Fetching receipt items for receipt:', receiptId);

      // Load items asynchronously
      fetch(`${API_BASE_URL}/receipts/${receiptId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(response => {
          console.log('Receipt details response status:', response.status);
          if (!response.ok) {
            throw new Error("Failed to fetch receipt details")
          }
          return response.json()
        })
        .then(data => {
          console.log('Receipt details data:', data);
          if (data.success) {
            console.log('Items received:', data.receipt.items);
            console.log('Number of items:', data.receipt.items?.length || 0);

            setReceipts(prev => {
              const updated = prev.map(r => {
                if (r.receipt_id === receiptId) {
                  console.log('Updating receipt with items:', data.receipt.items);
                  return {
                    ...r,
                    items: data.receipt.items || [],
                    expanded: true
                  };
                }
                return r;
              });
              console.log('Updated receipts state:', updated.find(r => r.receipt_id === receiptId));
              return updated;
            });
          } else {
            throw new Error(data.message || "Failed to load receipt details")
          }
        })
        .catch(error => {
          console.error('Error fetching receipt items:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to load receipt details",
          })
          // Collapse on error
          setReceipts(prev => prev.map(r =>
            r.receipt_id === receiptId
              ? { ...r, expanded: false }
              : r
          ))
        })

      // Immediately mark as expanded while loading
      return prevReceipts.map(r =>
        r.receipt_id === receiptId
          ? { ...r, expanded: true }
          : r
      );
    })
  }

  // Filter and search logic
  const filteredReceipts = receipts.filter(receipt => {
    // For search, only match on receipt-level fields (store name, payment method)
    // Don't require items to be loaded for searching
    const matchesSearch = !searchTerm ||
      receipt.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.store_location?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'credit') return matchesSearch && receipt.payment_method === 'Credit Card';
    if (filterBy === 'debit') return matchesSearch && receipt.payment_method === 'Debit Card';
    if (filterBy === 'cash') return matchesSearch && receipt.payment_method === 'Cash';

    return matchesSearch;
  });

  // Sort logic
  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    if (sortBy === 'receipt_date') return new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime();
    if (sortBy === 'total') return Number(b.total) - Number(a.total);
    if (sortBy === 'store_name') return a.store_name.localeCompare(b.store_name);
    return 0;
  });

  // Receipt editing functions
  const startEditingReceipt = (receipt: ReceiptType) => {
    setEditingReceipt({ ...receipt });
  };

  const handleReceiptChange = (field: keyof ReceiptType, value: any) => {
    if (editingReceipt) {
      // Handle NaN for number fields
      if (field === 'total' && (value === '' || isNaN(value))) {
        setEditingReceipt(prev => ({ ...prev!, [field]: 0 }));
      } else {
        setEditingReceipt(prev => ({ ...prev!, [field]: value }));
      }
    }
  };

  const saveReceiptChanges = () => {
    if (editingReceipt) {
      const oldReceipt = receipts.find(r => r.receipt_id === editingReceipt.receipt_id);
      if (!oldReceipt) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not find original receipt"
        });
        return;
      }

      // Validate if receipt has items
      if (oldReceipt.items && oldReceipt.items.length > 0) {
        const itemsTotal = oldReceipt.items.reduce((sum, item) => sum + Number(item.total_price), 0);
        const receiptTotal = Number(editingReceipt.total);
        const difference = Math.abs(itemsTotal - receiptTotal);

        // Allow small floating point differences (0.01)
        if (difference > 0.01) {
          const confirmMismatch = window.confirm(
            `Warning: Receipt total ($${receiptTotal.toFixed(2)}) doesn't match sum of items ($${itemsTotal.toFixed(2)}). Continue anyway?`
          );
          if (!confirmMismatch) {
            return;
          }
        }
      }

      setPendingChanges({
        type: 'receipt',
        old: oldReceipt,
        new: editingReceipt
      });
      setShowConfirmDialog(true);
    }
  };

  const cancelReceiptEdit = () => {
    setEditingReceipt(null);
  };

  // Item editing functions
  const startEditingItem = (receiptId: number, item: ReceiptItem) => {
    setEditingItem({ ...item, receipt_id: receiptId });
  };

  const handleItemChange = (field: keyof ReceiptItem, value: any) => {
    if (editingItem) {
      // Handle NaN for number fields
      if ((field === 'quantity' || field === 'price' || field === 'total_price') && (value === '' || isNaN(value))) {
        setEditingItem(prev => ({ ...prev!, [field]: 0 }));
      } else {
        // Auto-calculate total_price when quantity or price changes
        if (field === 'quantity' || field === 'price') {
          const newQuantity = field === 'quantity' ? parseFloat(value) : editingItem.quantity;
          const newPrice = field === 'price' ? parseFloat(value) : parseFloat(String(editingItem.price));
          const calculatedTotal = newQuantity * newPrice;

          setEditingItem(prev => ({
            ...prev!,
            [field]: value,
            total_price: calculatedTotal
          }));
        } else {
          setEditingItem(prev => ({ ...prev!, [field]: value }));
        }
      }
    }
  };

  const saveItemChanges = () => {
    if (editingItem) {
      const oldItem = receipts.find(r => r.receipt_id === editingItem.receipt_id)?.items?.find(i => i.item_id === editingItem.item_id);
      if (!oldItem) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not find original item"
        });
        return;
      }
      setPendingChanges({
        type: 'item',
        receiptId: editingItem.receipt_id,
        old: oldItem,
        new: editingItem
      });
      setShowConfirmDialog(true);
    }
  };

  const cancelItemEdit = () => {
    setEditingItem(null);
  };

  // API calls for updates
  const updateReceiptAPI = async (receiptData: ReceiptType) => {
    const response = await fetch(`${API_BASE_URL}/receipts/${receiptData.receipt_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(receiptData)
    });

    if (!response.ok) {
      throw new Error('Failed to update receipt');
    }

    return response.json();
  };

  const updateItemAPI = async (itemData: ReceiptItem & { receipt_id: number }) => {
    const response = await fetch(`${API_BASE_URL}/receipts/${itemData.receipt_id}/items/${itemData.item_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(itemData)
    });

    if (!response.ok) {
      throw new Error('Failed to update item');
    }

    return response.json();
  };

  const deleteReceiptAPI = async (receiptId: number) => {
    const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete receipt');
    }

    return response.json();
  };

  // Confirm changes
  const confirmChanges = async () => {
    if (!pendingChanges) return;

    try {
      if (pendingChanges.type === 'receipt') {
        const receiptData = pendingChanges.new as ReceiptType;
        await updateReceiptAPI(receiptData);

        setReceipts(prev => prev.map(receipt =>
          receipt.receipt_id === receiptData.receipt_id
            ? { ...receiptData, updated_date: new Date().toISOString().split('T')[0] }
            : receipt
        ));
        setEditingReceipt(null);
        toast({ title: "Success", description: "Receipt updated successfully!" });

        // Only close dialog on success
        setShowConfirmDialog(false);
        setPendingChanges(null);
      } else if (pendingChanges.type === 'item') {
        const itemData = pendingChanges.new as ReceiptItem & { receipt_id: number };
        await updateItemAPI(itemData);

        setReceipts(prev => prev.map(receipt => {
          if (receipt.receipt_id === pendingChanges.receiptId) {
            const updatedItems = receipt.items?.map(item =>
              item.item_id === itemData.item_id ? itemData : item
            ) || [];
            const newTotal = updatedItems.reduce((sum, item) => sum + Number(item.total_price), 0);
            return {
              ...receipt,
              items: updatedItems,
              total: newTotal,
              updated_date: new Date().toISOString().split('T')[0]
            };
          }
          return receipt;
        }));
        setEditingItem(null);
        toast({ title: "Success", description: "Item updated successfully!" });

        // Only close dialog on success
        setShowConfirmDialog(false);
        setPendingChanges(null);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes"
      });
      // Keep dialog open and preserve pending changes so user can retry
    }
  };

  const deleteReceipt = async (receiptId: number) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        await deleteReceiptAPI(receiptId);
        setReceipts(prev => prev.filter(r => r.receipt_id !== receiptId));
        toast({ title: "Success", description: "Receipt deleted successfully!" });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete receipt"
        });
      }
    }
  };

  const deleteItemAPI = async (receiptId: number, itemId: number) => {
    const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete item');
    }

    return response.json();
  };

  const deleteItem = async (receiptId: number, itemId: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItemAPI(receiptId, itemId);

        // Update receipts state - remove the item and recalculate total
        setReceipts(prev => prev.map(receipt => {
          if (receipt.receipt_id === receiptId) {
            const updatedItems = receipt.items?.filter(item => item.item_id !== itemId) || [];
            const newTotal = updatedItems.reduce((sum, item) => sum + Number(item.total_price), 0);
            return {
              ...receipt,
              items: updatedItems,
              total: newTotal
            };
          }
          return receipt;
        }));

        toast({ title: "Success", description: "Item deleted successfully!" });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete item"
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="container py-4">
      {/* Header with Management Toggle */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Receipt History</h1>
        <div className="d-flex gap-2">
          <button 
            onClick={() => setIsManagementMode(!isManagementMode)}
            className={`btn ${isManagementMode ? 'btn-warning' : 'btn-outline-secondary'} btn-sm`}
          >
            {isManagementMode ? 'Exit Management' : 'Manage Receipts'}
          </button>
          <button onClick={fetchReceipts} className="btn btn-outline-primary btn-sm">
            Refresh
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <Check size={16} className="me-2" />
          {notification}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setNotification('')}
          ></button>
        </div>
      )}

      {/* Management Controls */}
      {isManagementMode && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              {/* Search */}
              <div className="col-md-4">
                <label htmlFor="receipt-search" className="visually-hidden">Search receipts</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <Search size={16} />
                  </span>
                  <input
                    id="receipt-search"
                    type="text"
                    className="form-control"
                    placeholder="Search receipts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search receipts by store name, payment method, or location"
                  />
                </div>
              </div>

              {/* Filter */}
              <div className="col-md-3">
                <label htmlFor="payment-filter" className="visually-hidden">Filter by payment method</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <Filter size={16} />
                  </span>
                  <select
                    id="payment-filter"
                    className="form-select"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    aria-label="Filter receipts by payment method"
                  >
                    <option value="all">All Payment Methods</option>
                    <option value="credit">Credit Card</option>
                    <option value="debit">Debit Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              {/* Sort */}
              <div className="col-md-3">
                <label htmlFor="receipt-sort" className="visually-hidden">Sort receipts</label>
                <select
                  id="receipt-sort"
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort receipts by date, amount, or store name"
                >
                  <option value="receipt_date">Sort by Date</option>
                  <option value="total">Sort by Amount</option>
                  <option value="store_name">Sort by Store</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="col-md-2">
                <div className="badge bg-primary fs-6 w-100 py-2">
                  {sortedReceipts.length} receipts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : sortedReceipts.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <Receipt size={48} className="text-muted mb-3" />
            <h3 className="h5 mb-2">No receipts found</h3>
            <p className="text-muted">
              {searchTerm || filterBy !== 'all' ?
                "No receipts match your search criteria." :
                "You haven't scanned any receipts yet. Go to the home page to scan your first receipt."
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {sortedReceipts.map((receipt) => (
            <div key={receipt.receipt_id} className="card">
              <div className="card-header py-3">
                <div className="d-flex justify-content-between align-items-start">
                  {editingReceipt?.receipt_id === receipt.receipt_id ? (
                    // Edit Mode
                    <div className="row w-100 g-2">
                      <div className="col-md-3">
                        <label className="form-label small mb-1">Store Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editingReceipt.store_name}
                          onChange={(e) => handleReceiptChange('store_name', e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small mb-1">Store Location</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editingReceipt.store_location || ''}
                          onChange={(e) => handleReceiptChange('store_location', e.target.value)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={editingReceipt.receipt_date?.split('T')[0] || editingReceipt.receipt_date}
                          onChange={(e) => handleReceiptChange('receipt_date', e.target.value)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Total</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          value={editingReceipt.total}
                          onChange={(e) => handleReceiptChange('total', e.target.value ? parseFloat(e.target.value) : 0)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Payment</label>
                        <select
                          className="form-select form-select-sm"
                          value={editingReceipt.payment_method}
                          onChange={(e) => handleReceiptChange('payment_method', e.target.value)}
                        >
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            onClick={saveReceiptChanges}
                            className="btn btn-success btn-sm"
                          >
                            <Save size={14} className="me-1" />
                            Save Changes
                          </button>
                          <button
                            onClick={cancelReceiptEdit}
                            className="btn btn-secondary btn-sm"
                          >
                            <X size={14} className="me-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div>
                        <h5 className="mb-1">{receipt.store_name}</h5>
                        <p className="text-muted small mb-0">{formatDate(receipt.receipt_date)}</p>
                      </div>
                      <div className="text-end">
                        <p className="fw-medium mb-1">${formatNumber(receipt.total)}</p>
                        <p className="text-muted small mb-0">{receipt.payment_method}</p>
                      </div>
                      {isManagementMode && (
                        <div className="ms-3">
                          <button
                            onClick={() => startEditingReceipt(receipt)}
                            className="btn btn-outline-primary btn-sm me-2"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => deleteReceipt(receipt.receipt_id)}
                            className="btn btn-outline-danger btn-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="card-body">
                <button
                  className="btn btn-link text-decoration-none w-100 d-flex justify-content-between align-items-center"
                  onClick={() => toggleReceipt(receipt.receipt_id)}
                >
                  <span>{receipt.expanded ? "Hide Details" : "View Details"}</span>
                  {receipt.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {receipt.expanded && !receipt.items && (
                  <div className="mt-3 text-center py-3">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="text-muted">Loading items...</span>
                  </div>
                )}

                {receipt.expanded && receipt.items && receipt.items.length === 0 && (
                  <div className="mt-3 text-center py-3">
                    <p className="text-muted mb-0">No items found for this receipt.</p>
                  </div>
                )}

                {receipt.expanded && receipt.items && receipt.items.length > 0 && (
                  <div className="mt-3">
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Item</th>
                            <th className="text-end">Qty</th>
                            <th className="text-end">Price</th>
                            <th className="text-end">Total</th>
                            {isManagementMode && <th className="text-center">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {receipt.items.map((item) => (
                            <tr key={item.item_id}>
                              {editingItem?.item_id === item.item_id ? (
                                // Edit mode for item
                                <>
                                  <td>
                                    <label htmlFor={`item-name-${item.item_id}`} className="visually-hidden">Item name</label>
                                    <input
                                      id={`item-name-${item.item_id}`}
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={editingItem.name}
                                      onChange={(e) => handleItemChange('name', e.target.value)}
                                      aria-label="Item name"
                                    />
                                  </td>
                                  <td>
                                    <label htmlFor={`item-quantity-${item.item_id}`} className="visually-hidden">Item quantity</label>
                                    <input
                                      id={`item-quantity-${item.item_id}`}
                                      type="number"
                                      className="form-control form-control-sm text-end"
                                      value={editingItem.quantity}
                                      onChange={(e) => handleItemChange('quantity', e.target.value ? parseInt(e.target.value) : 0)}
                                      aria-label="Item quantity"
                                    />
                                  </td>
                                  <td>
                                    <label htmlFor={`item-price-${item.item_id}`} className="visually-hidden">Item price</label>
                                    <input
                                      id={`item-price-${item.item_id}`}
                                      type="number"
                                      step="0.01"
                                      className="form-control form-control-sm text-end"
                                      value={editingItem.price}
                                      onChange={(e) => handleItemChange('price', e.target.value ? parseFloat(e.target.value) : 0)}
                                      aria-label="Item price"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="form-control form-control-sm text-end bg-light"
                                      value={formatNumber(editingItem.total_price)}
                                      readOnly
                                      title="Auto-calculated: Quantity × Price"
                                    />
                                  </td>
                                  <td>
                                    <div className="d-flex gap-1 justify-content-center">
                                      <button
                                        onClick={saveItemChanges}
                                        className="btn btn-success btn-sm"
                                      >
                                        <Save size={12} />
                                      </button>
                                      <button
                                        onClick={cancelItemEdit}
                                        className="btn btn-secondary btn-sm"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                // View mode for item
                                <>
                                  <td>{item.name}</td>
                                  <td className="text-end">{item.quantity}</td>
                                  <td className="text-end">${formatNumber(item.price)}</td>
                                  <td className="text-end">${formatNumber(item.total_price)}</td>
                                  {isManagementMode && (
                                    <td>
                                      <div className="d-flex gap-1 justify-content-center">
                                        <button
                                          onClick={() => startEditingItem(receipt.receipt_id, item)}
                                          className="btn btn-outline-primary btn-sm"
                                          title="Edit item"
                                        >
                                          <Edit3 size={12} />
                                        </button>
                                        <button
                                          onClick={() => deleteItem(receipt.receipt_id, item.item_id)}
                                          className="btn btn-outline-danger btn-sm"
                                          title="Delete item"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmDialog && (
        <div className="modal fade show d-block modal-backdrop-custom" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Changes</h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to save these changes? This will update the record in the database.</p>
                
                {pendingChanges && (
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-title">Changes Summary:</h6>
                      {pendingChanges.type === 'receipt' ? (
                        <div className="small">
                          <div>Store: {(pendingChanges.old as ReceiptType).store_name} → {(pendingChanges.new as ReceiptType).store_name}</div>
                          <div>Date: {(pendingChanges.old as ReceiptType).receipt_date} → {(pendingChanges.new as ReceiptType).receipt_date}</div>
                          <div>Total: ${formatNumber((pendingChanges.old as ReceiptType).total)} → ${formatNumber((pendingChanges.new as ReceiptType).total)}</div>
                        </div>
                      ) : (
                        <div className="small">
                          <div>Item: {(pendingChanges.old as ReceiptItem).name} → {(pendingChanges.new as ReceiptItem).name}</div>
                          <div>Quantity: {(pendingChanges.old as ReceiptItem).quantity} → {(pendingChanges.new as ReceiptItem).quantity}</div>
                          <div>Price: ${formatNumber((pendingChanges.old as ReceiptItem).price)} → ${formatNumber((pendingChanges.new as ReceiptItem).price)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  onClick={confirmChanges}
                  className="btn btn-success"
                >
                  Confirm Changes
                </button>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}