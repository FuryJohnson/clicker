import { createContext } from 'react';

interface Settings {
  soundEnabled: boolean;
}

export interface SettingsContextType {
  settings: Settings;
  toggleSound: () => void;
}

export const defaultSettings: Settings = {
  soundEnabled: true,
};

export const SettingsContext = createContext<SettingsContextType | null>(null);

