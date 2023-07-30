import { S3Event } from 'aws-lambda';
import * as AWS from 'aws-sdk';

export const handler = async (
  event: S3Event,
  context: any = {}
): Promise<any> => {
  // Get Asset file from S3  
  const bucketName = process.env.S3_BUCKET_NAME || '';
  const objectKey = process.env.S3_OBJECT_KEY || '';

  const s3 = new AWS.S3();
  const dbParams = { Bucket: bucketName, Key: objectKey };
  const response = await s3.getObject(dbParams).promise();

  // Parse and fill Dynamodb
  const data = response.Body?.toString('utf-8') || '';

  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  const words = data.split('\n');

  for (const word of words) {
    await putIntoDb(word, dynamoDb);
  }

  // data.split('\n').map(async (word) => {
  //   await dynamoDb.put({
  //     TableName: process.env.DYNAMODB_TABLE || '',
  //     Item: {
  //       entity: 'RU5',
  //       name: word,
  //     }
  //   }).promise();
  // });
};

const putIntoDb = (word: any, db: any) =>
  db.put({
    TableName: process.env.DYNAMODB_TABLE || '',
    Item: {
      entity: 'RU5',
      name: word,
    }
  }).promise();

