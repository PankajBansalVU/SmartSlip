# 📊 SmartSlip Report System - Complete Explanation

## Overview
The report generation system creates spending analysis reports in multiple formats (PDF, CSV, Excel, JSON) based on user receipt data.

---

## 🔄 Complete Data Flow

```
1. User clicks "Export Report" button
   ↓
2. Frontend sends POST request to /api/reports/generate
   ↓
3. Backend authenticates user with JWT token
   ↓
4. Backend queries database for user's receipt data
   ↓
5. Backend generates report file (PDF/CSV/Excel/JSON)
   ↓
6. Backend saves file to /public/reports/ folder
   ↓
7. Backend returns file URL to frontend
   ↓
8. Frontend downloads/displays the report
```

---

## 📍 API Endpoint

### **POST `/api/reports/generate`**

**Location:** `backend/reports.routes.js`

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "startDate": "2024-01-01",     // Optional: filter by date range
  "endDate": "2024-12-31",       // Optional: filter by date range
  "categoryId": 5,               // Optional: filter by category
  "reportFormat": "pdf",         // Required: pdf, csv, excel, json
  "reportTitle": "My Spending Report"  // Optional: custom title
}
```

**Response:**
```json
{
  "success": true,
  "reportUrl": "/reports/report-user5-1234567890.pdf",
  "message": "PDF report generated successfully"
}
```

---

## 🔐 Authentication Flow

### **Step 1: Extract User ID from JWT Token**

**Code:** `reports.routes.js` lines 11-38

```javascript
const authenticateUser = (req, res, next) => {
    // 1. Get Authorization header
    const authHeader = req.headers.authorization;

    // 2. Extract token (format: "Bearer <token>")
    const token = authHeader.split(' ')[1];

    // 3. Verify token with JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Extract user info from decoded token
    req.user = decoded;  // { userId: 5, name: "John", email: "john@example.com" }

    next();
};
```

**What happens:**
- Frontend sends: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Backend decodes token → Gets `userId: 5`
- All queries use this `userId` to fetch **ONLY that user's data**

---

## 🗄️ Database Queries - Where Data Comes From

### **Function:** `getReportData(connection, userId, startDate, endDate, categoryId)`

**Location:** Lines 173-303

This function runs **5 separate SQL queries** to get all report data:

---

### **Query 1: Summary Statistics**
**Lines 187-196**

```sql
SELECT
    COUNT(DISTINCT r.receipt_id) as receipt_count,
    SUM(r.total) as total_spending,
    AVG(r.total) as avg_transaction,
    MIN(r.receipt_date) as first_transaction,
    MAX(r.receipt_date) as last_transaction
FROM receipts r
WHERE r.user_id = ?  -- CRITICAL: Filters by authenticated user ID
AND r.receipt_date BETWEEN '2024-01-01' AND '2024-12-31'  -- Optional date filter
```

**Returns:**
```javascript
{
    receipt_count: 25,
    total_spending: 750.50,
    avg_transaction: 30.02,
    first_transaction: '2024-01-05',
    last_transaction: '2024-12-20'
}
```

**Data Source:** `receipts` table

---

### **Query 2: Category Breakdown**
**Lines 201-213**

```sql
SELECT
    ri.category_id,
    ri.category_name,
    SUM(ri.total_price) as total_spent,
    COUNT(ri.item_id) as item_count,
    AVG(ri.total_price) as avg_item_price
FROM receipt_items ri
JOIN receipts r ON ri.receipt_id = r.receipt_id
WHERE r.user_id = ?  -- CRITICAL: User-specific filter
AND r.receipt_date BETWEEN '2024-01-01' AND '2024-12-31'
AND ri.category_id = 5  -- Optional category filter
GROUP BY ri.category_id, ri.category_name
ORDER BY total_spent DESC
```

**Returns:**
```javascript
[
    { category_id: 1, category_name: 'Groceries', total_spent: 350.25, item_count: 45, percentage: 47 },
    { category_id: 2, category_name: 'Dining', total_spent: 250.00, item_count: 20, percentage: 33 },
    { category_id: 3, category_name: 'Gas', total_spent: 150.25, item_count: 10, percentage: 20 }
]
```

**Data Source:** `receipt_items` table (joined with `receipts`)

---

### **Query 3: Monthly Spending Trends**
**Lines 229-238**

```sql
SELECT
    DATE_FORMAT(r.receipt_date, '%Y-%m') as month,
    SUM(r.total) as total_spent,
    COUNT(r.receipt_id) as transaction_count
FROM receipts r
WHERE r.user_id = ?  -- CRITICAL: User-specific filter
AND r.receipt_date BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY DATE_FORMAT(r.receipt_date, '%Y-%m')
ORDER BY month
```

**Returns:**
```javascript
[
    { month: '2024-01', total_spent: 125.50, transaction_count: 5 },
    { month: '2024-02', total_spent: 200.00, transaction_count: 8 },
    { month: '2024-03', total_spent: 175.25, transaction_count: 6 }
]
```

**Data Source:** `receipts` table (grouped by month)

---

### **Query 4: Top Stores**
**Lines 241-253**

```sql
SELECT
    r.store_name,
    COUNT(r.receipt_id) as visit_count,
    SUM(r.total) as total_spent,
    AVG(r.total) as avg_per_visit
FROM receipts r
WHERE r.user_id = ?  -- CRITICAL: User-specific filter
AND r.receipt_date BETWEEN '2024-01-01' AND '2024-12-31'
AND r.store_name IS NOT NULL AND r.store_name != ''
GROUP BY r.store_name
ORDER BY total_spent DESC
LIMIT 10
```

**Returns:**
```javascript
[
    { store_name: 'Walmart', visit_count: 12, total_spent: 350.00, avg_per_visit: 29.17 },
    { store_name: 'Target', visit_count: 8, total_spent: 250.00, avg_per_visit: 31.25 },
    { store_name: 'Kroger', visit_count: 5, total_spent: 150.50, avg_per_visit: 30.10 }
]
```

**Data Source:** `receipts` table (grouped by store)

---

### **Query 5: Top Purchased Items**
**Lines 256-268**

```sql
SELECT
    ri.name,
    ri.category_name,
    SUM(ri.total_price) as total_spent,
    SUM(ri.quantity) as total_quantity
FROM receipt_items ri
JOIN receipts r ON ri.receipt_id = r.receipt_id
WHERE r.user_id = ?  -- CRITICAL: User-specific filter
AND r.receipt_date BETWEEN '2024-01-01' AND '2024-12-31'
AND ri.category_id = 5  -- Optional category filter
GROUP BY ri.name, ri.category_name
ORDER BY total_spent DESC
LIMIT 15
```

**Returns:**
```javascript
[
    { name: 'Milk', category_name: 'Groceries', total_spent: 45.00, total_quantity: 15 },
    { name: 'Bread', category_name: 'Groceries', total_spent: 30.00, total_quantity: 10 },
    { name: 'Coffee', category_name: 'Beverages', total_spent: 25.50, total_quantity: 5 }
]
```

**Data Source:** `receipt_items` table (joined with `receipts`)

---

## 📁 Database Tables Used

### **1. `receipts` Table**
```sql
Columns:
- receipt_id (Primary Key)
- user_id (Foreign Key) ← CRITICAL for filtering
- store_name
- total
- receipt_date
- created_at
```

### **2. `receipt_items` Table**
```sql
Columns:
- item_id (Primary Key)
- receipt_id (Foreign Key)
- name
- category_id
- category_name
- total_price
- quantity
- unit_price
```

---

## 🎯 Why Users Might See Wrong Data

### **Problem: User sees $750 (someone else's data)**

**Possible Causes:**

1. **❌ FIXED: Hardcoded userId = 1** (This was the bug we fixed!)
   ```javascript
   // OLD CODE (WRONG):
   req.user = { userId: 1 };  // Everyone got user 1's data!

   // NEW CODE (CORRECT):
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   req.user = decoded;  // Gets actual user ID from token
   ```

2. **❌ User not logged in properly**
   - JWT token missing or invalid
   - Token expired (7 days default)
   - Solution: User needs to re-login

3. **❌ Frontend sending wrong token**
   - Check: `localStorage.getItem('authToken')`
   - Should be a valid JWT token
   - Solution: Clear localStorage and re-login

4. **❌ Database connection issue**
   - MySQL connection pooling problem
   - Database returns cached results
   - Solution: Restart backend server

5. **❌ Browser caching old report**
   - Browser cached the PDF/CSV file
   - Solution: Add timestamp to filename (already done!)
   - Filename format: `report-user5-1734567890.pdf`

---

## 🔍 Debugging Steps

### **Step 1: Check Backend Logs**

When a report is generated, you'll see:
```
=== DEBUGGING DATA QUERIES ===
UserId: 5
StartDate: 2024-01-01
EndDate: 2024-12-31
CategoryId: null

--- 1. CHECKING RAW RECEIPTS ---
Raw Receipts Sample: [ { receipt_id: 123, store_name: 'Walmart', total: 45.50 } ]
Total Raw Receipts Found: 25

--- 2. CHECKING RAW RECEIPT ITEMS ---
Raw Items Sample: [ { item_id: 456, name: 'Milk', total_price: 4.50 } ]
Total Raw Items Found: 120

Debug: totalSpending = 750.5 number
Debug: receiptCount = 25 number
```

**Check:** Is `UserId` correct? Should match the logged-in user.

---

### **Step 2: Verify JWT Token**

**Frontend (Browser Console):**
```javascript
// Get token
const token = localStorage.getItem('authToken');
console.log('Token:', token);

// Decode token (paste this in console)
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

console.log('Decoded:', parseJwt(token));
// Should show: { userId: 5, name: "John", email: "john@example.com", iat: ..., exp: ... }
```

**Check:** Does `userId` match the logged-in user?

---

### **Step 3: Check Database Directly**

**MySQL Query:**
```sql
-- Get user's receipts
SELECT * FROM receipts WHERE user_id = 5;

-- Get user's items
SELECT ri.* FROM receipt_items ri
JOIN receipts r ON ri.receipt_id = r.receipt_id
WHERE r.user_id = 5;

-- Get user's total spending
SELECT SUM(total) FROM receipts WHERE user_id = 5;
```

**Check:** Is the data in the database correct for this user?

---

### **Step 4: Test with Specific User**

**Using curl:**
```bash
# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use the token from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Generate report
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reportFormat":"json"}'
```

**Check:** Does the JSON response have the correct user's data?

---

## 🛠️ Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| All users see $750 | Hardcoded `userId: 1` | ✅ **FIXED** - Now uses JWT authentication |
| User sees empty report | No receipts in database | Add receipts first |
| "Unauthorized" error | Missing/invalid token | Re-login to get new token |
| Old data in report | Browser cache | Clear cache or use incognito mode |
| Wrong date range | Frontend sending wrong dates | Check date picker values |
| Report shows 0 items | Category filter too restrictive | Remove category filter |

---

## 🔒 Security Features

1. **JWT Authentication** - Every request verified
2. **User Isolation** - `WHERE user_id = ?` in all queries
3. **SQL Injection Prevention** - Using parameterized queries
4. **Unique Filenames** - `report-user{userId}-{timestamp}.pdf`
5. **Token Expiry** - JWT tokens expire after 7 days

---

## 📝 Report Formats

### **PDF Report**
- **File**: `report-user5-1234567890.pdf`
- **Contains**: All sections with charts and styling
- **Size**: ~50-200 KB

### **CSV Report**
- **File**: `report-user5-1234567890.csv`
- **Contains**: Top items only (simple format)
- **Size**: ~5-10 KB

### **Excel Report**
- **File**: `report-user5-1234567890.xlsx`
- **Contains**: 5 sheets (Summary, Categories, Stores, Items, Monthly)
- **Size**: ~15-30 KB

### **JSON Report**
- **Format**: Inline response (no file)
- **Contains**: All data in JSON format
- **Use**: For API integration

---

## 🚀 Performance

- **Query Time**: 50-200ms (5 SQL queries)
- **PDF Generation**: 100-500ms
- **Total Time**: ~300-700ms per report

---

## 📊 Data Freshness

**Reports are generated in REAL-TIME:**
- ✅ Always reflects latest receipts
- ✅ No caching of query results
- ✅ File generated fresh each time
- ⚠️ Old PDF files are NOT deleted (cleanup needed)

---

## 🎯 Key Takeaway

**Every report is generated by:**
1. Authenticating the user (JWT token → userId)
2. Running 5 SQL queries with `WHERE user_id = ?`
3. Aggregating the data
4. Generating the file format
5. Returning the file URL

**The CRITICAL filter is:** `WHERE r.user_id = ?` in EVERY query!

This ensures users **ONLY see their own data**. 🔒
