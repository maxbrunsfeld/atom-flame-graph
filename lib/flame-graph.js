const fs = require('fs');
const temp = require('temp');
const {fork, spawn, spawnSync} = require('child_process');
const {CompositeDisposable} = require('atom');

const PASSWORD = 'YOUR-PASSWORD-HERE' + '\n';

module.exports = {
  activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'flame-graph:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  buildFlameGraphView({data}) {
    const FlameGraphView = require('./flame-graph-view');
    return new FlameGraphView(data);
  },

  toggle(containingFunctionName) {
    containingFunctionName = 'tree_sitter';

    if (this.dtraceProcess) {
      const passwordFile = temp.openSync({prefix: 'password'});
      fs.writeFileSync(passwordFile.path, PASSWORD);
      fs.closeSync(passwordFile.fd)

      spawnSync('sudo', [
        '-S',
        'kill',
        this.dtraceProcess.pid
      ], {
        stdio: [
          fs.openSync(passwordFile.path, 'r'),
          'ignore',
          'ignore'
        ]
      })
      this.dtraceProcess = null
    } else {
      const passwordFile = temp.openSync({prefix: 'password'});
      fs.writeFileSync(passwordFile.path, PASSWORD);
      fs.closeSync(passwordFile.fd)

      const dtraceOutputFile = temp.openSync({prefix: 'dtrace.out'});
      const dtraceErrorFile = temp.openSync({prefix: 'dtrace.err'});

      this.dtraceProcess = spawn('sudo', [
        '-S',
        'dtrace',
        '-x', 'ustackframes=100',
        '-n', 'profile-2000 /pid == $target/ { @num[ustack()] = count(); }',
        '-p', process.pid
      ], {
        stdio: [
          fs.openSync(passwordFile.path, 'r'),
          dtraceOutputFile.fd,
          dtraceErrorFile.fd
        ]
      })

      this.dtraceProcess.on('close', (code) => {
        if (code !== 0) {
          atom.notifications.addWarning('Capturing stacks with Dtrace failed', {
            detail: fs.readFileSync(dtraceErrorFile.path, 'utf8')
          })
          return
        }

        fs.closeSync(dtraceOutputFile.fd);
        console.log("Wrote raw stacks to", dtraceOutputFile.path);

        let aggregatedStacks = ''
        const aggregatorProcess = fork(require.resolve('./aggregate-stacks'), [
          containingFunctionName || ''
        ], {
          stdio: [fs.openSync(dtraceOutputFile.path, 'r'), 'pipe', 'ignore', 'ipc']
        });

        aggregatorProcess.stdout.on('data', (chunk) => aggregatedStacks += chunk.toString('utf8'))

        aggregatorProcess.on('close', (code) => {
          if (code !== 0) {
            atom.notifications.addWarning('Aggregating stacks failed', {
              detail: fs.readFileSync(dtraceErrorFile.path, 'utf8')
            })
            return
          }

          atom.workspace.open(this.buildFlameGraphView({data: JSON.parse(aggregatedStacks)}))
        });
      });
    }
  }
};
