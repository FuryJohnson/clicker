import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { IconButton, Menu, MenuItem, ListItemText, Switch } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useSettings } from '../../hooks/useSettings';

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  'color': theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.text.primary,
    background: 'rgba(255, 255, 255, 0.05)',
  },
}));

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    background: theme.palette.background.paper,
    borderRadius: 12,
    minWidth: 200,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
}));

const StyledMenuItem = styled(MenuItem)({
  'padding': '12px 16px',
  'display': 'flex',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  '&:hover': {
    background: 'rgba(0, 152, 234, 0.1)',
  },
});

const MenuItemContent = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
});

const IconWrapper = styled('span')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.palette.primary.main,
}));

export const SettingsMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { settings, toggleSound } = useSettings();
  const isOpen = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSoundToggle = () => {
    toggleSound();
  };

  return (
    <>
      <StyledIconButton
        onClick={handleOpen}
        aria-label="Settings"
        aria-controls={isOpen ? 'settings-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen ? 'true' : undefined}
      >
        <SettingsIcon />
      </StyledIconButton>
      <StyledMenu
        id="settings-menu"
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <StyledMenuItem onClick={handleSoundToggle}>
          <MenuItemContent>
            <IconWrapper>
              {settings.soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconWrapper>
            <ListItemText primary="Sounds" />
          </MenuItemContent>
          <Switch checked={settings.soundEnabled} size="small" color="primary" />
        </StyledMenuItem>
      </StyledMenu>
    </>
  );
};
