/*
▓█████▄  ██▀███           ▒█████  
▒██▀ ██▌▓██ ▒ ██▒        ▒██▒  ██▒
░██   █▌▓██ ░▄█ ▒        ▒██░  ██▒
░▓█▄   ▌▒██▀▀█▄          ▒██   ██░
░▒████▓ ░██▓ ▒██▒ ██▓    ░ ████▓▒░
 ▒▒▓  ▒ ░ ▒▓ ░▒▓░ ▒▓▒    ░ ▒░▒░▒░ 
 ░ ▒  ▒   ░▒ ░ ▒░ ░▒       ░ ▒ ▒░ 
 ░ ░  ░   ░░   ░  ░      ░ ░ ░ ▒  
   ░       ░       ░         ░ ░  
 ░                 ░              
 */

 const MOD_NAME = "caterpillar";





function rotate_angle_from_vec(old_pos, new_pos){
    let diff = {x:new_pos.x-old_pos.x,
                y:new_pos.y-old_pos.y};
    return 90 + Math.toDegrees( Math.atan2( diff.y, diff.x ) );
}


 

function vNeg(p){
  return {x:-p.x, y:-p.y};
}
function vAdd(p1, p2){
  return {x:p1.x+p2.x, y:p1.y+p2.y };
}
function vSub(p1, p2){
  return {x:p1.x-p2.x, y:p1.y-p2.y };
}
function vMult(p,v){
  return {x:p.x*v, y: p.y*v};  
}
function vDot(p1, p2){
  return p1.x*p2.x + p1.y*p2.y;
}
function vLen(p){
  return Math.sqrt(p.x**2 + p.y**2);
}
function vNorm(p){
  return vMult(p, 1.0/vLen(p));
}
function vAngle(p){
  return 90+Math.toDegrees(Math.atan2(p.y, p.x));
}

class SimpleSpline{
  constructor(points, smoothness=0.0){
    this.p = points;
    this.smoothness = smoothness;
    this.lengths = [];
    for (let i = 1; i < this.len; ++i){
      this.lengths.push( vLen(vSub(this.p[i-1], this.p[i])) );
    }
  }
  parametricLength(){
    return this.lengths.reduce((p, a)=>p+a,0);
  }
  get len (){
    return this.p.length;
  }
  get plen(){
    return this.parametricLength();
  }

  // Position at parametric position t
  parametricPosition( t ){
    if (this.len<2){return this.p[0];}    
    let len = 0;
    for (let i = 1; i < this.len; ++i){
      let nlen = this.lengths[i-1];
      if (len+nlen >= t){
        let nfrac = (t-len)/(nlen);//normalized fraction
        // returning (1-nt)*prev + nt*cur
        return vAdd(vMult(this.p[i-1], 1-nfrac), vMult(this.p[i], nfrac) );
      }
      len += nlen;
    }
    // we have gone past our parametric length, clamp at last point
    return this.p[this.len-1];
  }

  #iNorm(i){
    if(i<1){
      return vNorm(vSub(this.p[0], this.p[1]));
    }
    if(i > (this.len-2)){
      // last (or past last) point, return (last - next to last)
      return vNorm(vSub(this.p[this.len-2], this.p[this.len-1]));
    }
    return vNorm( vSub(this.p[i-1], this.p[i+1]));
  }

  // Derivative at parametric position t
  derivative(t){
    if (t<=0){ 
      return this.#iNorm(0);
    }
    let len = 0;
    for (let i = 1; i < this.len; ++i){
      let nlen = this.lengths[i-1];
      if ((len+nlen) >= t){
        let nfrac = (t-len)/(nlen);//normalized fraction
        let p = this.#iNorm(i-1);
        let n = this.#iNorm(i);
        return vNorm( vAdd(vMult(p,1-nfrac), vMult(n,nfrac)) );
      }
      len += nlen;
    }
    return this.#iNorm(this.len);
  }
}

function prepend(value, array) {
  var newArray = array.slice();
  newArray.unshift(value);
  return newArray;
}

function isHead(token){
  return token.getFlag(MOD_NAME, 'enabled');
}
function isTail(token){
  try{
    let head = canvas.tokens.get( isHead(token)?token.id: token.getFlag(MOD_NAME, 'head_id'));
    let length = head.document.getFlag(MOD_NAME, 'length');
    let index = token.getFlag(MOD_NAME, 'tail_index');
    return index == length;
  }
  catch(err){
    console.warn(err);
    return false;
  }
}

function* catepillarIterator(length, step, reverse=false){
  let p = (reverse)?length:0;
  while (true){
    yield p;
    p += (reverse)?-step : step;
  }
}
function* reversableIterator(len, reverse=false){
  let start = (reverse)?len-1: 0;
  let step = (reverse)?-1:1;
  let end = (reverse)?-1:len;
  for (let i = start; i!=end; i+=step){
    yield i;
  }
}
/*
ri = reversableIterator(10, true);
for (const i of ri){console.warn(i)}
console.warn('---------');
ii = reversableIterator(10);
for (const i of ii){console.warn(i)}
*/

Hooks.on('preUpdateToken', (token, change, options, user_id)=>{ 
  if(!change.x && !change.y){
    // No change that modifies the caterpillar
    return;
  }
  if (options.worm_triggered){
    return true;
  }  

  let ihead = isHead(token);
  let itail = isTail(token);

  if (ihead || itail){    
    const HEAD_ID = (ihead)?token.id:token.getFlag(MOD_NAME, 'head_id');
    let head_doc = (ihead)?token: canvas.tokens.get(HEAD_ID).document;

    console.warn("HEAD ID", HEAD_ID);

    // This is either the head or the tail        
    let tail_ids = head_doc.getFlag(MOD_NAME, 'tail_items');    
    
    let caterpillar = tail_ids.map(id=>canvas.tokens.get(id));
    let positions = caterpillar.map((part)=>{return {x:part.data.x, y:part.data.y};});

    let prev_pos = {x:token.data.x, y:token.data.y};
    let new_pos = duplicate(prev_pos);
    if (change.x){new_pos.x = change.x;}
    if (change.y){new_pos.y = change.y;}

    if (ihead){
      positions = prepend(new_pos, positions);
    }else{
      positions.push(new_pos);
    }

    let stepSize = (caterpillar[0].hitArea.width)/1.5;
    let spline = new SimpleSpline(positions);
    let updates = [];

    // This is the head
    //updates.push({_id: token.id, rotation: vAngle(spline.derivative(0)) });
    let c_iter = catepillarIterator(spline.plen, stepSize, itail);
    let i_iter = reversableIterator(positions.length, itail);
    
    for (const i of i_iter){
      let t = c_iter.next().value;
      let npos = spline.parametricPosition(t);
      let angle = vAngle(spline.derivative(t));
      if (Number.isNaN(angle)){angle=0;}
      
      let id;
      if (i==0){     
        id=HEAD_ID;
      }else{
        id=tail_ids[i-1];
      }
      updates.push({ 
          _id : id, 
          x: npos.x,
          y: npos.y,
          rotation: angle
        });
    }    
    delete updates[0].x; 
    delete updates[0].y;
    canvas.scene.updateEmbeddedDocuments('Token', updates, {worm_triggered:true} );
  }

});




// Delete token
Hooks.on('deleteToken', (token, options, user_id)=>{
  if (!game.user.isGM)return true;

  if (token.getFlag(MOD_NAME, 'tail_items')){
    let tail = token.getFlag(MOD_NAME, 'tail_items');
    canvas.scene.deleteEmbeddedDocuments('Token', tail);
  }

});




// Create token
Hooks.on('createToken', (token, options, user_id)=>{
  if (!game.user.isGM)return true;
  if (token.getFlag(MOD_NAME, "enabled") && token.getFlag(MOD_NAME, 'length')){
    // We need to create a catepillar
    let len = token.getFlag(MOD_NAME, 'length');
    let tail = [];
    
    for (let i = 1; i <= len; ++i){
      let t = duplicate(token);
      t.y += (i) * canvas.grid.size;
      t.flags.caterpillar.tail = true;
      t.flags.caterpillar.tail_index = i;
      t.flags.caterpillar.enabled = false;
      t.flags.caterpillar.head_id = token.id
      t.img = token.getFlag(MOD_NAME, (i<len)?'body_token':'rear_token' );
      tail.push(t);
    }
    canvas.scene.createEmbeddedDocuments("Token", tail).then((tokens)=>{
      token.setFlag(MOD_NAME, 'tail_items', tokens.map( tok=>tok.id ) );
    });
  }
});



// Let's grab those token updates
/*
Hooks.on('updateToken', (token, change, options, user_id)=>{
  if (!game.user.isGM)return true;
  if (token.getFlag(MOD_NAME, "enabled")){
    // Go on and move its body.
  }  
});
*/





// Settings:
Hooks.once("init", () => {
  game.settings.register(MOD_NAME, "snap_to_grid", {
    name: "Snap to grid",
    hint: "Should the tokens automatically snap to grid, or preserve length",
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
});



function imageSelector( app, flag_name, title ){
  let data_path = 'flags.'+MOD_NAME+'.'+flag_name;
  
  let grp = document.createElement('div');
  grp.classList.add('form-group');
  let label = document.createElement('label');
  label.innerText = title;  
  let fields = document.createElement('div');
  fields.classList.add('form-fields');
  
  const button = document.createElement("button");
  button.classList.add("file-picker");
  button.type = "button";
  button.title = "Browse Files";
  button.tabindex = "-1";
  button.dataset.target = data_path;
  button['data-type'] = "imagevideo";
  button['data-target'] = data_path;
  //button.onclick = _activateFilePicker;
  //button.onclick = app._activateFilePicker;
  button.onclick = app._activateFilePicker.bind(app);
  
  let bi = document.createElement('i');
  bi.classList.add('fas');
  bi.classList.add('fa-file-import');
  bi.classList.add('fa-fw');
  

  const inpt = document.createElement("input");  
  inpt.name = data_path;
  inpt.classList.add("image");
  inpt.type = "text";
  inpt.title = title;
  inpt.placeholder = "path/image.png";
  // Insert the flags current value into the input box  
  if (app.token.getFlag(MOD_NAME, flag_name)){
    inpt.value=app.token.getFlag(MOD_NAME, flag_name);
  }
  
  button.append(bi);

  grp.append(label);
  grp.append(fields);
  
  fields.append(button);
  fields.append(inpt);
  return grp;
}


// Hook into the token config render
Hooks.on("renderTokenConfig", (app, html) => {
    
  // Create a new form group
  const formGroup = document.createElement("div");
  formGroup.classList.add("form-group");
  formGroup.classList.add("slim");
  // Create a label for this setting
  const label = document.createElement("label");
  label.textContent = "Caterpillar";
  formGroup.prepend(label);

  // Create a form fields container
  const formFields = document.createElement("div");
  formFields.classList.add("form-fields");
  formGroup.append(formFields);
  const label1 = document.createElement('label');
  label1.textContent = "Enable";
  formFields.append(label1);

  const enableBox = document.createElement("input");
  enableBox.name = 'flags.'+MOD_NAME+'.enabled';
  enableBox.type = 'checkbox';
  enableBox.title = 'Enable caterpillar control on this token.';
  if (app.token.getFlag(MOD_NAME, 'enabled')){
    enableBox.checked = true;
  }
  formFields.append(enableBox);

  const label2 = document.createElement('label');
  label2.textContent = 'Length';
  formFields.append(label2);
  const cat_len = document.createElement('input');
  cat_len.name = 'flags.'+MOD_NAME+'.length';
  cat_len.type = 'number';
  cat_len.step = "1";
  if(app.token.getFlag(MOD_NAME, 'length')){
    cat_len.value=app.token.getFlag(MOD_NAME, 'length');
  }
  formFields.append(cat_len);
  
  const cat_body = imageSelector(app, 'body_token', "Token for Caterpillar body");
  const cat_rear = imageSelector(app, 'rear_token', "Token for Caterpillar rear");
    
  
  // Add the form group to the bottom of the Identity tab
  html[0].querySelector("div[data-tab='character']").append(formGroup);
  //html[0].querySelector("div[data-tab='character']").append(cat_body);
  //html[0].querySelector("div[data-tab='character']").append(cat_rear);

  html[0].querySelector("div[data-tab='appearance']").append(cat_body);
  html[0].querySelector("div[data-tab='appearance']").append(cat_rear);

  // Set the apps height correctly
  app.setPosition();

  console.log(app);
});

