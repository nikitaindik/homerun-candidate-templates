const MESSAGE_CLASSES_BY_TYPE = {
  info: 'ct-message--info',
  error: 'ct-message--error',
  success: 'ct-message--success',
};

const MESSAGE_CLASSES = Object.values(MESSAGE_CLASSES_BY_TYPE);

let timeoutId = null;

const makeMessenger = (containerElement) => {
  const hideMessage = () => {
    containerElement.classList.remove(...MESSAGE_CLASSES);
    containerElement.innerText = '';
  };

  const showMessage = (text, type, milliseconds) => {
    window.clearTimeout(timeoutId);

    containerElement.classList.remove(...MESSAGE_CLASSES);
    containerElement.classList.add(MESSAGE_CLASSES_BY_TYPE[type]);

    containerElement.innerText = text;

    if (milliseconds) {
      timeoutId = window.setTimeout(() => {
        hideMessage();
        timeoutId = null;
      }, milliseconds);
    }
  };

  return {
    showMessage,
    hideMessage,
  };
};

export default makeMessenger;
