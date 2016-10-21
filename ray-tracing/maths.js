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
    var det = Math.sqrt(b*b - 4*a*c);
    var t1 = (0 - (b + det))/(2*a);
    var t2 = (0 - (b - det))/(2*a);
    return ((t1<t2) ? t1 : t2);

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

  static normalise(v) {
    var mag = this.magnitude(v);
    return [v[0]/mag, v[1]/mag, v[2]/mag];
  }

  static unitvector(v1,v2) {
    var u = this.minus(v2,v1);
    return this.normalise(u)
  }

  static linepoint(p1,p2,t){
    return (Maths.add(p1, Maths.mul(t, Maths.minus(p2,p1))));
  }
  //v1,v2,v3: vertices of triangle
  static plane_normal(v1,v2,v3){
    var v12 = this.unitvector(v1,v2);
    var v23 = this.unitvector(v2,v3);
    return this.normalise(math.cross(v12,v23));
  }
  //v1,v2,v3: vertices of triangle
  //p: point from where ray origins
  //v: direction vector of ray
  static line_plane_intersection(v1,v2,v3,p,v){
    var n = this.plane_normal(v1,v2,v3);
    //v = this.normalise(v);
    var w = this.minus(v1,p);
    var k = this.dotproduct(w,n)/this.dotproduct(v,n);
    if (k < 0)
      throw "line plane wrong";
    if (k>=1)
      return (this.add(p,this.mul(k,v)));
    else
      console.log("Error");
    return null;
  }
  // projection of a on b;
  static projection(a,b){
    return this.mul(this.dotproduct(a,b)/this.dotproduct(b,b), b);
  }

  static barycentric(a,b,c,p){
    var ab = this.minus(a,b);
    var cb = this.minus(c,b);
    var ap = this.minus(a,p);
    var cp = this.minus(c,p);
    var bp = this.minus(b,p);
    var v1 = this.minus(ab, this.projection(ab,cb));
    var alpha = 1 - (this.dotproduct(v1,ap)/this.dotproduct(v1,ab));
    var v2 = this.minus(cb, this.projection(cb,ab));
    var beta = 1 - (this.dotproduct(v2,cp)/this.dotproduct(v2,cb));
    var v3 = this.minus(cb, this.projection(cb,ab));
    return [alpha, beta];
  }

  static barycentric_val(a,b,c,p){
    var ab = this.minus(b,a);
    var ac = this.minus(c,a);
    var ap = this.minus(p,a);

    return [this.projection(ap,ab), this.projection(ap,ac)];
    //var cb = this.minus(c,b);
    // var ap = this.minus(a,p);
    // var v = this.minus(ab, this.projection(ab,cb));
    // return (1 - (this.dotproduct(v,ap)/this.dotproduct(v,ab)));
  }

  static ray_sphere_intersect(p1,p2,Ce,r){
    var E_C = Maths.minus(p2, Ce);
    E_C[2] = -1*E_C[2];
    var D = Maths.minus(p1, p2);
    var A = Maths.dotproduct(D,D);
    var B = 2* Maths.dotproduct(D, E_C);
    var C = Maths.dotproduct(E_C,E_C) - (r*r);
    return (this.realroots(A,B,C));
   }
}
