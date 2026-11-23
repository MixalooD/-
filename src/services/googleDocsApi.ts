import type {
  CompendiumDocPlan,
  ParsedGoogleDoc,
} from '../utils/googleDocsBuilder';
import { extractPlainTextFromGoogleDoc } from '../utils/googleDocsBuilder';

const DOCS_API_BASE = 'https://docs.googleapis.com/v1/documents';

export class GoogleDocsApiError extends Error {
  status: number;
  requiresReauth: boolean;

  constructor(message: string, status: number, requiresReauth = false) {
    super(message);
    this.name = 'GoogleDocsApiError';
    this.status = status;
    this.requiresReauth = requiresReauth;
  }
}

async function parseErrorResponse(res: Response): Promise<GoogleDocsApiError> {
  let detail = '';
  try {
    const json = await res.json();
    detail = json?.error?.message ?? '';
  } catch {
    detail = '';
  }

  if (res.status === 401) {
    return new GoogleDocsApiError(
      'Сессия Google истекла. Пожалуйста, выполните вход через Google повторно.',
      401,
      true
    );
  }
  if (res.status === 403) {
    return new GoogleDocsApiError(
      detail
        ? `Недостаточно прав для работы с документом Google Docs: ${detail}`
        : 'Нет прав доступа к этому документу Google Docs. Убедитесь, что у аккаунта есть доступ на чтение и редактирование.',
      403,
      false
    );
  }
  if (res.status === 404) {
    return new GoogleDocsApiError(
      'Документ Google Docs не найден. Проверьте ссылку или идентификатор документа.',
      404,
      false
    );
  }
  return new GoogleDocsApiError(
    detail || `Ошибка Google Docs API (код ${res.status}).`,
    res.status,
    false
  );
}

/**
 * Creates a new Google Doc and populates it with formatted lecture sections via batchUpdate.
 */
export async function createFormattedGoogleDoc(
  accessToken: string,
  plan: CompendiumDocPlan
): Promise<{ documentId: string; title: string; url: string }> {
  const createRes = await fetch(DOCS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: plan.title }),
  });

  if (!createRes.ok) {
    throw await parseErrorResponse(createRes);
  }

  const created = await createRes.json();
  const documentId: string = created.documentId;
  const title: string = created.title ?? plan.title;

  if (plan.requests.length > 0) {
    const updateRes = await fetch(`${DOCS_API_BASE}/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: plan.requests }),
    });

    if (!updateRes.ok) {
      throw await parseErrorResponse(updateRes);
    }
  }

  return {
    documentId,
    title,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

/**
 * Fetches an existing Google Doc and returns its title, readable paragraphs, and safe append index.
 */
export async function fetchGoogleDocById(
  accessToken: string,
  documentId: string
): Promise<ParsedGoogleDoc> {
  const res = await fetch(`${DOCS_API_BASE}/${encodeURIComponent(documentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const json = await res.json();
  return extractPlainTextFromGoogleDoc(json);
}

/**
 * Appends formatted lecture content to the end of an existing Google Doc via batchUpdate.
 */
export async function appendToGoogleDoc(
  accessToken: string,
  documentId: string,
  plan: CompendiumDocPlan
): Promise<{ documentId: string; url: string }> {
  if (plan.requests.length === 0) {
    return {
      documentId,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  }

  const res = await fetch(
    `${DOCS_API_BASE}/${encodeURIComponent(documentId)}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: plan.requests }),
    }
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return {
    documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}
