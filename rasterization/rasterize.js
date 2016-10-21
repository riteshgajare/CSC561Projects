/* GLOBAL CONSTANTS AND VARIABLES */
/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
const INPUT_LIGHTS_URL = "https://ncsucgclass.github.io/prog2/lights.json"
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!

var shaderProgram;
var viewport;
//var viewport;
// ASSIGNMENT HELPER FUNCTIONS

function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
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
  gl.width = canvas.width;
  gl.height = canvas.height;
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

function loadSpheres(){
  var latitudeBands = 30;
  var longitudeBands = 30;
  var inputSpheres = getJSONFile(INPUT_SPHERES_URL, "spheres");
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

      var mMatrix = mat4.create();
      mat4.identity(mMatrix);
      //mat4.mul(vMatrix, oMatrix, vMatrix);
      mat4.translate(mMatrix,mMatrix,center); // model
      var triBuffer = new TriangleBuffer(gl, mMatrix, shaderProgram, true);
      triBuffer.UpdateShaderData(coordArray, indexArray, normalArray);
      triBuffer.AddColor(inputSpheres[s].ambient,
                         inputSpheres[s].diffuse,
                         inputSpheres[s].specular,
                         inputSpheres[s].n);
      viewport.AddBuffer(triBuffer);
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
      var centroid = [0,0,0];
      var vtxLength = inputTriangles[whichSet].vertices.length;
      // set up the vertex coord array
      for (whichSetVert=0; whichSetVert<vtxLength; whichSetVert++) {
        vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
        centroid = [centroid[0]+vtxToAdd[0],centroid[1]+vtxToAdd[1],centroid[2]+vtxToAdd[2]];
      }
      centroid = [centroid[0]/vtxLength,centroid[1]/vtxLength,centroid[2]/vtxLength]
      for (whichSetVert=0; whichSetVert<vtxLength; whichSetVert++) {
        vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
        normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
        normalArray.push(normalToAdd[0]);
        normalArray.push(normalToAdd[1]);
        normalArray.push(normalToAdd[2]);
        coordArray.push(vtxToAdd[0]-centroid[0],vtxToAdd[1]-centroid[1],vtxToAdd[2]-centroid[2]);
      } // end for vertices in set

      // set up the triangle index array, adjusting indices across sets
      for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
        vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
        indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
      } // end for triangles in set

      var mMatrix = mat4.create();
      mat4.identity(mMatrix);
      mat4.translate(mMatrix,mMatrix,centroid); // model
      var triBuffer = new TriangleBuffer(gl, mMatrix, shaderProgram, false);
      triBuffer.centroid = centroid;
      triBuffer.UpdateShaderData(coordArray, indexArray, normalArray);
      triBuffer.AddColor(inputTriangles[whichSet].material.ambient,
                         inputTriangles[whichSet].material.diffuse,
                         inputTriangles[whichSet].material.specular, 5.0);
      //triBuffer.DrawElements();
      viewport.AddBuffer(triBuffer);
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

        uniform vec3 uExternalLights[3];
        uniform mat4 uVMatrix;
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
            vec4 eyePosition = uVMatrix * uEyePosition;
            vec3 vLightsColor;
            if (!uUseLighting) {
              vLightsColor = uDiffuseColor;
            } else {
              vec3 lightDirection = normalize(uPointLightingLocation - mvPosition.xyz);
              vec3 transformedNormal = uNMatrix * vertexNormal;
              float diffuseFactor = max(dot(transformedNormal, lightDirection), 0.0);
              vec3 pointVector = normalize(  eyePosition.xyz - mvPosition.xyz);
              vec3 H = normalize(lightDirection + pointVector);
              float specularFactor = pow(max(dot(transformedNormal, H), 0.0), 5.0*uShineness);
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
        shaderProgram.vertexNormalAttrib = gl.getAttribLocation(shaderProgram, "vertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttrib);

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.externalLightsUniform = gl.getUniformLocation(shaderProgram, "uExternalLights");
        shaderProgram.vMatrixUniform = gl.getUniformLocation(shaderProgram, "uVMatrix");
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
  var lighting = (document.getElementById("e_lights").checked);
  setupWebGL(); // set up the webGL environment
  setupShaders(); // setup the webGL shaders
  //createPMatrix(); // build the initial setup
  gl.oMatrix = mat4.create();
  mat4.ortho(gl.oMatrix,WIN_LEFT,WIN_RIGHT,WIN_BOTTOM,WIN_TOP,WIN_Z,1);
  viewport = new Viewport(gl,shaderProgram);
  viewport.SetPosition([Eye[0], Eye[1], Eye[2]]);
  viewport.SetViewVector([0,0,1]);
  viewport.SetMoveSpeed(5);
  viewport.SetRotationsPerSecond(0.5);
  viewport.SetViewInformation(Math.PI/2, 0.1, 5.0, [0,0,0]);
  viewport.UpdateLookMatrix();
  // var inputLights = getJSONFile(INPUT_LIGHTS_URL, "lights");
  // if (inputLights != String.null) {
  //   for(var i = 0; i < inputLights.length; i++) {
  //     var light = vec3.fromValues();
  //   }
  // }
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
  gl.uniform1i(shaderProgram.useLightingUniform, lighting);
  loadSpheres();
  loadTriangles(); // load in the triangles from tri file
  viewport.StartRenderLoop();
} // end main
