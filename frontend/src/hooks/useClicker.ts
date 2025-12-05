import { useState, useEffect, useRef, useCallback } from 'react';
import { api, UserData, LeaderboardData, UserRankData, ClickResult } from '../api/client';
import { ClickCommandQueue } from '../domain/commands/command-queue';

const BatchInterval = 1000;
const LeaderboardRefresh = 5000;
const RankRefresh = 10000;

interface UseClickerProps {
  initData: string;
}

export const useClicker = ({ initData }: UseClickerProps) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [userRank, setUserRank] = useState<UserRankData | null>(null);
  const [localClicks, setLocalClicks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const commandQueueRef = useRef<ClickCommandQueue | null>(null);
  const lastServerClicksRef = useRef(0);

  const refreshLeaderboard = useCallback(async () => {
    if (!initData) return;

    const result = await api.getLeaderboard(initData);
    if (result.ok) {
      setLeaderboard(result.data);
    }
  }, [initData]);

  const refreshRank = useCallback(async () => {
    if (!initData) return;

    const result = await api.getUserRank(initData);
    if (result.ok) {
      setUserRank(result.data);
      lastServerClicksRef.current = result.data.clicks;
    }
  }, [initData]);

  useEffect(() => {
    if (!initData) return;

    const addClicks = async (count: number): Promise<ClickResult | null> => {
      const result = await api.addClicks(initData, count);
      return result.ok ? result.data : null;
    };

    const queue = new ClickCommandQueue(addClicks, BatchInterval);

    queue.setOnSuccess((result) => {
      lastServerClicksRef.current = result.clicks;
      setUser((prev) => (prev ? { ...prev, clicks: result.clicks } : null));
      refreshRank();
      refreshLeaderboard();
    });

    commandQueueRef.current = queue;

    return () => {
      queue.dispose();
    };
  }, [initData, refreshRank, refreshLeaderboard]);

  useEffect(() => {
    const init = async () => {
      const authResult = await api.auth(initData);

      if (!authResult.ok) {
        setError(authResult.error);
        setIsLoading(false);
        return;
      }

      setUser(authResult.data);
      setLocalClicks(authResult.data.clicks);
      lastServerClicksRef.current = authResult.data.clicks;

      const [lbResult, rankResult] = await Promise.all([
        api.getLeaderboard(initData),
        api.getUserRank(initData),
      ]);

      if (lbResult.ok) {
        setLeaderboard(lbResult.data);
      }
      if (rankResult.ok) {
        setUserRank(rankResult.data);
      }

      setIsLoading(false);
    };

    init();
  }, [initData]);

  useEffect(() => {
    if (!initData) return;

    const lbInterval = setInterval(refreshLeaderboard, LeaderboardRefresh);
    const rankInterval = setInterval(refreshRank, RankRefresh);

    return () => {
      clearInterval(lbInterval);
      clearInterval(rankInterval);
    };
  }, [initData, refreshLeaderboard, refreshRank]);

  const handleClick = useCallback(() => {
    setLocalClicks((prev) => prev + 1);
    commandQueueRef.current?.enqueue();
  }, []);

  return {
    user,
    leaderboard,
    userRank,
    localClicks,
    isLoading,
    error,
    handleClick,
    refreshLeaderboard,
  };
};
