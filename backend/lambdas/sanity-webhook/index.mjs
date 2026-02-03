import crypto from 'crypto';

export const handler = async (event) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_WORKFLOW = process.env.GITHUB_WORKFLOW || 'deploy-client.yml';
  const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET;

  // 1. Verify Sanity Signature (Optional but recommended)
  const signature = event.headers['ms-sanity-signature-v1'] || event.headers['Ms-Sanity-Signature-V1'];
  if (SANITY_WEBHOOK_SECRET && signature) {
    let body = event.body;
    if (event.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf8');
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', SANITY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid signature' }),
      };
    }
  }

  // 2. Trigger GitHub Action
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`;

  console.log('Triggering GitHub workflow at:', url);
  console.log('Owner:', GITHUB_OWNER, 'Repo:', GITHUB_REPO, 'Workflow:', GITHUB_WORKFLOW);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: 'main', // or the branch you want to deploy
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      return {
        statusCode: response.status,
        body: JSON.stringify(errorData),
      };
    }

    console.log('Successfully triggered GitHub Action');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Workflow triggered successfully' }),
    };
  } catch (error) {
    console.error('Error triggering GitHub Action:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
