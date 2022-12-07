/**
 * Demo of rendering portals using Three.js
 * This file follows the same basic structure of:
 * https://stevekautz.com/cs336f22/examples/threejsexamples/TextureThreejsWithFBO.html
 * Authors: Maxwell Dupree, Brandon Schumacher
 */

/* ---- GLOBAL CONSTANTS / MACROS ---- */

const OFFSCREEN_SIZE = 2160;
const CAMERA_MOVESPEED = 0.25;

/* ---- GLOBAL VARIABLES ---- */

// demo mode
var demoMode = 1;
var recursions = 20;

// cameras
var camera = new THREE.PerspectiveCamera(25, 1.0, 0.1);
var cameraP1 = new THREE.PerspectiveCamera(25, 1.0, 0.1);
var cameraP2 = new THREE.PerspectiveCamera(25, 1.0, 0.1);
var cameraTD = new THREE.PerspectiveCamera(25, 1.0, 0.1);

// portals
var portal1;
var portal2;

// key listener
var keystate = {};
window.addEventListener("keydown", evt => keystate[evt.keyCode] = true);
window.addEventListener("keyup", evt => delete keystate[evt.keyCode]);

/**
 * based on https://github.com/mrdoob/three.js/blob/master/examples/jsm/utils/CameraUtils.js
 * uses Kooima's Generalized Perspective Projection formulation to create 
 * projection matrix and quaternion for portal camera
 */
function frameCorners(camera, bottomLeft, bottomRight, topLeft, estimateViewFrustum = false) {
    let pa = bottomLeft;
    let pb = bottomRight;
    let pc = topLeft;
    let pe = camera.position;
    let n = camera.near;
    let f = camera.far;

    let _vr = new THREE.Vector3().copy(pb).sub(pa).normalize();
    let _vu = new THREE.Vector3().copy(pc).sub(pa).normalize();
    let _vn = new THREE.Vector3().crossVectors(_vr, _vu).normalize();
    let _va = new THREE.Vector3().copy(pa).sub(pe); // from pe to pa
    let _vb = new THREE.Vector3().copy(pb).sub(pe); // from pe to pb
    let _vc = new THREE.Vector3().copy(pc).sub(pe); // from pe to pc

    let d = - _va.dot(_vn);	// distance from eye to screen
    let l = _vr.dot(_va) * n / d; // distance to left screen edge
    let r = _vr.dot(_vb) * n / d; // distance to right screen edge
    let b = _vu.dot(_va) * n / d; // distance to bottom screen edge
    let t = _vu.dot(_vc) * n / d; // distance to top screen edge

    // Set camera rotation to match focal plane to corners' plane
    let _vec = new THREE.Vector3();

    let _quat = new THREE.Quaternion().setFromUnitVectors(_vec.set(0, 1, 0), _vu);
    //console.log(_quat);
    camera.quaternion.setFromUnitVectors(_vec.set(0, 0, 1).applyQuaternion(_quat), _vn).multiply(_quat);

    // set off-axis projection matrix to match corners
    camera.projectionMatrix.set(2.0 * n / (r - l), 0.0,
        (r + l) / (r - l), 0.0, 0.0,
        2.0 * n / (t - b),
        (t + b) / (t - b), 0.0, 0.0, 0.0,
        (f + n) / (n - f),
        2.0 * f * n / (n - f), 0.0, 0.0, - 1.0, 0.0);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

/**
 * based on function from: https://threejs.org/examples/?q=portal#webgl_portal
 * sets portal camera position, rotation, and projection matrix for rendering
 */
function positionCamera(portalCamera, portal1Mesh, portal2Mesh) {
    // reflect portal camera about portal plane
    var reflected = new THREE.Vector3();
    portal1Mesh.worldToLocal(reflected.copy(camera.position));
    reflected.x = reflected.x * -1.0;
    reflected.z = reflected.z * -1.0;
    portal2Mesh.localToWorld(reflected);
    portalCamera.position.copy(reflected);

    // get corners of portal being rendered to for Kooima's
    var vertexArray = portal2Mesh.geometry.getAttribute('position');
    var topLeft = new THREE.Vector3();
    var bottomLeft = new THREE.Vector3();
    var bottomRight = new THREE.Vector3();
    portal2Mesh.localToWorld(topLeft.fromBufferAttribute(vertexArray, 1));
    portal2Mesh.localToWorld(bottomLeft.fromBufferAttribute(vertexArray, 3));
    portal2Mesh.localToWorld(bottomRight.fromBufferAttribute(vertexArray, 2));

    // Kooima's
    frameCorners(portalCamera, bottomLeft, bottomRight, topLeft);
}

// entry point when page is loaded
function main() {

    // get canvas and renderer handles
    var canvas = document.getElementById('theCanvas');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas });

    // create FBO and set texture parameters
    var texPortal1 = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE);
    var texPortal2 = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE);

    // set up scene geometry
    var scene = new THREE.Scene();

    var cubeDummy = new THREE.Object3D();
    var cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xdc143c }));
    cubeDummy.add(cube);

    var floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xff7f50 }));
    floor.translateY(-3);

    var c1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
    c1.translateX(-4); c1.translateZ(-4); c1.translateY(-2.8);

    var c2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    c2.translateX(4); c2.translateZ(4); c2.translateY(-2.8);

    var c3 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshBasicMaterial({ color: 0xffc0cb }));
    c3.translateX(4); c3.translateZ(-4); c3.translateY(-2.8);

    var wallN = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0x556b2f }));
    var wallE = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0x008b8b }));
    var wallS = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0xcd5c5c }));
    var wallW = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0xf4a460 }));

    wallN.translateZ(-6);
    wallE.rotateY(toRadians(-90));
    wallE.translateZ(-6);
    wallS.rotateY(toRadians(180));
    wallS.translateZ(-6);
    wallW.rotateY(toRadians(90));
    wallW.translateZ(-6);

    scene.add(c1);
    scene.add(c2);
    scene.add(c3);
    scene.add(cubeDummy);
    scene.add(floor);
    scene.add(wallN);
    scene.add(wallE);
    scene.add(wallS);
    scene.add(wallW);

    // set up portal geometry
    var portalGeometry1 = new THREE.PlaneGeometry(5, 5);
    var portalGeometry2 = new THREE.PlaneGeometry(5, 5);
    //var portalGeometry2 = new THREE.PlaneGeometry(2, 5);
    //var portalGeometry2 = new THREE.PlaneGeometry(10, 5);
    portal1 = new THREE.Mesh(portalGeometry1, new THREE.MeshBasicMaterial({ color: 0xffffff, map: texPortal1.texture }));
    portal2 = new THREE.Mesh(portalGeometry2, new THREE.MeshBasicMaterial({ color: 0xffffff, map: texPortal2.texture }));

    // add cameras to their portals
    portal1.add(cameraP2);
    portal2.add(cameraP1);

    // position portals
    portal1.translateZ(-5.99);

    portal2.rotateY(toRadians(90));
    //portal2.rotateY(toRadians(180));
    portal2.translateZ(-5.99);

    scene.add(portal1);
    scene.add(portal2);

    // position cameras
    cameraTD.position.y = 100;
    cameraTD.lookAt(new THREE.Vector3(0, 0, 0));

    camera.position.z = 5;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // add boxes to cameras for top down view
    //camera.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xbfc0c0 })));
    //cameraP1.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00ff00 })));
    //cameraP2.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x0000ff })));

    scene.add(camera);
    scene.add(cameraP1);
    scene.add(cameraP2);

    // set variables for animation function

    var animate = function () {
        renderer.setClearColor(0x00cccc);

        // switch demo mode
        if (keystate[49]) demoMode = 1;
        if (keystate[50]) demoMode = 2;
        if (keystate[51]) demoMode = 3;

        // camera controls
        var mz = (keystate[87] ? 1 : 0) - (keystate[83] ? 1 : 0);
        var mx = (keystate[68] ? 1 : 0) - (keystate[65] ? 1 : 0);
        var my = (keystate[32] ? 1 : 0) - (keystate[16] ? 1 : 0);
        var ry = (keystate[81] ? 1 : 0) - (keystate[69] ? 1 : 0);
        var rz = (keystate[37] ? 1 : 0) - (keystate[39] ? 1 : 0);
        var rx = (keystate[38] ? 1 : 0) - (keystate[40] ? 1 : 0);
        camera.translateZ(-mz * CAMERA_MOVESPEED);
        camera.translateX(mx * CAMERA_MOVESPEED);
        camera.translateY(my * 0.5 * CAMERA_MOVESPEED);
        camera.rotateY(toRadians(ry));
        camera.rotateZ(toRadians(rz));
        camera.rotateX(toRadians(rx));

        // rotate cube
        cube.rotateX(toRadians(0.6));
        cube.rotateY(toRadians(0.7));
        cube.rotateZ(toRadians(0.5));
        cubeDummy.position.set(0, 0, 0);
        cubeDummy.rotateY(toRadians(1));
        cubeDummy.translateZ(-1);
        

        // set clear color
        renderer.setClearColor(0x444444);

        // position cameras
        positionCamera(cameraP2, portal1, portal2);
        positionCamera(cameraP1, portal2, portal1);

        // render to portal 1
        renderer.setRenderTarget(texPortal1);
        renderer.render(scene, cameraP2);

        // render to portal 2
        renderer.setRenderTarget(texPortal2);
        renderer.render(scene, cameraP1);

        // render to canvas
        renderer.setRenderTarget(null);
        if (demoMode == 2) {
            renderer.render(scene, cameraTD);
        } else {
            renderer.render(scene, camera);
        }

        // request animation frame asap
        requestAnimationFrame(animate);
    }

    // draw!
    animate();
}