// Schema exports
export * from './schema/enums/index.js';
export * from './schema/gcp/index.js';
export * from './schema/wp/index.js';
export * from './schema/platform/index.js';

// Client
export { getDb, withWorkspaceTransaction, type Database } from './client.js';

// Repositories
export * from './repositories/index.js';

// Projections
export {
  projectCreatorToIndex,
  projectCreatorsToIndex,
  deleteCreatorFromIndex,
  buildCreatorIndexDocument,
  type CreatorIndexDocument,
} from './projections/creator-index-projection.js';

// Identity Resolution (ADR-029)
export * from './identity/index.js';
