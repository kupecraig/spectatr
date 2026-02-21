/**
 * LocalStorage Migration Utilities
 * Handles migration from fantasy-union to spectatr localStorage keys
 */

interface MigrationResult {
  migrated: number;
  failed: number;
  errors: string[];
}

/**
 * Migrates localStorage keys from fantasy-union to spectatr
 * Preserves old keys for 1 version as backup
 * 
 * @returns Migration result with count of migrated keys
 */
export function migrateLocalStorage(): MigrationResult {
  const result: MigrationResult = {
    migrated: 0,
    failed: 0,
    errors: [],
  };

  const keyMap: Record<string, string> = {
    'fantasy-union-my-team': 'spectatr-my-team',
    'fantasy-union-theme': 'spectatr-theme',
    'fantasy-union-preferences': 'spectatr-preferences',
  };

  try {
    Object.entries(keyMap).forEach(([oldKey, newKey]) => {
      try {
        const data = localStorage.getItem(oldKey);
        
        // Only migrate if old key exists and new key doesn't
        if (data && !localStorage.getItem(newKey)) {
          // Validate JSON structure before migration
          try {
            JSON.parse(data);
            localStorage.setItem(newKey, data);
            result.migrated++;
            console.log(`✅ Migrated: ${oldKey} → ${newKey}`);
          } catch (parseError) {
            result.failed++;
            result.errors.push(`Invalid JSON in ${oldKey}: ${parseError}`);
            console.warn(`⚠️  Skipped ${oldKey}: Invalid JSON format`);
          }
        } else if (data && localStorage.getItem(newKey)) {
          console.log(`ℹ️  Skipped ${oldKey}: New key already exists`);
        }
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to migrate ${oldKey}: ${errorMessage}`);
        console.error(`❌ Failed to migrate ${oldKey}:`, error);
      }
    });

    if (result.migrated > 0) {
      console.log(`\n🎉 LocalStorage migration complete: ${result.migrated} key(s) migrated`);
    } else if (result.failed === 0) {
      console.log('ℹ️  No localStorage keys to migrate');
    }

    if (result.failed > 0) {
      console.error(`\n⚠️  Migration completed with ${result.failed} error(s)`, result.errors);
    }
  } catch (error) {
    result.failed++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Fatal migration error: ${errorMessage}`);
    console.error('❌ Fatal error during localStorage migration:', error);
  }

  return result;
}

/**
 * Cleanup old fantasy-union localStorage keys
 * Should only be called after confirming new keys are working
 * 
 * @returns Number of keys removed
 */
export function cleanupOldLocalStorageKeys(): number {
  const oldKeys = [
    'fantasy-union-my-team',
    'fantasy-union-theme',
    'fantasy-union-preferences',
  ];

  let removed = 0;
  oldKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      removed++;
      console.log(`🗑️  Removed old key: ${key}`);
    }
  });

  if (removed > 0) {
    console.log(`\n✅ Cleanup complete: ${removed} old key(s) removed`);
  }

  return removed;
}

/**
 * Check if migration is needed
 * @returns true if any old keys exist without corresponding new keys
 */
export function isMigrationNeeded(): boolean {
  const checks = [
    { old: 'fantasy-union-my-team', new: 'spectatr-my-team' },
    { old: 'fantasy-union-theme', new: 'spectatr-theme' },
    { old: 'fantasy-union-preferences', new: 'spectatr-preferences' },
  ];

  return checks.some(({ old, new: newKey }) => {
    const hasOld = localStorage.getItem(old) !== null;
    const hasNew = localStorage.getItem(newKey) !== null;
    return hasOld && !hasNew;
  });
}
