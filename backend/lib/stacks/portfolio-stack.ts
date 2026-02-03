import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class ViktorijaPortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. S3 Bucket for Static Website
    const bucket = new s3.Bucket(this, 'AstroBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      autoDeleteObjects: true, // Only for non-production environments to ease cleanup
    });

    // 2. Lambda@Edge Functions
    // Origin Request Function (Rewrites /about -> /about/index.html)
    // Note: Lambda@Edge must be in us-east-1. The stack should be deployed to us-east-1,
    // or use EdgeFunction which handles cross-region creation (experimental).
    // Using standard Function here assuming stack is in us-east-1 as per best practice for Edge stacks.
    const originRequestFunction = new lambda.Function(this, 'OriginRequestFunction', {
      runtime: new lambda.Runtime('nodejs24.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/origin-request')),
      architecture: lambda.Architecture.X86_64, // Lambda@Edge currently supports x86_64
    });

    // Origin Response Function (Adds Security Headers)
    const originResponseFunction = new lambda.Function(this, 'OriginResponseFunction', {
      runtime: new lambda.Runtime('nodejs24.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/origin-response')),
      architecture: lambda.Architecture.X86_64,
    });

    // 3. CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'AstroDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        edgeLambdas: [
          {
            functionVersion: originRequestFunction.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
          {
            functionVersion: originResponseFunction.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
          },
        ],
      },
      defaultRootObject: 'index.html',
    });

    // 4. Sanity Webhook Lambda (to trigger GHA)
    const sanityWebhookLambda = new lambda.Function(this, 'SanityWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/sanity-webhook')),
      environment: {
        GITHUB_TOKEN: 'REPLACE_WITH_GITHUB_PAT', // User should replace this or use Secrets Manager
        GITHUB_OWNER: 'ViktorijaKorlevska',
        GITHUB_REPO: 'ViktorijaKorlevska',
        GITHUB_WORKFLOW: 'deploy-client.yml',
        SANITY_WEBHOOK_SECRET: 'REPLACE_WITH_SANITY_SECRET', // Optional security
      },
    });

    // 5. API Gateway for the Webhook
    const api = new apigateway.RestApi(this, 'SanityWebhookApi', {
      restApiName: 'Sanity Webhook Service',
      description: 'Triggers GHA on Sanity content updates.',
    });

    const webhookIntegration = new apigateway.LambdaIntegration(sanityWebhookLambda);
    api.root.addMethod('POST', webhookIntegration);

    // 6. Outputs for CI/CD
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'The S3 Bucket Name for static assets',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'The CloudFront Distribution ID for invalidation',
    });

    // Output CloudFront URL
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebhookUrl', {
      value: api.url,
      description: 'The Sanity Webhook URL',
    });
  }
}
