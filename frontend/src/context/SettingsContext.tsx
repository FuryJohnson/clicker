import { useState, useEffect, ReactNode } from 'react';
import { storage } from '../infrastructure/storage';
import { SettingsContext, defaultSettings } from './settings.context';

const STORAGE_KEY = 'clicker_settings';

const loadSettings = () => {
  const stored = storage.get<typeof defaultSettings>(STORAGE_KEY);
  return stored ? { ...defaultSettings, ...stored } : defaultSettings;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    storage.set(STORAGE_KEY, settings);
  }, [settings]);

  const toggleSound = () => {
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  return (
    <SettingsContext.Provider value={{ settings, toggleSound }}>
      {children}
    </SettingsContext.Provider>
  );
};
