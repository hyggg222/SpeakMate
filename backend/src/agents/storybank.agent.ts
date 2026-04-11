import { StoryStructureResponse } from '../contracts/data.contracts';
import { PromptService, Lang } from '../services/prompt.service';
import { getGenAI, isRateLimited, switchToFallback, GEMINI_MODEL } from '../config/genai';
import { sanitizeObj } from '../utils/sanitize';

type LangParam = Lang | string;
function toLang(language?: LangParam): Lang {
  return language === 'en' ? 'en' : 'vi';
}

// Framework-specific field defaults (per language)
const FRAMEWORK_DEFAULTS: Record<Lang, Record<string, Record<string, string>>> = {
  vi: {
    STAR: {
      situation: 'Chưa có thông tin bối cảnh.',
      task:      'Chưa có thông tin nhiệm vụ.',
      action:    'Chưa có thông tin hành động.',
      result:    'Chưa có thông tin kết quả.',
    },
    CAR: {
      challenge: 'Chưa có thông tin thách thức.',
      action:    'Chưa có thông tin hành động.',
      result:    'Chưa có thông tin kết quả.',
    },
    PREP: {
      point:   'Chưa có luận điểm chính.',
      reason:  'Chưa có lý do.',
      example: 'Chưa có ví dụ.',
      point2:  'Chưa có kết luận.',
    },
  },
  en: {
    STAR: {
      situation: 'No situation information yet.',
      task:      'No task information yet.',
      action:    'No action information yet.',
      result:    'No result information yet.',
    },
    CAR: {
      challenge: 'No challenge information yet.',
      action:    'No action information yet.',
      result:    'No result information yet.',
    },
    PREP: {
      point:   'No main point yet.',
      reason:  'No reason yet.',
      example: 'No example yet.',
      point2:  'No conclusion yet.',
    },
  },
};

export class StoryBankAgent {
  private modelName = GEMINI_MODEL;
  private promptService: PromptService;

  constructor() {
    this.promptService = new PromptService();
  }

  /**
   * Structures raw user input into a STAR/CAR/PREP-formatted story.
   * If input is insufficient, returns follow-up questions instead.
   */
  public async structureStory(
    rawInput: string,
    inputMethod: string,
    followUpAnswers?: string[],
    chatHistory?: { role: string; content: string; fieldTargeted?: string | null }[],
    framework?: string,
    language: LangParam = 'vi'
  ): Promise<StoryStructureResponse> {
    const lang = toLang(language);
    const maxAttempts = 3;
    let lastError: unknown;
    const fw = (framework || 'STAR').toUpperCase();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const contents = this.promptService.buildStoryBankStructurePrompt(
          fw,
          rawInput,
          inputMethod,
          followUpAnswers,
          chatHistory,
          lang,
        );

        const response = await getGenAI().models.generateContent({
          model: this.modelName,
          contents: [{ role: 'user', parts: [{ text: contents }] }],
          config: {
            systemInstruction: this.promptService.getStoryBankSystemPrompt(lang),
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
        });

        const jsonStr = response.text || '{}';
        const result: StoryStructureResponse = sanitizeObj(JSON.parse(jsonStr));

        // If user has already chatted or answered follow-ups, force structure regardless
        if ((chatHistory && chatHistory.length > 0) || (followUpAnswers && followUpAnswers.length > 0)) {
          result.needsFollowUp = false;
        }

        // Validate + fill defaults on successful structuring
        if (!result.needsFollowUp) {
          // Ensure structured sub-fields exist using framework-specific defaults
          if (!result.structured) result.structured = {} as any;
          const s = result.structured as any;
          const langDefaults = FRAMEWORK_DEFAULTS[lang] || FRAMEWORK_DEFAULTS.vi;
          const defaults = langDefaults[fw] || langDefaults.STAR;
          for (const [field, fallback] of Object.entries(defaults)) {
            if (!s[field]) s[field] = fallback;
          }

          // Ensure fullScript
          if (!result.fullScript || result.fullScript.trim().length < 10) {
            result.fullScript = Object.values(s).filter(Boolean).join(' ');
          } else {
            const wordCount = result.fullScript.split(/\s+/).length;
            if (wordCount > 200) {
              result.fullScript = result.fullScript.split(/\s+/).slice(0, 200).join(' ');
            }
          }

          // Ensure other fields
          if (!result.title || result.title.trim().length === 0) {
            result.title = 'Câu chuyện chưa có tiêu đề';
          } else {
            result.title = result.title.slice(0, 100);
          }
          if (!result.estimatedDuration || result.estimatedDuration <= 0) {
            result.estimatedDuration = Math.round(result.fullScript.split(/\s+/).length / 2.5);
          }
          if (!Array.isArray(result.suggestedTags) || result.suggestedTags.length === 0) {
            result.suggestedTags = ['câu chuyện cá nhân'];
          } else {
            result.suggestedTags = result.suggestedTags.slice(0, 10).map((tag: string) => tag.slice(0, 30));
          }
          if (!result.framework) result.framework = fw as 'STAR' | 'CAR' | 'PREP';
          if (!Array.isArray(result.missingFields)) result.missingFields = [];
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
