import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { themes, defaultTheme, type ThemeName } from '../theme';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

// Helper to get saved theme from localStorage
const getSavedTheme = (): ThemeName => {
  if (import.meta.env.DEV) {
    const saved = localStorage.getItem('theme-name');
    if (saved && saved in themes) {
      return saved as ThemeName;
    }
  }
  return defaultTheme;
};

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(getSavedTheme());

  useEffect(() => {
    setCurrentTheme(getSavedTheme());
  }, []);

  const applyTheme = (themeName: ThemeName) => {
    if (import.meta.env.DEV) {
      localStorage.setItem('theme-name', themeName);
      globalThis.dispatchEvent(new CustomEvent('theme-change', { detail: themeName }));
    }
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = event.target.value as ThemeName;
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Settings
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {import.meta.env.DEV && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Theme switcher available in dev mode only for testing different sport instances.
          </Alert>
        )}
        <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
          <FormLabel component="legend">Theme</FormLabel>
          <RadioGroup value={currentTheme} onChange={handleThemeChange}>
            <FormControlLabel value="rugby" control={<Radio />} label="Rugby Instance" />
            <FormControlLabel value="light" control={<Radio />} label="Light (preview)" />
            <FormControlLabel value="dark" control={<Radio />} label="Dark (preview)" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
    </Dialog>
  );
}
