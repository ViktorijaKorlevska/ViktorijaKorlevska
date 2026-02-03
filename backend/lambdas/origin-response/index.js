// Origin Response Lambda@Edge function
// Add Security Headers
exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;

    const securityHeaders = {
        'strict-transport-security': [
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
        ],
        'x-frame-options': [
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' }
        ],
        'x-content-type-options': [
            { key: 'X-Content-Type-Options', value: 'nosniff' }
        ],
        'referrer-policy': [
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ],
        'content-security-policy': [
            { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' * data:; font-src 'self' https: data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" }
        ]
    };

    // Merge headers
    for (const header in securityHeaders) {
        headers[header] = securityHeaders[header];
    }

    return response;
};
