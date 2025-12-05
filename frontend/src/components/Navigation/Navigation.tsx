import { styled } from '@mui/material/styles';
import { ButtonBase } from '@mui/material';

type Tab = 'clicker' | 'leaderboard';

const CLICKER_TAB_LABEL = 'Clicker';
const LEADERBOARD_TAB_LABEL = 'Leaderboard';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Nav = styled('nav')(({ theme }) => ({
  display: 'flex',
  gap: 8,
  padding: 8,
  background: theme.palette.background.paper,
  borderRadius: 16,
}));

const NavItem = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>(({ theme, isActive }) => ({
  'flex': 1,
  'display': 'flex',
  'flexDirection': 'column',
  'alignItems': 'center',
  'gap': 4,
  'padding': '14px 16px',
  'borderRadius': 12,
  'background': isActive ? 'rgba(0, 152, 234, 0.15)' : 'transparent',
  'color': isActive ? theme.palette.primary.main : theme.palette.text.secondary,
  'transition': 'all 0.2s ease',
  '&:hover': {
    background: isActive ? 'rgba(0, 152, 234, 0.15)' : 'rgba(255, 255, 255, 0.05)',
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

const NavLabel = styled('span')({
  fontSize: 12,
  fontWeight: 600,
});

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const handleClickerTab = () => onTabChange('clicker');
  const handleLeaderboardTab = () => onTabChange('leaderboard');

  const handleKeyDown = (tab: Tab) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTabChange(tab);
    }
  };

  return (
    <Nav>
      <NavItem
        isActive={activeTab === 'clicker'}
        onClick={handleClickerTab}
        onKeyDown={handleKeyDown('clicker')}
        aria-label={CLICKER_TAB_LABEL}
        tabIndex={0}
      >
        <NavLabel>{CLICKER_TAB_LABEL}</NavLabel>
      </NavItem>
      <NavItem
        isActive={activeTab === 'leaderboard'}
        onClick={handleLeaderboardTab}
        onKeyDown={handleKeyDown('leaderboard')}
        aria-label={LEADERBOARD_TAB_LABEL}
        tabIndex={0}
      >
        <NavLabel>{LEADERBOARD_TAB_LABEL}</NavLabel>
      </NavItem>
    </Nav>
  );
};
