import renderTemplate from 'lodash.template';
import {
  readSettingsFromLocalStorage,
  addEntryToState,
  deleteEntryFromState,
  changeState,
  isPositionAlreadyInSettings,
} from './state';
import { htmlToDom, wait } from './utils';
import makeMessenger from './messages';
import styles from './style.css';

import entryTemplate from './entry.tpl';
import modalTemplate from './modal.tpl';

const CLIENT_ID = process.env.CLIENT_ID;
const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;

var DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://docs.googleapis.com/$discovery/rest?version=v1',
];
var SCOPES = 'https://www.googleapis.com/auth/drive.file';

let pickerApiLoaded = false;

const createScreeningNotesButton = document.createElement('button');
createScreeningNotesButton.innerText = 'Add "Screening notes"';
createScreeningNotesButton.onclick = () => {
  createGoogleDoc('screeningNotes', 'Screening notes');
};
createScreeningNotesButton.className = `${styles.button} ${styles.addScreeningNotesButton}`;

const createTechInterviewNotesButton = document.createElement('button');
createTechInterviewNotesButton.innerText = 'Add "Tech interview notes"';
createTechInterviewNotesButton.onclick = () => {
  createGoogleDoc('techInterviewNotes', 'Tech interview notes');
};
createTechInterviewNotesButton.className = `${styles.button} ${styles.addTechInterviewNotesButton}`;

const settingsButton = document.createElement('button');
settingsButton.innerText = 'Settings';
settingsButton.onclick = showSettingsModal;
settingsButton.className = styles.button;
settingsButton.innerHTML = `
  <svg width="20" height="19" fill="none" xmlns="http://www.w3.org/2000/svg" class="CogIcon__component__36HIb">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M19.061 10.73V8.254h-2.69c-.174-.716-.457-1.8-.832-2.412l1.903-1.895-2.345-2.334-1.903 1.895c-.614-.373-1.701-.656-2.42-.828V0H8.287v2.68c-.718.172-1.807.455-2.42.828L3.963 1.613 1.62 3.947l1.903 1.896c-.375.61-.658 1.695-.832 2.41H0v2.477h2.69c.174.715.457 1.8.832 2.41L1.62 15.037l2.344 2.335 1.903-1.896c.614.374 1.703.656 2.421.83v2.678h2.487v-2.679c.719-.173 1.807-.455 2.42-.828l1.904 1.895 2.344-2.335-1.903-1.895c.375-.612.658-1.696.832-2.411h2.69zm-9.53 2.476A3.722 3.722 0 015.8 9.492a3.722 3.722 0 013.73-3.714c2.06 0 3.729 1.662 3.729 3.714a3.722 3.722 0 01-3.73 3.714z"></path>
  </svg>`;

const containerElement = document.createElement('div');
containerElement.className = styles.mainButtonsContainer;
const areButtonsSubmerged = true;
if (areButtonsSubmerged) {
  containerElement.classList.add(styles.mainButtonsContainerSubmerged);
}

const handleElement = document.createElement('div');
handleElement.className = styles.mainButtonsContainerHandle;
handleElement.onclick = () => {
  containerElement.classList.toggle(styles.mainButtonsContainerSubmerged);
};

const errorsElement = document.createElement('div');
errorsElement.className = styles.mainButtonsContainerMessages;
containerElement.appendChild(errorsElement);
const { showMessage } = makeMessenger(errorsElement);

const buttonsWrapElement = document.createElement('div');
buttonsWrapElement.className = styles.buttonsWrap;

buttonsWrapElement.appendChild(settingsButton);
buttonsWrapElement.appendChild(createScreeningNotesButton);
buttonsWrapElement.appendChild(createTechInterviewNotesButton);
containerElement.appendChild(buttonsWrapElement);

containerElement.appendChild(handleElement);
document.body.appendChild(containerElement);

let isAuthorized = false;

function updateSigninStatus(isSignedIn) {
  isAuthorized = isSignedIn;

  const settingsModalElement = document.querySelector(`.${styles.candidateTemplatesSettingsModal}`);
  if (!settingsModalElement) {
    return;
  }

  if (isAuthorized) {
    settingsModalElement.classList.add(styles.authorized);
  } else {
    settingsModalElement.classList.remove(styles.authorized);
  }
}

async function copyFile(fileId, copyName, copyFolderId) {
  const copyResponse = await gapi.client.drive.files.copy({
    fileId: fileId,
    fields: 'id, webViewLink',
    resource: {
      name: copyName,
      parents: [copyFolderId],
    },
  });

  return {
    id: copyResponse.result.id,
    webViewLink: copyResponse.result.webViewLink,
  };
}

function isEntrySetUpForAction(settings, entry, templateType) {
  if (!entry) {
    return false;
  }

  if (templateType === 'screeningNotes') {
    const isTemplateSet = !!settings.screeningNotesFolder.folderId;
    const isFolderSet = !!entry.screeningNotesTemplate.documentId;
    return isTemplateSet && isFolderSet;
  }

  if (templateType === 'techInterviewNotes') {
    const isTemplateSet = !!entry.techInterviewNotesFolder.folderId;
    const isFolderSet = !!entry.techInterviewNotesTemplate.documentId;
    return isTemplateSet && isFolderSet;
  }
}

async function createGoogleDoc(templateType, templateTitle) {
  const isCandidateModalOpen = document.location.search.includes('candidateModalId=');

  if (!isCandidateModalOpen) {
    showMessage('You must be on candidate page for this to work', 'error', 3000);
    return;
  }

  const candidatePosition = getCandidatePosition();
  const settings = readSettingsFromLocalStorage();
  const entryForThisPosition = settings.entries.find((entry) => entry.positionName === candidatePosition);

  if (!isEntrySetUpForAction(settings, entryForThisPosition, templateType)) {
    showMessage(`You need to set up template and folder for "${candidatePosition}"`, 'error', 3000);
    return;
  }

  let templateDocumentId;
  try {
    templateDocumentId = entryForThisPosition[templateType + 'Template'].documentId;
  } catch {
    showMessage(`Incorrect template for "${candidatePosition}". Please check it in settings.`, 'error', 3000);
    return;
  }

  const candidateName = document.querySelector('[class^="CandidateProfileCard__name"]').innerText;

  const newDocumentName = `${candidateName} - ${candidatePosition} - ${templateTitle}`;

  let copyFolderId;
  try {
    if (templateType === 'screeningNotes') {
      copyFolderId = settings.screeningNotesFolder.folderId;
    } else {
      copyFolderId = entryForThisPosition[templateType + 'Folder'].folderId;
    }
  } catch {
    showMessage(`Incorrect folder for "${candidatePosition}". Please check it in settings.`, 'error', 3000);
    return;
  }

  showMessage('Please wait...', 'info');
  containerElement.classList.add(styles.mainButtonsContainerBusy);

  const copyFileResult = await copyFile(templateDocumentId, newDocumentName, copyFolderId);

  await gapi.client.docs.documents.batchUpdate({
    documentId: copyFileResult.id,
    resource: {
      requests: [
        {
          replaceAllText: {
            containsText: {
              matchCase: false,
              text: '{{name}}',
            },
            replaceText: candidateName,
          },
        },
        {
          replaceAllText: {
            containsText: {
              matchCase: false,
              text: '{{position}}',
            },
            replaceText: candidatePosition,
          },
        },
        {
          replaceAllText: {
            containsText: {
              matchCase: false,
              text: '{{date}}',
            },
            replaceText: new Date().toLocaleDateString('ru-RU'),
          },
        },
      ],
    },
  });

  console.log(copyFileResult.webViewLink);
  await postDocumentUrl(copyFileResult.webViewLink, templateTitle);
  showMessage('Done!', 'success', 3000);
  containerElement.classList.remove(styles.mainButtonsContainerBusy);
}

async function postDocumentUrl(documentUrl, templateTitle) {
  document.querySelector('.Notes__new-note__AGyt4').dispatchEvent(new Event('click'));
  await wait(200);
  document.querySelector('.ProseMirror').innerHTML = `
      <div>
        <b>${templateTitle}: </b>
        <div>${documentUrl}</div>
      </div>`;
  await wait(200);
  document.querySelector('.Notes__add__39sFn').dispatchEvent(new Event('click'));
  await wait(500);
  document.querySelector('.ProseMirror').innerHTML = '';
}

function initClient() {
  gapi.client
    .init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    })
    .then(
      function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      },
      function (error) {
        console.log(JSON.stringify(error, null, 2));
      }
    );
}

function createPicker(onPickerStateChange, pickerType) {
  const oauthToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

  const view = new google.picker.DocsView(pickerType).setSelectFolderEnabled(true);

  if (pickerApiLoaded && oauthToken) {
    var picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setAppId(APP_ID)
      .setOAuthToken(oauthToken)
      .addView(view)
      .setDeveloperKey(API_KEY)
      .setCallback(onPickerStateChange)
      .build();

    picker.setVisible(true);
  }
}

function onPickerApiLoad() {
  console.log('pickerApiLoad!', gapi);
  pickerApiLoaded = true;
}

function handleClientLoad() {
  gapi.load('client:auth2', initClient);

  gapi.load('picker', { callback: onPickerApiLoad });
}

function handleAuthorizeClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

function showSettingsModal() {
  const savedSettings = readSettingsFromLocalStorage();

  const entriesHtml = savedSettings.entries.map((entry) => createEntryHtml(entry)).join('');
  const settingsModalHtml = makeModalContentHtml(savedSettings, entriesHtml);

  const settingsModalElement = htmlToDom(settingsModalHtml);

  if (isAuthorized) {
    settingsModalElement.classList.add(styles.authorized);
  }

  settingsModalElement.addEventListener('click', handleAddEntryClick);
  settingsModalElement.addEventListener('click', handleDeleteEntryClick);
  settingsModalElement.addEventListener('click', (event) => {
    if (event.target.classList.contains(styles.closeIconContent)) {
      settingsModalElement.remove();
    }
  });

  settingsModalElement.addEventListener('click', (event) => {
    if (event.target.classList.contains(styles.chooseButton)) {
      const pickerType = event.target.dataset.fieldType.includes('Folder')
        ? google.picker.ViewId.FOLDERS
        : google.picker.ViewId.DOCUMENTS;

      createPicker((pickerStateChange) => {
        if (pickerStateChange.action === google.picker.Action.PICKED) {
          const { entryId, fieldType } = event.target.dataset;

          const { id, name } = pickerStateChange.docs[0];

          const selectedValue =
            pickerType === google.picker.ViewId.FOLDERS
              ? {
                  folderId: id,
                  folderName: name,
                }
              : {
                  documentId: id,
                  documentName: name,
                };

          // Update state
          changeState(entryId, fieldType, selectedValue);

          // Update UI
          const selector = `input[data-field-type="${fieldType}"]` + (entryId ? `[data-entry-id="${entryId}"]` : '');
          const matchingInputElement = document.querySelector(selector);
          matchingInputElement.value = name;
        }
      }, pickerType);
    }
  });

  settingsModalElement.addEventListener('click', (event) => {
    if (event.target.classList.contains(styles.authorizeButton)) {
      handleAuthorizeClick();
    } else if (event.target.classList.contains(styles.signOutButton)) {
      handleSignoutClick();
    }
  });

  settingsModalElement.addEventListener('input', handleFieldChange);

  document.body.appendChild(settingsModalElement);
}

function createEntryHtml(entry) {
  return renderTemplate(entryTemplate)({ ...entry, styles });
}

function getCandidatePosition() {
  try {
    return document.querySelector('[class^="JobPageTitle__title"]').innerText;
  } catch {
    return '';
  }
}

function handleAddEntryClick(event) {
  if (event.target.classList.contains(styles.addEntryButton)) {
    const entry = createEmptyEntry();

    const candidatePosition = getCandidatePosition();

    if (!isPositionAlreadyInSettings(candidatePosition)) {
      entry.positionName = candidatePosition;
    }

    addEntryToState(entry);
    event.target.insertAdjacentHTML('beforebegin', createEntryHtml(entry));
  }
}

function handleDeleteEntryClick(event) {
  if (event.target.classList.contains('delete-entry-button')) {
    const { entryId } = event.target.dataset;
    deleteEntryFromState(entryId);

    const rowToRemove = document.querySelector(
      `.${styles.entriesContainer} .${styles.entry}[data-entry-id="${entryId}"]`
    );
    rowToRemove.remove();
  }
}

function handleFieldChange(event) {
  const { entryId, fieldType } = event.target.dataset;

  if (entryId) {
    changeState(entryId, fieldType, event.target.value);
  }
}

function createEmptyEntry() {
  return {
    entryId: Math.random().toString().slice(-4),
    positionName: '',
    screeningNotesTemplate: {
      documentName: '',
      documentId: '',
    },
    techInterviewNotesTemplate: {
      documentName: '',
      documentId: '',
    },
    techInterviewNotesFolder: {
      folderName: '',
      folderId: '',
    },
  };
}

function makeModalContentHtml(settings, entriesHtml) {
  return renderTemplate(modalTemplate)({ settings, styles, entriesHtml });
}

const googleApiScriptElement = document.createElement('script');
googleApiScriptElement.src = 'https://apis.google.com/js/api.js';
googleApiScriptElement.onload = handleClientLoad;
document.body.appendChild(googleApiScriptElement);
