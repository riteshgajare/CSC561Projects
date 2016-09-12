/* classes */

// Color constructor
class Color {
  constructor(r,g,b,a) {
    try {
      if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
        throw "color component not a number";
      else if ( (r<0) || (g<0) || (b<0) || (a<0))
        throw "color component less than 0";
      else if ((r>255) || (g>255) || (b>255) || (a>255))
        throw "color component bigger than 255";
      else {
          this.r = r; this.g = g; this.b = b; this.a = a;
      }
  } // end try
  catch (e) {
    console.log(e);
  }
} // end Color constructor

  // Color change method
  change(r,g,b,a) {
    try {
      if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
        throw "color component not a number";
      else if ((r<0) || (g<0) || (b<0) || (a<0))
        throw "color component less than 0";
      else if ((r>255) || (g>255) || (b>255) || (a>255))
        throw "color component bigger than 255";
      else {
        this.r = r; this.g = g; this.b = b; this.a = a;
      }
    } // end throw
    catch (e) {
      console.log(e);
    }
  } // end Color change method

  add(r,b,g) {
    this.change(this.r+r, this.b+b, this.g+g, 255);
  }
}// end color class

class ViewPane {
  constructor(width, height, eye, look_up, look_at, d, c) {
    this.w = width;
    this.h = height;
    this.eye = eye;
    this.look_up = look_up;
    this.look_at = look_at;
    this.d = d;
    this.c = c;
    this.ul = [c[0] - 0.5, c[1] + 0.5, c[2]];
  }
  // get the real coord of the pixels on view pane
  getRealCoord(coord) {
    return [ this.ul[0] + (coord[0]/this.w), this.ul[1] - (coord[1]/this.h), this.ul[2]]
  }

}

var vp;
var pixels = [];

/* utility functions */

// draw a pixel at x,y using color
function drawPixel(imagedata,x,y,color) {
  try {
    if ((typeof(x) !== "number") || (typeof(y) !== "number"))
      throw "drawpixel location not a number";
    else if ((x<0) || (y<0) || (x>=imagedata.width) || (y>=imagedata.height))
      throw "drawpixel location outside of image";
    else if (color instanceof Color) {
      var pixelindex = (y*imagedata.width + x) * 4;
      imagedata.data[pixelindex] = color.r;
      imagedata.data[pixelindex+1] = color.g;
      imagedata.data[pixelindex+2] = color.b;
      imagedata.data[pixelindex+3] = color.a;
    } else
      throw "drawpixel color is not a Color";
  } // end try
  catch(e) {
    console.log(e);
  }
} // end drawPixel

// get the input spheres from the standard class URL
function getInputSpheres() {
  const INPUT_SPHERES_URL =
  "https://ncsucgclass.github.io/prog1/spheres.json";

  // load the spheres file
  var httpReq = new XMLHttpRequest(); // a new http request
  httpReq.open("GET",INPUT_SPHERES_URL,false); // init the request
  httpReq.send(null); // send the request
  var startTime = Date.now();
  while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
    if ((Date.now()-startTime) > 3000)
      break;
  } // until its loaded or we time out after three seconds
  if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE)) {
    console.log*("Unable to open input spheres file!");
    return String.null;
  } else
    return JSON.parse(httpReq.response);
} // end get input spheres

// Mathematics class for doing relavant work
class Maths {
  // Calc dot product of A&B == A.B
  static dotproduct(x,y) {
    return x[0]*y[0] + x[1]*y[1] + x[2]*y[2];
  }
  // Calc the magnitude of the vector
  static magnitude(a) {
    var mag = this.dotproduct(a,a);
    if (mag < 0)
      throw "magnitude can't be negative";
    return Math.sqrt(mag);
  }
  // Calc the real roots for the equation ax2+bx+c=0
  static realroots(a, b, c) {
    return (b*b >= (4*a*c));
  }
  // Calc the least root of the equation ax2+bx+c=0
  static leastroot(a,b,c) {
    return (0 - (b + Math.sqrt((b*b - 4*a*c))))/(2*a);

  }
  // Calc A-B
  static minus(a,b) {
    return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  }
  // Calc A+B
  static add(a,b) {
    return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
  }
  static mul(a,b) {
    return [a*b[0], a*b[1], a*b[2]];
  }

  static unitvector(v1,v2) {
    var ux = v2[0] - v1[0];
    var uy = v2[1] - v1[1];
    var uz = v2[2] - v1[2];
    var mag = this.magnitude([ux, uy, uz]);
    return [ux/mag, uy/mag, uz/mag];
  }
}

function getInputTriangles() {
  const INPUT_SPHERES_URL =
  "https://ncsucgclass.github.io/prog1/spheres.json";
  // load the spheres file
  var httpReq = new XMLHttpRequest(); // a new http request
  httpReq.open("GET",INPUT_SPHERES_URL,false); // init the request
  httpReq.send(null); // send the request
  var startTime = Date.now();
  while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
    if ((Date.now()-startTime) > 3000)
      break;
  } // until its loaded or we time out after three seconds
  if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE)) {
    console.log*("Unable to open input spheres file!");
    return String.null;
  } else
    return JSON.parse(httpReq.response);
}

function raycasting(context) {
  var inputSpheres = getInputSpheres();
  var inputTriangles = getInputTriangles();
  var black = new Color(0,0,0,255);
  var c = new Color(0,0,0,0); // the color at the pixel: black
  var w = context.canvas.width;
  var h = context.canvas.height;
  // Loop over the pixels and compute real coords of all pixels and save it in a list
  // console.log("number of spheres: " + n);
  var imagedata = context.createImageData(w,h);
  const PIXEL_DENSITY = 1;
  var numCanvasPixels = Math.round((w*h)*PIXEL_DENSITY);
  var numCanvasHeightPixel = Math.round(h*Math.sqrt(PIXEL_DENSITY));
  // console.log("Canvas Pixels: " + numCanvasPixels + " : " + numCanvasHeightPixel);
  // create a function to get real world co-ordinates for the screen
  // Loop over the spheres, draw each in 2d
  if (inputSpheres != String.null) {
    var n = inputSpheres.length;
    for (var s=0; s<n; s++) {
      // For sphere
      var Ce = [inputSpheres[s].x, inputSpheres[s].y, inputSpheres[s].z];
      var E_C = Maths.minus(vp.eye, Ce);
      // For sphere : end
      for (var p=0; p<numCanvasPixels; p++) {
        if (s == 0) {
          var px = Math.ceil(p / numCanvasHeightPixel);
          var py = p % numCanvasHeightPixel;
          var coord = [px, py];
          var real = vp.getRealCoord(coord);
          pixels[p] = [real[0], real[1], real[2], px, py, 0];
          //black background
          drawPixel(imagedata, Math.round(px), Math.round(py), black);
        }
        var real_coord = [pixels[p][0], pixels[p][1], pixels[p][2]];

        var D = Maths.minus(real_coord, vp.eye);
        var A = Maths.dotproduct(D,D);
        var B = 2* Maths.dotproduct(D, E_C);
        var C = Maths.dotproduct(E_C,E_C) - (inputSpheres[s].r*inputSpheres[s].r);
        if (Maths.realroots(A,B,C)) {
          //drawPixel(imagedata, Math.round(pixels[p][3]), Math.round(pixels[p][4]), c);
          var t = Maths.leastroot(A,B,C);
          //console.log(t);
          if (t > pixels[p][5] && t > 1) {
            pixels[p][5] = t;
            // Diffuse shading ==>
            var ps = Maths.add(vp.eye, Maths.mul(t,D));
            var N = Maths.unitvector(Ce, ps);
            var L = Maths.unitvector(ps, [2,4,-0.5]);
            var factor = Maths.dotproduct(N,L);
            var I = [0,0,0];
            I = Maths.add(I, inputSpheres[s].ambient);
            I = Maths.add(I, Maths.mul(factor, inputSpheres[s].diffuse));
            // <== End diffuse shading
            // Specular highlights ==>
            var R = Maths.minus(Maths.mul(2*factor,N), L);
            var V = Maths.unitvector(ps, vp.eye);
            factor = Math.pow(Maths.dotproduct(R,V), 5);
            I = Maths.add(I, Maths.mul(factor, inputSpheres[s].specular));
            // Normalise or Max it out
            for(var i = 0; i < 3; i++) {
              if (I[i] > 1)
                I[i] = 0.9;
              if (I[i] < 0)
                I[i] = 0.034;
            }
            I = Maths.mul(255, I);
            c.change(I[0], I[1], I[2], 255);
             // <== Specular highlights
            drawPixel(imagedata, Math.round(pixels[p][3]), Math.round(pixels[p][4]), c);
          }
        }
      }
    }
    if (inputTriangles != String.null) {
      var n = inputTriangles.length;
      // Loop over the triangles, draw each in 2d
      for (var s=0; s<n; s++) {
        // For sphere
        for (var p=0; p<numCanvasPixels; p++) {
          var real_coord = [pixels[p][0], pixels[p][1], pixels[p][2]];
          var D = Maths.minus(real_coord, vp.eye);
          var A = Maths.dotproduct(D,D);
          var B = 2* Maths.dotproduct(D, E_C);
          var C = Maths.dotproduct(E_C,E_C) - (inputSpheres[s].r*inputSpheres[s].r);
          if (Maths.realroots(A,B,C)) {
            //drawPixel(imagedata, Math.round(pixels[p][3]), Math.round(pixels[p][4]), c);
            var t = Maths.leastroot(A,B,C);
            //console.log(t);
            if (t > pixels[p][5] && t > 1) {
              pixels[p][5] = t;
              // Diffuse shading ==>
              var ps = Maths.add(vp.eye, Maths.mul(t,D));
              var N = Maths.unitvector(Ce, ps);
              var L = Maths.unitvector(ps, [2,4,-0.5]);
              var factor = Maths.dotproduct(N,L);
              var I = [0,0,0];
              I = Maths.add(I, inputSpheres[s].ambient);
              I = Maths.add(I, Maths.mul(factor, inputSpheres[s].diffuse));
              // <== End diffuse shading
              // Specular highlights ==>
              var R = Maths.minus(Maths.mul(2*factor,N), L);
              var V = Maths.unitvector(ps, vp.eye);
              factor = Math.pow(Maths.dotproduct(R,V), 5);
              I = Maths.add(I, Maths.mul(factor, inputSpheres[s].specular));
              // Normalise or Max it out
              for(var i = 0; i < 3; i++) {
                if (I[i] > 1)
                  I[i] = 0.9;
                if (I[i] < 0)
                  I[i] = 0.034;
              }
              I = Maths.mul(255, I);
              c.change(I[0], I[1], I[2], 255);
              // <== Specular highlights
              drawPixel(imagedata, Math.round(pixels[p][3]), Math.round(pixels[p][4]), c);
            }
          }
        }
      }

    context.putImageData(imagedata, 0, 0);
  }
}

/* main -- here is where execution begins after window load */

function main() {

  // Get the canvas and context
  var canvas = document.getElementById("viewport");
  var context = canvas.getContext("2d");
  var eye = [0.5, 0.5, -0.5];
  var look_up = [0, 1, 0];
  var look_at = [0, 0, 1];
  var d = 0.5;
  var c = [0.5, 0.5, 0];
  vp = new ViewPane (canvas.width, canvas.height, eye, look_up, look_at, d, c);
  // Render image using ray casting techniques.
  raycasting(context);
}
