const net = require('net');
const path = require('path');
const temp = require('temp');
const {Disposable, TextEditor} = require('atom');

class PromptView {
  constructor(question, callback) {
    const label = document.createElement('span');
    label.textContent = question;
    this.callback = callback;

    this.input = document.createElement('input');
    this.input.type = 'password';
    this.input.className = 'input-text';

    this.element = document.createElement('div');
    this.element.appendChild(label);
    this.element.appendChild(this.input);
  }

  getElement() {
    return this.element;
  }

  activate() {
    this.input.focus();
    atom.commands.add(this.input, 'core:confirm', () => this.finish(this.input.value));
    atom.commands.add(this.input, 'core:cancel', () => this.finish(null));
    this.input.addEventListener('blur', () => this.finish(null));
  }

  finish(value) {
    const callback = this.callback;
    if (callback) {
      this.callback = null;
      callback(value)
    }
  }
}

module.exports = function handleAskPass() {
  return new Promise(resolve => {
    temp.mkdir('askpass-', (error, tempDirPath) => {
      if (error) return reject(error);

      const server = net.createServer(connection => {
        connection.setEncoding('utf8');

        let question = '';
        connection.on('data', data => {
          const nullIndex = data.indexOf('\u0000');
          if (nullIndex === -1) {
            question += data;
          } else {
            question += data.substring(0, nullIndex);
            const promptView = new PromptView(
              question,
              (answer) => {
                connection.end(JSON.stringify(answer));
                panel.destroy();
                atom.workspace.getActivePane().activate();
              }
            );
            const panel = atom.workspace.addModalPanel({item: promptView});
            setImmediate(() => promptView.activate());
          }
        });
      });

      const socketPath = path.join(tempDirPath, 'askpass.sock');
      server.listen(socketPath, () => {
        resolve({
          close() { return  new Promise(resolve => server.close(resolve)); },
          path: require.resolve('./askpass.sh'),
          env: {
            ATOM_ELECTRON_PATH: process.execPath,
            ATOM_ASKPASS_SOCKET_PATH: socketPath
          }
        });
      });
    });
  });
}
