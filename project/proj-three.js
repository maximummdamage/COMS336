/**
 * Authors: Maxwell Dupree,
 * Demo of rendering portals using THREE.js
 * Currently: one-way "portal" from stationary camera point to flat tile
 * TODO: implement camera controls for main camera, implement 2-way portal views, fix colors
 *       Add geometry for walls, floors, ceiling to make view more impressive
 */

// TODO: create shaders here if necessary

/* ---- MACROS (GLOBAL CONSTANTS) ---- */

// offscreen buffer size
const OFFSCREEN_SIZE = 1080;

// camera control constants
const CAMERA_TRANSLATION_SPEED = 0.2;
const CAMERA_ROTATION_SPEED = 5;

/* ---- GLOBAL VARIABLES ---- */

// cameras
var camera = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
var cameraPortal = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
//var cameraPortal = new THREE.OrthographicCamera(-2, 2, -2, 2, -20, 20);



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

// TODO: should move portal camera(s) according to relevant angle to portals

// handle keypresses TODO: add more controls as needed
function handleKeyPress(event) {
    var ch = getChar(event);
    // TODO: remove this if we dont need it
    //if (camera.keyControl(ch)) return false;

    switch (ch) {
    // camera position controls
    // translation
    case 'a': 
        camera.translateX(-CAMERA_TRANSLATION_SPEED);
        break;
    case 'd':
        camera.translateX(CAMERA_TRANSLATION_SPEED);
        break;
    case 'w':
        camera.translateZ(-CAMERA_TRANSLATION_SPEED);
        break;
    case 's':
        camera.translateZ(CAMERA_TRANSLATION_SPEED);
        break;
    case 'z': 
        camera.translateY(CAMERA_TRANSLATION_SPEED);
        break;
    case 'x':
        camera.translateY(-CAMERA_TRANSLATION_SPEED);
        break;
    // rotation
    case 'j':
        camera.rotateY(toRadians(CAMERA_ROTATION_SPEED));
        break;
    case 'l':
        camera.rotateY(toRadians(-CAMERA_ROTATION_SPEED));
        break;
    case 'i':
        camera.rotateX(toRadians(CAMERA_ROTATION_SPEED));
        break;
    case 'k': 
        camera.rotateX(toRadians(-CAMERA_ROTATION_SPEED));
        break;
    case 'u': 
        camera.rotateY(toRadians(180));
        break;
    case 'o':
        camera.lookAt(0, 0, 0);
        break;
    // special
    case 'O':
        // TODO: move camera to original position/rotation
        break;
    }
}

// entry point when page is loaded TODO: fix colors, fix rendering size
function main() {
    // handle keypress events
    window.onkeypress = handleKeyPress;

    // get canvas
    var ourCanvas = document.getElementById('theCanvas');

    // create THREE renderer for canvas
    var renderer = new THREE.WebGLRenderer({ canvas: ourCanvas });

    // *** this creates the FBO and sets the texture parameters ***
    var rtTexture = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });

    /* ---- set up main scene w/o portals, this will be put on the portal ---- */
    var scenePortal = new THREE.Scene();
    cameraPortal.position.x = 15;
    cameraPortal.position.y = 2;
    cameraPortal.position.z = 0;
    cameraPortal.lookAt(new THREE.Vector3(0, 0, 0));

    // create a cube using MeshNormalMaterial()
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshNormalMaterial();
    var cube = new THREE.Mesh(geometry, material);
    scenePortal.add(cube);

    /* ---- render scene with portals ---- */
    // setup FBO camera
    camera.position.x = 15;
    camera.position.y = 2;
    camera.position.z = 15;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    var scene = new THREE.Scene();

    var geometry = new THREE.PlaneGeometry(5, 5);
    // FIX: to fix color: change color of material to 0xffffff
    // this is left unfixed temporarily to see portal dimensions easier
    var material = new THREE.MeshBasicMaterial({ color: 0xffff00, map: rtTexture.texture });

    var portal1 = new THREE.Mesh(geometry, material);
    var portal2 = new THREE.Mesh(geometry, material);

    portal1.translateZ(-5);

    portal2.translateX(-5);
    portal2.rotateY(toRadians(90));

    scene = scenePortal;
    scene.add(portal1);
    scene.add(portal2);


    // animation parameters

    var animate = function () {
        renderer.setClearColor(0x000000);

        // update cube rotation
        cube.rotateY(toRadians(0.7));
        cube.rotateX(toRadians(0.6));

        // render to texture
        renderer.setRenderTarget(rtTexture);
        renderer.setClearColor(0x444444);
        renderer.render(scenePortal, cameraPortal);

        // render to canvas
        renderer.setRenderTarget(null);
        renderer.setClearColor(0x444444);
        renderer.render(scene, camera);

        requestAnimationFrame(animate);

    };

    // draw!
    animate();

}
