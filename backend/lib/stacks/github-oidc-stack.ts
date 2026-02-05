import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface GitHubOIDCStackProps extends StackProps {
  githubOrg: string;
  githubRepo: string;
}

export class GitHubOIDCStack extends Stack {
  public readonly deploymentRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOIDCStackProps) {
    super(scope, id, props);

    const { githubOrg, githubRepo } = props;

    const githubProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubOIDCProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
        thumbprints: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
      }
    );

    this.deploymentRole = new iam.Role(this, "GitHubActionsDeploymentRole", {
      roleName: "cicd",
      description: `Role for GitHub Actions to deploy ${githubOrg}/${githubRepo} via CDK`,
      maxSessionDuration: Duration.hours(2),
      assumedBy: new iam.FederatedPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": [
              `repo:${githubOrg}/${githubRepo}:ref:refs/heads/*`,
              `repo:${githubOrg}/${githubRepo}:environment:*`,
            ],
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    this.addDeploymentPermissions();

    new CfnOutput(this, "DeploymentRoleArn", {
      value: this.deploymentRole.roleArn,
      description: "ARN of the GitHub Actions deployment role",
      exportName: "GitHubDeploymentRoleArn",
    });

    new CfnOutput(this, "OIDCProviderArn", {
      value: githubProvider.openIdConnectProviderArn,
      description: "ARN of the GitHub OIDC provider",
    });
  }

  private addDeploymentPermissions(): void {
    const account = Stack.of(this).account;

    // Resource wildcards for this project
    const stackWildcards = [
        `arn:aws:cloudformation:*:${account}:stack/viktorija-*/*`,
        `arn:aws:cloudformation:*:${account}:stack/CDKToolkit/*`,
    ];

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudFormationStackManagement",
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudformation:Create*",
          "cloudformation:Update*",
          "cloudformation:Delete*",
          "cloudformation:Describe*",
          "cloudformation:Get*",
          "cloudformation:List*",
          "cloudformation:Execute*",
          "cloudformation:ValidateTemplate",
        ],
        resources: stackWildcards,
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "S3CDKStagingBucket",
        effect: iam.Effect.ALLOW,
        actions: ["s3:Get*", "s3:Put*", "s3:Delete*", "s3:List*"],
        resources: [
          `arn:aws:s3:::cdk-*-assets-${account}-*`,
          `arn:aws:s3:::cdk-*-assets-${account}-*/*`,
        ],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "S3Buckets",
        effect: iam.Effect.ALLOW,
        actions: ["s3:Create*", "s3:Delete*", "s3:Get*", "s3:List*", "s3:Put*"],
        resources: [
            `arn:aws:s3:::viktorija-*`,
            `arn:aws:s3:::viktorija-*/*`,
        ],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudFrontManagement",
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudfront:Create*",
          "cloudfront:Update*",
          "cloudfront:Delete*",
          "cloudfront:Get*",
          "cloudfront:List*",
          "cloudfront:TagResource",
          "cloudfront:UntagResource",
        ],
        resources: ["*"],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SSMParameterAccess",
        effect: iam.Effect.ALLOW,
        actions: ["ssm:Get*", "ssm:Put*"],
        resources: [
          `arn:aws:ssm:*:${account}:parameter/cdk-bootstrap/*`,
        ],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "IAMRoleManagement",
        effect: iam.Effect.ALLOW,
        actions: [
          "iam:Create*",
          "iam:Delete*",
          "iam:Get*",
          "iam:List*",
          "iam:Put*",
          "iam:Update*",
          "iam:Attach*",
          "iam:Detach*",
          "iam:PassRole",
          "iam:Tag*",
          "iam:Untag*",
        ],
        resources: [
            `arn:aws:iam::${account}:role/viktorija-*`,
            `arn:aws:iam::${account}:role/cdk-*`,
            `arn:aws:iam::${account}:policy/viktorija-*`,
        ],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "LambdaManagement",
        effect: iam.Effect.ALLOW,
        actions: [
          "lambda:Create*",
          "lambda:Update*",
          "lambda:Delete*",
          "lambda:Get*",
          "lambda:List*",
          "lambda:Add*",
          "lambda:Remove*",
          "lambda:Invoke*",
          "lambda:Publish*",
          "lambda:Tag*",
          "lambda:Untag*",
        ],
        resources: [
            `arn:aws:lambda:*:${account}:function:viktorija-*`,
            `arn:aws:lambda:*:${account}:function:us-east-1:viktorija-*`,
        ],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchLogsManagement",
        effect: iam.Effect.ALLOW,
        actions: ["logs:*"],
        resources: ["*"],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "STSCallerIdentity",
        effect: iam.Effect.ALLOW,
        actions: ["sts:GetCallerIdentity"],
        resources: ["*"],
      })
    );

    this.deploymentRole.addToPolicy(
        new iam.PolicyStatement({
            sid: "CloudFrontOAC",
            effect: iam.Effect.ALLOW,
            actions: [
                "cloudfront:CreateOriginAccessControl",
                "cloudfront:DeleteOriginAccessControl",
                "cloudfront:GetOriginAccessControl",
                "cloudfront:ListOriginAccessControls",
                "cloudfront:UpdateOriginAccessControl"
            ],
            resources: ["*"],
        })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "APIGatewayManagement",
        effect: iam.Effect.ALLOW,
        actions: ["apigateway:*"],
        resources: [
          `arn:aws:apigateway:*::/restapis`,
          `arn:aws:apigateway:*::/restapis/*`,
          `arn:aws:apigateway:*::/apis`,
          `arn:aws:apigateway:*::/apis/*`,
        ],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "Route53Management",
        effect: iam.Effect.ALLOW,
        actions: ["route53:Get*", "route53:List*", "route53:ChangeResourceRecordSets"],
        resources: ["*"],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CDKLookupRoleAssumption",
        effect: iam.Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${account}:role/cdk-*-lookup-role-${account}-*`],
      })
    );

    this.deploymentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "ACMManager",
        effect: iam.Effect.ALLOW,
        actions: ["acm:DescribeCertificate", "acm:ListCertificates", "acm:GetCertificate"],
        resources: ["*"],
      })
    );
  }
}
