# CSC 561 Computer Graphics
# Rasterization
## By Ritesh Gajare

**The project assignment details are as follows based:**

1. Rendering the input triangle without lighting.
We can use the lighting toggle switch to on & off the lighting.
2. Rendering Spheres.
3. Using the light switch, spheres and triangles can be rendered with lights.
4. Interactively change the view of the spheres and triangles using the key binding specified. [Demo](https://plus.google.com/100523281871704763068/posts/PqhFxaEn4zq)
5. Interactively transform the spheres and triangles around the axis of view centered around the object. `Space` do work, but viewport should be on focus or else it presses the `Render` button  [Demo](https://plus.google.com/100523281871704763068/posts/UA19zzVTaHa)
6. Smooth shading with vertex normals is used for rendering the spheres and triangles. During lighting, we use these normals rather than the normal of the triangles. This is same as calculating the normal by subtracting the vertex from centre. **(Extra Credit)**
7. Used quaternion matrices to calculate the rotation of the objects. (Avoid gimbal lock) **(Extra Credit)**
8. Class forum participation.

_Disclaimer: Mac doesn't have `backspace` key, used `delete` instead._

_References: Wikus Coetser, http://learningwebgl.com/blog/_
