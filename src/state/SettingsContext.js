import { createContext, useContext } from 'react';

/**
 * The signed-in user's settings as useUserSettings (SettingsStore.jsx) gives them:
 * { settings, updateSettings, getSettings }. Signed out there is no provider and
 * useSettings() returns null. Kept apart from SettingsStore so that consumers do not
 * load Firebase.
 */
export const SettingsContext = createContext(null);

export const useSettings = () => useContext(SettingsContext);
