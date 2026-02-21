import crypto from 'node:crypto';

/**
 * Generate MD5 checksum for any data
 * Ensures deterministic hashing by stringifying with sorted keys
 */
export function generateChecksum(data: unknown): string {
  const jsonString = JSON.stringify(data, (_key, value) => {
    // Sort object keys for deterministic hashing
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .reduce((sorted, key) => {
          sorted[key] = value[key];
          return sorted;
        }, {} as Record<string, unknown>);
    }
    return value;
  });

  return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * Generate checksums for multiple data partitions
 * Returns object with checksum for each partition
 */
export function generateChecksums(data: Record<string, unknown>): Record<string, string> {
  const checksums: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(data)) {
    checksums[key] = generateChecksum(value);
  }
  
  return checksums;
}

/**
 * In-memory checksum cache per tenant
 * Key: tenantId, Value: checksums object
 */
const checksumCache = new Map<string, { checksums: Record<string, string>; timestamp: number }>();

/**
 * Get checksums from cache
 */
export function getChecksumsFromCache(tenantId: string) {
  return checksumCache.get(tenantId);
}

/**
 * Store checksums in cache
 */
export function storeChecksumsInCache(tenantId: string, checksums: Record<string, string>) {
  checksumCache.set(tenantId, {
    checksums,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate specific checksum partition
 * Forces refetch on next request
 */
export function invalidateChecksum(tenantId: string, partition: string) {
  const cached = checksumCache.get(tenantId);
  if (cached) {
    // Update timestamp to force recalculation
    cached.checksums[partition] = generateChecksum({ invalidated: Date.now() });
  }
}

/**
 * Invalidate players checksum (called after player updates/locks)
 */
export function invalidatePlayersChecksum(tenantId: string) {
  invalidateChecksum(tenantId, 'players');
}

/**
 * Invalidate rounds checksum (called after round updates)
 */
export function invalidateRoundsChecksum(tenantId: string) {
  invalidateChecksum(tenantId, 'rounds');
}

/**
 * Clear all checksums for a tenant
 */
export function clearChecksumCache(tenantId: string) {
  checksumCache.delete(tenantId);
}
