export function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

export function htmlToDom(htmlString) {
  const temporaryElement = document.createElement('div');
  temporaryElement.innerHTML = htmlString;
  return temporaryElement.firstChild;
}
