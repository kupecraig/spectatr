import { useEffect, useRef, useState } from 'react';
import { useChecksumQuery } from './useChecksumQuery';
import { useGameweekQuery } from './useGameweekQuery';

export interface PollingConfig {
  baseInterval?: number;          // Default: 60s (no activity)
  transferWindowInterval?: number; // Default: 30s (transfer window open)
  liveMatchInterval?: number;      // Default: 10s (live matches)
  maxRetryInterval?: number;       // Default: 60s (max backoff)
  enabled?: boolean;                // Default: true
}

const DEFAULT_CONFIG: Required<PollingConfig> = {
  baseInterval: 60 * 1000,          // 60 seconds
  transferWindowInterval: 30 * 1000, // 30 seconds
  liveMatchInterval: 10 * 1000,      // 10 seconds
  maxRetryInterval: 60 * 1000,       // 60 seconds
  enabled: true,
};

/**
 * Adaptive polling hook for checksum change detection
 * Adjusts poll frequency based on gameweek state and errors
 */
export const useChecksumPoller = (config: PollingConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { data: gameweekData } = useGameweekQuery();
  const [pollInterval, setPollInterval] = useState(mergedConfig.baseInterval);
  const [errorCount, setErrorCount] = useState(0);
  const previousChecksumsRef = useRef<Record<string, string>>({});

  // Query with polling enabled
  const { data, error, refetch } = useChecksumQuery();

  // Determine appropriate polling interval based on gameweek state
  useEffect(() => {
    if (!mergedConfig.enabled || !gameweekData) {
      return;
    }

    const status = gameweekData.status;
    let newInterval = mergedConfig.baseInterval;

    // Aggressive polling during active rounds
    if (status === 'active') {
      newInterval = mergedConfig.liveMatchInterval;
    }
    // Moderate polling during transfer windows (pre_round)
    else if (status === 'pre_round') {
      newInterval = mergedConfig.transferWindowInterval;
    }

    setPollInterval(newInterval);
  }, [gameweekData, mergedConfig]);

  // Exponential backoff on errors
  useEffect(() => {
    if (error) {
      setErrorCount((prev) => {
        const newCount = prev + 1;
        const backoffInterval = Math.min(
          pollInterval * Math.pow(2, newCount),
          mergedConfig.maxRetryInterval
        );
        setPollInterval(backoffInterval);
        return newCount;
      });
    } else {
      // Reset error count on successful fetch
      setErrorCount(0);
    }
  }, [error, pollInterval, mergedConfig.maxRetryInterval]);

  // Polling effect
  useEffect(() => {
    if (!mergedConfig.enabled) {
      return;
    }

    const intervalId = setInterval(() => {
      refetch();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [pollInterval, mergedConfig.enabled, refetch]);

  // Detect changes in checksums
  const hasChanged = (partition: string): boolean => {
    if (!data) return false;

    const currentChecksum = data.checksums[partition as keyof typeof data.checksums];
    const previousChecksum = previousChecksumsRef.current[partition];

    // Update reference
    previousChecksumsRef.current[partition] = currentChecksum;

    // Return true if changed (and not first fetch)
    return !!previousChecksum && previousChecksum !== currentChecksum;
  };

  return {
    checksums: data?.checksums,
    version: data?.version,
    lastUpdated: data?.lastUpdated,
    hasChanged,
    pollInterval,
    errorCount,
    isEnabled: mergedConfig.enabled,
  };
};
