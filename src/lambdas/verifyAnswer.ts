import { DynamoDB } from 'aws-sdk';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const dynamoDb = new DynamoDB.DocumentClient();

  if (event.queryStringParameters?.gameId == null) {
    const randonUuidv4 = uuidv4()

    const word = await dynamoDb.scan({
      TableName: process.env.DYNAMODB_TABLE || '',
      Limit: 1,
      ExclusiveStartKey: { "entity": "RU5", "uuid": uuidv4() }
    }).promise()

    const gameUuid = uuidv4();

    await dynamoDb.put({
      TableName: process.env.DYNAMODB_TABLE || '',
      Item: {
        entity: 'Game',
        uuid: gameUuid,
        word: word.Items?.at(0)?.word
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(wordComparison(event.queryStringParameters?.word || '', word.Items?.at(0)?.word)),
      headers: { "Set-Cookie": `gameId=${gameUuid}` },
    };
  };

  const startedGame = await dynamoDb.scan({
    TableName: process.env.DYNAMODB_TABLE || '',
    Limit: 1,
    FilterExpression: '#gameUuid = :gameUuid',
    ExpressionAttributeValues: { ":gameUuid": event.queryStringParameters?.gameId },
    ExpressionAttributeNames: { "#gameUuid": "uuid"}
  }).promise()

  return {
    statusCode: 200,
    body: JSON.stringify(wordComparison(event.queryStringParameters?.word || '', startedGame.Items?.at(0)?.word)),
  };
};

const wordComparison = (userAnswer: string, hiddenWord: string) => {
  let guessedPositions: Number[] = [];
  let guessedLetters: Number[] = [];

  let userAnswerArray = [...userAnswer]
  let hiddenWordArray = [...hiddenWord]

  if (userAnswer === hiddenWord) {
    return { guessed: true, guessedPositions: [], guessedLetters: [] }
  }

  userAnswerArray.forEach((char, index) => {
    if (hiddenWordArray.at(index) === char) {
      guessedPositions.push(index);
      hiddenWordArray[index] = '.';
    } else if (hiddenWordArray.includes(userAnswerArray.at(index) || '')) {
      guessedLetters.push(index);
    }
  })

  return { guessed: false, guessedLetters: guessedLetters, guessedPositions: guessedPositions }
};