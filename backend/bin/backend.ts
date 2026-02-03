#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ViktorijaPortfolioStack } from '../lib/stacks/portfolio-stack';
import { GitHubOIDCStack } from '../lib/stacks/github-oidc-stack';

const app = new cdk.App();

// Environment configuration
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' };

const portfolioStack = new ViktorijaPortfolioStack(app, 'viktorija-portfolio', { 
  env,
  domainName: process.env.PORTFOLIO_DOMAIN_NAME,
  alternateNames: process.env.PORTFOLIO_ALTERNATE_NAMES ? process.env.PORTFOLIO_ALTERNATE_NAMES.split(',') : [],
  certificateArn: process.env.PORTFOLIO_CERT_ARN,
});

new GitHubOIDCStack(app, 'github-oidc', {
  env,
  githubOrg: 'ViktorijaKorlevska',
  githubRepo: 'ViktorijaKorlevska',
});

