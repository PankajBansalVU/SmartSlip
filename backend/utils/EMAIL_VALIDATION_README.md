# Email Validation System

## Overview
This email validation system prevents fake, disposable, and temporary email addresses from registering on SmartSlip, while also catching common typos.

## Features

### 1. **Format Validation**
- Validates proper email structure (local@domain.tld)
- Checks for invalid characters
- Prevents consecutive dots (..)
- Ensures valid domain format

### 2. **Disposable Email Blocking** 🚫
Blocks **50+ known disposable/temporary email providers**:
- mailinator.com
- 10minutemail.com
- guerrillamail.com
- tempmail.com
- yopmail.com
- And many more...

### 3. **Typo Detection & Suggestions** 💡
Detects common typos and suggests corrections:
- `gmial.com` → suggests `gmail.com`
- `yahooo.com` → suggests `yahoo.com`
- `hotmial.com` → suggests `hotmail.com`
- `outlok.com` → suggests `outlook.com`

### 4. **MX Record Verification** (Optional)
Can verify that the email domain actually exists and can receive emails by checking DNS MX records.

## Usage

### Quick Validation (Synchronous)
```javascript
const { validateEmailSync } = require('./utils/emailValidation');

const result = validateEmailSync('user@example.com');

if (result.valid) {
    console.log('Email is valid!');
} else {
    console.log('Errors:', result.errors);
}

if (result.suggestion) {
    console.log('Did you mean:', result.suggestion);
}
```

### Advanced Validation (Async with MX Check)
```javascript
const { validateEmail } = require('./utils/emailValidation');

const result = await validateEmail('user@example.com', {
    checkMX: true,           // Verify domain MX records
    blockDisposable: true    // Block temporary emails
});
```

## API Response Format

### Success Response
```json
{
    "valid": true,
    "email": "user@gmail.com",
    "errors": [],
    "warnings": [],
    "suggestion": null
}
```

### Error Response (Disposable Email)
```json
{
    "valid": false,
    "email": "test@mailinator.com",
    "errors": [
        "Disposable/temporary email addresses are not allowed. Please use a permanent email address."
    ],
    "warnings": [],
    "suggestion": null
}
```

### Warning Response (Typo Detected)
```json
{
    "valid": true,
    "email": "user@gmial.com",
    "errors": [],
    "warnings": ["Did you mean user@gmail.com?"],
    "suggestion": "user@gmail.com"
}
```

## Integration Points

### 1. Registration (`/auth/register`)
- Validates email format
- Blocks disposable emails
- Logs typo warnings

### 2. Forgot Password (`/auth/forgot-password`)
- Validates email format
- Silently rejects invalid emails (security measure)

### 3. Login
- No validation needed (already registered)

## Adding New Disposable Domains

To block additional disposable email providers, edit `emailValidation.js`:

```javascript
const DISPOSABLE_EMAIL_DOMAINS = [
    // Add new domains here
    'newtempemail.com',
    'anotherfakedomain.com',
    // ... existing domains
];
```

## Testing

Run the test suite:
```bash
cd backend
node utils/testEmailValidation.js
```

### Test Results:

✅ **Valid Emails:**
- user@gmail.com
- john.doe@company.com

❌ **Blocked (Disposable):**
- test@mailinator.com
- fake@10minutemail.com
- temp@guerrillamail.com
- spam@yopmail.com

💡 **Typo Suggestions:**
- user@gmial.com → user@gmail.com
- john@yahooo.com → john@yahoo.com

## Error Messages

| Error Type | Message |
|------------|---------|
| Invalid Format | "Invalid email format" |
| Disposable Email | "Disposable/temporary email addresses are not allowed. Please use a permanent email address." |
| No MX Records | "Email domain does not exist or cannot receive emails" |

## Performance

- **Sync Validation**: < 1ms (instant)
- **Async with MX Check**: 50-200ms (DNS lookup)

## Security Benefits

1. **Prevents spam accounts** - Blocks temporary email services
2. **Reduces fake registrations** - Ensures valid email domains
3. **Improves user experience** - Catches typos early
4. **Protects email deliverability** - Ensures emails actually reach users

## Common Blocked Domains (50+)

### Temporary Email Services
- 10minutemail.com, 10minutemail.net
- guerrillamail.com, guerrillamail.biz
- mailinator.com
- tempmail.com, temp-mail.org, temp-mail.io
- yopmail.com
- getnada.com
- maildrop.cc
- trashmail.com
- fakeinbox.com
- sharklasers.com

### Full list available in: `emailValidation.js`

## Future Enhancements

- [ ] Email verification with OTP
- [ ] Real-time API for disposable domain updates
- [ ] Machine learning for pattern detection
- [ ] Support for international domains
- [ ] Rate limiting for validation attempts

## Maintenance

**Update disposable email list monthly** by checking:
1. https://github.com/disposable-email-domains/disposable-email-domains
2. User registration patterns
3. Spam/abuse reports

## Support

For issues or questions:
1. Check test results: `node utils/testEmailValidation.js`
2. Review server logs for validation errors
3. Add new domains to blocklist as needed
