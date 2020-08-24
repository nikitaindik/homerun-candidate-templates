import { readSettingsFromLocalStorage, addEntryToState, deleteEntryFromState, changeState } from './state';
import { wait } from './utils';
import makeMessenger from './messages';
import './style.css';

/*

Fix sticky textarea comment
Add comments to do the auto-update
Hide .env files and node_modules from git

*/

const CLIENT_ID = process.env.CLIENT_ID;
const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;

var DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://docs.googleapis.com/$discovery/rest?version=v1',
];
var SCOPES = 'https://www.googleapis.com/auth/drive.file';

let pickerApiLoaded = false;

const authorizeButton = document.createElement('button');
authorizeButton.innerText = 'Authorize';

const signOutButton = document.createElement('button');
signOutButton.innerText = 'Sign out';

const createScreeningNotesButton = document.createElement('button');
createScreeningNotesButton.innerText = 'Add "Screening notes"';
createScreeningNotesButton.onclick = () => {
  createGoogleDoc('screeningNotes', 'Screening notes');
};
createScreeningNotesButton.className = 'ct-button ct-add-screening-notes-button';

const createTechInterviewNotesButton = document.createElement('button');
createTechInterviewNotesButton.innerText = 'Add "Tech interview notes"';
createTechInterviewNotesButton.onclick = () => {
  createGoogleDoc('techInterviewNotes', 'Tech interview notes');
};
createTechInterviewNotesButton.className = 'ct-button ct-add-tech-interview-notes-button';

const settingsButton = document.createElement('button');
settingsButton.innerText = 'Settings';
settingsButton.onclick = showSettingsModal;
settingsButton.className = 'ct-button';
settingsButton.innerHTML = `
  <svg width="20" height="19" fill="none" xmlns="http://www.w3.org/2000/svg" class="CogIcon__component__36HIb">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M19.061 10.73V8.254h-2.69c-.174-.716-.457-1.8-.832-2.412l1.903-1.895-2.345-2.334-1.903 1.895c-.614-.373-1.701-.656-2.42-.828V0H8.287v2.68c-.718.172-1.807.455-2.42.828L3.963 1.613 1.62 3.947l1.903 1.896c-.375.61-.658 1.695-.832 2.41H0v2.477h2.69c.174.715.457 1.8.832 2.41L1.62 15.037l2.344 2.335 1.903-1.896c.614.374 1.703.656 2.421.83v2.678h2.487v-2.679c.719-.173 1.807-.455 2.42-.828l1.904 1.895 2.344-2.335-1.903-1.895c.375-.612.658-1.696.832-2.411h2.69zm-9.53 2.476A3.722 3.722 0 015.8 9.492a3.722 3.722 0 013.73-3.714c2.06 0 3.729 1.662 3.729 3.714a3.722 3.722 0 01-3.73 3.714z"></path>
  </svg>`;

const containerElement = document.createElement('div');
containerElement.className = 'main-buttons-container';
const areButtonsSubmerged = true;
if (areButtonsSubmerged) {
  containerElement.classList.add('main-buttons-container-submerged');
}

const handleElement = document.createElement('div');
handleElement.className = 'main-buttons-container-handle';
handleElement.onclick = () => {
  containerElement.classList.toggle('main-buttons-container-submerged');
};

const errorsElement = document.createElement('div');
errorsElement.className = 'main-buttons-container-messages';
containerElement.appendChild(errorsElement);
const { showMessage } = makeMessenger(errorsElement);

const buttonsWrapElement = document.createElement('div');
buttonsWrapElement.className = 'buttons-wrap';

buttonsWrapElement.appendChild(settingsButton);
buttonsWrapElement.appendChild(createScreeningNotesButton);
buttonsWrapElement.appendChild(createTechInterviewNotesButton);
containerElement.appendChild(buttonsWrapElement);

containerElement.appendChild(handleElement);
document.body.appendChild(containerElement);

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signOutButton.style.display = 'inline';
  } else {
    authorizeButton.style.display = 'inline';
    signOutButton.style.display = 'none';
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

async function createGoogleDoc(templateType, templateTitle) {
  const isCandidateModalOpen = document.location.search.includes('candidateModalId=');

  if (!isCandidateModalOpen) {
    showMessage('You must be on candidate page for this to work', 'error', 3000);
    return;
  }

  const candidatePosition = document.querySelector('[class^="JobPageTitle__title"]').innerText;
  const settings = readSettingsFromLocalStorage();
  const entryForThisPosition = settings.entries.find((entry) => entry.positionName === candidatePosition);

  const isTemplateAvailableForPosition = !!entryForThisPosition;
  if (!isTemplateAvailableForPosition) {
    showMessage(`You need to select a template for "${candidatePosition}"`, 'error', 3000);
    return;
  }

  let templateDocumentId;
  try {
    templateDocumentId = entryForThisPosition[templateType + 'Template'].documentId;
  } catch {
    showMessage(`Incorrect template for "${candidatePosition}". Please check it in settings.`, 'error', 3000);
    return;
  }

  const candidateName = document.querySelector('[class^="CandidateProfile__candidate-name"]').innerText;

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
  containerElement.classList.add('main-buttons-container--busy');

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
  containerElement.classList.remove('main-buttons-container--busy');
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
  // await wait(200);
  // dispatch backspace
}

function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
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
        authorizeButton.onclick = handleAuthClick;
        signOutButton.onclick = handleSignoutClick;
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

function showSettingsModal() {
  const settingsModalElement = document.createElement('div');
  settingsModalElement.className = 'candidate-templates-settings-modal';

  settingsModalElement.addEventListener('click', handleAddEntryClick);
  settingsModalElement.addEventListener('click', handleDeleteEntryClick);
  settingsModalElement.addEventListener('click', (event) => {
    if (event.target.classList.contains('close-icon-content')) {
      settingsModalElement.remove();
    }
  });

  settingsModalElement.addEventListener('click', (event) => {
    if (event.target.classList.contains('choose-button')) {
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

  settingsModalElement.addEventListener('input', handleFieldChange);

  const savedSettings = readSettingsFromLocalStorage();

  const modalContentHtml = makeModalContentHtml(savedSettings);

  settingsModalElement.innerHTML = modalContentHtml;

  const contentElement = settingsModalElement.firstElementChild;

  contentElement.insertAdjacentHTML(
    'beforeend',
    `
      <div class="close-icon">
        <span class="close-icon-content"></span>
      </div>`
  );

  const authorizationButtonsContainer = document.createElement('div');
  authorizationButtonsContainer.className = 'authorization-buttons-container';
  authorizationButtonsContainer.appendChild(authorizeButton);
  authorizationButtonsContainer.appendChild(signOutButton);
  contentElement.appendChild(authorizationButtonsContainer);

  document.body.appendChild(settingsModalElement);
}

function createEntryHtml({
  entryId,
  positionName = '',
  screeningNotesTemplate = '',
  techInterviewNotesTemplate = '',
  techInterviewNotesFolder = '',
}) {
  return `
      <div class="entry" data-entry-id="${entryId}">

        <div class="entry-row">
          <label>Position name</label>
          <input type="text" data-field-type="positionName" data-entry-id="${entryId}" value="${positionName}" />
        </div>

        <div class="entry-row">
          <label>Screening notes template</label>
          <div class="entry-input-with-picker">
            <input type="text" disabled data-entry-id="${entryId}" data-field-type="screeningNotesTemplate" value="${screeningNotesTemplate.documentName}" />
            <button class="choose-button" data-entry-id="${entryId}" data-field-type="screeningNotesTemplate">Choose</button>
          </div>
        </div>
       
        <div class="entry-row">
          <label>Tech interview notes template</label>
          <div class="entry-input-with-picker">
            <input type="text" disabled data-entry-id="${entryId}" data-field-type="techInterviewNotesTemplate" value="${techInterviewNotesTemplate.documentName}" />
            <button class="choose-button" data-entry-id="${entryId}" data-field-type="techInterviewNotesTemplate">Choose</button>
          </div>
        </div>
     
        <div class="entry-row">
          <label>Tech interview notes folder</label>
          <div class="entry-input-with-picker">
            <input type="text" disabled data-entry-id="${entryId}" data-field-type="techInterviewNotesFolder" value="${techInterviewNotesFolder.folderName}" />
            <button class="choose-button" data-entry-id="${entryId}" data-field-type="techInterviewNotesFolder">Choose</button>
          </div>
        </div>

        <button class="delete-entry-button entry-row" data-entry-id="${entryId}">Delete template</button>
      </div>
    `;
}

function handleAddEntryClick(event) {
  if (event.target.classList.contains('add-entry-button')) {
    const entry = createEmptyEntry();

    addEntryToState(entry);
    event.target.insertAdjacentHTML('beforebegin', createEntryHtml(entry));
  }
}

function handleDeleteEntryClick(event) {
  if (event.target.classList.contains('delete-entry-button')) {
    const { entryId } = event.target.dataset;
    deleteEntryFromState(entryId);

    const rowToRemove = document.querySelector(`.entries-container .entry[data-entry-id="${entryId}"]`);
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

function makeModalContentHtml(settings) {
  const entriesHtml = settings.entries.map((entry) => createEntryHtml(entry)).join('');

  return `
    <div class="candidate-templates-settings-modal-content">
      <div class="screening-notes-row">
        <label>Screening notes folder</label>
        <div class="entry-input-with-picker">
          <input type="text" disabled data-field-type="screeningNotesFolder" value="${settings.screeningNotesFolder.folderName}" />
          <button class="choose-button" data-field-type="screeningNotesFolder">Choose</button>
        </div>
      </div>
      <div class="entries-container">
        ${entriesHtml}
        <button class="add-entry-button">Add template</button>
      </div>
    </div>
  `;
}

const googleApiScriptElement = document.createElement('script');
googleApiScriptElement.src = 'https://apis.google.com/js/api.js';
googleApiScriptElement.onload = handleClientLoad;
document.body.appendChild(googleApiScriptElement);
