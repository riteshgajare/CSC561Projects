// TriangleBuffer, Ritesh Gajare, 2016

/*
  TriangleBuffer class for doing the rendering
*/
const INPUT_REPO_URL = "https://ncsucgclass.github.io/prog3/"

TriangleBuffer = function (gl, vMatrix, shaderProgram, isSphere) {
  this.selected = false;
  this.gl = gl;
  this.mMatrix = vMatrix;
  this.originalMatrix = mat4.clone(vMatrix);
  this.shaderProgram = shaderProgram;
  this.normalMatrix = mat3.create();
  mat3.normalFromMat4(this.normalMatrix, this.mMatrix);
  this.lookAt = null;
  this.isSphere = isSphere;
  this.opaque = false;
  this.noTexture = false;
  this.id = nextId++;
}

TriangleBuffer.prototype.GetTranslation = function () {

  var triTrans = vec3.create(); //centroid
  mat4.getTranslation(triTrans,this.mMatrix);
  return triTrans;
}


TriangleBuffer.prototype.GetModelMatrix = function () {
  return this.mMatrix;
}

TriangleBuffer.prototype.SetModelMatrix = function (mMatrix) {
  this.mMatrix = mMatrix;
}

TriangleBuffer.prototype.SetPerspcMatrix = function (pMatrix) {
  this.pMatrix = pMatrix;
}

TriangleBuffer.prototype.Select = function() {
  this.selected = true;
}

TriangleBuffer.prototype.DeSelect = function() {
  this.selected = false;
}

TriangleBuffer.prototype.SetLookMatrix = function (lookAt) {
  this.lookAt = lookAt;
}

TriangleBuffer.prototype.IsOpaque = function () {
  return this.opaque;
}

TriangleBuffer.prototype.AddColor = function (ambient, diffuse, specular, shineness, alpha) {
  this.ambient = ambient;
  this.diffuse = diffuse;
  this.specular = specular;
  this.shineness = shineness;
  this.alpha = alpha;
  if (alpha == 1.0)
    this.opaque = true;
}

TriangleBuffer.prototype.AddTexture = function (imagesrc) {
  if (imagesrc == false) {
    this.noTexture = true;
    return;
  }
  var texture = this.gl.createTexture();
  texture.image = new Image();
  texture.image.crossOrigin = "anonymous";
  texture.image.onload = function () {

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  //texture.image.src = "https://raw.githubusercontent.com/gpjt/webgl-lessons/master/lesson11/moon.gif";//imagesrc;
  texture.image.src = INPUT_REPO_URL + imagesrc;
  this.texture = texture;
}

TriangleBuffer.prototype.UpdateShaderData = function (coordArray, indexArray, normalArray, textureArray) {
  this.coordArray = coordArray;
  this.indexArray = indexArray;
  this.normalArray = normalArray;

  this.vertexBuffer = this.gl.createBuffer(); // init empty vertex coord buffer
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer); // activate that buffer
  this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(coordArray),this.gl.STATIC_DRAW); // coords to that buffer
  this.vertexBuffer.itemSize = 3;
  this.vertexBuffer.numItems = this.coordArray.length/3;
  // send the triangle indices to webGL
  this.triangleBuffer = this.gl.createBuffer(); // init empty triangle index buffer
  this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer); // activate that buffer
  this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),this.gl.STATIC_DRAW); // indices to that buffer
  this.triangleBuffer.itemSize = 1;
  this.triangleBuffer.numItems = indexArray.length;

  this.normalBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.normalArray), this.gl.STATIC_DRAW);
  this.normalBuffer.itemSize = 3;
  this.normalBuffer.numItems = normalArray.length / 3;

  this.textureBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureArray), this.gl.STATIC_DRAW);
  this.textureBuffer.itemSize = 2;
  this.textureBuffer.numItems = textureArray.length / 2;
}

TriangleBuffer.prototype.Reset = function (){
  this.mMatrix = mat4.clone(this.originalMatrix);
}

TriangleBuffer.prototype.DrawElements = function () {

  var mvMatrix = mat4.create();
  mat4.mul(mvMatrix, this.lookAt, this.mMatrix);
  var pvmMatrix = mat4.create();
  mat4.mul(pvmMatrix, this.pMatrix, mvMatrix);

  this.gl.uniformMatrix4fv(this.shaderProgram.mMatrixUniform, false, this.mMatrix);
  this.gl.uniformMatrix4fv(this.shaderProgram.pvmMatrixUniform, false, pvmMatrix);

  this.gl.uniform3fv(this.shaderProgram.pointLightingLocationUniform, [2,4,-0.5] );

  var normalMatrix = mat3.create();
  mat3.normalFromMat4(this.normalMatrix, mvMatrix);
  this.gl.uniformMatrix3fv(this.shaderProgram.nMatrixUniform, false, this.normalMatrix);

  if (this.selected == true) {
    this.gl.uniform3fv(this.shaderProgram.ambientColorUniform, [0.5,0.5,0.5]);
    this.gl.uniform3fv(this.shaderProgram.diffuseColorUniform, [0.5,0.5,0.5]);
    this.gl.uniform3fv(this.shaderProgram.specularColorUniform, [0.0,0.0,0.0]);
    this.gl.uniform1f(this.shaderProgram.shinenessUniform, 1);
    this.gl.uniform1f(this.shaderProgram.alphaUniform, 1.0);
  }
  else {
    this.gl.uniform3fv(this.shaderProgram.ambientColorUniform, this.ambient);
    this.gl.uniform3fv(this.shaderProgram.diffuseColorUniform, this.diffuse);
    this.gl.uniform3fv(this.shaderProgram.specularColorUniform, this.specular);
    this.gl.uniform1f(this.shaderProgram.shinenessUniform, this.shineness);
    this.gl.uniform1f(this.shaderProgram.alphaUniform, this.alpha);
  }
  if (!this.noTexture) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);
    this.gl.uniform1i(this.shaderProgram.noTexture, 0);
  } else {
    this.gl.uniform1i(this.shaderProgram.noTexture, 1);
  }
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vertexBuffer); // activate
  this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttrib,this.vertexBuffer.itemSize,this.gl.FLOAT,false,0,0); // feed

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
  this.gl.vertexAttribPointer(this.shaderProgram.vertexNormalAttrib,this.normalBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
  // triangle buffer: activate and render

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
  this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.textureBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

  this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.triangleBuffer); // activate
  this.gl.drawElements(this.gl.TRIANGLES,this.triangleBuffer.numItems,this.gl.UNSIGNED_SHORT,0); // render

}
