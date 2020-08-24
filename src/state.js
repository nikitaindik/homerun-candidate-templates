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
  const entryToChange = savedSettings.entries.find((entry) => entry.entryId === entryId);
  const entriesWithoutChanged = savedSettings.entries.filter((entry) => entry !== entryToChange);

  return {
    ...savedSettings,
    entries: [...entriesWithoutChanged, { ...entryToChange, [fieldType]: value }],
  };
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
