/**
 * Authors: Maxwell Dupree,
 * Demo of rendering portals using THREE.js
 * Currently: one-way "portal" from stationary camera point to flat tile
 * TODO: implement camera controls for main camera, implement 2-way portal views, fix colors
 */

// TODO: create shaders here if necessary

// offscreen buffer size
var OFFSCREEN_SIZE = 1080;

// TODO: add camera controls should move camera and portal camera(s) according to relevant angle to portals

// entry point when page is loaded TODO: fix colors, fix rendering size
function main() {

    var ourCanvas = document.getElementById('theCanvas');
    var renderer = new THREE.WebGLRenderer({ canvas: ourCanvas });

    // *** this creates the FBO and sets the texture parameters ***
    var rtTexture = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
    var rtTexture2 = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
    // Set up the scene to render to texture, this code is just copied from RotatingSquare.js
    var cameraRTT = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    cameraRTT.position.z = 1;
    var sceneRTT = new THREE.Scene();

    /* ---------------------- cube texture ------------------------ */
    // create a red square
    var geometry = new THREE.PlaneGeometry(1, 1);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // vertical rectangle
    var rect1 = new THREE.Mesh(geometry, material);
    rect1.scale.set(.15, .4, 1.0);

    // horizontal rectangle
    var rect2 = new THREE.Mesh(geometry, material);
    rect2.scale.set(.4, .15, 1.0);

    // little square is a child of vertical rectangle
    var rect3 = new THREE.Mesh(geometry, material);
    rect1.add(rect3);
    rect3.translateY(1);
    rect3.scale.set(1, .15 / .4, 1);

    sceneRTT.add(rect1);
    sceneRTT.add(rect2);

    /* ---- make cube ---- */ 
    // set up the main scene
    var scenePortal = new THREE.Scene();
    var cameraPortal = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
    cameraPortal.position.x = 2;
    cameraPortal.position.y = 2;
    cameraPortal.position.z = 15;
    cameraPortal.lookAt(new THREE.Vector3(0, 0, 0));

    // create a texture-mapped cube
    var geometry = new THREE.BoxGeometry(1, 1, 1);

    // *** here is where we specify that we will sample from the render target's texture ***
    var material = new THREE.MeshBasicMaterial({ color: 0xffffff, map: rtTexture.texture });
    var cube = new THREE.Mesh(geometry, material);
    scenePortal.add(cube);

    /* ---- render scene ---- */
    // setup FBO camera
    var camera = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
    camera.position.x = 15;
    camera.position.y = 2;
    camera.position.z = 15;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    var scene = new THREE.Scene();

    var geometry = new THREE.PlaneGeometry(5, 5);
    var material = new THREE.MeshBasicMaterial({ color: 0xffff00, map: rtTexture2.texture });

    var portal1 = new THREE.Mesh(geometry, material);
    portal1.translateZ(-2);
    scene = scenePortal;
    scene.add(portal1);


    // animation parameters copied from RotatingSquare.js
    var angle = 0.0;
    var increment = 1.0;

    var animate = function () {
        renderer.setClearColor(0x00cccc);

        // update red square positions
        var tx = .75 * Math.cos(angle * Math.PI / 180.0);
        var ty = .75 * Math.sin(angle * Math.PI / 180.0);
        rect1.position.set(tx, ty, 0.0);
        rect1.rotation.z = -angle * Math.PI / 180.0;
        rect2.position.set(tx, ty, 0.0);
        rect2.rotation.z = -angle * Math.PI / 180.0;
        angle += increment;
        if (angle >= 360) angle = 0;

        // update cube rotation by one degree
        cube.rotateY(Math.PI / 180.0);

        // *** This renders the first scene with the FBO as its target ***
        renderer.setRenderTarget(rtTexture);
        renderer.render(sceneRTT, cameraRTT); //, rtTexture, true);

        // render to canvas
        renderer.setRenderTarget(rtTexture2);
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
