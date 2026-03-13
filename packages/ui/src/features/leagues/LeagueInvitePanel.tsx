import { useState } from 'react';
import { Box, Button, Snackbar, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface LeagueInvitePanelProps {
  inviteCode: string;
}

export function LeagueInvitePanel({ inviteCode }: LeagueInvitePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode).then(() => setCopied(true));
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Share this code with anyone you want to invite.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          value={inviteCode}
          size="small"
          slotProps={{
            input: {
              readOnly: true,
              sx: { fontFamily: 'monospace', letterSpacing: 3, fontWeight: 700, fontSize: '1rem' },
            },
          }}
          sx={{ width: 160 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopy}
        >
          Copy
        </Button>
      </Box>
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Invite code copied!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
