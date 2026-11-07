export type Config = { size: number; items: number; keys: boolean; delivery: boolean; ordered: boolean };
export type Gate = { a: number; b: number; kind: 'key' | 'delivery' };
export type Level = { rulesVersion: string; generatorVersion: string; seed: string; config: Config; n: number; start: number; goal: number; edges: number[][]; items: number[]; key: number; discovery: number; interaction: number; gates: Gate[]; optimal: number; solution: number[]; explored: number };
export type State = { cell: number; mask: number; key: boolean; discovery: number };
export const initial = (): State => ({cell:0,mask:0,key:false,discovery:0});
export function won(l: Level,s: State) { return s.cell===l.goal && s.mask===(1<<l.items.length)-1 && (!l.config.delivery || s.discovery===2); }
export function gateOpen(g: Gate,s: State) { return g.kind==='key' ? s.key : s.discovery===2; }
export function transition(l: Level,s: State,to: number): State | null {
  if(!l.edges[s.cell]?.includes(to)) return null;
  const gate=l.gates.find(g=>(g.a===s.cell&&g.b===to)||(g.b===s.cell&&g.a===to));
  if(gate&&!gateOpen(gate,s)) return null;
  const next={...s,cell:to};
  const i=l.items.indexOf(to);
  if(i>=0&&(!l.config.ordered||(s.mask&((1<<i)-1))===(1<<i)-1)) next.mask|=1<<i;
  if(to===l.key) next.key=true;
  if(to===l.discovery&&next.discovery===0) next.discovery=1;
  if(to===l.interaction&&next.discovery===1) next.discovery=2;
  return next;
}
export function replay(l: Level,path: number[]) { let s=initial(); for(const to of path){ const next=transition(l,s,to); if(!next) throw new Error('Invalid move');s=next; } return s; }
const stateKey=(s: State)=>`${s.cell}/${s.mask}/${+s.key}/${s.discovery}`;
export function solve(l: Level,budget=150000): {path:number[];explored:number}|null {
  const queue=[initial()]; const parents=[-1]; const seen=new Set([stateKey(queue[0])]);
  for(let head=0;head<queue.length&&head<budget;head++) {
    const s=queue[head];
    if(won(l,s)){const path:number[]=[];let p=head;while(parents[p]>=0){path.push(queue[p].cell);p=parents[p];}return {path:path.reverse(),explored:head+1};}
    for(const to of l.edges[s.cell]){const next=transition(l,s,to);if(!next)continue;const k=stateKey(next);if(seen.has(k))continue;seen.add(k);queue.push(next);parents.push(head);}
  }
  return null;
}
export function generate(seed:string,config:Config): Level {
  if(!Number.isInteger(config.size)||config.size<5||config.size>8||!Number.isInteger(config.items)||config.items<1||config.items>4)throw new Error('Unsupported puzzle settings');
  let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);
  const rand=()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const n=config.size,goal=n*n-1,vestibule=goal-n,parent=goal-2*n;
  const edges:number[][]=Array.from({length:n*n},()=>[]);
  const neighbors=(c:number)=>[c%n>0?c-1:-1,c%n<n-1?c+1:-1,c>=n?c-n:-1,c<n*(n-1)?c+n:-1].filter(x=>x>=0);
  const allowed=(c:number)=>c!==goal&&c!==vestibule;
  const connect=(a:number,b:number)=>{if(!edges[a].includes(b)){edges[a].push(b);edges[b].push(a);}};
  const visited=new Set([0]),stack=[0];
  while(stack.length){const c=stack[stack.length-1],options=neighbors(c).filter(x=>allowed(x)&&!visited.has(x));if(!options.length){stack.pop();continue;}const next=options[Math.floor(rand()*options.length)];connect(c,next);visited.add(next);stack.push(next);}
  const extra: [number,number][]=[];
  for(let a=0;a<n*n;a++)if(allowed(a))for(const b of neighbors(a))if(b>a&&allowed(b)&&!edges[a].includes(b))extra.push([a,b]);
  for(let i=extra.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[extra[i],extra[j]]=[extra[j],extra[i]];}
  extra.slice(0,Math.max(2,Math.floor(n*n*.12))).forEach(([a,b])=>connect(a,b));
  connect(parent,vestibule);connect(vestibule,goal);
  const positions=Array.from({length:n*n},(_,i)=>i).filter(i=>allowed(i)&&i!==0&&i!==parent);
  for(let i=positions.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
  const items=positions.splice(0,config.items);const key=config.keys?positions.pop()!:-1;
  const discovery=config.delivery?positions.pop()!:-1,interaction=config.delivery?positions.pop()!:-1;
  const gates:Gate[]=[];if(config.keys)gates.push({a:parent,b:vestibule,kind:'key'});if(config.delivery)gates.push({a:vestibule,b:goal,kind:'delivery'});
  const level:Level={rulesVersion:'pawzzle-web-v3.1',generatorVersion:'dfs-loops-1',seed,config:{...config},n,start:0,goal,edges,items,key,discovery,interaction,gates,optimal:0,solution:[],explored:0};
  const solution=solve(level);if(!solution)throw new Error('Puzzle could not be verified within the search budget. Try fewer items.');
  level.solution=solution.path;level.optimal=solution.path.length;level.explored=solution.explored;return level;
}
export const countBits=(n:number)=>{let count=0;while(n){count+=n&1;n>>>=1;}return count;};
