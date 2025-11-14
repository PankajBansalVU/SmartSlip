const dns = require('dns').promises;

// List of common disposable/temporary email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
    // Temporary email services
    '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'mailinator.com',
    'tempmail.com', 'temp-mail.org', 'throwaway.email', 'getnada.com',
    'maildrop.cc', 'trashmail.com', 'yopmail.com', 'fakeinbox.com',
    'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
    'grr.la', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
    'guerrillamail.org', 'mailnesia.com', 'mintemail.com', 'mytemp.email',
    'tempinbox.com', 'emailondeck.com', 'moakt.com', 'emltmp.com',
    '20minutemail.com', '33mail.com', 'dispostable.com', 'emailtemporanea.com',
    'mytrashmail.com', 'mailcatch.com', 'tempail.com', 'tempemail.net',

    // Add more as you discover them
    'temp-mail.io', 'mohmal.com', 'throwam.com', 'disposablemail.com',
    'anonbox.net', 'anonymbox.com', 'mailexpire.com', 'tempsky.com',
    'spamgourmet.com', 'discard.email', 'getairmail.com', 'goemailgo.com'
];

// Common typos of popular email providers
const COMMON_EMAIL_TYPOS = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmil.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'hotmial.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com'
};

/**
 * Validates email format using comprehensive regex
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email format is valid
 */
function validateEmailFormat(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Comprehensive email regex pattern
    // Allows: letters, numbers, dots, hyphens, underscores before @
    // Domain must have at least one dot and valid TLD
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Additional checks
    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const [localPart, domain] = parts;

    // Local part (before @) validations
    if (localPart.length === 0 || localPart.length > 64) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false; // No consecutive dots

    // Domain validations
    if (domain.length === 0 || domain.length > 255) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;

    return emailRegex.test(email);
}

/**
 * Checks if email domain is a known disposable/temporary email service
 * @param {string} email - Email address to check
 * @returns {boolean} - True if disposable email detected
 */
function isDisposableEmail(email) {
    if (!email) return false;

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Suggests correction for common email typos
 * @param {string} email - Email address to check
 * @returns {string|null} - Suggested email or null if no suggestion
 */
function suggestEmailCorrection(email) {
    if (!email) return null;

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    if (COMMON_EMAIL_TYPOS[domain]) {
        const localPart = email.split('@')[0];
        return `${localPart}@${COMMON_EMAIL_TYPOS[domain]}`;
    }

    return null;
}

/**
 * Verifies that email domain has valid MX records (can receive emails)
 * @param {string} email - Email address to verify
 * @returns {Promise<boolean>} - True if domain has MX records
 */
async function verifyMXRecords(email) {
    try {
        const domain = email.split('@')[1];
        if (!domain) return false;

        const addresses = await dns.resolveMx(domain);
        return addresses && addresses.length > 0;
    } catch (error) {
        // DNS lookup failed - domain doesn't exist or no MX records
        console.log(`MX record check failed for ${email}:`, error.message);
        return false;
    }
}

/**
 * Comprehensive email validation
 * @param {string} email - Email address to validate
 * @param {object} options - Validation options
 * @param {boolean} options.checkMX - Whether to verify MX records (slower but more thorough)
 * @param {boolean} options.blockDisposable - Whether to block disposable emails
 * @returns {Promise<object>} - Validation result with details
 */
async function validateEmail(email, options = {}) {
    const {
        checkMX = false,
        blockDisposable = true
    } = options;

    const result = {
        valid: false,
        email: email?.toLowerCase()?.trim(),
        errors: [],
        warnings: [],
        suggestion: null
    };

    // 1. Basic format validation
    if (!validateEmailFormat(email)) {
        result.errors.push('Invalid email format');
        return result;
    }

    // 2. Check for disposable email
    if (blockDisposable && isDisposableEmail(email)) {
        result.errors.push('Disposable/temporary email addresses are not allowed. Please use a permanent email address.');
        return result;
    }

    // 3. Check for common typos
    const suggestion = suggestEmailCorrection(email);
    if (suggestion) {
        result.warnings.push(`Did you mean ${suggestion}?`);
        result.suggestion = suggestion;
    }

    // 4. Optional: Verify MX records
    if (checkMX) {
        const hasMX = await verifyMXRecords(email);
        if (!hasMX) {
            result.errors.push('Email domain does not exist or cannot receive emails');
            return result;
        }
    }

    // All validations passed
    result.valid = true;
    return result;
}

/**
 * Quick synchronous validation (no MX check)
 * @param {string} email - Email address to validate
 * @returns {object} - Validation result
 */
function validateEmailSync(email) {
    const result = {
        valid: false,
        email: email?.toLowerCase()?.trim(),
        errors: [],
        warnings: [],
        suggestion: null
    };

    // Format validation
    if (!validateEmailFormat(email)) {
        result.errors.push('Invalid email format');
        return result;
    }

    // Disposable email check
    if (isDisposableEmail(email)) {
        result.errors.push('Disposable/temporary email addresses are not allowed. Please use a permanent email address.');
        return result;
    }

    // Typo check
    const suggestion = suggestEmailCorrection(email);
    if (suggestion) {
        result.warnings.push(`Did you mean ${suggestion}?`);
        result.suggestion = suggestion;
    }

    result.valid = true;
    return result;
}

module.exports = {
    validateEmail,
    validateEmailSync,
    validateEmailFormat,
    isDisposableEmail,
    suggestEmailCorrection,
    verifyMXRecords,
    DISPOSABLE_EMAIL_DOMAINS // Export for testing/updates
};
