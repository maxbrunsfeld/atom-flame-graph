const {Disposable, CompositeDisposable} = require('atom')
const StatusBarIcon = require('./status-bar-icon')

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
    const handleAskPass = require('./handle-askpass')
    const {generateFlameGraphForProcess} = require('@maxbrunsfeld/flame-graph')
    if (this.stopProfiling) {
      this.stopProfiling()
      this.statusBarIcon.stop()
      this.stopProfiling = null
    } else {
      this.askpassHandler = await handleAskPass()
      const functionNames = atom.config.get('flame-graph.functionFilter')
      const {stop, html} = generateFlameGraphForProcess(process.pid, {
        askpass: true,
        functionNames: functionNames ? functionNames.split(/\s+/).map(name => name.trim()) : null,
        env: Object.assign(
          this.askpassHandler.env,
          {SUDO_ASKPASS: this.askpassHandler.path}
        )
      })
      this.stopProfiling = stop
      this.statusBarIcon.start()

      try {
        atom.workspace.open(this.buildFlameGraphView({content: await html}))
      } catch (error) {
        atom.notifications.addWarning(error.message)
        this.statusBarIcon.stop()
        this.stopProfiling = null
      } finally {
        this.askpassHandler.close()
        this.askpassHandler = null
      }
    }
  }
}
