<div class="${styles.entry}" data-entry-id="${entryId}">
  <div class="${styles.entryRow}">
    <label>Position name</label>
    <input type="text" data-field-type="positionName" data-entry-id="${entryId}" value="${positionName}" />
  </div>

  <div class="${styles.entryRow}">
    <label>Screening notes template</label>
    <div class="${styles.entryInputWithPicker}">
      <input
        type="text"
        disabled
        data-entry-id="${entryId}"
        data-field-type="screeningNotesTemplate"
        value="${screeningNotesTemplate.documentName}"
      />
      <button class="${styles.chooseButton}" data-entry-id="${entryId}" data-field-type="screeningNotesTemplate">
        Choose
      </button>
    </div>
  </div>

  <div class="${styles.entryRow}">
    <label>Tech interview notes template</label>
    <div class="${styles.entryInputWithPicker}">
      <input
        type="text"
        disabled
        data-entry-id="${entryId}"
        data-field-type="techInterviewNotesTemplate"
        value="${techInterviewNotesTemplate.documentName}"
      />
      <button class="${styles.chooseButton}" data-entry-id="${entryId}" data-field-type="techInterviewNotesTemplate">
        Choose
      </button>
    </div>
  </div>

  <div class="${styles.entryRow}">
    <label>Tech interview notes folder</label>
    <div class="${styles.entryInputWithPicker}">
      <input
        type="text"
        disabled
        data-entry-id="${entryId}"
        data-field-type="techInterviewNotesFolder"
        value="${techInterviewNotesFolder.folderName}"
      />
      <button class="${styles.chooseButton}" data-entry-id="${entryId}" data-field-type="techInterviewNotesFolder">
        Choose
      </button>
    </div>
  </div>

  <button class="delete-entry-button ${styles.entryRow}" data-entry-id="${entryId}">Delete template</button>
</div>
