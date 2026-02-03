import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as path from 'path';
export interface ViktorijaPortfolioStackProps extends cdk.StackProps {
  domainName?: string;
  alternateNames?: string[];
  certificateArn?: string;
}

export class ViktorijaPortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ViktorijaPortfolioStackProps) {
    super(scope, id, props);

    const domainName = props?.domainName;
    const alternateNames = props?.alternateNames || [];
    const certificateArn = props?.certificateArn;

    // 1. S3 Bucket for Static Website
    const bucket = new s3.Bucket(this, 'ViktorijaPortfolioBucket', {
      bucketName: `viktorija-portfolio-assets-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. Lambda@Edge Functions
    const originRequestFunction = new lambda.Function(this, 'ViktorijaPortfolioOriginRequest', {
      functionName: 'viktorija-portfolio-origin-request',
      description: 'Rewrites URLs for Astro static site (e.g., /about to /about/index.html)',
      runtime: new lambda.Runtime('nodejs24.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/origin-request')),
      architecture: lambda.Architecture.X86_64,
    });

    const originResponseFunction = new lambda.Function(this, 'ViktorijaPortfolioOriginResponse', {
      functionName: 'viktorija-portfolio-origin-response',
      description: 'Adds security headers to CloudFront responses',
      runtime: new lambda.Runtime('nodejs24.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/origin-response')),
      architecture: lambda.Architecture.X86_64,
    });

    // 3. CloudFront Distribution
    const viewerCertificate = certificateArn 
      ? cloudfront.ViewerCertificate.fromAcmCertificate(
          acm.Certificate.fromCertificateArn(this, 'ViktorijaPortfolioCertificate', certificateArn),
          {
            aliases: [domainName!, ...alternateNames],
            sslMethod: cloudfront.SSLMethod.SNI,
            securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
          }
        )
      : undefined;

    const distribution = new cloudfront.Distribution(this, 'ViktorijaPortfolioDistribution', {
      comment: 'CloudFront distribution for Viktorija Korlevska Portfolio',
      domainNames: domainName ? [domainName, ...alternateNames] : undefined,
      certificate: certificateArn ? acm.Certificate.fromCertificateArn(this, 'PortfolioCert', certificateArn) : undefined,
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

    // 4. Route 53 Records
    if (domainName) {
      const zone = route53.HostedZone.fromLookup(this, 'ViktorijaPortfolioHostedZone', {
        domainName: domainName.replace('www.', ''), // Ensure we get the root zone
      });

      new route53.ARecord(this, 'ViktorijaPortfolioAliasRecord', {
        zone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });

      alternateNames.forEach((alias, index) => {
        new route53.ARecord(this, `ViktorijaPortfolioAliasRecord-${index}`, {
          zone,
          recordName: alias,
          target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        });
      });
    }

    // 4. Sanity Webhook Lambda (to trigger GHA)
    const sanityWebhookLambda = new lambda.Function(this, 'ViktorijaPortfolioSanityWebhook', {
      functionName: 'viktorija-portfolio-sanity-webhook',
      description: 'Triggers GitHub Actions workflow when Sanity content changes',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/sanity-webhook')),
      environment: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
        GITHUB_OWNER: process.env.GITHUB_OWNER || 'ViktorijaKorlevska',
        GITHUB_REPO: process.env.GITHUB_REPO || 'ViktorijaKorlevska',
        GITHUB_WORKFLOW: process.env.GITHUB_WORKFLOW || 'deploy-client.yml',
        SANITY_WEBHOOK_SECRET: process.env.SANITY_WEBHOOK_SECRET || '',
      },
    });

    // 5. API Gateway for the Webhook
    const api = new apigateway.RestApi(this, 'ViktorijaPortfolioWebhookApi', {
      restApiName: 'Viktorija Portfolio Webhook Service',
      description: 'Endpoint for Sanity CMS webhooks to trigger site rebuilds',
      deployOptions: {
        stageName: 'prod',
      },
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

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebhookUrl', {
      value: api.url,
      description: 'The Sanity Webhook URL to trigger deployments',
    });
  }
}
