/* GLOBAL CONSTANTS AND VARIABLES */
/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!

//var triBufferSize = 0; // the number of indices in the triangle buffer
var pMatrix = mat4.create();
var mvMatrix = mat4.create();

var shaderProgram;
//var viewport;
// ASSIGNMENT HELPER FUNCTIONS
// Spheres:

var lighting;
var lookAt = mat4.create();
var viewportWidth;
var viewportHeight;
var translation = [0,0,0];
var moveSpeed;
var position;
var rotationsPerSecond = 0.5; // i.e. how long it takes to rotate 360 degrees

function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {

    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
}

function setPosition(p){
  if (!(p instanceof Array)) throw "Expected position as 3 component array";
  this.position = p;
  // Position changed ...
  this.gl.uniform3fv(shaderProgram.uEyePositionUniform, new Float32Array(this.position));
}

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
  try {
    if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
      throw "getJSONFile: parameter not a string";
    else {
      var httpReq = new XMLHttpRequest(); // a new http request
      httpReq.open("GET",url,false); // init the request
      httpReq.send(null); // send the request
      var startTime = Date.now();
      while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
        if ((Date.now()-startTime) > 3000)
          break;
      } // until its loaded or we time out after three seconds
      if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
        throw "Unable to open "+descr+" file!";
      else
        return JSON.parse(httpReq.response);
    } // end if good params
  } // end try

  catch(e) {
    console.log(e);
    return(String.null);
  }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

  // Get the canvas and context
  var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
  gl = canvas.getContext("webgl"); // get a webgl object from it
  try {
    if (gl == null) {
      throw "unable to create gl context -- is your browser gl ready?";
    } else {

      //resize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
      gl.clearDepth(1.0); // use max when we clear the depth buffer
      gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
    }
  } // end try

  catch(e) {
    console.log(e);
  } // end catch

} // end setupWebGL

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  var normalMatrix = mat3.create();
  mat3.normalFromMat4(normalMatrix, mvMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}


function createPMatrix() {
  var eye = vec3.fromValues(0.5,0.5,-0.5);
  var up = vec3.fromValues(0,1,0);
  var center = vec3.fromValues(0.5,0.5,1);
  mat4.lookAt(lookAt, eye, center, up); // lookAt:: Camera perspective
  mat4.perspective(pMatrix, Math.PI/2, 1 , 0.25, 2);
}

function createMVMatrix(translation, update){
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix,mvMatrix, [translation[0], translation[1], translation[2]]); // model
  mat4.mul(mvMatrix, lookAt, mvMatrix);
  if (update)
    setMatrixUniforms(); // send P Matrix & MVMatrix to gpu
}

function loadSpheres(){
  var latitudeBands = 30;
  var longitudeBands = 30;
  var inputSpheres = getJSONFile(INPUT_SPHERES_URL, "spheres");
  var textureCoordData = [];
  var coordArray = []; // 1D array of vertex coords for WebGL
  var indexArray = []; // 1D array of vertex indices for WebGL
  var normalArray = [];

  // Source: http://learningwebgl.com/blog/?p=1253
  if (inputSpheres != String.null) {
    var n = inputSpheres.length;

    for (var s=0; s<n; s++) {
      // For sphere
      var center = [inputSpheres[s].x, inputSpheres[s].y, inputSpheres[s].z];
      var sphereRadius = inputSpheres[s].r;
      // var diffuse = inputSpheres[s].diffuse;
      // var ambient = inputSpheres[s].ambient;
      // var specular = inputSpheres[s].specular;
      gl.uniform3fv(shaderProgram.ambientColorUniform, inputSpheres[s].ambient);
      gl.uniform3fv(shaderProgram.diffuseColorUniform, inputSpheres[s].diffuse);
      gl.uniform3fv(shaderProgram.specularColorUniform, inputSpheres[s].specular);
      gl.uniform1f(shaderProgram.shinenessUniform, inputSpheres[s].n);

      for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
          var phi = longNumber * 2 * Math.PI / longitudeBands;
          var sinPhi = Math.sin(phi);
          var cosPhi = Math.cos(phi);

          var x = cosPhi * sinTheta;
          var y = cosTheta;
          var z = sinPhi * sinTheta;
          var u = 1 - (longNumber / longitudeBands);
          var v = 1 - (latNumber / latitudeBands);

          normalArray.push(x);
          normalArray.push(y);
          normalArray.push(z);
          textureCoordData.push(u);
          textureCoordData.push(v);
          coordArray.push(sphereRadius * x);
          coordArray.push(sphereRadius * y);
          coordArray.push(sphereRadius * z);
        }
      }

      for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
          var first = (latNumber * (longitudeBands + 1)) + longNumber;
          var second = first + longitudeBands + 1;
          indexArray.push(first);
          indexArray.push(second);
          indexArray.push(first + 1);

          indexArray.push(second);
          indexArray.push(second + 1);
          indexArray.push(first + 1);

        }
      }
      createMVMatrix(center, true);
      var triBuffer = new TriangleBuffer(gl, mvMatrix, shaderProgram);
      triBuffer.UpdateShaderData(coordArray, indexArray, normalArray);
      triBuffer.DrawElements();
    } // for all spheres ?
  } // end if spheresURL is null
} // endfunction

// read triangles in, load them into webgl buffers
function loadTriangles() {
  var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

  if (inputTriangles != String.null) {
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set

    for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
      var vtxToAdd = []; // vtx coords to add to the coord array
      var indexOffset = vec3.create(); // the index offset for the current set
      var triToAdd = vec3.create(); // tri indices to add to the index array
      var normalToAdd = [];
      var coordArray = []; // 1D array of vertex coords for WebGL
      var indexArray = []; // 1D array of vertex indices for WebGL
      var normalArray = [];

      // set up the vertex coord array
      for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
        vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
        normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
        normalArray.push(normalToAdd[0]);
        normalArray.push(normalToAdd[1]);
        normalArray.push(normalToAdd[2]);
        coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
      } // end for vertices in set

      // set up the triangle index array, adjusting indices across sets
      for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
        vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
        indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
      } // end for triangles in set

      gl.uniform3fv(shaderProgram.ambientColorUniform, inputTriangles[whichSet].material.ambient);
      gl.uniform3fv(shaderProgram.diffuseColorUniform, inputTriangles[whichSet].material.diffuse);
      gl.uniform3fv(shaderProgram.specularColorUniform, inputTriangles[whichSet].material.specular);
      gl.uniform1f(shaderProgram.shinenessUniform, 5.0);

      createMVMatrix(translation, true);
      var triBuffer = new TriangleBuffer(gl, mvMatrix, shaderProgram);
      triBuffer.UpdateShaderData(coordArray, indexArray, normalArray);
      triBuffer.DrawElements();

    } // end for each triangle set
    //triBufferSize *= 3; // now total number of indices
  } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

  // define fragment shader in essl using es6 template strings
  var fShaderCode = `
        varying lowp vec4 vColor;

        precision mediump float;

        void main(void) {
            gl_FragColor = vColor;
        }
    `;

  // define vertex shader in essl using es6 template strings
  var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec4 vertexColor;
        attribute vec3 vertexNormal;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform mat3 uNMatrix;
        uniform vec3 uAmbientColor;
        uniform vec3 uDiffuseColor;
        uniform vec3 uSpecularColor;
        uniform bool uUseLighting;
        uniform vec3 uPointLightingLocation;
        uniform vec4 uEyePosition;
        uniform float uShineness;
        varying lowp vec4 vColor;

        void main(void) {
            vec4 mvPosition = uMVMatrix * vec4(vertexPosition, 1.0);
            gl_Position = uPMatrix * mvPosition;
            vec3 vLightsColor;
            if (!uUseLighting) {
              vLightsColor = uDiffuseColor;
            } else {
              vec3 lightDirection = normalize(uPointLightingLocation - mvPosition.xyz);
              vec3 transformedNormal = uNMatrix * vertexNormal;
              float diffuseFactor = max(dot(transformedNormal, lightDirection), 0.0);
              vec3 pointVector = normalize( uEyePosition.xyz - mvPosition.xyz);
              vec3 H = normalize(lightDirection + pointVector);
              float specularFactor = pow(max(dot(transformedNormal, H), 0.0), uShineness);
              vLightsColor = uAmbientColor + uDiffuseColor * diffuseFactor + specularFactor * uSpecularColor;
            }
            vColor = vec4(clamp(vLightsColor, 0.0, 1.0), 1.0);

        }
    `;
  try {
    // console.log("fragment shader: "+fShaderCode);
    var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
    gl.shaderSource(fShader,fShaderCode); // attach code to shader
    gl.compileShader(fShader); // compile the code for gpu execution

    // console.log("vertex shader: "+vShaderCode);
    var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
    gl.shaderSource(vShader,vShaderCode); // attach code to shader
    gl.compileShader(vShader); // compile the code for gpu execution

    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
      throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
      gl.deleteShader(fShader);
    } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
      throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
      gl.deleteShader(vShader);
    } else { // no compile errors
      shaderProgram = gl.createProgram(); // create the single shader program
      gl.attachShader(shaderProgram, fShader); // put frag shader in program
      gl.attachShader(shaderProgram, vShader); // put vertex shader in program
      gl.linkProgram(shaderProgram); // link program into gl context

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
        throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
      } else { // no shader program link errors
        gl.useProgram(shaderProgram); // activate shader program (frag and vert)
        shaderProgram.vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition");// get pointer to vertex shader input
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttrib); // input to shader from array
        // get the pointer to vertex color inputTriangles
        // vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
        // gl.enableVertexAttribArray(vertexColorAttrib);

        shaderProgram.vertexNormalAttrib = gl.getAttribLocation(shaderProgram, "vertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttrib);

        //shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPosition");
        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.diffuseColorUniform = gl.getUniformLocation(shaderProgram, "uDiffuseColor");
        shaderProgram.specularColorUniform = gl.getUniformLocation(shaderProgram, "uSpecularColor");
        shaderProgram.uEyePositionUniform = gl.getUniformLocation(shaderProgram, "uEyePosition");
        shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
        shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
        shaderProgram.shinenessUniform = gl.getUniformLocation(shaderProgram, "uShineness");

      } // end if no shader program link errors
    } // end if no compile errors
  } // end try

  catch(e) {
    console.log(e);
  } // end catch
} // end setup shaders

function parse_val(id, def){
  if (document.getElementById(id).value == "")
    return def;
  else
    return parseFloat(document.getElementById(id).value);
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
  lighting = (document.getElementById("e_lights").checked);
  setupWebGL(); // set up the webGL environment
  setupShaders(); // setup the webGL shaders
  createPMatrix(); // build the initial setup
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
  gl.uniform1i(shaderProgram.useLightingUniform, lighting);
  gl.uniform3fv(shaderProgram.pointLightingLocationUniform, [2,4,-0.5]);
  gl.uniform4fv(shaderProgram.uEyePositionUniform, Eye);
  loadSpheres();
  loadTriangles(); // load in the triangles from tri file

  // setupBuffer();
  // renderTriangles(); // draw the triangles using webGL
} // end main
