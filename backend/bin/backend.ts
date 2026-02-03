#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ViktorijaPortfolioStack } from '../lib/stacks/portfolio-stack';
import { GitHubOIDCStack } from '../lib/stacks/github-oidc-stack';

const app = new cdk.App();

// Environment configuration
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' };

const portfolioStack = new ViktorijaPortfolioStack(app, 'viktorija-portfolio', { env });

new GitHubOIDCStack(app, 'github-oidc', {
  env,
  githubOrg: 'ViktorijaKorlevska',
  githubRepo: 'ViktorijaKorlevska',
});

