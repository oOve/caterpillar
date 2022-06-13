import { vAdd, vSub, vMult, vAngle } from "./utils.mjs";

const angles = [20, 75, 105, 150,  210,255,295,330 ];
const radii =  [2.0, 1.5,1.5, 2.0, 2.0, 1.5,1.5, 2.0];
const radians = angles.map(degToRad);


function degToRad(deg) {
    return deg * (Math.PI / 180.0);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function updateLoop( list, stime ){
    for (let l of list){
        await sleep(stime);
        await canvas.scene.updateEmbeddedDocuments('Token', l, {spiderTriggered:true});
        let all = [];
        for(let u of l){
            let t = canvas.tokens.get(u._id);
            let an = t.movementAnimationName;
            let ani = CanvasAnimation.getAnimation(an)?.promise;
            all.push(ani);
        }
        await Promise.all(all);
        
    }
}

function getLegs(pos, rot){
    let sz = canvas.grid.size;
    let szh=sz/2;
    let legs=[];
    for (let i=0;i<radians.length; ++i){
        legs.push({x:Math.sin(radians[i]-degToRad(rot))*sz*radii[i] + pos.x - szh,
                   y:Math.cos(radians[i]-degToRad(rot))*sz*radii[i] + pos.y - szh});
    }
    return legs;
}

export function createSpider(token){
    let pos = token.object.center;// {x:token.data.x,y:token.data.y};
    let sz = canvas.grid.size;
    let szh = sz/2.0;
    
    let radians = angles.map(degToRad);

    let legs = getLegs(token.object.center, 0);
    legs = legs.map(t=>{t.img='characters/spider_shoe.png';
                        t.actorId = token.data.actorId; 
                        return t;});

    canvas.scene.createEmbeddedDocuments('Token', legs).then( (tokens)=>{
        token.setFlag("caterpillar", "spiderLegs", tokens.map(t=>t.id));        
        for (let leg of tokens){
            new Sequence()
            .effect()
                .file("characters/spider_leg.png")
                .attachTo(token)
                .stretchTo(leg, { attachTo: true })
                .template({ gridSize: canvas.grid.size })
                .tilingTexture()
                .scale(0.5)
                .belowTokens()
                .persist()
            .play()
        }   

    });
}

export function moveSpider(token, change){
    let sz = canvas.grid.size;
    let szh = sz/2;

    let oldP = {x:token.data.x, y:token.data.y};
    let newP = duplicate(oldP);
    if (change.x != undefined){newP.x=change.x;}
    if (change.y != undefined){newP.y=change.y;}
    let diff = vSub(newP,oldP);
    let newC = vAdd(newP, {x: token.data.height*szh, 
                           y: token.data.height*szh});

    let len = Math.sqrt(diff.x**2+diff.y**2);
    let leg_ids = token.getFlag('caterpillar', 'spiderLegs');
    let legs = leg_ids.map(i=>canvas.tokens.get(i));
    let legP = legs.map(t=>t.position);
    let newPositions = legP.map(p=>vAdd(p,diff));

    let odd = token.getFlag('caterpillar', 'odd');
    if (odd===undefined)odd=false;
    token.setFlag('caterpillar', 'odd',!odd);
    //console.warn(newPositions);
    let animation = [[],[],[],[]];
    for (let i=0; i<legP.length; ++i){
        animation[(i+odd)%2].push( {_id:leg_ids[i], 
                              x:newPositions[i].x, 
                              y:newPositions[i].y});
    }
    animation.splice(1,0, [{_id:token.id, x:newP.x, y:newP.y}]);
    let rot = token.data.rotation;
    let radians = angles.map((a)=>degToRad(a-rot));
    //let finalPositions = radians.map(r=>{return {x:Math.sin(r)*radius*sz + newC.x - szh, 
    //                                             y:Math.cos(r)*radius*sz + newC.y - szh}});
    let finalPositions = getLegs(newC, rot);
    for (let i=0; i<finalPositions.length;++i){
        animation[2+(i+odd)%2].push({
            _id:leg_ids[i],
            x:finalPositions[i].x,
            y:finalPositions[i].y});
    }
    updateLoop(animation, 20);
    return false;
}

export function rotateSpider(token, change){
    let sz = canvas.grid.size;
    let szh = sz/2;
    let newAngle = change.rotation;
    let rot = token.data.rotation;

    let diffrot = (newAngle-rot+540)%360 - 180;
    let steps = Math.ceil(Math.abs(diffrot/20));
    let animation = [];
    let leg_ids = token.getFlag('caterpillar', 'spiderLegs');
    let legs = leg_ids.map(i=>canvas.tokens.get(i));
    let legP = legs.map(t=>t.center);

    let sinT = Math.sin(degToRad(2*diffrot/steps));
    let cosT = Math.cos(degToRad(2*diffrot/steps));
    
    for (let step=0; step<steps; ++step){
      let a = [];
      a.push({_id: token.id, rotation: rot+diffrot*(step+1)/steps});      
      let odd = step%2;
      for (let l = odd; l < legs.length; l+=2){
        let offset = vSub( legP[l], token.object.center);
        let f = vMult(offset, cosT);
        f.x -= sinT * offset.y;
        f.y += sinT * offset.x;
        let final = vAdd(f, token.object.center);
        legP[l] = final;
        a.push({_id:leg_ids[l], x:final.x-szh, y: final.y-szh});
      }
      animation.push(a);
    }
    updateLoop(animation, 20);
    return false;
}