/* classes */
// Using mathjs library for doing triangle rendering. Since it has lot of complex maths and will be skipped.
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
  constructor(width, height, eye, look_up, look_at, d, c, asp_x, asp_y) {
    this.w = width;
    this.h = height;
    this.eye = eye;
    if ((this.w != this.h) && asp_x==1 && asp_y==1){
      asp_x = this.w/Math.min(this.w,this.h);
      asp_y = this.h/Math.min(this.w,this.h);
    }
    this.asp_x = asp_x;
    this.asp_y = asp_y;
    this.look_up = look_up;
    this.look_at = look_at;
    this.d = d;
    this.c = c;
    this.ul = [c[0] - 0.5, c[1] + 0.5, c[2]];
  }
  // get the real coord of the pixels on view pane
  getRealCoord(coord) {
    var n = Maths.unitvector(this.look_at, this.eye);
    var u = Maths.normalise(math.cross(n, this.look_up));
    var v = math.cross(u,n);
    this.c = Maths.minus(this.eye, Maths.mul(this.d,n)); //c=eye-d*n
    this.ul = Maths.add(Maths.add(this.c, Maths.mul(this.asp_x/2, u)), Maths.mul(this.asp_y/2, v)); // l=c-w/2u-h/2v
    // var real_coord =
    return  Maths.minus(Maths.minus(this.ul,Maths.mul(coord[0]*this.asp_x/this.w, u)), Maths.mul(coord[1]*this.asp_y/this.h, v));
    //return [ this.ul[0] + (coord[0]/this.w), this.ul[1] - (coord[1]/this.h), this.ul[2]];
  }
}

var vp;
var pixels = [];
var external_lighting;
var render_triangles;
var blinn_phong;
var custom_Lights;
var shadows;
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

function connect(URL) {
  var httpReq = new XMLHttpRequest(); // a new http request
  httpReq.open("GET",URL,false); // init the request
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

// get the input spheres from the standard class URL
function getInputSpheres() {
  const INPUT_SPHERES_URL =
        "https://ncsucgclass.github.io/prog1/spheres.json";
  return connect(INPUT_SPHERES_URL);
} // end get input spheres

function getLights() {
  const INPUT_LIGHTS_URL =
        "https://ncsucgclass.github.io/prog1/lights.json";
  // load the lights file
  return connect(INPUT_LIGHTS_URL);
}

function getInputTriangles() {
  const INPUT_TRIANGLES_URL =
        "https://raw.githubusercontent.com/riteshgajare/CSC561Projects/master/triangles.json";
  // load the triangles file
  return connect(INPUT_TRIANGLES_URL);
}

function raycasting(context) {
  var inputSpheres = getInputSpheres();
  var inputTriangles = getInputTriangles();
  var lights = getLights();
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
          var px = Math.floor(p / numCanvasHeightPixel);
          var py = p % numCanvasHeightPixel;
          var coord = [px, py];
          var real = vp.getRealCoord(coord);
          pixels[p] = [real[0], real[1], real[2], w-px, py, 1233];
          //black background
          drawPixel(imagedata, Math.round(px), Math.round(py), black);
        }
        var real_coord = [pixels[p][0], pixels[p][1], pixels[p][2]];
        var D = Maths.minus(real_coord, vp.eye);
        var A = Maths.dotproduct(D,D);
        var B = 2* Maths.dotproduct(D, E_C);
        var C = Maths.dotproduct(E_C,E_C) - (inputSpheres[s].r*inputSpheres[s].r);
         if (Maths.realroots(A,B,C)) {
          if (!blinn_phong) {
            c.change(inputSpheres[s].diffuse[0]*255, inputSpheres[s].diffuse[1]*255, inputSpheres[s].diffuse[2]*255, 255);
            drawPixel(imagedata, Math.round(pixels[p][3]), Math.round(pixels[p][4]), c);
            continue;
          }
          // if (numCanvasPixels/2 == p)
          //   break;
          var t = Maths.leastroot(A,B,C);
          //console.log(t);
          if (t < pixels[p][5] && t > 1) {
            pixels[p][5] = t;
            var ps = Maths.add(vp.eye, Maths.mul(t,D));
            var N = Maths.unitvector(Ce,ps); //FIXME
            var L = Maths.unitvector(ps,custom_Lights);
            var factor = Maths.dotproduct(N,L);
            // if (factor > 1)
            //   throw "factor > 1 not possible";
            var I = [0,0,0];
            I = Maths.add(I, inputSpheres[s].ambient);
            var InShadow = false;
            for(var sh_sp = 0; sh_sp<n; sh_sp++) {
              if (sh_sp != s && shadows) {
                var Ce_s = [inputSpheres[sh_sp].x, inputSpheres[sh_sp].y, inputSpheres[sh_sp].z];
                if (Maths.ray_sphere_intersect([2,4,-0.5],ps,Ce_s,inputSpheres[sh_sp].r)){
                  InShadow = true;
                  break;
                }
              }
            }
            if (!InShadow) {
              I = Maths.add(I, Maths.mul(factor, inputSpheres[s].diffuse));
              // <== End diffuse shading
              // Specular highlights ==>
              var R = Maths.minus(Maths.mul(2*factor,N), L);
              var V = Maths.unitvector(ps, vp.eye);//FIXME
              //L = Maths.mul(-1,L);
              var H = Maths.normalise(Maths.add(L,V));
              factor = Math.pow(Maths.dotproduct(N,H), inputSpheres[s].n);
              //factor = Math.pow(Maths.dotproduct(R,V), 5);
              // if (factor > 1)
              //   throw "factor > 1 not possible";
              I = Maths.add(I, Maths.mul(factor, inputSpheres[s].specular));
              // External light sources
            }
            if (external_lighting) {
              for(var ls = 0; ls < lights.length; ls++) {
                L = Maths.unitvector(ps, [lights[ls].x, lights[ls].y, lights[ls].z]);
                var factor = Maths.dotproduct(N,L);
                I = Maths.add(I, math.dotMultiply(lights[ls].ambient, inputSpheres[s].ambient));
                InShadow = false;
                for(var sh_sp = 0; sh_sp < n; sh_sp++) {
                  if (sh_sp != s && shadows) {
                    var Ce_s = [inputSpheres[sh_sp].x, inputSpheres[sh_sp].y, inputSpheres[sh_sp].z];
                    if (Maths.ray_sphere_intersect([lights[ls].x, lights[ls].y, lights[ls].z],ps,Ce_s,inputSpheres[sh_sp].r)){
                      InShadow = true;
                      break;
                    }
                  }
                }
                if (!InShadow){
                  I = Maths.add(I, Maths.mul(factor, math.dotMultiply(lights[ls].diffuse, inputSpheres[s].diffuse)));
                  var H = Maths.normalise(Maths.add(L,V));
                  factor = Math.pow(Maths.dotproduct(N,H), inputSpheres[s].n);
                  I = Maths.add(I, Maths.mul(factor, math.dotMultiply(lights[ls].specular, inputSpheres[s].specular)));
                }
              } // Lights iterator
            }
            //Clamp intensity values
            for(var i = 0; i < 3; i++) {
              if (I[i] > 1)
                I[i] = 1;
              if (I[i] < 0)
                I[i] = 0.05;
            } // Clamp intensity values
            I = Maths.mul(255, I);
            c.change(I[0], I[1], I[2], 255);
            // <== Specular highlights
            drawPixel(imagedata, Math.round(pixels[p][3]), Math.round(pixels[p][4]), c);
          }
        }
      }
    }
  }

  // If triangle is found
  //  then:
  if (render_triangles && (inputTriangles != String.null)) {
    var n = inputTriangles.length;
    var ver = inputTriangles[1].vertices;
    // Loop over the triangles, draw each in 2d
    // FIXME made s < 1 should be s<n
    for (var s=0; s<1; s++) {
      var inde = inputTriangles[2].triangles;
      var vertices = [ver[inde[s][0]], ver[inde[s][1]], ver[inde[s][2]]];
      // For triangles
      var A = [ [vertices[0][0], vertices[1][0], vertices[2][0]],
                [vertices[0][1], vertices[1][1], vertices[2][1]],
                [vertices[0][2], vertices[1][2], vertices[2][2]] ];
      var A_inv = math.inv(A);
      pixel:for (var p=0; p<numCanvasPixels; p++) {
        var real_coord = [pixels[p][0], pixels[p][1], pixels[p][2]];
        // Ray from eye to pixel;
        var v = Maths.minus(real_coord, vp.eye);
        var intersect = Maths.line_plane_intersection(vertices[0],vertices[1],vertices[2],vp.eye,v);
        var PP = math.multiply(A_inv, intersect);
        for(var i = 0; i < PP.length; i++) {
          if ((PP[i]<0))
            continue pixel;
        }
        var t = Maths.magnitude(Maths.minus(intersect, vp.eye));
        //console.log(t);
        if (t <= pixels[p][5] && t > 0.5) {
          pixels[p][5] = t;
          // Diffuse shading ==>
          var N = Maths.plane_normal(vertices[0],vertices[1],vertices[2]);
          var L = Maths.unitvector(intersect, custom_Lights);
          var factor = Maths.dotproduct(N,L);
          var I = [0,0,0];
          // if (intersect[0] < 0.5 && (real_coord[0] > 0.5))
          //   continue pixel;
          I = Maths.add(I, inputTriangles[s].material.ambient);
          I = Maths.add(I, Maths.mul(factor, inputTriangles[s].material.diffuse));
          // <== End diffuse shading
          // Specular highlights ==>
          //var R = Maths.minus(Maths.mul(2*factor,N), L);
          var V = Maths.unitvector(intersect, vp.eye);
          var H = Maths.normalise(Maths.add(L,V));
          factor = Math.pow(Maths.dotproduct(N,H), 5);
          //factor = Math.pow(Maths.dotproduct(R,V), 5);
          I = Maths.add(I, Maths.mul(factor, inputTriangles[s].material.specular));
          // // Normalise or Max it out
          if (external_lighting) {
            for(var ls = 0; ls < lights.length; ls++) {
              L = Maths.unitvector(intersect, [lights[ls].x, lights[ls].y, lights[ls].z]);
              var factor = Maths.dotproduct(N,L);
              I = Maths.add(I, math.dotMultiply(lights[ls].ambient, inputSpheres[s].ambient));
            }
          }
          for(var i = 0; i < 3; i++) {
            if (I[i] > 1)
              I[i] = 1;
            if (I[i] < 0)
              I[i] = 0;
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
/* main -- here is where execution begins after window load */

function parse_val(id, def){
  if (document.getElementById(id).value == "")
    return def;
  else
    return parseFloat(document.getElementById(id).value);
}

function main(render) {
  // Get the canvas and context
  var canvas = document.getElementById("viewport");
  var context = canvas.getContext("2d");
  var eye = [parse_val("x",0.5),parse_val("y", 0.5), parse_val("z",-0.5)];
  console.log(eye);
  canvas.width = parse_val("w", 512);
  canvas.height = parse_val("h", 512);
  if ((canvas.width==0) || canvas.height==0)
    throw "canvas width/height cannot be 0"
  external_lighting = (document.getElementById("e_lights").checked);
  render_triangles = (document.getElementById("triangles").checked);
  blinn_phong = (document.getElementById("blinn").checked);
  shadows = (document.getElementById("shadows").checked);
  custom_Lights = [parse_val("clx",2),parse_val("cly", 4), parse_val("clz",-0.5)];
  var look_at = [parse_val("lx",0.5),parse_val("ly", 0.5), parse_val("lz",1)];
  var look_up = [parse_val("vx",0),parse_val("vy", 1), parse_val("vz",0)];
  var d = parse_val("d",0.5);
  var c = [0.5, 0.5, eye[2]+0.5];
  vp = new ViewPane (canvas.width, canvas.height, eye, look_up, look_at, d, c, parse_val("asp_x", 1), parse_val("asp_y", 1));
  // Render image using ray casting techniques.
  if (render == 1)
    raycasting(context);
  console.log("Rendering complete.");
}
