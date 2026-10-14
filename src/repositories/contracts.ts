import type { ContentBlock, Database, GugakContext, Resource, ResourceVersion, ReviewCommand, RightsRecord, Unit } from '../domain/types';

export type RepositoryErrorCode = 'not_found' | 'validation_error' | 'storage_unavailable' | 'conflict' | 'not_allowed';
export class RepositoryError extends Error {
  constructor(public readonly code: RepositoryErrorCode, message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}
export interface RepositorySnapshot {
  data: Database;
  ready: boolean;
  warning: string | null;
  storageMode: 'persistent' | 'memory';
}
export interface ResourceDetail { resource: Resource; version: ResourceVersion; units: Unit[] }
export type ResourcePatch = Partial<Pick<Resource,
  'title' | 'description' | 'level' | 'objectives' | 'topics' | 'instrumentSystem' |
  'kind' | 'estimatedMinutes' | 'notationKinds' | 'jangdanNames' | 'sourceRefs'>> & {
  rights?: RightsRecord;
  gugakContext?: GugakContext;
  reviewScope?: string;
  changeSummary?: string;
  units?: Unit[];
  blocks?: ContentBlock[];
};
export type RepositoryReviewCommand = ReviewCommand & { resourceId: string; versionId: string };
export interface IssueUpdate {
  status: 'open' | 'fixed' | 'verified' | 'dismissed';
  resolution?: string;
  dismissalReason?: string;
  actorRole: 'editor' | 'reviewer';
}
