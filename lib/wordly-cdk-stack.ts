import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigwv from 'aws-cdk-lib/aws-apigateway';

export class WordlyCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const entitiesTable = new dynamodb.Table(this, 'gamesTable', {
      partitionKey: { name: 'entity', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uuid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const fileAsset = new Asset(this, 'ruFiveWordsAsset', {
      path: path.join(__dirname, '../files', 'ruFiveWords.txt')
    });

    const fillDbWithWords = new lambda.NodejsFunction(this, 'fillDbWithWords', {
      entry: path.join(__dirname, '../src/lambdas', 'fillDbWithWords.ts'),
      runtime: Runtime.NODEJS_16_X,
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      functionName: 'fillDbWithWords',
      environment: {
        'S3_BUCKET_NAME': fileAsset.s3BucketName,
        'S3_OBJECT_KEY': fileAsset.s3ObjectKey,
        'DYNAMODB_TABLE': entitiesTable.tableName,
      },
    });

    const lambdaTrigger = new cr.AwsCustomResource(this, 'fillDbWithWordsLambdaTrigger', {
      policy: cr.AwsCustomResourcePolicy.fromStatements([new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        effect: iam.Effect.ALLOW,
        resources: [fillDbWithWords.functionArn]
      })]),
      timeout: cdk.Duration.minutes(15),
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: fillDbWithWords.functionName,
          InvocationType: 'Event'
        },
        physicalResourceId: cr.PhysicalResourceId.of('fillDbWithWordsPhysicalId')
      },
    })

    fileAsset.grantRead(fillDbWithWords)
    entitiesTable.grantFullAccess(fillDbWithWords)

    const verifyAnswer = new lambda.NodejsFunction(this, 'verifyAnswer', {
      entry: path.join(__dirname, '../src/lambdas', 'verifyAnswer.ts'),
      runtime: Runtime.NODEJS_16_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      functionName: 'verifyAnswer',
      environment: {
        'DYNAMODB_TABLE': entitiesTable.tableName,
      },
    });

    const verifyAnswerApi = new apigwv.LambdaRestApi(this, 'verifyAnswerApi', {
      handler: verifyAnswer,
    });

    new cdk.CfnOutput(this, 'test', {
      value: verifyAnswerApi.url,
      description: 'Lambda testing url',
    });

    entitiesTable.grantFullAccess(verifyAnswer)
  }
}
