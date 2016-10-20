/* Licence: GPL version 3, Wikus Coetser, 2013 */

/*
  Viewport class for connecting canvas to WebGL context and doing projections.
*/

// Stolen & Modified accordingly
Viewport = function (gl, shaderProgram) {
  try {
    //Hook up user input ...
    this.gl = gl;
    $("body").keydown(function (event) {
      this.OnKeyDown(String.fromCharCode(event.shiftKey ? event.which : event.which + 32), event.which);
    }.bind(this));
    $("body").keyup(function (event) {
      this.OnKeyUp(String.fromCharCode(event.shiftKey ? event.which : event.which + 32), event.which);
    }.bind(this));
    $("body").blur(function (event) {
      this.ClearKeys();
    }.bind(this));
    // Initialize camera posistion
    this.position = [0.5, 0.5, -0.5];
    this.lookVector = [0, 0, 1];
    this.moveSpeed = 5; // kph, ie. walking speed
    this.rotationsPerSecond = 0.5; // i.e. how long it takes to rotate 360 degrees
    this.lastTime = Date.now();
    this.keyState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      fptich: false,
      bpitch: false,
      fyaw: false,
      byaw: false,
      froll: false,
      broll: false,
      tLeft: false,
      tRigth: false,
      tUp: false,
      tDown: false,
      tForward: false,
      tBackward: false
      //tYaw: false
    };
    // The ruler is a cube that is renderred arround the camara position for ray-casting puroposes
    this.ruler = null;
    // Initialize WebGL
    this.viewportWidth = gl.width;
    this.viewportHeight = gl.height;
    this.triangleBuffers = new Array();
    this.angle = Math.PI/2;
    this.shaderProgram = shaderProgram;
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    this.lookAtMat = null;
    this.s = 0;
    this.triSel = -1;
    this.sphereSel = 0;
  } catch (e) {
    throw "Failed to initialize WebGL: " + e;
  }
}

/*
  Sets the camera position
*/
Viewport.prototype.SetPosition = function (p) {
  if (!(p instanceof Array)) throw "Expected position as 3 component array";
  this.position = p;
  // Position changed ...
  this.gl.uniform3fv(this.shaderProgram.uEyePositionUniform, new Float32Array(this.position));
}

/*
  Set direction in which camera points.
*/
Viewport.prototype.SetViewVector = function (v) {
  if (!(v instanceof Array)) throw "Expected position as 3 component array";
  this.lookVector = v;
}

/*
  Set movement speed in km/h
*/
Viewport.prototype.SetMoveSpeed = function (s) {
  if (!s) throw "Invalid argument for movement speed.";
  this.moveSpeed = s;
}

/*
  How long it takes to rotate by 360 degress in seconds, using the left and right buttons.
*/
Viewport.prototype.SetRotationsPerSecond = function (rs) {
  if (!rs) throw "Invalid argument for rotations per second.";
  this.rotationsPerSecond = rs;
}

/*
  Projection and view information.
*/
Viewport.prototype.SetViewInformation = function (angle, nearClip, farClip, clearColour) {
  if (!angle) throw "Angle not given.";
  if (!nearClip) throw "Near clipping distance not given.";
  if (!farClip) throw "Far clipping distance not given.";
  if (!clearColour
      || !(clearColour instanceof Array)
      || clearColour.length != 3) throw "Invalid clear colour.";
  this.angle = angle;
  this.nearClip = nearClip;
  this.farClip = farClip;
  this.clearColour = clearColour;
  // Set projection matrix
  var gl = this.gl;
  gl.viewport(0, 0, this.viewportWidth, this.viewportHeight);
  pMatrix = this.GetViewMatrix();
  if (this.shaderProgram) this.UpdateProjectionMatrix(pMatrix);
  gl.clearColor(this.clearColour[0], this.clearColour[1], this.clearColour[2], 1.0);
}

/*
  Handles the hey down event on the canvas.
*/
Viewport.prototype.OnKeyDown = function (char, keyCode) {
  this.keypressed = char;
  if (char == 'w') this.keyState.forward = true;
  if (char == 's') this.keyState.backward = true;
  if (char == 'd') this.keyState.right = true;
  if (char == 'a') this.keyState.left = true;
  if (char == 'q') this.keyState.up = true;
  if (char == 'e') this.keyState.down = true;
  if (char == 'W') this.keyState.fptich = true;
  if (char == 'S') this.keyState.bpitch = true;
  if (char == 'A') this.keyState.fyaw = true;
  if (char == 'D') this.keyState.byaw = true;
  if (char == 'Q') this.keyState.froll = true;
  if (char == 'E') this.keyState.broll = true;
  if (char == 'k') this.keyState.tLeft = true;
  if (keyCode == 186) this.keyState.tRigth = true;
  if (char == 'o') this.keyState.tForward = true;
  if (char == 'l') this.keyState.tBackward = true;
  if (char == 'i') this.keyState.tUp = true;
  if (char == 'p') this.keyState.tDown = true;
}

/*
  Handles the keyup event for the canvas.
*/
Viewport.prototype.OnKeyUp = function (char, keyCode) {

  if (char == 'w') this.keyState.forward = false;
  if (char == 's') this.keyState.backward = false;
  if (char == 'd') this.keyState.right = false;
  if (char == 'a') this.keyState.left = false;
  if (char == 'q') this.keyState.up = false;
  if (char == 'e') this.keyState.down = false;
  if (char == 'W') this.keyState.fptich = false;
  if (char == 'S') this.keyState.bpitch = false;
  if (char == 'A') this.keyState.fyaw = false;
  if (char == 'D') this.keyState.byaw = false;
  if (char == 'Q') this.keyState.froll = false;
  if (char == 'E') this.keyState.broll = false;
  if (char == 'k') this.keyState.tLeft = false;
  if (keyCode == 186) this.keyState.tRigth = false;
  if (char == 'o') this.keyState.tForward = false;
  if (char == 'l') this.keyState.tBackward = false;
  if (char == 'i') this.keyState.tUp = false;
  if (char == 'p') this.keyState.tDown = false;
}


/*
  Sets all the keys as "up".
*/
Viewport.prototype.ClearKeys = function () {
  this.keypressed = "";
  // if (s == 4)
  //   s = 0;
  this.keyState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      fptich: false,
      bpitch: false,
      fyaw: false,
      byaw: false,
      froll: false,
      broll: false,
      tLeft: false
    };
}

/*
  Gets the current projection matrix, taking camara position and view vector into account
*/
Viewport.prototype.GetViewMatrix = function () {
  var pMatrix = mat4.create();
  mat4.perspective(pMatrix, this.angle, this.viewportWidth / this.viewportHeight ,this.nearClip, this.farClip);
  return pMatrix;
}

Viewport.prototype.UpdateAndGetLookMatrix = function () {
  var lookat = mat4.create();
  var up = [0, 1, 0];
  mat4.lookAt(lookat, this.position, [this.position[0] + this.lookVector[0], this.position[1] + this.lookVector[1], this.position[2] + this.lookVector[2]], up);
  this.lookAtMat = lookat;
  return lookat;
}

Viewport.prototype.UpdateProjectionMatrix = function (pMatrix){
  gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
}

/*
  Set vertex and fragment shaders.
*/
Viewport.prototype.SetShaderProgram = function (shaderProgram) {
  var gl = this.gl;
  this.shaderProgram = shaderProgram;
  if (this.angle) {
    // Set projection matrix
    pMatrix = this.GetViewMatrix();
    this.UpdateProjectionMatrix(pMatrix);
  }
}
/*
  Add vertex array buffers.
*/
Viewport.prototype.AddBuffer = function (buffer) {
  if (!(buffer instanceof TriangleBuffer)) throw "Invalid argument: Expected triangle buffer.";
  this.triangleBuffers.push(buffer);
}

/*
  Draw buffers using shader.
*/
Viewport.prototype.Draw = function () {
  var gl = this.gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Set the "camera box" location to be arround the camera
  // var rulerposition = mat4.create();
  // mat4.translate(rulerposition, mat4.create(), this.position);
  // this.ruler.modelViewMatrix = rulerposition;
  // this.gl.disable(this.gl.DEPTH_TEST);
  // this.gl.uniform1i(this.shaderProgram.isCameraBox, 1);
  // this.ruler.Draw();
  // this.gl.uniform1i(this.shaderProgram.isCameraBox, 0);
  this.gl.enable(this.gl.DEPTH_TEST);
  for (var i = 0; i < this.triangleBuffers.length; i++) {
    this.triangleBuffers[i].SetLookMatrix(this.UpdateAndGetLookMatrix());
    var mat = mat4.create();
    //mat4.mul(mat);
    this.triangleBuffers[i].DrawElements();
  }
}

Viewport.prototype.UpdateEyePosition = function () {
  // var eye = vec4.fromValues(this.position[0], this.position[1], this.position[2], 1);
  // vec4.transformMat4(eye, eye, this.lookAt);
  this.gl.uniform3fv(this.shaderProgram.uEyePositionUniform, new Float32Array(this.position));
  // this.gl.uniform3fv(this.shaderProgram.uEyePositionUniform, [eye[0],eye[1],eye[2]]);
}
/*
  Continually request new frames from WebGL and render them in the browser.
*/
Viewport.prototype.StartRenderLoop = function () {
  // Move camera
  if (this.keyState.forward
      || this.keyState.backward
      || this.keyState.left
      || this.keyState.right
      || this.keyState.up
      || this.keyState.down
      || this.keyState.fpitch
      || this.keyState.bpitch
      || this.keyState.fyaw
      || this.keyState.byaw
      || this.keyState.froll
      || this.keyState.broll
      || this.keyState.tLeft
      || this.keyState.tRigth
      || this.keyState.tForward
      || this.keyState.tBackward
      || this.keyState.tUp
      || this.keyState.tDown
     ) {
    // Get time difference
    var now = Date.now();
    var dHours = (now - this.lastTime) / 3600000; // milliseconds to hours
    this.lastTime = now;
    // Do rotations, in rotations per second
    if (this.keyState.fyaw || this.keyState.byaw)
    {
      var angle = (this.keyState.fyaw ? 1 : -1) * (dHours * 3600) * this.rotationsPerSecond * 2 * Math.PI;
      var rotationMatrix = mat4.create(); // loads identity matrix
      this.yaw = angle;
    }
    if (this.keyState.fpitch || this.keyState.bpitch)
    {
      var angle = (this.keyState.froll ? 1 : -1) * (dHours * 3600) * this.rotationsPerSecond * 2 * Math.PI;
      var rotationMatrix = mat4.create(); // loads identity matrix
      this.pitch = angle;
    }
    if (this.keyState.froll || this.keyState.broll)
    {
      var angle = (this.keyState.froll ? 1 : -1) * (dHours * 3600) * this.rotationsPerSecond * 2 * Math.PI;
      var rotationMatrix = mat4.create(); // loads identity matrix
      this.roll = angle;
    }
    var dist = dHours * this.moveSpeed * 1000; // km to m
    // Move forward/backward in killometers per hour
    if (this.keyState.forward
        || this.keyState.backward) {
      var sdist = (this.keyState.backward ? -1 : 1) * dist;
      var viewDist = vec3.length(this.lookVector);
      this.position[0] += (this.lookVector[0] / viewDist) * sdist;
      this.position[1] += (this.lookVector[1] / viewDist) * sdist;
      this.position[2] += (this.lookVector[2] / viewDist) * sdist;
      // Position changed ...
    }
    if (this.keyState.left
        || this.keyState.right) {
      var sdist = (this.keyState.left ? -1 : 1) * dist;
      var viewDist = vec3.length(this.lookVector);
      this.position[0] += (this.lookVector[0] / viewDist) * sdist;
      this.position[1] += (this.lookVector[1] / viewDist) * sdist;
      this.position[2] += (this.lookVector[2] / viewDist) * sdist;
    }
    if (this.keyState.up
        || this.keyState.down) {
      this.position[1] += (this.keyState.up ? +1.0 : -1) * dist;
      // Position changed ...
    }
    if (this.keyState.tLeft || this.keyState.tRigth || this.keyState.tForward || this.keyState.tBackward
        || this.keyState.tUp || this.keyState.tDown)
    {
      var mMatrix = this.triangleBuffers[this.sphereSel].GetModelMatrix();
      //var sdist = (this.keyState.tLeft ? 1 : -1) * dist;
      dist = dist/10;
      var original = vec3.create();
      var translate;
      mat4.getTranslation(original,mMatrix);
      if (this.keyState.tLeft)
        translate = [dist,0.0,0.0];
      if (this.keyState.tRigth)
        translate = [-1*dist,0.0,0.0];
      if (this.keyState.tForward)
        translate = [0.0,0.0,dist];
      if (this.keyState.tBackward)
        translate = [0.0,0.0,-1*dist];
      if (this.keyState.tUp)
        translate = [0.0,dist,0.0];
      if (this.keyState.tDown)
        translate = [0.0,-1*dist,0.0];
      vec3.add(original, original,translate);
      mat4.identity(mMatrix);
      mat4.translate(mMatrix, mMatrix,original);
      this.triangleBuffers[this.sphereSel].SetModelMatrix(mMatrix);
    }
    // if (this.keyState.left || this.keyState.right)
    // {
    //   // var angle = (this.keyState.left ? 1 : -1) * (dHours * 3600) * this.rotationsPerSecond * 2 * Math.PI;
    //   // var rotationMatrix = mat4.create(); // loads identity matrix
    //   // mat4.rotateY(rotationMatrix, mat4.create(), angle);
    //   // var newLookVector = vec3.create();
    //   // vec3.transformMat4(newLookVector, vec3.fromValues(this.lookVector[0], this.lookVector[1], this.lookVector[2]), rotationMatrix);
    //   // this.lookVector[0] = newLookVector[0];
    //   // this.lookVector[1] = newLookVector[1];
    //   // this.lookVector[2] = newLookVector[2];

    // }
    this.UpdateEyePosition();
  }
  else {
    this.lastTime = Date.now();
  }

  if (this.keypressed == 'F') { // Up
    var s = this.slectedObject % 4;
    for (var i = 0; i < this.triangleBuffers.length; i++) this.triangleBuffers[i].DeSelect();
    this.triangleBuffers[this.sphereSel].Select();
    this.sphereSel += 1;
    //this.s+=1;
    this.ClearKeys();
  }
  if (this.keypressed == 'H') { // Down
    //var s = this.slectedObject % 4
    for (var i = 0; i < this.triangleBuffers.length; i++) this.triangleBuffers[i].DeSelect();
    if (s == 0)
      s = 4;
    this.triangleBuffers[s].Select();
    this.slectedObject-=1;
    this.ClearKeys();
  }

  this.SetViewInformation(this.angle, this.nearClip, this.farClip, this.clearColour);
  // Render scene
  this.Draw();
  // Rerender
  window.requestAnimationFrame(this.StartRenderLoop.bind(this));
}
