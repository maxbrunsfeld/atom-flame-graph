module.exports =
class FlameGraphView {
  constructor ({content}) {
    this.element = document.createElement('div')
    this.element.className = 'flame-graph-view'
    this.element.innerHTML = content
  }

  serialize () {
    return {
      deserializer: 'FlameGraphView',
      content: this.element.innerHTML
    }
  }

  getElement () {
    return this.element
  }

  getTitle () {
    return 'Flame Graph'
  }
}
