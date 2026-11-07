import assert from 'node:assert/strict';
import { generate, initial, transition, replay, won, solve } from '../src/puzzle.ts';
let checked=0;
for(const size of [5,6,7,8])for(const keys of [false,true])for(const delivery of [false,true])for(const ordered of [false,true])for(let seed=0;seed<4;seed++){
 const config={size,items:1+seed,keys,delivery,ordered};
 const level=generate('test-'+seed,config);
 assert.deepEqual(generate('test-'+seed,config),level,'Generation must be reproducible');
 const end=replay(level,level.solution);assert(won(level,end));
 assert.equal(level.solution.length,level.optimal);
 for(const [a,edges] of level.edges.entries())for(const b of edges){assert(level.edges[b].includes(a));assert(Math.abs(a%size-b%size)+Math.abs(Math.floor(a/size)-Math.floor(b/size))===1);}
 let s=initial();for(const to of level.solution){const prev={...s};const next=transition(level,s,to);assert(next);assert.deepEqual(s,prev,'Transitions must not mutate their input');s=next;}
 assert.equal(transition(level,initial(),-1),null);
 assert.equal(won(level,{...initial(),cell:level.goal}),false);
 for(const g of level.gates){assert.equal(transition(level,{...initial(),cell:g.a},g.b),null);const unlocked={...initial(),cell:g.a,key:true,discovery:2};assert(transition(level,unlocked,g.b));}
 checked++;
}
// A short handcrafted fixture proves the optimum must include a detour and revisit.
const fixture={n:3,start:0,goal:2,edges:[[1,3],[0,2],[1],[0]],items:[3],key:-1,discovery:-1,interaction:-1,gates:[],config:{ordered:false,delivery:false}};
assert.equal(solve(fixture).path.length,4);
assert.deepEqual(solve(fixture).path,[3,0,1,2]);
assert(!won(fixture,replay(fixture,[1,2])));
// Out-of-order items need a later visit, not just a previous crossing.
const ordered={...fixture,items:[3,1],config:{ordered:true,delivery:false}};
assert.equal(replay(ordered,[1]).mask,0);
assert.equal(replay(ordered,[1,0,3,0,1]).mask,3);
// Delivery consumes carried state but retains completion; undo restores both gate and parcel state.
const delivery={...fixture,items:[],key:-1,discovery:3,interaction:1,gates:[{a:1,b:2,kind:'delivery'}],config:{ordered:false,delivery:true}};
assert.equal(replay(delivery,[3,0]).discovery,1);
assert.equal(replay(delivery,[3,0,1]).discovery,2);
assert(won(delivery,replay(delivery,[3,0,1,2])));
assert.equal(replay(delivery,[]).discovery,0);
assert.equal(solve(delivery).path.length,4);
assert.equal(solve(fixture,1),null,'Budget cutoff must not claim an optimum');
console.log(`PASS: ${checked} generated puzzles verified, deterministic seeds, gate constraints, full-state optimum, ordering, delivery, and search budgets.`);

