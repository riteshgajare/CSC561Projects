/* Licence: GPL version 3, Wikus Coetser, 2013 */

/*
  Viewport class for connecting canvas to WebGL context and doing projections.
*/

// Stolen the idea and modified for my use.
Viewport = function (gl, shaderProgram) {
  try {
    //Hook up user input ...
    this.gl = gl;
    // Initialize camera posistion
    this.position = [0.5, 0.5, -0.5];

    $("body").keydown(function (event) {
      this.OnKeyDown(String.fromCharCode(event.shiftKey ? event.which : event.which + 32), event.shiftKey ? event.which+100 : event.which );
    }.bind(this));
    $("body").keyup(function (event) {
     this.OnKeyUp(String.fromCharCode(event.shiftKey ? event.which : event.which + 32), event.shiftKey ? event.which+100 : event.which );
     this.ClearKeys();
    }.bind(this));
    $("body").blur(function (event) {
      this.ClearKeys();
    }.bind(this));

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
      fpitch: false,
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
      tayaw: false,
      tcyaw: false,
      tapitch: false,
      tcpitch: false,
      taroll: false,
      tcroll: false,
      tBackward: false
      //tYaw: false
    };
    // The ruler is a cube that is renderred arround the camara position for ray-casting puroposes
    this.ruler = null;
    // Initialize WebGL
    this.viewportWidth = gl.width;
    this.viewportHeight = gl.height;
    this.triangleBuffers = [];//new Array();
    this.originalBuffers = new Array();
    this.numSpheres = 0;
    this.angle = Math.PI/2;
    this.shaderProgram = shaderProgram;
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    this.lookAtMat = null;
    this.s = 0;
    this.spSel = false;
    this.triSel = false;
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
  console.log(keyCode);
  this.keyCode = keyCode;
  if (char == 'w') this.keyState.forward = true;
  if (char == 's') this.keyState.backward = true;
  if (char == 'd') this.keyState.right = true;
  if (char == 'a') this.keyState.left = true;
  if (char == 'q') this.keyState.up = true;
  if (char == 'e') this.keyState.down = true;
  if (char == 'W') this.keyState.fpitch = true;
  if (char == 'S') this.keyState.bpitch = true;
  if (char == 'A') this.keyState.fyaw = true;
  if (char == 'D') this.keyState.byaw = true;
  if (char == 'Q') this.keyState.froll = true;
//  if (char == 'E') this.keyState.broll = true;
  if (keyCode == 169) this.keyState.broll = true;
  if (char == 'k') this.keyState.tLeft = true;
  if (keyCode == 186) this.keyState.tRigth = true;
  if (char == 'o') this.keyState.tForward = true;
  if (char == 'l') this.keyState.tBackward = true;
  if (char == 'i') this.keyState.tUp = true;
  if (char == 'p') this.keyState.tDown = true;
  if (char == 'K') this.keyState.tayaw = true;
  if (keyCode == 286) this.keyState.tcyaw = true;
  if (char == 'O') this.keyState.tapitch = true;
  if (char == 'L') this.keyState.tcpitch = true;
  if (char == 'I') this.keyState.taroll = true;
  if (char == 'P') this.keyState.tcroll = true;

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
  if (char == 'W') this.keyState.fpitch = false;
  if (char == 'S') this.keyState.bpitch = false;
  if (char == 'A') this.keyState.fyaw = false;
  if (char == 'D') this.keyState.byaw = false;
  if (char == 'Q') this.keyState.froll = false;

//  if (char == 'E') this.keyState.broll = false;
  if (keyCode == 169) this.keyState.broll = false;
  if (char == 'k') this.keyState.tLeft = false;
  if (keyCode == 186) this.keyState.tRigth = false;
  if (char == 'o') this.keyState.tForward = false;
  if (char == 'l') this.keyState.tBackward = false;
  if (char == 'i') this.keyState.tUp = false;
  if (char == 'p') this.keyState.tDown = false;
  if (char == 'K') this.keyState.tayaw = false;
  if (keyCode == 286) this.keyState.tcyaw = false;
  if (char == 'O') this.keyState.tapitch = false;
  if (char == 'L') this.keyState.tcpitch = false;
  if (char == 'I') this.keyState.taroll = false;
  if (char == 'P') this.keyState.tcroll = false;
}


/*
  Sets all the keys as "up".
*/
Viewport.prototype.ClearKeys = function () {
  this.keyCode = -1;
  this.keyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    fpitch: false,
    bpitch: false,
    fyaw: false,
    byaw: false,
    froll: false,
    broll: false,
    tayaw: false,
    tcyaw: false,
    tapitch: false,
    tcpitch: false,
    taroll: false,
    tcroll: false,
    tLeft: false,
    tUp: false,
    tDown: false,
    tForward: false,
    tBackward: false,
    tRigth: false
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

Viewport.prototype.UpdateLookMatrix = function () {
  var lookat = mat4.create();
  var up = [0, 1, 0];
  mat4.lookAt(lookat, this.position, [this.position[0] + this.lookVector[0], this.position[1] + this.lookVector[1], this.position[2] + this.lookVector[2]], up);
  this.lookAtMat = lookat;
}

Viewport.prototype.UpdateProjectionMatrix = function (pMatrix){
  this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
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
//  this.originalBuffers.push(buffer);
  if (buffer.isSphere)
    this.numSpheres += 1;
}

/*
  Draw buffers using shader.
*/
Viewport.prototype.Draw = function () {
  var gl = this.gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  this.gl.enable(this.gl.DEPTH_TEST);
  for (var i = 0; i < this.triangleBuffers.length; i++) {
    this.triangleBuffers[i].SetLookMatrix(this.lookAtMat);
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
  if (this.keyCode == 27) {
    //Escape undo all the view changes;
    this.UpdateLookMatrix();
    this.ClearKeys();
  }
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
      || this.keyState.tayaw
      || this.keyState.tcyaw
      || this.keyState.tapitch
      || this.keyState.tcpitch
      || this.keyState.taroll
      || this.keyState.tcroll
     ) {
    // Get time difference
    var now = Date.now();
    var dHours = (now - this.lastTime) / 3600000; // milliseconds to hours
    var dist = dHours * this.moveSpeed * 1000; // km to m
    this.lastTime = now;
    var vMatrix = this.lookAtMat;
    var angle =  (dHours * 3600) * this.rotationsPerSecond * 2 * Math.PI;
    var rotationMatrix = mat4.create(); // loads identity matrix
    var translate = mat4.create();
    // Do rotations, in rotations per second
    if (this.keyState.fyaw || this.keyState.byaw) {
      mat4.rotateY(rotationMatrix, mat4.create(), (this.keyState.fyaw) ? -1*angle : angle);
      mat4.mul(vMatrix, rotationMatrix, vMatrix);
    }
    if (this.keyState.fpitch || this.keyState.bpitch) {
      mat4.rotateX(rotationMatrix, mat4.create(), (this.keyState.fpitch) ? -1*angle : angle);
      mat4.mul(vMatrix, rotationMatrix, vMatrix);
    }
    if (this.keyState.froll || this.keyState.broll) {
      mat4.rotateZ(rotationMatrix, mat4.create(), (this.keyState.froll) ? -1*angle : angle);
      mat4.mul(vMatrix, rotationMatrix, vMatrix);
    }
    // Move forward/backward in killometers per hour
    if (this.keyState.forward
        || this.keyState.backward) {
      var sdist = (this.keyState.forward) ? dist : -1*dist;
      mat4.translate(translate, translate, [0,0,sdist]);
      mat4.mul(vMatrix,  translate, vMatrix);
    }
    if (this.keyState.left
        || this.keyState.right) {
      var sdist = (this.keyState.left) ? -1*dist : dist;
      mat4.translate(translate, translate, [-sdist,0,0]);
      mat4.mul(vMatrix, translate, vMatrix);
    }
    if (this.keyState.up
        || this.keyState.down) {
      var sdist = (this.keyState.up) ? dist :-1* dist;
      mat4.translate(translate, translate, [0,-sdist,0]);
      mat4.mul(vMatrix,  translate, vMatrix);
    }
    this.lookAtMat = vMatrix;

    // if (this.keyState.tLeft || this.keyState.tRigth || this.keyState.tForward || this.keyState.tBackward
    //     || this.keyState.tUp || this.keyState.tDown)
    // {
    //   var mMatrix = this.triangleBuffers[this.s].GetModelMatrix();
    //   //var sdist = (this.keyState.tLeft ? 1 : -1) * dist;
    //   dist = dist/10;
    //   var original = vec3.create();
    //   var translate;
    //   mat4.getTranslation(original,mMatrix);
    //   if (this.keyState.tLeft)
    //     translate = [dist,0.0,0.0];
    //   if (this.keyState.tRigth)
    //     translate = [-1*dist,0.0,0.0];
    //   if (this.keyState.tForward)
    //     translate = [0.0,0.0,dist];
    //   if (this.keyState.tBackward)
    //     translate = [0.0,0.0,-1*dist];
    //   if (this.keyState.tUp)
    //     translate = [0.0,dist,0.0];
    //   if (this.keyState.tDown)
    //     translate = [0.0,-1*dist,0.0];
    //   vec3.add(original, original,translate);
    //   mat4.identity(mMatrix);
    //   mat4.translate(mMatrix, mMatrix,original);
    //   this.triangleBuffers[this.s].SetModelMatrix(mMatrix);
    // }

    // if (this.keyState.tLeft
    //     || this.keyState.tRigth
    //     || this.keyState.tForward
    //     || this.keyState.tBackward
    //     || this.keyState.tUp
    //     || this.keyState.tDow
    //     || this.keyState.tayaw
    //     || this.keyState.tcyaw
    //     || this.keyState.tapitch
    //     || this.keyState.tcpitch
    //     || this.keyState.taroll
    //     || this.keyState.tcroll) {

    //   dist = dist/10;
    //   var translate = [0.0,0.0,0.0];
    //   var angle = (dHours * 3600) * this.rotationsPerSecond * 2 * Math.PI;
    //   var mMatrix = this.triangleBuffers[this.s].GetModelMatrix();
    //   var oriTrans = vec3.create(); //centroid
    //   mat4.getTranslation(oriTrans,mMatrix);
    //   var oriRot = quat.create();
    //   mat4.getRotation(oriRot,mMatrix);
    //   var rotationMatrix = mat4.create(); // loads identity matrix

    //   if (this.keyState.tayaw)
    //     quat.rotateY(oriRot, oriRot, -1*angle);
    //   if (this.keyState.tcyaw)
    //     quat.rotateY(oriRot, oriRot, angle);
    //   if (this.keyState.tapitch)
    //     quat.rotateX(oriRot, oriRot, -1*angle);
    //   if (this.keyState.tcpitch)
    //     quat.rotateX(oriRot, oriRot, angle);
    //   if (this.keyState.taroll)
    //     quat.rotateZ(oriRot, oriRot, -1*angle);
    //   if (this.keyState.tcroll)
    //     quat.rotateZ(oriRot, oriRot, angle);
    //   if (this.keyState.tLeft)
    //     translate = [dist,0.0,0.0];
    //   if (this.keyState.tRigth)
    //     translate = [-1*dist,0.0,0.0];
    //   if (this.keyState.tForward)
    //     translate = [0.0,0.0,dist];
    //   if (this.keyState.tBackward)
    //     translate = [0.0,0.0,-1*dist];
    //   if (this.keyState.tUp)
    //     translate = [0.0,dist,0.0];
    //   if (this.keyState.tDown)
    //     translate = [0.0,-1*dist,0.0];
    //   vec3.add(oriTrans, oriTrans,translate);
    //   mat4.fromRotationTranslation(mMatrix, oriRot, oriTrans);// centroid);
    //   this.triangleBuffers[this.s].SetModelMatrix(mMatrix);
    // }

    if (this.keyState.tLeft
        || this.keyState.tRigth
        || this.keyState.tForward
        || this.keyState.tBackward
        || this.keyState.tUp
        || this.keyState.tDown
        || this.keyState.tayaw
        || this.keyState.tcyaw
        || this.keyState.tapitch
        || this.keyState.tcpitch
        || this.keyState.taroll
        || this.keyState.tcroll) {

      dist = dist/10;
      var translate = [0.0,0.0,0.0];
      var angle = (dHours * 3600) * this.rotationsPerSecond * 2 * Math.PI;
      var mMatrix = this.triangleBuffers[this.s].GetModelMatrix();
      var oriTrans = vec3.create(); //centroid
      mat4.getTranslation(oriTrans,mMatrix);
      var oriRot = quat.create();
      mat4.getRotation(oriRot,mMatrix);
      var rotationMatrix = quat.create(); // loads identity matrix

      if (this.keyState.tayaw)
        quat.rotateY(rotationMatrix, quat.create(), -1*angle);
      if (this.keyState.tcyaw)
        quat.rotateY(rotationMatrix, quat.create(), angle);
      if (this.keyState.tapitch)
        quat.rotateX(rotationMatrix, quat.create(), -1*angle);
      if (this.keyState.tcpitch)
        quat.rotateX(rotationMatrix, quat.create(), angle);
      if (this.keyState.taroll)
        quat.rotateZ(rotationMatrix, quat.create(), -1*angle);
      if (this.keyState.tcroll)
        quat.rotateZ(rotationMatrix, quat.create(), angle);
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
      quat.mul(rotationMatrix, rotationMatrix, oriRot);
      vec3.add(oriTrans, oriTrans,translate);
      mat4.fromRotationTranslation(mMatrix, rotationMatrix, oriTrans);// centroid);
      this.triangleBuffers[this.s].SetModelMatrix(mMatrix);
    }

    this.UpdateEyePosition();
  }
  else {
    this.lastTime = Date.now();
  }

  if (this.keyCode == 8) // Backspace
  {
    // Restore viewport
    this.s = 0;
    this.spSel = false;
    this.triSel = false;
    for (var i = 0; i < this.triangleBuffers.length; i++) {
      this.triangleBuffers[i].DeSelect();
      this.triangleBuffers[i].Reset();
    }
    this.ClearKeys();
  }

  if (this.keyCode == 32) {
    for (var i = 0; i < this.triangleBuffers.length; i++) this.triangleBuffers[i].DeSelect();
    this.s = 0;
    this.spSel = false;
    this.triSel = false;
    this.ClearKeys();
  }

  if (this.keyCode == 38
      || this.keyCode == 40) { // Up
    this.triangleBuffers[this.s].DeSelect();
    if (this.triSel) {
      this.triSel = false;
      this.s = 0;
    }
    var prev = this.s;
    if (this.keyCode == 40) {
      this.s = prev - 1;
      if (this.s < 0)
        this.s = this.numSpheres - 1;
      if (this.s > (this.numSpheres - 1))
        this.s = 0;
    } else {
      this.s = prev + 1;
      if (this.s < 0)
        this.s = this.numSpheres - 1;
      if (this.s > (this.numSpheres - 1))
        this.s = 0;
    }
    this.spSel = true;
    this.triangleBuffers[this.s].Select();
    this.ClearKeys();
  }

  if (this.keyCode == 37
      || this.keyCode == 39) { // Up
    this.triangleBuffers[this.s].DeSelect();
    var total = this.triangleBuffers.length;
    if (this.spSel) {
      this.spSel = false;
      this.s = this.numSpheres;
    }
    var prev = this.s;
    if (this.keyCode == 37) {
      this.s = prev - 1;
      if (this.s < this.numSpheres)
        this.s = total - 1;
      if (this.s > (total - 1))
        this.s = this.numSpheres;
    } else {
      this.s = prev + 1;
      if (this.s < this.numSpheres)
        this.s = total - 1;
      if (this.s > (total - 1))
        this.s = this.numSpheres;
    }
    this.triSel = true;
    this.triangleBuffers[this.s].Select();
    this.ClearKeys();
  }

  this.SetViewInformation(this.angle, this.nearClip, this.farClip, this.clearColour);
  // Render scene
  this.Draw();
  // Rerender
  window.requestAnimationFrame(this.StartRenderLoop.bind(this));
}
