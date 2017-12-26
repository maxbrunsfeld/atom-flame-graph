module.exports =
class StatusBarIcon {
  constructor (callback) {
    this.element = document.createElement('div')
    this.element.className = 'inline-block flame-graph-status-bar-item'
    this.element.addEventListener('click', callback)

    const icon = document.createElement('div')
    icon.className = 'icon icon-dashboard'
    this.element.appendChild(icon)

    this.stop()
  }

  stop () {
    this.element.classList.remove('flame-graph-is-tracing')
    this.element.title = 'Start CPU Profiling'
  }

  start () {
    this.element.classList.add('flame-graph-is-tracing')
    this.element.title = 'Stop CPU Profiling'
  }

  getElement () {
    return this.element
  }
}
