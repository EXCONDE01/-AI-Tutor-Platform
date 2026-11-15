/**
 * Google Slides API wrapper
 * Creates presentations with slides
 */

const SLIDES_API_BASE = 'https://slides.googleapis.com/v1/presentations';

export interface SlideContent {
  title: string;
  content: string;
  layout?: 'title' | 'title_and_body' | 'blank' | 'section_header';
}

export class GoogleSlidesClient {
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
      throw new Error(`Google Slides API error: ${res.status} - ${error}`);
    }
    return res.json() as T;
  }

  async createPresentation(
    title: string,
    slides: SlideContent[]
  ): Promise<{ presentationId: string; url: string }> {
    if (slides.length === 0) {
      throw new Error('At least one slide is required');
    }

    // 1. Create presentation
    const presentation = await this.request<{ presentationId: string }>(
      SLIDES_API_BASE,
      {
        method: 'POST',
        body: JSON.stringify({ title }),
      }
    );

    // 2. Get default slide ID (first slide)
    const pres = await this.request<{ slides: Array<{ objectId: string }> }>(
      `${SLIDES_API_BASE}/${presentation.presentationId}`
    );

    const firstSlideId = pres.slides[0]?.objectId;
    const requests: any[] = [];

    // 3. Update first slide with title
    if (firstSlideId && slides[0]) {
      requests.push({
        replaceAllText: {
          containsText: { text: '{{TITLE}}', matchCase: true },
          replaceText: slides[0].title,
          pageObjectIds: [firstSlideId],
        },
      });
      requests.push({
        replaceAllText: {
          containsText: { text: '{{BODY}}', matchCase: true },
          replaceText: slides[0].content,
          pageObjectIds: [firstSlideId],
        },
      });
    }

    // 4. Add additional slides
    const layoutMap: Record<string, string> = {
      title: 'TITLE',
      title_and_body: 'TITLE_AND_BODY',
      blank: 'BLANK',
      section_header: 'SECTION_HEADER',
    };

    for (let i = 1; i < slides.length; i++) {
      const slide = slides[i];
      const newSlideId = `slide_${i}_${Date.now()}`;

      requests.push({
        createSlide: {
          objectId: newSlideId,
          insertionIndex: i,
          slideLayoutReference: {
            predefinedLayout: layoutMap[slide.layout || 'title_and_body'],
          },
        },
      });

      // Add content to new slide
      requests.push({
        replaceAllText: {
          containsText: { text: '{{TITLE}}', matchCase: true },
          replaceText: slide.title,
          pageObjectIds: [newSlideId],
        },
      });
      requests.push({
        replaceAllText: {
          containsText: { text: '{{BODY}}', matchCase: true },
          replaceText: slide.content,
          pageObjectIds: [newSlideId],
        },
      });
    }

    if (requests.length > 0) {
      await this.request(
        `${SLIDES_API_BASE}/${presentation.presentationId}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({ requests }),
        }
      );
    }

    return {
      presentationId: presentation.presentationId,
      url: `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`,
    };
  }
}