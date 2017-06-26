#!/usr/bin/env node

const containingFunctionName = process.argv[2]
const StackAggregator = require('./stack-aggregator');

let dtraceContent = ''
const countedStacks = {}
const aggregator = new StackAggregator(containingFunctionName);

process.stdin.on('data', (chunk) => {
  let dtraceContentIndex = 0
  dtraceContent += chunk.toString('utf8')
  while (true) {
    const stackEndIndex = dtraceContent.indexOf('\n\n', dtraceContentIndex)
    if (stackEndIndex === -1) break
    aggregator.addStack(dtraceContent.slice(dtraceContentIndex, stackEndIndex));
    dtraceContentIndex = stackEndIndex + 1
  }
  dtraceContent = dtraceContent.slice(dtraceContentIndex)
})

process.stdin.on('end', () => {
  const blocks = aggregator.getBlocksToRender();
  process.stdout.write(JSON.stringify(blocks))
  process.stdout.write('\n')
});
