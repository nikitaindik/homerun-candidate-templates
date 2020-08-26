<div class="${styles.candidateTemplatesSettingsModal}">
  <div class="${styles.candidateTemplatesSettingsModalContent}">
    <div class="${styles.closeIcon}">
      <span class="${styles.closeIconContent}"></span>
    </div>
    <div class="${styles.screeningNotesRow}">
      <label>Screening notes folder</label>
      <div class="${styles.entryInputWithPicker}">
        <input
          type="text"
          disabled
          data-field-type="screeningNotesFolder"
          value="${settings.screeningNotesFolder.folderName}"
        />
        <button class="${styles.chooseButton}" data-field-type="screeningNotesFolder">Choose</button>
      </div>
    </div>
    <div class="${styles.entriesContainer}">
      ${entriesHtml}
      <button class="${styles.addEntryButton}">Add template</button>
    </div>
    <div class="${styles.authorizationButtonsContainer}">
      <button class="${styles.authorizeButton}">Authorize</button>
      <button class="${styles.signOutButton}">Sign out</button>
    </div>
  </div>
</div>
