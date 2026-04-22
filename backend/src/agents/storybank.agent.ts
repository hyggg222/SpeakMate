import { StoryStructureResponse } from '../contracts/data.contracts';
import { PromptService } from '../services/prompt.service';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL } from '../config/genai';

function sanitizePlaceholders(text: string): string {
  let result = text.replace(/\[(?:tên của bạn|tên bạn|tên người dùng|your name|tên|name|họ tên|user name|người dùng)[^\]]*\]/gi, 'bạn');
  result = result.replace(/\[[^\]]{1,40}\]/g, '');
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

function sanitizeObj(obj: any): any {
  if (typeof obj === 'string') return sanitizePlaceholders(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObj);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeObj(obj[key]);
    }
    return result;
  }
  return obj;
}

export class StoryBankAgent {
  private modelName = GEMINI_MODEL;
  private promptService: PromptService;

  constructor() {
    this.promptService = new PromptService();
  }

  /**
   * Structures raw user input into a STAR-formatted story.
   * If input is insufficient, returns follow-up questions instead.
   */
  public async structureStory(
    rawInput: string,
    inputMethod: string,
    followUpAnswers?: string[],
    chatHistory?: { role: string; content: string; fieldTargeted?: string | null }[]
  ): Promise<StoryStructureResponse> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let contents = `Input thô từ user (${inputMethod}):\n${rawInput}`;
        if (followUpAnswers && followUpAnswers.length > 0) {
          contents += `\n\nUser đã trả lời các câu hỏi bổ sung:\n`;
          followUpAnswers.forEach((answer, i) => {
            contents += `Câu ${i + 1}: ${answer}\n`;
          });
          contents += `\nBây giờ hãy cấu trúc hóa đầy đủ, KHÔNG hỏi thêm nữa. needsFollowUp PHẢI = false.`;
        }
        if (chatHistory && chatHistory.length > 0) {
          contents += `\n\nUser đã trò chuyện với Ni để làm rõ thêm:\n`;
          chatHistory.forEach((msg) => {
            const speaker = msg.role === 'user' ? 'User' : 'Ni';
            contents += `${speaker}: ${msg.content}\n`;
          });
          contents += `\nBây giờ hãy cấu trúc hóa đầy đủ dựa trên TOÀN BỘ thông tin trên. needsFollowUp PHẢI = false. Nếu thiếu field nào, VẪN cấu trúc hóa nhưng đánh dấu vào missingFields.`;
        }

        const response = await getGenAI().models.generateContent({
          model: this.modelName,
          contents: [{ role: 'user', parts: [{ text: contents }] }],
          config: {
            systemInstruction: this.promptService.getStoryBankSystemPrompt(),
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
        });

        const jsonStr = response.text || '{}';
        const result: StoryStructureResponse = sanitizeObj(JSON.parse(jsonStr));

        // Validate constraints on successful structuring
        if (!result.needsFollowUp) {
          if (result.fullScript) {
            const wordCount = result.fullScript.split(/\s+/).length;
            if (wordCount > 200) {
              result.fullScript = result.fullScript.split(/\s+/).slice(0, 200).join(' ');
            }
          }
          if (result.suggestedTags) {
            result.suggestedTags = result.suggestedTags
              .slice(0, 10)
              .map((tag: string) => tag.slice(0, 30));
          }
          if (result.title) {
            result.title = result.title.slice(0, 100);
          }
        }

        return result;
      } catch (error) {
        lastError = error;
        console.error(`[StoryBankAgent] structureStory attempt ${attempt}/${maxAttempts} failed:`, (error as any)?.message || error);
        if (isRateLimited(error)) switchToFallback();
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    throw lastError;
  }
}
