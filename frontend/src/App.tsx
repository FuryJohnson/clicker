import { useState, useMemo, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { createAppTheme } from './theme';
import { SettingsProvider } from './context/SettingsContext';
import { useTelegram } from './hooks/useTelegram';
import { useClicker } from './hooks/useClicker';
import { ClickButton } from './components/ClickButton/ClickButton';
import { Leaderboard } from './components/Leaderboard/Leaderboard';
import { Navigation } from './components/Navigation/Navigation';
import { SettingsMenu } from './components/SettingsMenu/SettingsMenu';
import { UserInfo } from './components/UserInfo/UserInfo';

type Tab = 'clicker' | 'leaderboard';

const AppContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: 16,
  paddingBottom: 'env(safe-area-inset-bottom, 16px)',
  overflow: 'hidden',
  background: theme.palette.background.default,
}));

const Header = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0 16px',
});

const Content = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  overflowY: 'auto',
  padding: '16px 0',
});

const Footer = styled(Box)({
  paddingTop: 8,
});

const LoadingScreen = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
});

const ErrorScreen = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
});

const ErrorIcon = styled('span')({
  fontSize: 56,
});

const AppContent = () => {
  const { initData, user: tgUser } = useTelegram();
  const { user, leaderboard, userRank, localClicks, isLoading, error, handleClick, refreshLeaderboard } =
    useClicker({ initData });
  const [activeTab, setActiveTab] = useState<Tab>('clicker');

  const handleRetry = () => window.location.reload();

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'leaderboard') {
      refreshLeaderboard();
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      refreshLeaderboard();
    }
  }, [activeTab, refreshLeaderboard]);

  if (isLoading) {
    return (
      <LoadingScreen>
        <CircularProgress size={48} />
        <Typography color="text.secondary" fontSize={15}>
          Загрузка...
        </Typography>
      </LoadingScreen>
    );
  }

  if (error) {
    return (
      <ErrorScreen>
        <ErrorIcon>😵</ErrorIcon>
        <Typography color="text.secondary" fontSize={15} textAlign="center">
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={handleRetry}
          aria-label="Retry loading"
          sx={{
            borderRadius: 3,
            px: 4,
            py: 1.5,
            fontWeight: 600,
          }}
        >
          Попробовать снова
        </Button>
      </ErrorScreen>
    );
  }

  return (
    <>
      <Header>
        {tgUser && user ? (
          <UserInfo
            firstName={tgUser.first_name}
            lastName={tgUser.last_name}
            username={tgUser.username}
            photoUrl={user.photoUrl}
          />
        ) : (
          <Box />
        )}
        <SettingsMenu />
      </Header>

      <Content>
        {activeTab === 'clicker' && <ClickButton clicks={localClicks} onClick={handleClick} />}
        {activeTab === 'leaderboard' && leaderboard && tgUser && (
          <Leaderboard data={leaderboard} userRank={userRank} currentUserId={tgUser.id} localClicks={localClicks} />
        )}
      </Content>

      <Footer>
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      </Footer>
    </>
  );
};

export const App = () => {
  const theme = useMemo(() => createAppTheme(), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SettingsProvider>
        <AppContainer>
          <AppContent />
        </AppContainer>
      </SettingsProvider>
    </ThemeProvider>
  );
};
