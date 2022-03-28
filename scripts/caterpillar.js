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

let module_name = "caterpillar";


// Bind to pre-update to pick up those mirrors moving away from a beam
Hooks.on('preUpdateToken', (token, change, options, user_id)=>{
  if (!game.user.isGM)return true;

});

// Delete token
Hooks.on('deleteToken', (token, options, user_id)=>{
  if (!game.user.isGM)return true;

});


// Let's grab those token updates
Hooks.on('updateToken', (token, change, options, user_id)=>{
  if (!game.user.isGM)return true;

  console.log('caterpillar update token:', token, change, options, user_id);
});






// Settings:
Hooks.once("init", () => {
  game.settings.register(module_name, "snap_to_grid", {
    name: "Snap to grid",
    hint: "Should the tokens automatically snap to grid, or preserve length",
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
});


// Hook into the token config render
Hooks.on("renderTokenConfig", (app, html) => {
  // Create a new form group
  const formGroup = document.createElement("div");
  formGroup.classList.add("form-group");

  // Create a label for this setting
  const label = document.createElement("label");
  label.textContent = "Caterpillar";
  formGroup.prepend(label);

  // Create a form fields container
  const formFields = document.createElement("div");
  formGroup.classList.add("form-fields");
  formGroup.append(formFields);

  // Create a lamp input box
  const body_token = document.createElement("input");
  body_token.name = "flags.caterpillar.body_token";
  body_token.type = "file";
  body_token.title = 'The token image for its body';  
  // Insert the flags current value into the input box  
  if (app.token.getFlag(module_name, 'body_token')){
    body_token.value=app.token.getFlag(module_name, 'body_token');
  }
  formFields.append(body_token);
  

  // Create mirror input box
  const rear_token = document.createElement("input");  
  rear_token.name = "flags.caterpillar.rear_token";
  rear_token.type = "file";
  rear_token.title = 'The token image for its rear, leave empty for no rear.';
  formFields.append(rear_token);
  if ( app.token.getFlag(module_name, 'rear_token')){
    rear_token.value = app.token.getFlag(module_name, 'rear_token');
  }
  
  
  // Add the form group to the bottom of the Identity tab
  html[0].querySelector("div[data-tab='character']").append(formGroup);

  // Set the apps height correctly
  app.setPosition();
});

