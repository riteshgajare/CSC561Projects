/* GLOBAL CONSTANTS AND VARIABLES */
/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
// const INPUT_TRIANGLES_URL = "https://raw.githubusercontent.com/riteshgajare/CSC561Projects/master/ray-tracing/triangles.json"; //"https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
// const INPUT_SPHERES_URL = "https://raw.githubusercontent.com/riteshgajare/CSC561Projects/master/texturing/spheres.json"; //"https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
// const INPUT_LIGHTS_URL = "https://ncsucgclass.github.io/prog3/lights.json"
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc
const INPUT_LIGHTS_URL = "https://ncsucgclass.github.io/prog3/lights.json"

var lightAmbient = vec3.fromValues(1,1,1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1,1,1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1,1,1); // default light specular emission

var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var triangesloaded = false;
var shaderProgram;
var viewport;
var nextId = 0;
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
  var textureArray = [];
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
          textureArray.push(u);
          textureArray.push(v);
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
      triBuffer.UpdateShaderData(coordArray, indexArray, normalArray, textureArray);
      triBuffer.AddTexture(inputSpheres[s].texture);
      triBuffer.AddColor(inputSpheres[s].ambient,
                         inputSpheres[s].diffuse,
                         inputSpheres[s].specular,
                         inputSpheres[s].n,
                         //1);
                         inputSpheres[s].alpha);
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
      var textureArray = [];
      var texToAdd = [];
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
        texToAdd = inputTriangles[whichSet].uvs[whichSetVert];
        textureArray.push(texToAdd[0]);
        textureArray.push(texToAdd[1]);
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
      triBuffer.UpdateShaderData(coordArray, indexArray, normalArray, textureArray);
      triBuffer.AddTexture(inputTriangles[whichSet].material.texture);
      triBuffer.AddColor(inputTriangles[whichSet].material.ambient,
                         inputTriangles[whichSet].material.diffuse,
                         inputTriangles[whichSet].material.specular,
                         inputTriangles[whichSet].material.n,
                         inputTriangles[whichSet].material.alpha);
                         //1.0);

      viewport.AddBuffer(triBuffer);
    } // end for each triangle set
  } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

  // define fragment shader in essl using es6 template strings
  var fShaderCode = `
        precision mediump float;

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world

        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        uniform bool uNoTexture;
        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent

        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment

        varying vec2 vTextureCoord;
        uniform float uAlpha;
        uniform sampler2D uSampler;

        void main(void) {

            vec3 ambient = uAmbient*uLightAmbient;

            // diffuse term
            vec3 normal = normalize(vVertexNormal);
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term

            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term

            // combine to output color
            vec3 colorOut = ambient + diffuse + specular; // no specular yet
            if (uNoTexture) {
              gl_FragColor = vec4(colorOut, uAlpha);
            } else {
              vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
              gl_FragColor = vec4(textureColor.rgb * colorOut, textureColor.a * uAlpha);
            }
        }
    `;

  // define vertex shader in essl using es6 template strings
  var vShaderCode = `

        struct PointLight {
             vec3 position;
             vec3 ambient;
             vec3 diffuse;
             vec3 specular;
        };
        attribute vec3 vertexPosition;
        attribute vec3 vertexNormal;
        attribute vec2 textureCoord;

        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader
        varying vec2 vTextureCoord;

        uniform mat4 upvmMatrix;
        uniform mat4 umMatrix;
        uniform mat3 uNMatrix;

        // vec3 processLights(vec3 pointLightLocation, vec3 position, vec3 eyeposition) {
        //     vec3 output;

        //     vec3 lightDirection = normalize(pointLightLocation - position);
        //     vec3 transformedNormal = uNMatrix * vertexNormal;
        //     float diffuseFactor = max(dot(transformedNormal, lightDirection), 0.0);
        //     vec3 pointVector = normalize(  eyeposition - position);
        //     vec3 H = normalize(lightDirection + pointVector);
        //     float specularFactor = pow(max(dot(transformedNormal, H), 0.0), uShineness);
        //     vLightsColor = uAmbientColor + uDiffuseColor * diffuseFactor + specularFactor * uSpecularColor;

        // }

        void main(void) {
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(vertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(vertexPosition, 1.0);
            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(vertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z));
            vTextureCoord = textureCoord;
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
        shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "textureCoord")
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

        //shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.externalLightsUniform = gl.getUniformLocation(shaderProgram, "uExternalLights");
        shaderProgram.pvmMatrixUniform = gl.getUniformLocation(shaderProgram, "upvmMatrix");
        shaderProgram.mMatrixUniform = gl.getUniformLocation(shaderProgram, "umMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        // Phong shading
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbient");
        shaderProgram.diffuseColorUniform = gl.getUniformLocation(shaderProgram, "uDiffuse");
        shaderProgram.specularColorUniform = gl.getUniformLocation(shaderProgram, "uSpecular");
        shaderProgram.uEyePositionUniform = gl.getUniformLocation(shaderProgram, "uEyePosition");
        shaderProgram.shinenessUniform = gl.getUniformLocation(shaderProgram, "uShininess");
        // texture setup
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.alphaUniform = gl.getUniformLocation(shaderProgram, "uAlpha");
        shaderProgram.noTexture = gl.getUniformLocation(shaderProgram, "uNoTexture");
        // Ligthing setup
        shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uLightPosition");
        shaderProgram.lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
        shaderProgram.lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
        shaderProgram.lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular

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
  //Ligthing setup
  gl.uniform3fv(shaderProgram.lightAmbientULoc,lightAmbient); // pass in the light's ambient emission
  gl.uniform3fv(shaderProgram.lightDiffuseULoc,lightDiffuse); // pass in the light's diffuse emission
  gl.uniform3fv(shaderProgram.lightSpecularULoc,lightSpecular); // pass in the light's specular emission

  loadSpheres();
  loadTriangles(); // load in the triangles from tri file

  $(document).ready(function () {
    viewport.StartRenderLoop();
  });

} // end main
