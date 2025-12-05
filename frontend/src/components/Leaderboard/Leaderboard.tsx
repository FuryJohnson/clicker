import { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { LeaderboardData, UserRankData } from '../../api/client';

const TITLE = 'Leaderboard';
const POSITION_LABEL = 'Ur position';

interface LeaderboardProps {
  data: LeaderboardData;
  userRank: UserRankData | null;
  currentUserId: number;
  localClicks: number;
}

const Container = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 400,
  background: theme.palette.background.paper,
  borderRadius: 16,
  padding: 20,
}));

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 20,
  fontWeight: 600,
  color: theme.palette.text.primary,
  textAlign: 'center',
  marginBottom: 16,
}));

const List = styled(Box)({
  'display': 'flex',
  'flexDirection': 'column',
  'gap': 8,
  'maxHeight': 320,
  'overflowY': 'auto',
  '&::-webkit-scrollbar': {
    width: 4,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(0, 152, 234, 0.3)',
    borderRadius: 2,
  },
});

const Item = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isCurrent',
})<{ isCurrent?: boolean }>(({ theme, isCurrent }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  background: isCurrent ? 'rgba(0, 152, 234, 0.15)' : theme.palette.secondary.main,
  border: isCurrent ? '1px solid rgba(0, 152, 234, 0.3)' : '1px solid transparent',
  borderRadius: 12,
  transition: 'background 0.2s ease',
}));

const Rank = styled('span')({
  minWidth: 32,
  fontSize: 18,
  textAlign: 'center',
});

const Name = styled('span')(({ theme }) => ({
  flex: 1,
  fontSize: 15,
  fontWeight: 500,
  color: theme.palette.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const Username = styled('span')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 13,
  fontWeight: 400,
  marginLeft: 6,
}));

const Clicks = styled('span')(({ theme }) => ({
  fontSize: 15,
  fontWeight: 600,
  color: theme.palette.primary.main,
}));

const CurrentUserRank = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 16,
  padding: 16,
  background: 'rgba(0, 152, 234, 0.1)',
  borderRadius: 12,
  border: '1px dashed rgba(0, 152, 234, 0.3)',
});

const CurrentRank = styled('span')(({ theme }) => ({
  fontSize: 22,
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

const Label = styled('span')(({ theme }) => ({
  flex: 1,
  fontSize: 14,
  color: theme.palette.text.secondary,
}));

const CurrentClicks = styled('span')(({ theme }) => ({
  fontSize: 17,
  fontWeight: 600,
  color: theme.palette.primary.main,
}));

const getRankEmoji = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
};

export const Leaderboard = ({ data, userRank, currentUserId, localClicks }: LeaderboardProps) => {
  const { leaders } = data;

  const updatedLeaders = useMemo(() => {
    return leaders
      .map((entry) => {
        if (entry.telegramId === currentUserId) {
          return { ...entry, clicks: localClicks };
        }
        return entry;
      })
      .sort((a, b) => b.clicks - a.clicks)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [leaders, currentUserId, localClicks]);

  const isInTop = updatedLeaders.some((l) => l.telegramId === currentUserId);

  const currentUserRank = useMemo(() => {
    if (isInTop) {
      const user = updatedLeaders.find((l) => l.telegramId === currentUserId);
      return user?.rank || userRank?.rank || 0;
    }
    return userRank?.rank || 0;
  }, [updatedLeaders, isInTop, currentUserId, userRank?.rank]);

  return (
    <Container>
      <Title>{TITLE}</Title>

      <List>
        {updatedLeaders.map((entry) => {
          const isCurrent = entry.telegramId === currentUserId;
          return (
            <Item key={entry.telegramId} isCurrent={isCurrent}>
              <Rank>{getRankEmoji(entry.rank)}</Rank>
              <Name>
                {entry.firstName}
                {entry.username && <Username>@{entry.username}</Username>}
              </Name>
              <Clicks>{entry.clicks.toLocaleString()}</Clicks>
            </Item>
          );
        })}
      </List>

      {!isInTop && currentUserRank > 0 && (
        <CurrentUserRank>
          <CurrentRank>{currentUserRank}</CurrentRank>
          <Label>{POSITION_LABEL}</Label>
          <CurrentClicks>{localClicks.toLocaleString()}</CurrentClicks>
        </CurrentUserRank>
      )}
    </Container>
  );
};
