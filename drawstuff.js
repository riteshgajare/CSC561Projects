/* classes */

// Color constructor
class Color {
  constructor(r,g,b,a) {
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
} // end color class


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

// draw random pixels
function drawRandPixels(context) {
  var c = new Color(0,0,0,0); // the color at the pixel: black
  var w = context.canvas.width;
  var h = context.canvas.height;
  var imagedata = context.createImageData(w,h);
  const PIXEL_DENSITY = 0.01;
  var numPixels = (w*h)*PIXEL_DENSITY;

  // Loop over 1% of the pixels in the image
  for (var x=0; x<numPixels; x++) {
    c.change(Math.random()*255,Math.random()*255,
             Math.random()*255,255); // rand color
    drawPixel(imagedata,
              Math.floor(Math.random()*w),
              Math.floor(Math.random()*h),
              c);
  } // end for x
  context.putImageData(imagedata, 0, 0);
} // end draw random pixels

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

// put random points in the spheres from the class github
function drawRandPixelsInInputSpheres(context) {
  var inputSpheres = getInputSpheres();
  var w = context.canvas.width;
  var h = context.canvas.height;
  var imagedata = context.createImageData(w,h);
  const PIXEL_DENSITY = 0.1;
  var numCanvasPixels = (w*h)*PIXEL_DENSITY;

  if (inputSpheres != String.null) {
    var x = 0; var y = 0; // pixel coord init
    var cx = 0; var cy = 0; // init center x and y coord
    var sphereRadius = 0; // init sphere radius
    var numSpherePixels = 0; // init num pixels in sphere
    var c = new Color(0,0,0,0); // init the sphere color
    var n = inputSpheres.length;
    //console.log("number of spheres: " + n);

    // Loop over the spheres, draw rand pixels in each
    for (var s=0; s<n; s++) {
      cx = w*inputSpheres[s].x; // sphere center x
      cy = h*inputSpheres[s].y; // sphere center y
      sphereRadius = Math.round(w*inputSpheres[s].r); // radius
      numSpherePixels = sphereRadius*4*Math.PI; // sphere area
      numSpherePixels *= PIXEL_DENSITY; // percentage of sphere on
      numSpherePixels = Math.round(numSpherePixels);
      //console.log("sphere radius: "+sphereRadius);
      //console.log("num sphere pixels: "+numSpherePixels);
      c.change(
        inputSpheres[s].diffuse[0]*255,
        inputSpheres[s].diffuse[1]*255,
        inputSpheres[s].diffuse[2]*255,
        255); // rand color
      for (var p=0; p<numSpherePixels; p++) {
        do {
          x = Math.random()*2 - 1; // in unit square
          y = Math.random()*2 - 1; // in unit square
        } while (Math.sqrt(x*x + y*y) > 1)
        drawPixel(imagedata,
                  cx+Math.round(x*sphereRadius),
                  cy+Math.round(y*sphereRadius),c);
        //console.log("color: ("+c.r+","+c.g+","+c.b+")");
        //console.log("x: "+Math.round(w*inputSpheres[s].x));
        //console.log("y: "+Math.round(h*inputSpheres[s].y));
      } // end for pixels in sphere
    } // end for spheres
    context.putImageData(imagedata, 0, 0);
  } // end if spheres found
} // end draw rand pixels in input spheres

// draw 2d projections read from the JSON file at class github
function drawInputSpheresUsingArcs(context) {
  var inputSpheres = getInputSpheres();


  if (inputSpheres != String.null) {
    var c = new Color(0,0,0,0); // the color at the pixel: black
    var w = context.canvas.width;
    var h = context.canvas.height;
    var n = inputSpheres.length;
    //console.log("number of spheres: " + n);

    // Loop over the spheres, draw each in 2d
    for (var s=0; s<n; s++) {
      context.fillStyle =
        "rgb(" + Math.floor(inputSpheres[s].diffuse[0]*255)
        +","+ Math.floor(inputSpheres[s].diffuse[1]*255)
        +","+ Math.floor(inputSpheres[s].diffuse[2]*255) +")"; // rand color
      context.beginPath();
      context.arc(
        Math.round(w*inputSpheres[s].x),
        Math.round(h*inputSpheres[s].y),
        Math.round(w*inputSpheres[s].r),
        0,2*Math.PI);
      context.fill();
      //console.log(context.fillStyle);
      //console.log("x: "+Math.round(w*inputSpheres[s].x));
      //console.log("y: "+Math.round(h*inputSpheres[s].y));
      //console.log("r: "+Math.round(w*inputSpheres[s].r));
    } // end for spheres
  } // end if spheres found
} // end draw input spheres


/* main -- here is where execution begins after window load */

function main() {

  // Get the canvas and context
  var canvas = document.getElementById("viewport");
  var context = canvas.getContext("2d");

  // Create the image
  //drawRandPixels(context);
  // shows how to draw pixels

  drawRandPixelsInInputSpheres(context);
  // shows how to draw pixels and read input file

  //drawInputSpheresUsingArcs(context);
  // shows how to read input file, but not how to draw pixels
}
