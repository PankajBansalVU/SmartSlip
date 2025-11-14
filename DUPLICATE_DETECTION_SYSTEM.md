# 🔍 Duplicate Receipt Detection System

## Overview
SmartSlip now automatically detects and prevents duplicate receipts from being saved, while allowing users to review and clean up existing duplicates.

---

## 🎯 Features

### 1. **Real-Time Duplicate Prevention** (NEW)
- Checks for duplicates **BEFORE** saving new receipts
- Prevents accidental double-scanning
- Does NOT affect existing data

### 2. **Duplicate Review API** (NEW)
- Lists all existing duplicate receipts
- Groups duplicates by store, total, and date
- Shows which receipt was saved first/last

### 3. **Manual Cleanup**
- Users can review duplicates
- Delete unwanted copies manually
- Keeps the original receipt

---

## 🔧 How It Works

### Duplicate Detection Logic

A receipt is considered a **duplicate** if it matches ALL of these criteria:
1. **Same user_id** (same user)
2. **Same store_name** (exact match)
3. **Same total amount** (exact match)
4. **Same receipt_date** (same day)

**Example:**
```
Receipt A: Walmart, $25.00, 2024-07-12
Receipt B: Walmart, $25.00, 2024-07-12
→ DUPLICATE! ⚠️

Receipt C: Walmart, $25.01, 2024-07-12
→ NOT duplicate (different total)

Receipt D: Walmart, $25.00, 2024-07-13
→ NOT duplicate (different date)
```

---

## 📡 API Endpoints

### **1. Save Receipt (Modified)**

**Endpoint:** `POST /save-receipt`

**New Behavior:**
- Checks for duplicates before saving
- Returns HTTP **409 Conflict** if duplicate found
- Original receipt is NOT saved

**Request:**
```json
{
  "analysis": {
    "store": { "name": "Walmart", "location": "..." },
    "totals": { "total": 25.00, ... },
    "date": "2024-07-12",
    "items": [...]
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Receipt saved successfully",
  "receiptId": 123
}
```

**Duplicate Detected Response (409):**
```json
{
  "success": false,
  "isDuplicate": true,
  "message": "Possible duplicate receipt detected",
  "duplicateReceipt": {
    "id": 89,
    "store": "Walmart",
    "total": "25.00",
    "date": "2024-07-12T00:00:00.000Z",
    "savedAt": "2024-07-12T10:30:00.000Z"
  },
  "currentReceipt": {
    "store": "Walmart",
    "total": 25.00,
    "date": "2024-07-12 00:00:00"
  }
}
```

---

### **2. Get Duplicate Receipts (NEW)**

**Endpoint:** `GET /receipts/duplicates`

**Authentication:** Required (JWT Bearer token)

**Response:**
```json
{
  "success": true,
  "duplicateCount": 2,
  "duplicates": [
    {
      "duplicateGroup": {
        "store": "BIG W Fountain Gate",
        "total": "25.00",
        "date": "2024-07-12T00:00:00.000Z",
        "count": 2
      },
      "receipts": [
        {
          "receipt_id": 25,
          "store_name": "BIG W Fountain Gate",
          "total": "25.00",
          "receipt_date": "2024-07-12T00:00:00.000Z",
          "created_at": "2024-07-12T08:15:00.000Z",
          "item_count": 5
        },
        {
          "receipt_id": 27,
          "store_name": "BIG W Fountain Gate",
          "total": "25.00",
          "receipt_date": "2024-07-12T00:00:00.000Z",
          "created_at": "2024-07-12T14:30:00.000Z",
          "item_count": 5
        }
      ]
    }
  ]
}
```

---

### **3. Delete Receipt (Existing)**

**Endpoint:** `DELETE /receipts/:id`

**Authentication:** Required

**Use Case:** Delete unwanted duplicate receipts

**Response:**
```json
{
  "success": true,
  "message": "Receipt deleted successfully"
}
```

---

## 🖥️ Frontend Integration Examples

### **Example 1: Handle Duplicate on Save**

```javascript
async function saveReceipt(analysis) {
    try {
        const response = await fetch('/save-receipt', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ analysis })
        });

        const data = await response.json();

        if (response.status === 409) {
            // Duplicate detected!
            showDuplicateWarning(data);
            return;
        }

        if (data.success) {
            showSuccess('Receipt saved!');
        }
    } catch (error) {
        console.error('Save error:', error);
    }
}

function showDuplicateWarning(data) {
    const dup = data.duplicateReceipt;

    alert(`⚠️ Duplicate Detected!\n\n` +
          `You already saved this receipt:\n` +
          `${dup.store} - $${dup.total}\n` +
          `Date: ${new Date(dup.date).toLocaleDateString()}\n` +
          `Saved: ${new Date(dup.savedAt).toLocaleString()}\n\n` +
          `Receipt was NOT saved to avoid duplication.`);
}
```

---

### **Example 2: Show Duplicates Page**

```javascript
async function loadDuplicates() {
    try {
        const response = await fetch('/receipts/duplicates', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.duplicateCount === 0) {
            showMessage('No duplicates found! ✅');
            return;
        }

        displayDuplicates(data.duplicates);
    } catch (error) {
        console.error('Load duplicates error:', error);
    }
}

function displayDuplicates(duplicates) {
    const html = duplicates.map(dup => `
        <div class="duplicate-group">
            <h3>${dup.duplicateGroup.store} - $${dup.duplicateGroup.total}</h3>
            <p>Found ${dup.duplicateGroup.count} copies</p>

            ${dup.receipts.map((receipt, idx) => `
                <div class="receipt-card">
                    <span>${idx === 0 ? '📌 Original' : '⚠️ Duplicate'}</span>
                    <p>Saved: ${new Date(receipt.created_at).toLocaleString()}</p>
                    <p>Items: ${receipt.item_count}</p>
                    ${idx > 0 ? `
                        <button onclick="deleteReceipt(${receipt.receipt_id})">
                            🗑️ Delete This Copy
                        </button>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `).join('');

    document.getElementById('duplicates-container').innerHTML = html;
}
```

---

## 🧪 Testing

### **Test Case 1: Prevent New Duplicates**

1. Scan a receipt (e.g., Walmart $25.00, July 12)
2. Save it successfully
3. Scan the SAME receipt again
4. **Expected:** HTTP 409 error with duplicate details
5. **Result:** Receipt is NOT saved

### **Test Case 2: View Existing Duplicates**

1. Call `GET /receipts/duplicates`
2. **Expected:** List of duplicate groups
3. Review each group showing original and duplicate(s)

### **Test Case 3: Delete Duplicate**

1. Find duplicate receipt ID from duplicates list
2. Call `DELETE /receipts/:id`
3. Verify receipt is deleted
4. Verify items are also deleted (cascading delete)

### **Test Case 4: Different Receipt (NOT Duplicate)**

```javascript
// Receipt A
{ store: "Walmart", total: 25.00, date: "2024-07-12" }

// Receipt B (different total)
{ store: "Walmart", total: 25.50, date: "2024-07-12" }

// Expected: Both saved successfully (NOT duplicates)
```

---

## 📊 Database Queries

### **Check for Duplicates (used in /save-receipt)**

```sql
SELECT
    receipt_id,
    store_name,
    total,
    receipt_date,
    created_at
FROM receipts
WHERE user_id = ?
AND store_name = ?
AND total = ?
AND DATE(receipt_date) = DATE(?)
LIMIT 1
```

### **Find All Duplicates (used in /receipts/duplicates)**

```sql
SELECT
    GROUP_CONCAT(receipt_id ORDER BY receipt_id) as receipt_ids,
    store_name,
    total,
    receipt_date,
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_saved,
    MAX(created_at) as last_saved
FROM receipts
WHERE user_id = ?
GROUP BY user_id, store_name, total, DATE(receipt_date)
HAVING COUNT(*) > 1
ORDER BY last_saved DESC
```

---

## ⚙️ Configuration

### **Matching Criteria (Can be adjusted)**

Currently matches on:
- ✅ Store name (exact match)
- ✅ Total amount (exact match)
- ✅ Receipt date (same day)
- ✅ User ID (same user)

**To make matching more lenient:**
```sql
-- Allow small price differences (e.g., ±$0.10)
AND ABS(total - ?) < 0.10

-- Match by week instead of day
AND WEEK(receipt_date) = WEEK(?)
```

**To make matching stricter:**
```sql
-- Also match time (not just date)
AND receipt_date = ?

-- Also match store location
AND store_location = ?
```

---

## 🔒 Security

1. **User Isolation:** Only checks duplicates within same user_id
2. **Authentication Required:** All endpoints require JWT token
3. **Ownership Verification:** Users can only delete their own receipts
4. **Transaction Safety:** Uses database transactions for consistency

---

## 📈 Impact on Reports

**Before Fix:**
- Duplicates counted twice → inflated totals
- User sees $750 when actual is $700

**After Fix:**
- Duplicates prevented from saving
- Existing duplicates can be manually removed
- Reports show accurate totals

---

## 🚀 Deployment

### **Changes Made:**
1. Modified `POST /save-receipt` endpoint
2. Added `GET /receipts/duplicates` endpoint
3. Fixed report SQL queries to use `DISTINCT` and `COALESCE`

### **Database Changes:**
- None required (uses existing tables)

### **Environment Variables:**
- None required

---

## 📝 User Guide

### **For End Users:**

**When scanning a receipt:**
1. If you see "Duplicate detected" → Receipt already saved
2. Check your history to verify
3. Don't scan the same receipt twice

**To clean up existing duplicates:**
1. Go to Settings → Review Duplicates
2. See list of duplicate receipts
3. Keep the original, delete extra copies
4. Totals in reports will be corrected

---

## 🐛 Troubleshooting

### **Issue: False positive duplicates**

**Cause:** Two different receipts have same store, total, and date

**Solution:**
- Add more matching criteria (location, time, items)
- Or manually review and confirm it's actually duplicate

### **Issue: Duplicate not detected**

**Possible causes:**
1. Store name spelled differently ("Walmart" vs "Wal-Mart")
2. Total amount differs by pennies ($25.00 vs $25.01)
3. Dates in different format

**Solution:**
- Normalize store names before saving
- Use fuzzy matching for store names
- Round totals to nearest dollar

---

## 🔮 Future Enhancements

- [ ] Fuzzy matching for store names
- [ ] Auto-merge duplicates with user confirmation
- [ ] Duplicate detection based on item similarity
- [ ] Weekly summary of prevented duplicates
- [ ] Bulk delete duplicates feature

---

## ✅ Summary

**What's Fixed:**
✅ New receipts are checked for duplicates before saving
✅ Users get clear error message when duplicate detected
✅ Existing duplicates can be reviewed via API
✅ Users can manually delete duplicate receipts
✅ Report calculations improved with DISTINCT and COALESCE

**What's NOT Changed:**
❌ Existing duplicate data NOT automatically deleted
❌ Users must manually clean up old duplicates
❌ Historical reports may still show inflated totals until cleanup

---

**Next Steps:**
1. Test duplicate detection with various receipts
2. Add frontend UI to show duplicate warning
3. Create duplicates review page
4. Monitor for false positives
