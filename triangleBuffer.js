TriangleBuffer = function (gl, mvMatrix, shaderProgram) {

  this.gl = gl;
  this.mvMatrix = mvMatrix;
  this.shaderProgram = shaderProgram;

}

TriangleBuffer.prototype.UpdateShaderData = function (coordArray, indexArray, normalArray) {
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

}

TriangleBuffer.prototype.DrawElements = function () {
  this.gl.bindBuffer(gl.ARRAY_BUFFER,this.vertexBuffer); // activate
  this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttrib,this.vertexBuffer.itemSize,this.gl.FLOAT,false,0,0); // feed

  this.gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
  this.gl.vertexAttribPointer(this.shaderProgram.vertexNormalAttrib,this.normalBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
  // triangle buffer: activate and render

  this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.triangleBuffer); // activate
  this.gl.drawElements(this.gl.TRIANGLES,this.triangleBuffer.numItems,this.gl.UNSIGNED_SHORT,0); // render

}
