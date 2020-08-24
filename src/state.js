export function addEntryToState(entry) {
  const savedSettings = readSettingsFromLocalStorage();

  const updatedSettings = {
    ...savedSettings,
    entries: [...savedSettings.entries, entry],
  };

  writeSettingsToLocalStorage(updatedSettings);
}

export function deleteEntryFromState(entryId) {
  const savedSettings = readSettingsFromLocalStorage();

  const entriesWithoutRemoved = savedSettings.entries.filter((entry) => entry.entryId !== entryId);
  const updatedSettings = {
    ...savedSettings,
    entries: entriesWithoutRemoved,
  };

  writeSettingsToLocalStorage(updatedSettings);
}

export function changeState(entryId, fieldType, value) {
  const savedSettings = readSettingsFromLocalStorage();

  const updatedSettings = entryId
    ? changeEntryInState(savedSettings, entryId, fieldType, value)
    : changeFieldInState(savedSettings, fieldType, value);

  writeSettingsToLocalStorage(updatedSettings);
}

function changeEntryInState(savedSettings, entryId, fieldType, value) {
  const entryToChangeIndex = savedSettings.entries.findIndex((entry) => entry.entryId === entryId);
  const entryToChange = savedSettings.entries[entryToChangeIndex];
  savedSettings.entries.splice(entryToChangeIndex, 1, { ...entryToChange, [fieldType]: value });

  return savedSettings;
}

function changeFieldInState(savedSettings, fieldType, value) {
  return {
    ...savedSettings,
    [fieldType]: value,
  };
}

function createEmptySettings() {
  return {
    screeningNotesFolder: {
      folderName: '',
      folderId: '',
    },
    entries: [],
  };
}

export function isPositionAlreadyInSettings(candidatePosition) {
  const savedSettings = readSettingsFromLocalStorage();
  return savedSettings.entries.some((entry) => entry.positionName === candidatePosition);
}

export function readSettingsFromLocalStorage() {
  try {
    const parsedSettings = JSON.parse(localStorage.getItem('candidateTemplates'));
    return parsedSettings || createEmptySettings();
  } catch {
    return createEmptySettings();
  }
}

function writeSettingsToLocalStorage(settings) {
  localStorage.setItem('candidateTemplates', JSON.stringify(settings));
}
