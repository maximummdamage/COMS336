/**
 * Authors: Maxwell Dupree
 * Demo for Portals
 */

// vertex shader for texture 
const vTextureShaderSource = `
uniform mat4 transform;
attribute vec4 a_Position;
attribute vec4 a_Color;
attribute vec2 a_TexCoord;
varying vec2 fTexCoord;
varying vec4 fColor;
void main()
{
  // pass through so the value gets interpolated
  fTexCoord = a_TexCoord;
  fColor = a_Color;
  gl_Position = transform * a_Position;
}`;

// fragment shader for texture 
const fTextureShaderSource = `
precision mediump float;
uniform sampler2D sampler;
varying vec2 fTexCoord;
varying vec4 fColor;
void main()
{
  // sample from the texture at the interpolated texture coordinate,
  // use the texture's alpha to blend with given color
  vec4 texColor = texture2D(sampler, fTexCoord);
  float alpha = texColor.a;

  gl_FragColor = (1.0 - alpha) * fColor + alpha * texColor;
  gl_FragColor.a = 1.0;
}`;

// vertex shader for lighting
const vLightingShaderSource = `
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform mat3 normalMatrix;

uniform vec4 lightPosition;

attribute vec4 a_Position;
attribute vec3 a_Normal;

varying vec3 fL;
varying vec3 fN;
varying vec3 fV;

void main()
{
  // convert position to eye coords
  vec4 positionEye = view * model * a_Position;

  // vector to light
  vec4 lightEye = view * lightPosition;
  fL = (lightEye - positionEye).xyz;

  // transform normal matrix into eye coords
  fN = normalMatrix * a_Normal;

  // vector from vertex position toward view point
  fV = normalize(-(positionEye).xyz);

  gl_Position = projection * view * model * a_Position;
}`;

// fragment shader for lighting
const fLightingShaderSource = `
precision mediump float;

uniform mat3 materialProperties;
uniform mat3 lightProperties;
uniform float shininess;

varying vec3 fL;
varying vec3 fN;
varying vec3 fV;

void main()
{
  // normalize after interpolating
  vec3 N = normalize(fN);
  vec3 V = normalize(fV);
  vec3 L = normalize(fL);

  // reflected vector
  vec3 R = reflect(-L, N);

  mat3 products = matrixCompMult(lightProperties, materialProperties);
  vec4 ambientColor = vec4(products[0], 1.0);
  vec4 diffuseColor = vec4(products[1], 1.0);
  vec4 specularColor = vec4(products[2], 1.0);

  // Lambert's law, clamp negative values to zero
  float diffuseFactor = max(0.0, dot(L, N));

  // specular factor from Phong reflection model
  float specularFactor = pow(max(0.0, dot(V, R)), shininess);

  // add the components together
  vec4 color = specularColor * specularFactor + diffuseColor * diffuseFactor + ambientColor;

  // usually need to rescale somehow after adding
  gl_FragColor = color;
}`;

// vertex shader for color only TODO: remove if unnecessary
const vColorShaderSource = `
uniform mat4 transform;
attribute vec4 a_Position;
attribute vec4 a_Color;
varying vec4 color;
void main()
{
  color = a_Color;
  gl_Position = transform * a_Position;
}`;

// fragment shader for color only TODO: remove if unecessary
const fColorShaderSource = `
precision mediump float;
varying vec4 color;
void main()
{
  gl_FragColor = color;
}
`;

// white light (TODO: currently red) 
var lightPropElements = new Float32Array([
    0.2, 0.2, 0.2,
    0.7, 0.0, 0.0,
    0.7, 0.0, 0.0
]);

// fake looking white 
var matPropElements = new Float32Array([
    1, 1, 1,
    1, 1, 1,
    1, 1, 1
]);
var shininess = 20.0;

// vertices for portal 1
var portalVertices = new Float32Array([
    -3.0, -3.0, -3.0,
    3.0, -3.0, -3.0,
    3.0, 3.0, -3.0,
    -3.0, -3.0, -3.0,
    3.0, 3.0, -3.0,
    -3.0, 3.0, -3.0
]);

var portalColor = new Float32Array([
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0
])

var portalTexCoords = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 0,
    1, 1,
    0, 1
]);

// FBO width and height
var OFFSCREEN_WIDTH = 256;
var OFFSCREEN_HEIGHT = 256;

// Code for initializing FBO borrowed directly from teal book example (see chapter 10)
// Returns a handle to the FBO, with an added attribute called 'texture' which is the
// associated texture.  Depends on the two constants OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT.
function initFramebufferObject(gl) {
    var framebuffer, texture, depthBuffer;

    // Define the error handling function
    var error = function () {
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (texture) gl.deleteTexture(texture);
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    }

    // Create a frame buffer object (FBO)
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.log('Failed to create frame buffer object');
        return error();
    }

    // Create a texture object and set its size and parameters
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
        console.log('Failed to create texture object');
        return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    framebuffer.texture = texture; // Store the texture object

    // Create a renderbuffer object and Set its size and parameters
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer); // Bind the object to target
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    // Attach the texture and the renderbuffer object to the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check if FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    // Unbind the buffer object
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return framebuffer;
}

/* -- global variables -- */

// OpenGL context
var gl;

// framebuffer and associated texture
var fbo;

// handle for model
var theModel;

theModel = getModelData(new THREE.BoxGeometry(1, 1, 1));
var modelScale = new THREE.Matrix4();

// handle to buffer on GPU TODO
var vertexBuffer;
var vertexNormalBuffer;
var vertexColorBuffer;

var portalVertexBuffer;
var portalColorBuffer;

// handle to compiled shader on GPU TODO

// transformation matrices
var model = new THREE.Matrix4();

// animation globals
var paused = false;

// camera instead of view & projection
var camera = new Camera(30, 1.0);

//translate keypress events to strings
//from http://javascript.info/tutorial/keyboard-events
function getChar(event) {
    if (event.which == null) {
        return String.fromCharCode(event.keyCode) // IE
    } else if (event.which != 0 && event.charCode != 0) {
        return String.fromCharCode(event.which)   // the rest
    } else {
        return null // special key
    }
}

// handle keypresses TODO
function handleKeyPress(event) {
    var ch = getChar(event);
    if (camera.keyControl(ch)) return false;

    switch (ch) {
    }
}

// draw function TODO: consolidate code from both draw functions into this one, if repeat code occurs
function draw(useTexture) {
    return;
}

// code for rendering to FBO TODO
function drawToFbo() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
    gl.enable(gl.DEPTH_TEST);

    // set background to particular color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(textureShader);

    // get index for a_Position, a_Color, and a_TexCoord
    var positionIndex = gl.getAttribLocation(textureShader, 'a_Position');
    if (positionIndex < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }
    gl.enableVertexAttribArray(positionIndex);
    gl.bindBuffer(gl.ARRAY_BUFFER, portalVertexBuffer);
    gl.vertexAttribPointer(positionIndex, 3, gl.FLOAT, false, 0, 0);

    var colorIndex = gl.getAttribLocation(textureShader, 'a_Color');
    if (colorIndex < 0) {
        console.log('Failed to get the storage location of a_');
        return;
    }
    gl.enableVertexAttribArray(colorIndex);
    gl.bindBuffer(gl.ARRAY_BUFFER, portalColorBuffer);
    gl.vertexAttribPointer(colorIndex, 4, gl.FLOAT, false, 0, 0);

    var texCoordIndex = gl.getAttribLocation(textureShader, 'a_TexCoord');
    if (texCoordIndex < 0) {
        console.log('Failed to get the storage location of a_TexCoord');
        return;
    }
    gl.enableVertexAttribArray(texCoordIndex);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordIndex, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // bind texture object to target
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // sampler value in shader set to index for texture unit
    var loc = gl.getUniformLocation(textureShader, 'sampler');
    gl.uniform1i(loc, 0);

    // set uniform for projection * view
    var projection = camera.getProjection();
    var view = camera.getView();
    var transform = new THREE.Matrix4().multiply(projection).multiply(view);
    var transformLoc = gl.getUniformLocation(textureShader, 'transform');
    gl.uniformMatrix4fv(transformLoc, false, transform.elements);
    gl.drawArrays(gl.triangles, 0, 6);

    // unbind and disable things
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(positionIndex);
    gl.disableVertexAttribArray(texCoordIndex);
    gl.useProgram(null);
}

// code to draw to screen TODO
function drawToScreen() {
    // bind correct framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, 600, 600);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0.0, 0.9, 0.9, 1.0);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // bind the shader
    gl.useProgram(lightingShader);

    // get index for a_Position attribute
    var positionIndex = gl.getAttribLocation(lightingShader, 'a_Position');
    if (positionIndex < 0) {
        console.log("Failed to get location of a_Position");
        return;
    }

    var normalIndex = gl.getAttribLocation(lightingShader, 'a_Normal');
    if (normalIndex < 0) {
        console.log("Failed to get location of a_Normal");
        return;
    }

    // enable a_position and a_normal
    gl.enableVertexAttribArray(positionIndex);
    gl.enableVertexAttribArray(normalIndex);

    // bind buffers for points
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionIndex, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.vertexAttribPointer(normalIndex, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // set uniform in shader for projection * view * model transformation
    var loc = gl.getUniformLocation(lightingShader, 'model');
    gl.uniformMatrix4fv(loc, false, model.elements);
    loc = gl.getUniformLocation(lightingShader, 'view');
    gl.uniformMatrix4fv(loc, false, camera.getView().elements);
    loc = gl.getUniformLocation(lightingShader, 'projection');
    gl.uniformMatrix4fv(loc, false, camera.getProjection().elements);
    loc = gl.getUniformLocation(lightingShader, 'normalMatrix');
    gl.uniformMatrix3fv(loc, false, makeNormalMatrixElements(model, camera.getView()));

    // light and material properties
    loc = gl.getUniformLocation(lightingShader, 'materialProperties');
    gl.uniformMatrix3fv(loc, false, matPropElements);
    loc = gl.getUniformLocation(lightingShader, 'shininess');
    gl.uniform1f(loc, shininess);

    // light information
    loc = gl.getUniformLocation(lightingShader, 'lightPosition');
    gl.uniform4f(loc, 2.0, 4.0, 2.0, 1.0);
    loc = gl.getUniformLocation(lightingShader, 'lightProperties');
    gl.uniformMatrix3fv(loc, false, lightPropElements);

    // draw
    gl.drawArrays(gl.TRIANGLES, 0, theModel.numVertices);

    // below code draws portal as a wall behind object, TODO: remove when not needed for testing
    //// bind buffers for new points
    //gl.bindBuffer(gl.ARRAY_BUFFER, portalVertexBuffer);
    //gl.vertexAttribPointer(positionIndex, 3, gl.FLOAT, false, 0, 0);
    //
    //// update uniform in shader for model
    //loc = gl.getUniformLocation(lightingShader, 'model');
    //gl.uniformMatrix4fv(loc, false, new THREE.Matrix4().elements);
    //loc = gl.getUniformLocation(lightingShader, 'normalMatrix');
    //gl.uniformMatrix3fv(loc, false, makeNormalMatrixElements(new THREE.Matrix4(), camera.getView()));
    //
    //gl.drawArrays(gl.TRIANGLES, 0, 6);

    // disable things
    gl.disableVertexAttribArray(positionIndex);
    gl.disableVertexAttribArray(normalIndex);
    gl.useProgram(null);
}

// entry point
function main() {
    // key handlers
    window.onkeypress = handleKeyPress;

    // get graphics context
    gl = getGraphicsContext("theCanvas");

    // load and compile shaders TODO: shader for textures
    lightingShader = createShaderProgram(gl, vLightingShaderSource, fLightingShaderSource);
    colorShader = createShaderProgram(gl, vColorShaderSource, fColorShaderSource);
    textureShader = createShaderProgram(gl, vTextureShaderSource, fTextureShaderSource);

    // create the FBO and associated texture
    fbo = initFramebufferObject(gl);

    // load vertex data into GPU memory TODO if necessary
    vertexBuffer = createAndLoadBuffer(theModel.vertices);

    // load vertex normal data
    vertexNormalBuffer = createAndLoadBuffer(theModel.vertexNormals);

    // load portal vertex data
    portalVertexBuffer = createAndLoadBuffer(portalVertices);

    // load colorbuffer TODO remove this if unnecessary
    portalColorBuffer = createAndLoadBuffer(portalColor);

    // buffer for texture coords TODO
    texCoordBuffer = createAndLoadBuffer(portalTexCoords);

    // specify fill color for clearing framebuffer
    gl.clearColor(0.0, 0.9, 0.9, 1.0);

    gl.enable(gl.DEPTH_TEST);

    // define an animation loop
    var animate = function () {
        drawToFbo();
        drawToScreen();

        // model animation here
        model = new THREE.Matrix4().makeRotationY(toRadians(0.5)).multiply(model);
        model = new THREE.Matrix4().makeRotationZ(toRadians(0.7)).multiply(model);

        // request that browser calls animate() asap
        requestAnimationFrame(animate);
    };

    // start drawing
    animate();
}