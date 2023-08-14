import { S3, DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export const handler = async () => {
  const dynamoDb = new DynamoDB.DocumentClient();
  const s3 = new S3();
  const dbParams = { Bucket: process.env.S3_BUCKET_NAME || '', Key: process.env.S3_OBJECT_KEY || '' };
  const response = await s3.getObject(dbParams).promise();
  const data = response.Body?.toString('utf-8') || '';
  const words = data.split('\n');

  for (const word of words) {
    await dynamoDb.put({
      TableName: process.env.DYNAMODB_TABLE || '',
      Item: {
        entity: 'RU5',
        uuid: uuidv4(),
        word: word,
      }
    }).promise();
  }

  console.log(`Dynamodb filled with ${words.length} words!`);
};

