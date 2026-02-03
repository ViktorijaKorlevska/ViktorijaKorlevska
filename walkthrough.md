# Astro + AWS CDK Deployment Walkthrough

This guide explains how to deploy your Astro static site using the newly configured AWS CDK setup.

## Prerequisites

- AWS Credentials configured in your environment.
- Node.js installed.

## Project Structure

- `client/`: Astro project.
- `backend/`: AWS CDK project (Infrastructure as Code).

## Sanity Integration

This project is connected to Sanity CMS.

1. **Environment Setup**
   - Copy `.env.example` to `.env` in `client/`.
   - Update `SANITY_PROJECT_ID` and `SANITY_DATASET`.
   - Start the dev server: `npm run dev` in `client/`.

2. **Testing**
   - Visit `/sanity-test` to see data fetched from Sanity.
   - The page is static and generated at build time.

## Deployment Steps

1. **Bootstrap CDK (First Time Only)**
   If this is your first time deploying CDK in this account/region, run:

   ```bash
   cd backend
   npm run bootstrap
   ```

2. **Deploy Infrastructure**

   This command deploys the **ViktorijaPortfolioStack** CDK stack (without uploading static files, which is handled by CI/CD):

   ```bash
   cd backend
   npm run deploy
   ```

   After deployment, note the following outputs:
   - `BucketName`: The S3 bucket to sync your files to.
   - `DistributionId`: The CloudFront ID to invalidate.
   - `DistributionDomainName`: The URL of your website.
   - `WebhookUrl`: The endpoint for Sanity Content updates.

## CI/CD Integration (GitHub Actions)

Two workflow files have been created in `.github/workflows/`:

1.  **`deploy-backend.yml`**:
    - **Triggers**: Push to `main` when `backend/` files change.
    - **Action**: Deploys the CDK Infrastructure (`viktorija-portfolio`).

2.  **`deploy-client.yml`**:
    - **Triggers**: Push to `main` when `client/` files change **OR** triggered via Webhook.
    - **Action**: Builds Astro, Fetches Stack Outputs (Bucket/Distribution), Syncs to S3, Invalidates CloudFront.

### Setup Instructions

1.  **Deploy OIDC Stack (One-time)**

    ```bash
    cd backend
    npm run deploy -- github-oidc
    ```

2.  **Configure GitHub Secrets**
    Add these to **Settings** -> **Secrets and variables** -> **Actions**:

| Secret Name                 | Description                                               |
| :-------------------------- | :-------------------------------------------------------- |
| `AWS_ACCOUNT_ID`            | Your AWS Account ID.                                      |
| `SANITY_PROJECT_ID`         | Your Sanity Project ID.                                   |
| `SANITY_DATASET`            | Your Sanity Dataset (e.g., `production`).                 |
| `SANITY_GHA_TOKEN`          | GitHub PAT with `repo` scope to trigger workflows.        |
| `SANITY_WEBHOOK_SECRET`     | (Optional) Shared secret for Sanity Webhook verification. |
| `PORTFOLIO_DOMAIN_NAME`     | (Optional) Custom domain (e.g. `viktorijakorlevska.com`). |
| `PORTFOLIO_ALTERNATE_NAMES` | (Optional) Comma-separated aliases (e.g. `www...`).       |
| `PORTFOLIO_CERT_ARN`        | (Optional) ARN of ACM cert in us-east-1.                  |

## Sanity Webhook Configuration

To automatically rebuild your site when content changes in Sanity:

1.  **Create a GitHub Personal Access Token (PAT)**:
    - Go to GitHub Settings -> Developer settings -> Personal access tokens -> Tokens (classic).
    - Generate a new token with `repo` scope.
2.  **Update Lambda Environment Variables**:
    - In the AWS Lambda Console, find `SanityWebhookFunction`.
    - Update `GITHUB_TOKEN` with your PAT.
    - (Optional) Set `SANITY_WEBHOOK_SECRET` for signature verification.
3.  **Configure Webhook in Sanity**:
    - Go to [Sanity Manage](https://www.sanity.io/manage).
    - Select your project -> API -> Webhooks.
    - Click **Create Webhook**.
    - **URL**: Use the `WebhookUrl` from CDK outputs.
    - **Dataset**: `production`.
    - **Secret**: The one you set in Lambda (if any).
    - **Filter**: `_type == "portfolio"` (or leave blank for all changes).

### Verification

- After deployment, the CloudFront URL will be printed in the terminal (e.g., `DistributionDomainName = https://d12345.cloudfront.net`).
- Visit the URL.
- Test `/about` -> should load `/about/index.html`.
- Check response headers for security headers.

## Configuration Details

- **Region**: `us-east-1` (Required for Lambda@Edge).
- **Runtime**: Node.js 24 (specified as `nodejs24.x`).
- **Security**:
  - S3 Bucket is private.
  - CloudFront accesses S3 via Origin Access Control (OAC).
  - Lambda@Edge adds security headers.

## Scripts

- `client/package.json`:
  - `build`: Builds the Astro site.
- `backend/package.json`:
  - `bootstrap`: Boootstraps CDK environment.
  - `synth`: Synthesizes CloudFormation template.
  - `deploy`: Deploys stack (updates infrastructure).
  - `destroy`: Destroys stack.
  - `deploy:all`: Builds Client + Deploys Backend.

## Troubleshooting

- **Lambda Runtime Error**: If `nodejs24.x` is not yet available in your AWS region, edit `backend/lib/backend-stack.ts` and change runtime to `NODEJS_20_X` or `NODEJS_22_X`.
