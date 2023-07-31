import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Asset } from 'aws-cdk-lib/aws-s3-assets'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class WordlyCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const entitiesTable = new dynamodb.Table(this, 'gamesTable', {
      partitionKey: { name: 'entity', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const fileAsset = new Asset(this, 'ruFiveWordsAsset', {
      path: path.join(__dirname, '../files', 'ruFiveWords.txt')
    });

    const nodeJsFunctionProps: lambda.NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk',
        ],
      },
      runtime: Runtime.NODEJS_16_X,
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
    };

    const fillDbWithWords = new lambda.NodejsFunction(this, 'fillDbWithWords', {
      entry: path.join(__dirname, '../src/lambdas', 'fillDbWithWords.ts'),
      ...nodeJsFunctionProps,
      functionName: 'fillDbWithWords',
      environment: {
        'S3_BUCKET_NAME': fileAsset.s3BucketName,
        'S3_OBJECT_KEY': fileAsset.s3ObjectKey,
        'DYNAMODB_TABLE': entitiesTable.tableName,
      },
    });

    fileAsset.grantRead(fillDbWithWords)
    entitiesTable.grantWriteData(fillDbWithWords)
  }
}
