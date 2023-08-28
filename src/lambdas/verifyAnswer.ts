import { DynamoDB } from 'aws-sdk';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,HEAD'
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const dynamoDb = new DynamoDB.DocumentClient();

  const answerExist = await dynamoDb.query({
    TableName: process.env.DYNAMODB_TABLE || '',
    KeyConditionExpression: 'entity = :entity',
    FilterExpression: 'word = :word',
    ExpressionAttributeValues: { ":entity": "RU5", ":word": event.queryStringParameters?.word },
  }).promise()

  let messageBody = {};

  if (answerExist.Count == 0) {
    return { statusCode: 200, body: JSON.stringify({ error: "Word is not exist" }), headers: CORS_HEADERS }
  };

  if (event.queryStringParameters?.gameId == null) {
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

    const result = wordComparison(event.queryStringParameters?.word || '', word.Items?.at(0)?.word);
    messageBody = { ...result, gameId: gameUuid }
  } else {
    const startedGame = await dynamoDb.query({
      TableName: process.env.DYNAMODB_TABLE || '',
      KeyConditionExpression: 'entity = :entity and #gameUuid = :gameUuid',
      ExpressionAttributeValues: { ":entity": "Game", ":gameUuid": event.queryStringParameters?.gameId },
      ExpressionAttributeNames: { "#gameUuid": "uuid" }
    }).promise()

    messageBody = wordComparison(event.queryStringParameters?.word || '', startedGame.Items?.at(0)?.word);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ...messageBody }),
    headers: CORS_HEADERS,
  };
};

const wordComparison = (userAnswer: string, hiddenWord: string) => {
  let guessedPositions: number[] = [];
  let guessedLetters: number[] = [];

  if (userAnswer === hiddenWord) {
    return { guessedPositions: [0, 1, 2, 3, 4], guessedLetters: [] }
  }

  const userAnswerLetters = parseByLetters(userAnswer)
  const hiddenWordLetters = parseByLetters(hiddenWord)

  Object.keys(userAnswerLetters).forEach(char => {
    if (!hiddenWordLetters[`${char}`]) return;

    let intersection = userAnswerLetters[`${char}`].filter((x: string) => hiddenWordLetters[`${char}`].includes(x));
    let difference = userAnswerLetters[`${char}`].filter((x: string) => !hiddenWordLetters[`${char}`].includes(x));
    let differenceContrary = hiddenWordLetters[`${char}`].filter((x: string) => !userAnswerLetters[`${char}`].includes(x));

    differenceContrary.forEach((_diff: any, index: number) => guessedLetters = [...guessedLetters, difference.at(index)])

    guessedPositions = [...guessedPositions, ...intersection]
  })

  return { guessedLetters: guessedLetters, guessedPositions: guessedPositions }
};

const parseByLetters = (word: string) => {
  let letters: any = {};

  [...word].forEach((char, index) => 
    !letters[`${char}`] ? letters[`${char}`] = [index] : letters[`${char}`] = [...letters[`${char}`], index]
  )

  return letters;
}
