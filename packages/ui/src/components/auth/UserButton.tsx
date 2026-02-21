import { Avatar, IconButton, Menu, MenuItem } from '@mui/material';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useState } from 'react';

/**
 * User Button - Avatar menu for signed-in users
 * Shows user avatar and dropdown menu with Profile/Sign Out options
 */
export function UserButton() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!isSignedIn || !user) return null;

  const handleClose = () => setAnchorEl(null);

  const displayName = user.username ?? user.primaryEmailAddress?.emailAddress ?? 'User';

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="User menu">
        <Avatar src={user.imageUrl} alt={displayName} />
      </IconButton>
      <Menu 
        anchorEl={anchorEl} 
        open={Boolean(anchorEl)} 
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
        <MenuItem onClick={() => { openUserProfile(); handleClose(); }}>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { signOut(); handleClose(); }}>
          Sign Out
        </MenuItem>
      </Menu>
    </>
  );
}
