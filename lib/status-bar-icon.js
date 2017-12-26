module.exports =
class StatusBarIcon {
  constructor (callback) {
    this.element = document.createElement('div')
    this.element.className = 'inline-block icon flame-graph-tracing-icon'
    this.element.addEventListener('click', callback)
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
