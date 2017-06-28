const fs = require('fs');
const temp = require('temp');
const {fork, spawn, spawnSync} = require('child_process');
const {Disposable, CompositeDisposable} = require('atom');
const handleAskPass = require('./handle-askpass');
const StatusBarIcon = require('./status-bar-icon');

module.exports = {
  activate(state) {
    this.statusBarIcon = new StatusBarIcon(() => this.toggle());
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

  consumeStatusBar(statusBar) {
    const statusBarTile = statusBar.addRightTile({item: this.statusBarIcon, priority: -1000});
    this.subscriptions.add(new Disposable(() => statusBarTile.destroy()));
  },

  async toggle() {
    if (this.traceProcess) {
      await this.stopTracing(this.traceProcess);
      this.traceProcess = null;
    } else {
      this.traceProcess = await this.startTracing();
    }
  },

  async startTracing() {
    const containingFunctionName = 'superstring';
    const askpassHandler = await handleAskPass();
    const traceOutputFile = temp.openSync({prefix: 'trace.out'});
    let traceStderr = '';

    const traceProcess = spawn('sudo', [
      '-A',
      'dtrace',
      '-x', 'ustackframes=100',
      '-n', 'profile-2000 /pid == $target/ { @num[ustack()] = count(); }',
      '-p', process.pid
    ], {
      env: Object.assign(
        {},
        process.env,
        askpassHandler.env,
        {SUDO_ASKPASS: askpassHandler.path}
      ),
      stdio: [
        'ignore',
        traceOutputFile.fd,
        'pipe'
      ]
    });

    traceProcess.stderr.on('data', (data) => {
      traceStderr += data.toString('utf8');
      this.statusBarIcon.start();
    })

    traceProcess.on('close', (code) => {
      askpassHandler.close();
      this.statusBarIcon.stop();

      if (code !== 0) {
        atom.notifications.addWarning('Capturing stacks failed', {detail: traceStderr})
        return
      }

      fs.closeSync(traceOutputFile.fd);
      console.log("Wrote raw stacks to", traceOutputFile.path);

      let aggregatedStacks = ''
      const aggregatorProcess = fork(require.resolve('./aggregate-stacks'), [
        containingFunctionName || ''
      ], {
        stdio: [
          fs.openSync(traceOutputFile.path, 'r'),
          'pipe',
          'ignore',
          'ipc'
        ]
      });

      aggregatorProcess.stdout.on('data', (chunk) => aggregatedStacks += chunk.toString('utf8'))

      aggregatorProcess.on('close', (code) => {
        if (code !== 0) {
          atom.notifications.addWarning('Aggregating stacks failed', {detail: traceStderr})
          return
        }

        atom.workspace.open(this.buildFlameGraphView({data: JSON.parse(aggregatedStacks)}))
      });
    });

    return traceProcess
  },

  async stopTracing(traceProcess) {
    const askpassHandler = await handleAskPass();

    const killProcess = spawn('sudo', [
      '-A',
      'kill',
      traceProcess.pid
    ], {
      env: Object.assign(
        {},
        process.env,
        askpassHandler.env,
        {SUDO_ASKPASS: askpassHandler.path}
      )
    });

    killProcess.on('close', () => askpassHandler.close())
  }
};
