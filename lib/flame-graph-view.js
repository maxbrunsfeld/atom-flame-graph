const frameHeight = 24

module.exports =
class FlameGraphView {
  constructor (blocks) {
    this.blocks = blocks;
    this.element = document.createElement('div');
    this.scroller = document.createElement('div');
    this.element.appendChild(this.scroller)

    this.element.className = 'flame-graph-view';
    this.scroller.className = 'flame-graph-scroll-view';

    let maxDepth = 0

    for (let block of blocks) {
      if (block.depth > maxDepth) maxDepth = block.depth;

      const frameDiv = document.createElement('div');
      frameDiv.className = 'flame-graph-frame';
      frameDiv.title = block.name;
      frameDiv.textContent = block.name.split('`')[1];
      frameDiv.style.width = block.width + '%';
      frameDiv.style.left = block.left + '%';
      frameDiv.style.bottom = (block.depth * frameHeight) + 'px';
      frameDiv.style.height = frameHeight + 'px';
      this.scroller.appendChild(frameDiv);
    }

    this.scroller.style.height = maxDepth * frameHeight + 'px';
  }

  serialize() {
    return {
      deserializer: 'FlameGraphView',
      data: this.blocks
    };
  }

  getElement() {
    return this.element
  }

  getTitle() {
    return 'Flame Graph'
  }
};
