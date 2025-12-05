import { styled } from '@mui/material/styles';
import { Box, Avatar, Typography } from '@mui/material';

interface UserInfoProps {
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

const Container = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
});

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 36,
  height: 36,
  fontSize: 14,
  fontWeight: 600,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
}));

const Info = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
});

const Name = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  lineHeight: 1.2,
}));

const Username = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.secondary,
  lineHeight: 1.2,
}));

const getInitials = (firstName: string, lastName?: string): string => {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last;
};

export const UserInfo = ({ firstName, lastName, username, photoUrl }: UserInfoProps) => {
  const initials = getInitials(firstName, lastName);
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;

  return (
    <Container>
      <StyledAvatar src={photoUrl} alt={displayName}>
        {initials}
      </StyledAvatar>
      <Info>
        <Name>{displayName}</Name>
        {username && <Username>@{username}</Username>}
      </Info>
    </Container>
  );
};
