import {
    elizaLogger,
    generateText,
    ModelClass,
    type IAgentRuntime,
} from "@elizaos/core";
import type { Memory, Provider, State } from "@elizaos/core";

const TEESA_CONTRACT_ADDRESS_KEY = "teesa/contract_address";
const TEESA_MESSAGES_NUMBER_KEY = "teesa/messages_number";

interface GameDetails {
    contractAddress: string;
    initialFee: string;
    currentFee: string;
    prizePool: string;
    gameAbandoned: boolean;
    winnerAddress: string | undefined;
}

export enum MessageTypeEnum {
    QUESTION,
    GUESS,
    SYSTEM,
    OTHER
}

export enum AnswerResultEnum {
    YES,
    NO,
    CORRECT,
    INCORRECT,
    UNKNOWN
}

interface TeesaHistoryEntry {
    id: string;
    userId: string;
    timestamp: number;
    messageType: MessageTypeEnum;
    userMessage: string | undefined;
    llmMessage: string;
    answerResult?: AnswerResultEnum; // Optional to maintain backward compatibility
}

async function getGameDetails(): Promise<GameDetails | undefined> {
    const teesaUrl = process.env.TEESA_URL;
    let gameDetails: GameDetails | undefined = undefined;

    try {
        const response = await fetch(`${teesaUrl}/api/get-game-details`);
        gameDetails = await response.json();
    } catch (error) {
        elizaLogger.error('Failed to fetch Teesa game details:', error);
    }

    return gameDetails;
}

async function getTeesaHistory(): Promise<TeesaHistoryEntry[]> {
    const teesaUrl = process.env.TEESA_URL;
    let messages: TeesaHistoryEntry[] = [];

    try {
        const response = await fetch(`${teesaUrl}/api/get-messages?includeSystemMessages=false`);
        messages = await response.json();
    } catch (error) {
        elizaLogger.error('Failed to fetch Teesa messages:', error);
    }

    return messages;
}

async function summarizeTeesaHistory(
    runtime: IAgentRuntime,
    history: TeesaHistoryEntry[]
): Promise<string | undefined> {
    const relevantMessages = history.filter(msg => msg.messageType === MessageTypeEnum.QUESTION || msg.messageType === MessageTypeEnum.GUESS);

    const previousMessagesNumber = await runtime.cacheManager.get(TEESA_MESSAGES_NUMBER_KEY);
    if(previousMessagesNumber == relevantMessages.length) {
        return undefined;
    }

    await runtime.cacheManager.set(TEESA_MESSAGES_NUMBER_KEY, relevantMessages.length);

    const conversationText = relevantMessages.map(msg => {
        // Skip if user message is undefined
        if (!msg.userMessage) return '';
        
        let text = '';
        
        // Use the stored answerResult if available, otherwise fall back to text parsing
        let simpleAnswer = 'Unknown';
        
        if (msg.answerResult !== undefined) {
          // Use the stored answer result
          switch(msg.answerResult) {
            case AnswerResultEnum.YES:
              simpleAnswer = 'Yes';
              break;
            case AnswerResultEnum.NO:
              simpleAnswer = 'No';
              break;
            case AnswerResultEnum.CORRECT:
              simpleAnswer = 'Correct!';
              break;
            case AnswerResultEnum.INCORRECT:
              simpleAnswer = 'Incorrect';
              break;
            default:
              simpleAnswer = 'Unknown';
          }
  
          // Format the Q&A pair
          if (msg.messageType === MessageTypeEnum.QUESTION) {
            text = `Question: ${msg.userMessage}\nAnswer: ${simpleAnswer}\n`;
          } else if (msg.messageType === MessageTypeEnum.GUESS) {
            text = `Guess: ${msg.userMessage}\nResult: ${simpleAnswer}\n`;
          }
        }
        
        return text;
      }).join('\n');

      const context = `
Based on the following Q&A about a secret word guessing game, create a concise summary of what we know about the secret word so far. 
Focus on confirmed facts (yes answers) and things that have been ruled out (no answers). Don't include any clues or hints.
Include everything we know about the secret word.
Keep it brief but comprehensive.
Make it a list of sentences with no more than 5 items. Do not use bullet points or numbers.
Respond only with the summary, no other text.

Q&A History:
${conversationText}

Summary:
`;

    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });

    return response;
}

const gameProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        if (message?.content?.action != "TWEET") {
            return "";
        }

        const gameDetails = await getGameDetails();

        if(!gameDetails) {
            return "";
        }

        let result = "";

        const history = await getTeesaHistory();
        const summary = await summarizeTeesaHistory(runtime, history);

        const previousGameContractAddress = await runtime.cacheManager.get(TEESA_CONTRACT_ADDRESS_KEY);

        if(previousGameContractAddress && previousGameContractAddress != gameDetails.contractAddress) {
            result += "POST AN UPDATE ABOUT THE FOLLOWING: A new game has started. Invite the community to guess the word.";
        }

        if(gameDetails.winnerAddress) {
            result += "POST AN UPDATE ABOUT THE FOLLOWING:";
            result += "\n";
            result += `- The game has ended. The winner is ${gameDetails.winnerAddress}.`;
            result += "\n";
            result += `- The next game will start soon.`;
        }

        if(gameDetails.gameAbandoned) {
            result += "POST AN UPDATE ABOUT THE FOLLOWING:";
            result += "\n";
            result += `- The game has ended due to inactivity.`;
            result += "\n";
            result += `- Users can claim their share using the game contract. The game contract address is ${gameDetails.contractAddress}.`;
            result += "\n";
            result += `- The next game will start soon.`;
        }

        if(summary) {
            result += "POST AN UPDATE ABOUT THE FOLLOWING:";
            result += "\n";
            result += `- Here is what we know about the secret word so far:\n${summary};`;
            result += "\n";
            result += `- The prize pool is ${gameDetails.prizePool}.`;
            result += "\n";
            result += `- Invite the community to guess the word.`;
        }

        await runtime.cacheManager.set(TEESA_CONTRACT_ADDRESS_KEY, gameDetails.contractAddress);

        return result;
    },
};

export { gameProvider };
