// Test file for email validation
const { validateEmailSync, isDisposableEmail } = require('./emailValidation');

console.log('========== Email Validation Tests ==========\n');

// Test cases
const testEmails = [
    // Valid emails
    'user@gmail.com',
    'john.doe@company.com',
    'test.user+tag@example.co.uk',

    // Invalid formats
    'notanemail',
    'missing@domain',
    '@nodomain.com',
    'double@@domain.com',

    // Disposable/fake emails (should be blocked)
    'test@mailinator.com',
    'fake@10minutemail.com',
    'temp@guerrillamail.com',
    'spam@yopmail.com',
    'user@tempmail.com',

    // Common typos (should suggest correction)
    'user@gmial.com',
    'john@yahooo.com',
    'test@hotmial.com'
];

testEmails.forEach(email => {
    const result = validateEmailSync(email);

    console.log(`Email: ${email}`);
    console.log(`  Valid: ${result.valid}`);

    if (result.errors.length > 0) {
        console.log(`  ❌ Errors: ${result.errors.join(', ')}`);
    }

    if (result.warnings.length > 0) {
        console.log(`  ⚠️  Warnings: ${result.warnings.join(', ')}`);
    }

    if (result.suggestion) {
        console.log(`  💡 Suggestion: ${result.suggestion}`);
    }

    console.log('');
});

console.log('\n========== Disposable Email Domain Tests ==========\n');

const disposableTests = [
    'test@gmail.com',           // Should pass
    'user@outlook.com',         // Should pass
    'temp@mailinator.com',      // Should be blocked
    'fake@10minutemail.com',    // Should be blocked
    'spam@guerrillamail.com'    // Should be blocked
];

disposableTests.forEach(email => {
    const isDisposable = isDisposableEmail(email);
    console.log(`${email}: ${isDisposable ? '❌ BLOCKED (Disposable)' : '✅ ALLOWED'}`);
});

console.log('\n========== Test Complete ==========');
