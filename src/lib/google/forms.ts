/**
 * Google Forms API wrapper
 * Creates forms with questions
 */

const FORMS_API_BASE = 'https://forms.googleapis.com/v1/forms';

export interface FormQuestion {
  title: string;
  type: 'multiple_choice' | 'checkbox' | 'short_answer' | 'paragraph' | 'dropdown' | 'linear_scale';
  options?: string[];
  required?: boolean;
}

export class GoogleFormsClient {
  constructor(private accessToken: string) {}

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google Forms API error: ${res.status} - ${error}`);
    }
    return res.json() as T;
  }

  async createForm(title: string, questions: FormQuestion[]): Promise<{
    formId: string;
    url: string;
  }> {
    // 1. Create form
    const form = await this.request<{ formId: string; responderUri: string }>(
      FORMS_API_BASE,
      {
        method: 'POST',
        body: JSON.stringify({ info: { title } }),
      }
    );

    // 2. Batch update to add questions
    const requests = questions.map((q, i) => this.questionToRequest(q, i));

    if (requests.length > 0) {
      await this.request(`${FORMS_API_BASE}/${form.formId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests }),
      });
    }

    return {
      formId: form.formId,
      url: form.responderUri,
    };
  }

  private questionToRequest(q: FormQuestion, index: number): any {
    const typeMap: Record<string, string> = {
      multiple_choice: 'RADIO',
      checkbox: 'CHECKBOX',
      short_answer: 'TEXT',
      paragraph: 'PARAGRAPH',
      dropdown: 'DROP_DOWN',
      linear_scale: 'LINEAR_SCALE',
    };

    const base = {
      createItem: {
        item: {
          title: q.title,
          questionItem: {
            question: {
              required: q.required ?? false,
              [this.getQuestionTypeKey(q.type)]: this.getQuestionConfig(q),
            },
          },
        },
        location: { index },
      },
    };

    return base;
  }

  private getQuestionTypeKey(type: string): string {
    const map: Record<string, string> = {
      multiple_choice: 'choiceQuestion',
      checkbox: 'choiceQuestion',
      short_answer: 'textQuestion',
      paragraph: 'textQuestion',
      dropdown: 'choiceQuestion',
      linear_scale: 'scaleQuestion',
    };
    return map[type] || 'textQuestion';
  }

  private getQuestionConfig(q: FormQuestion): any {
    switch (q.type) {
      case 'multiple_choice':
      case 'checkbox':
      case 'dropdown':
        return {
          type: q.type === 'dropdown' ? 'DROP_DOWN' : q.type.toUpperCase(),
          options: q.options?.map(opt => ({ value: opt })) || [],
          shuffle: false,
        };
      case 'linear_scale':
        return {
          low: 1,
          high: 5,
          lowLabel: '',
          highLabel: '',
        };
      default:
        return { paragraph: q.type === 'paragraph' };
    }
  }
}