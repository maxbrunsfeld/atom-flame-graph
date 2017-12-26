const {Disposable, CompositeDisposable} = require('atom')
const handleAskPass = require('./handle-askpass')
const StatusBarIcon = require('./status-bar-icon')
const {generateFlameGraphForProcess} = require('@maxbrunsfeld/flame-graph')

module.exports = {
  activate (state) {
    this.statusBarIcon = new StatusBarIcon(() => this.toggle())
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'flame-graph:toggle': () => this.toggle()
    }))
  },

  deactivate () {
    this.subscriptions.dispose()
  },

  buildFlameGraphView (params) {
    const FlameGraphView = require('./flame-graph-view')
    return new FlameGraphView(params)
  },

  consumeStatusBar (statusBar) {
    const statusBarTile = statusBar.addRightTile({item: this.statusBarIcon, priority: -1000})
    this.subscriptions.add(new Disposable(() => statusBarTile.destroy()))
  },

  async toggle () {
    if (this.stopProfiling) {
      const content = await this.stopProfiling()
      this.askpassHandler.close()
      atom.workspace.open(this.buildFlameGraphView({content}))
      this.statusBarIcon.stop()
      this.stopProfiling = null
      this.askpassHandler = null
    } else {
      this.askpassHandler = await handleAskPass()
      this.stopProfiling = generateFlameGraphForProcess(process.pid, {
        askpass: true,
        functionNameFilter: atom.config.get('flame-graph.functionFilter'),
        env: Object.assign(
          this.askpassHandler.env,
          {SUDO_ASKPASS: this.askpassHandler.path}
        )
      })
      this.statusBarIcon.start()
    }
  }
}
