import { Construct } from 'constructs';
import { StackProps, Stack, aws_lambda, aws_s3, aws_certificatemanager, aws_route53 } from 'aws-cdk-lib';
import { IHttpApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
export interface AWSAdapterStackProps extends StackProps {
    FQDN: string;
    account?: string;
    region?: string;
    serverHandlerPolicies?: PolicyStatement[];
    zoneName?: string;
}
export declare class AWSAdapterStack extends Stack {
    bucket: aws_s3.IBucket;
    serverHandler: aws_lambda.IFunction;
    httpApi: IHttpApi;
    hostedZone: aws_route53.IHostedZone;
    certificate: aws_certificatemanager.ICertificate;
    constructor(scope: Construct, id: string, props: AWSAdapterStackProps);
}
