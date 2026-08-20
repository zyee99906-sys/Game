(()=>{
const cfg=window.GAME_CONFIG||{}; const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const img=n=>{const i=new Image();i.src=n;return i};
const assets={map:img(cfg.map),hero:img('assets/sprites/knight.png'),enemy:img(cfg.enemy),boss:img(cfg.boss),summon:img(cfg.summon),wings:img('assets/sprites/dark_wings.png'),skull:img('assets/ui/skull.png'),sword:img('assets/ui/sword.png'),shield:img('assets/ui/shield.png')};
for(const [name,im] of Object.entries(assets)){
  im.addEventListener('error',()=>console.warn('UNDEATH KNIGHT asset failed to load:',name,im.src));
}
let W,H,dpr=1;function resize(){dpr=devicePixelRatio||1;W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
const world={w:2200,h:1400}, player={x:1100,y:700,hp:400,max:400,atk:38,angle:0,attackCd:0,hold:0,coins:0,kills:0,invuln:0,lifesteal:0,wing:0,level:1};
let cam={x:0,y:0},enemies=[],summons=[],particles=[],boss=null,bossFight=false,last=performance.now(),spawnTimer=0,skills=[0,0,0,0],joy={x:0,y:0},keys={};
const $=id=>document.getElementById(id); function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1300)}
function makeWeather(){const box=$('weather');const count=cfg.snow?100:45;for(let i=0;i<count;i++){const p=document.createElement('i');p.className='particle';p.style.left=Math.random()*100+'%';p.style.animationDuration=(cfg.snow?3+Math.random()*5:7+Math.random()*10)+'s';p.style.animationDelay=(-Math.random()*10)+'s';box.appendChild(p)}}makeWeather();
function drawImage(im,x,y,w,h,rot=0){if(!im.complete)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function worldToScreen(x,y){return [x-cam.x,y-cam.y]}
function spawn(){if(bossFight)return;const side=Math.floor(Math.random()*4),m=80;let x,y;if(side===0){x=m;y=Math.random()*world.h}else if(side===1){x=world.w-m;y=Math.random()*world.h}else if(side===2){x=Math.random()*world.w;y=m}else{x=Math.random()*world.w;y=world.h-m}enemies.push({x,y,hp:90,max:90,atk:12,dead:false})}
function startBoss(){bossFight=true;$('gameRoot').classList.add('boss-fight');if(cfg.snow)$('weather').classList.add('snowstorm');boss={x:1100,y:360,hp:cfg.snow?1800:1500,max:cfg.snow?1800:1500,atk:30};toast(cfg.snow?'THE NINE-TAILED FOX DESCENDS':'THE BIG ZOMBIE RISES');for(let i=0;i<cfg.snow?0:0;i++){} }
function damage(e,n){if(e.dead)return;e.hp-=n;player.hp=Math.min(player.max,player.hp+n*player.lifesteal*.01);if(e.hp<=0){e.dead=true;player.kills++;player.coins+=5;player.xp=(player.xp||0)+10; if(player.kills%100===0)startBoss();}}
function attack(){if(player.attackCd>0)return;player.attackCd=.28;let hit=false;for(const e of enemies){if(e.dead)continue;const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);const a=Math.atan2(dy,dx);if(d<105&&Math.abs(Math.atan2(Math.sin(a-player.angle),Math.cos(a-player.angle)))<1.25){damage(e,player.atk);hit=true}}if(boss){const d=Math.hypot(boss.x-player.x,boss.y-player.y);if(d<125){boss.hp-=player.atk;player.hp=Math.min(player.max,player.hp+player.atk*player.lifesteal*.01);hit=true;if(boss.hp<=0){boss=null;bossFight=false;$('gameRoot').classList.remove('boss-fight');if(cfg.snow)$('weather').classList.remove('snowstorm');if(cfg.snow)$('weather').classList.remove('snowstorm');toast('BOSS DEFEATED');}}}if(hit)burst(player.x+Math.cos(player.angle)*60,player.y+Math.sin(player.angle)*60)}
function dash(){if(player.attackCd>0)return;player.attackCd=.55;const ax=player.x,ay=player.y,bx=Math.max(50,Math.min(world.w-50,ax+Math.cos(player.angle)*250)),by=Math.max(50,Math.min(world.h-50,ay+Math.sin(player.angle)*250));player.x=bx;player.y=by;for(const e of enemies)if(!e.dead&&seg(e.x,e.y,ax,ay,bx,by)<75)damage(e,player.atk*1.8);if(boss&&seg(boss.x,boss.y,ax,ay,bx,by)<105){boss.hp-=player.atk*1.3;if(boss.hp<=0){boss=null;bossFight=false;$('gameRoot').classList.remove('boss-fight');if(cfg.snow)$('weather').classList.remove('snowstorm')}}burst(player.x,player.y);toast('DASH SLASH')}
function seg(px,py,ax,ay,bx,by){const abx=bx-ax,aby=by-ay,t=Math.max(0,Math.min(1,((px-ax)*abx+(py-ay)*aby)/(abx*abx+aby*aby||1)));return Math.hypot(px-(ax+t*abx),py-(ay+t*aby))}
function summon(type=cfg.summon){for(let i=0;i<(type==='ult'?10:2);i++)summons.push({x:player.x+(Math.random()-.5)*100,y:player.y+(Math.random()-.5)*100,hp:40,life:5,atk:30})}
function skill(n){if(skills[n]>0)return;skills[n]=n===0?10:n===1?7:n===2?12:16;if(n===0){summon();toast(cfg.snow?'2 SNOW GOLEMS':'2 ZOMBIES')}else if(n===1){for(const e of enemies)if(!e.dead&&Math.hypot(e.x-player.x,e.y-player.y)<240)damage(e,90);toast('SOUL CLEAVE')}else if(n===2){player.invuln=3;toast('DARK BARRIER')}else{player.invuln=10;player.lifesteal=200;player.wing=10;summon('ult');toast('UNDEATH AWAKENED')}}
function burst(x,y){for(let i=0;i<10;i++)particles.push({x,y,vx:(Math.random()-.5)*130,vy:(Math.random()-.5)*130,life:.4})}
function update(dt){for(let i=0;i<4;i++)skills[i]=Math.max(0,skills[i]-dt);player.attackCd=Math.max(0,player.attackCd-dt);player.invuln=Math.max(0,player.invuln-dt);if(player.wing>0){player.wing=Math.max(0,player.wing-dt);if(player.wing===0)player.lifesteal=0}
let vx=joy.x,vy=joy.y;if(keys.w||keys.ArrowUp)vy=-1;if(keys.s||keys.ArrowDown)vy=1;if(keys.a||keys.ArrowLeft)vx=-1;if(keys.d||keys.ArrowRight)vx=1;const len=Math.hypot(vx,vy)||1;player.x=Math.max(40,Math.min(world.w-40,player.x+vx/len*230*dt));player.y=Math.max(40,Math.min(world.h-40,player.y+vy/len*230*dt));
spawnTimer-=dt;if(spawnTimer<=0){spawnTimer=.55;spawn()}for(const e of enemies){if(e.dead)continue;const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;if(d>70){e.x+=dx/d*55*dt;e.y+=dy/d*55*dt}else if(player.invuln<=0)player.hp-=e.atk*dt}
for(const s of summons){s.life-=dt;let target=enemies.find(e=>!e.dead);if(target){const dx=target.x-s.x,dy=target.y-s.y,d=Math.hypot(dx,dy)||1;if(d>40){s.x+=dx/d*100*dt;s.y+=dy/d*100*dt}else{target.hp-=s.atk*dt;if(target.hp<=0)damage(target,0)}}}summons=summons.filter(s=>s.life>0);
if(boss){const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;if(d>100){boss.x+=dx/d*42*dt;boss.y+=dy/d*42*dt}else if(player.invuln<=0)player.hp-=boss.atk*dt}
particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);if(player.hp<=0){player.hp=player.max;player.coins=Math.max(0,player.coins-25);player.x=1100;player.y=700;toast('YOU RETURN FROM DEATH')}
cam.x=Math.max(0,Math.min(world.w-W,player.x-W/2));cam.y=Math.max(0,Math.min(world.h-H,player.y-H/2));
$('hp').style.width=(player.hp/player.max*100)+'%';$('shopCoins').textContent=player.coins;$('hpText').textContent=Math.ceil(player.hp)+'/'+player.max;$('kills').textContent=player.kills;$('coins').textContent=player.coins;$('bossbar').classList.toggle('active',!!boss);if(boss){$('bossName').textContent=cfg.bossName;$('bossHp').style.width=(boss.hp/boss.max*100)+'%';$('bossHpText').textContent=Math.ceil(boss.hp)+'/'+boss.max}for(let i=0;i<4;i++)$('cd'+i).style.display=skills[i]>0?'flex':'none', $('cd'+i).textContent=skills[i]>0?Math.ceil(skills[i]):''}
function render(){
  ctx.clearRect(0,0,W,H);
  const iw=assets.map.naturalWidth||1254, ih=assets.map.naturalHeight||1254;
  ctx.save();
  ctx.translate(-cam.x,-cam.y);
  ctx.imageSmoothingEnabled=false;
  if(assets.map.complete && assets.map.naturalWidth){
    for(let x=0;x<world.w;x+=iw) for(let y=0;y<world.h;y+=ih) ctx.drawImage(assets.map,x,y,iw,ih);
  }else{
    ctx.fillStyle=cfg.snow?'#aebbc7':'#161012';
    ctx.fillRect(0,0,world.w,world.h);
  }
  for(const e of enemies)if(!e.dead){
    drawImage(assets.enemy,e.x,e.y,70,70);
    ctx.fillStyle='#170a0c';ctx.fillRect(e.x-25,e.y-42,50,4);
    ctx.fillStyle='#b6293d';ctx.fillRect(e.x-25,e.y-42,50*e.hp/e.max,4)
  }
  for(const s of summons)drawImage(assets.summon,s.x,s.y,58,58);
  if(boss)drawImage(assets.boss,boss.x,boss.y,150,150);
  if(player.wing>0)drawImage(assets.wings,player.x,player.y+8,120,120);
  drawImage(assets.hero,player.x,player.y,72,100,0);
  for(const p of particles){
    ctx.fillStyle='#fff';ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillRect(p.x,p.y,3,3)
  }
  ctx.globalAlpha=1;ctx.restore()
}
function loop(t){const dt=Math.min(.035,(t-last)/1000);last=t;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
// Controls
const joyEl=$('joy'),knob=$('knob');let joyPointer=null;joyEl.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joyEl.setPointerCapture(e.pointerId);moveJoy(e)});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoy(e)});joyEl.addEventListener('pointerup',()=>{joy.x=joy.y=0;knob.style.transform='translate(-50%,-50%)';joyPointer=null});function moveJoy(e){const r=joyEl.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=Math.min(42,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);joy.x=Math.cos(a)*m/42;joy.y=Math.sin(a)*m/42;knob.style.transform=`translate(calc(-50% + ${Math.cos(a)*m}px),calc(-50% + ${Math.sin(a)*m}px))`;if(Math.hypot(joy.x,joy.y)>.2)player.angle=Math.atan2(joy.y,joy.x)}
const attackEl=$('attack');let holdStart=0;attackEl.addEventListener('pointerdown',e=>{holdStart=performance.now();attackEl.setPointerCapture(e.pointerId)});attackEl.addEventListener('pointerup',()=>{const d=performance.now()-holdStart;if(d>420)dash();else attack()});for(let i=0;i<4;i++)$('s'+(i+1))?.addEventListener('click',()=>skill(i));$('ult').addEventListener('click',()=>skill(3));$('shopBtn').onclick=()=>{$('shop').classList.add('open')};$('shopClose').onclick=()=>{$('shop').classList.remove('open')};document.querySelectorAll('.buy').forEach(b=>b.addEventListener('click',()=>{const c=+b.dataset.cost;if(player.coins<c){toast('NOT ENOUGH COINS');return}player.coins-=c;if(b.dataset.buy==='atk')player.atk+=10;if(b.dataset.buy==='hp'){player.max+=80;player.hp+=80}if(b.dataset.buy==='guard')player.max+=30;toast('ITEM PURCHASED')}));
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' '||e.key==='j')attack();if(e.key==='q')skill(0);if(e.key==='e')skill(1);if(e.key==='r')skill(2);if(e.key==='f')skill(3)});window.addEventListener('keyup',e=>keys[e.key]=false);
})();
