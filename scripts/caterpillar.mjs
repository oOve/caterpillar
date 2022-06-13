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
import * as utils from "./utils.mjs"
import { createSpider, moveSpider, rotateSpider } from "./spider.mjs";

const MOD_NAME = "caterpillar";

const FLAG_LENGTH  = 'length';
const FLAG_ENABLED = 'enabled';
const FLAG_SPACING = 'spacing';

const FLAG_TAIL_INDEX = 'tail_index';
const FLAG_TAIL_ITEMS = 'tail_items';
const FLAG_HEAD_ID    = 'head_id';

const FLAG_BODY_TOKEN = 'body_token';
const FLAG_REAR_TOKEN = 'rear_token';


/**
 * Prepend value to array 'array'
 * @param {Number} value the value to prepend
 * @param {Array} array 
 * @returns 
 */
function prepend(value, array) {
  var newArray = array.slice();
  newArray.unshift(value);
  return newArray;
}

/**
 * Return true if this token is a caterpillar 'head'
 * @param {*} token The token to check whether it is a 'head' token
 * @returns Boolean
 */
function isHead(token){
  return token.getFlag(MOD_NAME, FLAG_ENABLED);
}
function isTail(token){
  try{
    let head = canvas.tokens.get( isHead(token)?token.id: token.getFlag(MOD_NAME, FLAG_HEAD_ID));
    let length = head.document.getFlag(MOD_NAME, FLAG_LENGTH);
    let index = token.getFlag(MOD_NAME, FLAG_TAIL_INDEX);
    return index == length;
  }
  catch(err){
    return false;
  }
}


/**
 * Iterate either from the back in reverse, or from zero towards the length
 * @param {Number} length The total parametric length, floating point
 * @param {Number} step Stepsize, also a floating point
 * @param {Boolean} reverse If true iterate from length towards zero
 */
function* catepillarIterator(length, step, reverse=false){
  let p = (reverse)?length:0;
  while (true){
    yield p;
    p += (reverse)?-step : step;
  }
}
/**
 * Iterate from zero to len-1, or from len-1 to zero
 * @param {Number} len Iterator size, an integer
 * @param {Boolean} reverse Iterate down towards zero if true
 */
function* reversableIterator(len, reverse=false){
  let start = (reverse)?len-1: 0;
  let step = (reverse)?-1:1;
  let end = (reverse)?-1:len;
  for (let i = start; i!=end; i+=step){
    yield i;
  }
}

function getSpacing(token){
  let spacing = token.getFlag(MOD_NAME, FLAG_SPACING);
  if(!spacing){spacing = 1.0;}
  let w = token.width;
  
  // V10 compatibility
  if (w===undefined) w = token.data.width;
  return spacing*w*canvas.grid.size;
}




Hooks.on('preUpdateToken', (token, change, options, user_id)=>{ 
  if(change.x === undefined && change.y === undefined && change.rotation === undefined){
    // No change that modifies the caterpillar
    return true;
  }
  if (options.worm_triggered || options.spiderTriggered){
    // We exit, to not trigger on 'triggered' movement
    return true;
  }

  if(token.getFlag(MOD_NAME, 'isSpider')){
    if (change.rotation!=undefined){return rotateSpider(token,change);
    }else{                          return moveSpider(token,change); }
  }

  let ihead = isHead(token);
  let itail = isTail(token);

  if (ihead || itail){    
    const HEAD_ID = (ihead)?token.id:token.getFlag(MOD_NAME, FLAG_HEAD_ID);
    //let head = (ihead)?token: canvas.tokens.get(HEAD_ID);
    let head = canvas.tokens.get(HEAD_ID);
    let head_doc = head.document;

    let spacing = getSpacing(head_doc);
    let zIndex  = head.zIndex;

    // This is either the head or the tail        
    let tail_ids = head_doc.getFlag(MOD_NAME, FLAG_TAIL_ITEMS);    
    
    let caterpillar = tail_ids.map(id=>canvas.tokens.get(id));
    let positions = caterpillar.map((part)=>{return {x:part.x, y:part.y};});

    // V10 Compat
    let tdata = (Number(game.version)>10)?token:token.data;

    let prev_pos = {x:tdata.x, y:tdata.y};
    let new_pos = duplicate(prev_pos);
    if (change.x){new_pos.x = change.x;}
    if (change.y){new_pos.y = change.y;}

    if (ihead){
      positions = prepend(new_pos, positions);
    }else{
      positions.push(new_pos);
    }

    let stepSize = spacing;
    let spline = new utils.SimpleSpline(positions);
    let updates = [];

    // This is the head
    let c_iter = catepillarIterator(spline.plen, stepSize, itail);
    let i_iter = reversableIterator(positions.length, itail);
    
    for (const i of i_iter){
      let t = c_iter.next().value;
      let npos = spline.parametricPosition(t);
      let angle = utils.vAngle(spline.derivative(t));
      if (Number.isNaN(angle)){angle=0;}      

      let id;
      if (i==0){
        id=HEAD_ID;
      }else{
        id=tail_ids[i-1];
      }
      //
      canvas.tokens.get(id).zIndex = - positions.length + 1 - i;

      updates.push({ 
          _id : id, 
          x: npos.x,
          y: npos.y,
          rotation: angle,
          zIndex: -positions.length + 1 - i
        });
    }

    // Remove positional update of the first element in the chain 
    // (will either be the head or the tail, the end that was dragged.)
    delete updates[0].x; 
    delete updates[0].y;
    // Execute all the accumulated updates, but mark these as "worm_triggered" to not trigger this again
    canvas.scene.updateEmbeddedDocuments('Token', updates, {worm_triggered:true} );
  }
});


// Delete token
Hooks.on('deleteToken', (token, options, user_id)=>{
  if (!game.user.isGM)return true;

  if (token.getFlag(MOD_NAME, FLAG_TAIL_ITEMS)){
    let tail = token.getFlag(MOD_NAME, FLAG_TAIL_ITEMS);
    canvas.scene.deleteEmbeddedDocuments('Token', tail);
  }

  if (token.getFlag(MOD_NAME, 'isSpider')){
    canvas.scene.deleteEmbeddedDocuments('Token', token.getFlag(MOD_NAME, 'spiderLegs'));
  }

});



// Create token
Hooks.on('createToken', (token, options, user_id)=>{
  if (!game.user.isGM)return true;
  if (token.getFlag(MOD_NAME, "enabled") && token.getFlag(MOD_NAME, FLAG_LENGTH)){
    let spacing = getSpacing(token);

    // We need to create a catepillar
    let len = token.getFlag(MOD_NAME, FLAG_LENGTH);
    let tail = [];
    
    for (let i = 1; i <= len; ++i){
      let t = duplicate(token);
      t.y +=  spacing * (i);
      t.flags.caterpillar.tail = true;
      t.flags.caterpillar.tail_index = i;
      t.flags.caterpillar.enabled = false;
      t.flags.caterpillar.head_id = token.id
      t.img = token.getFlag(MOD_NAME, (i<len)?FLAG_BODY_TOKEN:FLAG_REAR_TOKEN );
      tail.push(t);
    }
    canvas.scene.createEmbeddedDocuments("Token", tail).then((tokens)=>{
      token.setFlag(MOD_NAME, FLAG_TAIL_ITEMS, tokens.map( tok=>tok.id ) );
    });
  }

  if (token.getFlag(MOD_NAME, "isSpider")){
    console.warn("Spidertiem!!");
    createSpider(token);
  }

});




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
  
  let flags = app.token.flags;
  if (flags === undefined) flags = app.token.data.flags;
  
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
  if (flags?.[MOD_NAME]?.[flag_name]){
    inpt.value=flags?.[MOD_NAME]?.[flag_name];
  }
  
  button.append(bi);

  grp.append(label);
  grp.append(fields);
  
  fields.append(button);
  fields.append(inpt);
  return grp;
}

function createLabel(text){
  const label = document.createElement('label');
  label.textContent = text;
  return label;
}
function createDiv(classes){
  const div = document.createElement('div');
  for (let c of classes){div.classList.add(c);}
  return div;
}

function textBoxConfig(parent, app, flag_name, title, type="number",
                       placeholder=null, default_value=null, step=null)
{ 
  let flags = app.token.flags;
  if (flags === undefined) flags = app.token.data.flags;

  parent.append(createLabel(title));
  const input = document.createElement('input');
  input.name = 'flags.'+MOD_NAME+'.'+flag_name;
  input.type = type;  
  if(step) input.step = step;
  if(placeholder) input.placeholder = placeholder;

  if(flags?.[MOD_NAME]?.[flag_name]){
    input.value=flags?.[MOD_NAME]?.[flag_name];
  }
  else if(default_value!=null){
    input.value = default_value;
  }
  parent.append(input);
}




// Hook into the token config render
Hooks.on("renderTokenConfig", (app, html) => {
  window.MM = app
  // if ( !app.isPrototype) return;

  let flags = app.token.flags;
  if (flags === undefined) flags = app.token.data.flags;

  // Create a new form group
  const formGroup = createDiv(["form-group","slim"]);
  // Create a label for this setting
  const label = createLabel("Caterpillar");
  formGroup.prepend(label);

  // Create a form fields container
  const formFields = createDiv(["form-fields"]);
  formGroup.append(formFields);

  const label1 = createLabel("Enable");
  formFields.append(label1);

  const enableBox = document.createElement("input");
  enableBox.name = 'flags.'+MOD_NAME+'.enabled';
  enableBox.type = 'checkbox';
  enableBox.title = 'Enable caterpillar control on this token.';
  if (flags?.[MOD_NAME]?.[FLAG_ENABLED]){
    enableBox.checked = true;
  }
  formFields.append(enableBox);

  textBoxConfig(formFields, app, FLAG_LENGTH, 'Length', 'number', undefined, 10, 1 );
  textBoxConfig(formFields, app, FLAG_SPACING, 'Spacing', 'number', undefined, .75, .05 );
 
  const cat_body = imageSelector(app, FLAG_BODY_TOKEN, "Token for Caterpillar body");
  const cat_rear = imageSelector(app, FLAG_REAR_TOKEN, "Token for Caterpillar rear");
  
  
  // Add the form group to the bottom of the Identity tab
  html[0].querySelector("div[data-tab='character']").append(formGroup);

  // And add the token image selectors to the 'apperance' tab
  html[0].querySelector("div[data-tab='appearance']").append(cat_body);
  html[0].querySelector("div[data-tab='appearance']").append(cat_rear);

  // Set the apps height correctly
  app.setPosition();
  
});

