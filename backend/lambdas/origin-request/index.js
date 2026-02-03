// Origin Request Lambda@Edge function
// Rewrite URI requests for clean URLs
exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const uri = request.uri;

    // Check if the URI ends with / -> append index.html
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } 
    // Check if the URI does not have an extension (e.g. .html, .css, .js)
    else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }

    return request;
};
