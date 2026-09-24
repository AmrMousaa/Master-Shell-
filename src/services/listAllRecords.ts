import type { IOperationResult } from '@microsoft/power-apps/data';
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService';
import { TARGET_ORGANIZATION_URL } from '../generated/crossEnvironmentConfig';

interface ListAllOptions {
  select?: string[];
  filter?: string;
  orderBy?: string[];
}

// Safety cap so a server that keeps returning a next link can't loop forever.
// At Dataverse's default 5000-row page size this is 500k rows.
const MAX_PAGES = 100;

function skipTokenFrom(nextLink: string): string | undefined {
  const match = /[?&]\$skiptoken=([^&]+)/i.exec(nextLink);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Like the generated `*Service.getAll`, but follows `@odata.nextLink` until
 * every page is read. The generated `getAll` returns only the first page
 * (up to 5000 rows) and drops the next link, so large tables get silently
 * truncated. Lives outside `src/generated` because those files are
 * regenerated and must not be edited.
 */
export async function listAllRecords<T>(entityName: string, options: ListAllOptions = {}): Promise<IOperationResult<T[]>> {
  const rows: T[] = [];
  let skipToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await MicrosoftDataverseService.ListRecordsWithOrganization(
      TARGET_ORGANIZATION_URL,
      entityName,
      'return=representation,odata.include-annotations="*"',
      'application/json',
      undefined,
      undefined,
      options.select?.join(','),
      options.filter,
      options.orderBy?.join(','),
      undefined,
      undefined,
      undefined,
      skipToken
    );
    if (!result.success) {
      return { ...result, data: rows } as unknown as IOperationResult<T[]>;
    }

    const body = result.data as unknown as { value?: T[]; '@odata.nextLink'?: string };
    rows.push(...(body?.value ?? []));

    const nextLink = body?.['@odata.nextLink'];
    const nextToken = nextLink ? skipTokenFrom(nextLink) : undefined;
    if (!nextToken || nextToken === skipToken) {
      return { ...result, data: rows } as unknown as IOperationResult<T[]>;
    }
    skipToken = nextToken;
  }

  throw new Error(`Stopped reading ${entityName} after ${MAX_PAGES} pages.`);
}
