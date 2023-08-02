import { DynamoDB } from 'aws-sdk';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const dynamoDb = new DynamoDB.DocumentClient();

  const word = await dynamoDb.scan({ TableName: process.env.DYNAMODB_TABLE || '', Limit: 1, ExclusiveStartKey: { "entity": "RU5", "uuid": uuidv4() } }).promise()

  const gameUuid = uuidv4();

  await dynamoDb.put({
    TableName: process.env.DYNAMODB_TABLE || '',
    Item: {
      entity: 'Game',
      uuid: gameUuid,
      name: word.Items?.at(0)?.name
    }
  }).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(event),
    headers: { "Set-Cookie": `gameId=${gameUuid}` },
  };
};