import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(new URL('../web-prototype/public/pawzzle-garden.html', import.meta.url), 'utf8');
const code = html.match(/<script id="engine-script">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(code, context);
const fixtures = [];
for (const size of [5, 6, 8]) {
  for (let i = 0; i < 100; i++) {
    const seed = i === 0 ? 'PAW-1024' : `GARDEN-${i}`;
    const level = context.Maze.generate(size, seed);
    const route = context.Maze.solve(level);
    if (!route) throw new Error(`Unsolvable ${size}/${seed}`);
    fixtures.push({level, route});
  }
}
fs.writeFileSync(new URL('../games/godot/garden/parity.json', import.meta.url), JSON.stringify(fixtures));
console.log(`Wrote ${fixtures.length} reference puzzles.`);
