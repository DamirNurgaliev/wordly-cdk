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
    });

    const fileAsset = new Asset(this, 'ruFiveWordsAsset', {
      path: path.join(__dirname, '../files', 'ruFiveWords.csv')
    });

    const nodeJsFunctionProps: lambda.NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk',
        ],
      },
      runtime: Runtime.NODEJS_16_X,
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
    };

    const readS3ObjFn = new lambda.NodejsFunction(this, 'readS3Obj', {
      entry: path.join(__dirname, '../src/lambdas', 'read-s3-obj.ts'),
      ...nodeJsFunctionProps,
      functionName: 'readS3Obj',
      environment: {
        'S3_BUCKET_NAME': fileAsset.s3BucketName,
        'S3_OBJECT_KEY': fileAsset.s3ObjectKey,
        'S3_OBJECT_URL': fileAsset.s3ObjectUrl,
        'DYNAMODB_TABLE': entitiesTable.tableName,
      },
    });

    fileAsset.grantRead(readS3ObjFn)
    entitiesTable.grantWriteData(readS3ObjFn)
  }
}
