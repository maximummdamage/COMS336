/**
 * Authors: Maxwell Dupree,
 * Demo of rendering portals using THREE.js
 * Currently: one-way "portal" from stationary camera point to flat tile
 * TODO: implement camera controls for main camera, implement 2-way portal views, fix colors
 */

// TODO: create shaders here if necessary

// offscreen buffer size
var OFFSCREEN_SIZE = 1080;
var DEG2RAD = Math.PI / 180;
var RAD2DEG = 1 / DEG2RAD;

// cameras


// TODO: add camera controls should move camera and portal camera(s) according to relevant angle to portals
var keystate = {};
window.addEventListener("keydown", evt => keystate[evt.keyCode] = true);
window.addEventListener("keyup", evt => delete keystate[evt.keyCode]);

const _va = /*@__PURE__*/ new THREE.Vector3(), // from pe to pa
	_vb = /*@__PURE__*/ new THREE.Vector3(), // from pe to pb
	_vc = /*@__PURE__*/ new THREE.Vector3(), // from pe to pc
	_vr = /*@__PURE__*/ new THREE.Vector3(), // right axis of screen
	_vu = /*@__PURE__*/ new THREE.Vector3(), // up axis of screen
	_vn = /*@__PURE__*/ new THREE.Vector3(), // normal vector of screen
	_vec = /*@__PURE__*/ new THREE.Vector3(), // temporary vector
	_quat = /*@__PURE__*/ new THREE.Quaternion(); // temporary quaternion


/** Set a PerspectiveCamera's projectionMatrix and quaternion
 * to exactly frame the corners of an arbitrary rectangle.
 * NOTE: This function ignores the standard parameters;
 * do not call updateProjectionMatrix() after this!
 * @param {Vector3} bottomLeftCorner
 * @param {Vector3} bottomRightCorner
 * @param {Vector3} topLeftCorner
 * @param {boolean} estimateViewFrustum */
function frameCorners( camera, bottomLeftCorner, bottomRightCorner, topLeftCorner, estimateViewFrustum = false ) {

	const pa = bottomLeftCorner, pb = bottomRightCorner, pc = topLeftCorner;
	const pe = camera.position; // eye position
	const n = camera.near; // distance of near clipping plane
	const f = camera.far; //distance of far clipping plane

	_vr.copy( pb ).sub( pa ).normalize();
	_vu.copy( pc ).sub( pa ).normalize();
	_vn.crossVectors( _vr, _vu ).normalize();

	_va.copy( pa ).sub( pe ); // from pe to pa
	_vb.copy( pb ).sub( pe ); // from pe to pb
	_vc.copy( pc ).sub( pe ); // from pe to pc

	const d = - _va.dot( _vn );	// distance from eye to screen
	const l = _vr.dot( _va ) * n / d; // distance to left screen edge
	const r = _vr.dot( _vb ) * n / d; // distance to right screen edge
	const b = _vu.dot( _va ) * n / d; // distance to bottom screen edge
	const t = _vu.dot( _vc ) * n / d; // distance to top screen edge

	// Set the camera rotation to match the focal plane to the corners' plane
	_quat.setFromUnitVectors( _vec.set( 0, 1, 0 ), _vu );
	camera.quaternion.setFromUnitVectors( _vec.set( 0, 0, 1 ).applyQuaternion( _quat ), _vn ).multiply( _quat );

	// Set the off-axis projection matrix to match the corners
	camera.projectionMatrix.set( 2.0 * n / ( r - l ), 0.0,
		( r + l ) / ( r - l ), 0.0, 0.0,
		2.0 * n / ( t - b ),
		( t + b ) / ( t - b ), 0.0, 0.0, 0.0,
		( f + n ) / ( n - f ),
		2.0 * f * n / ( n - f ), 0.0, 0.0, - 1.0, 0.0 );
	camera.projectionMatrixInverse.copy( camera.projectionMatrix ).invert();

	// FoV estimation to fix frustum culling
	if ( estimateViewFrustum ) {

		// Set fieldOfView to a conservative estimate
		// to make frustum tall/wide enough to encompass it
		camera.fov =
			MathUtils.RAD2DEG / Math.min( 1.0, camera.aspect ) *
			Math.atan( ( _vec.copy( pb ).sub( pa ).length() +
							( _vec.copy( pc ).sub( pa ).length() ) ) / _va.length() );

	}

}



// entry point when page is loaded TODO: fix colors, fix rendering size
function main() {

    var ourCanvas = document.getElementById('theCanvas');
    var renderer = new THREE.WebGLRenderer({ canvas: ourCanvas });

    // *** this creates the FBO and sets the texture parameters ***
    var rtTexture = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
    var rtTexture2 = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
    var rtTexture1 = new THREE.WebGLRenderTarget(OFFSCREEN_SIZE, OFFSCREEN_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
    // Set up the scene to render to texture, this code is just copied from RotatingSquare.js
    var cameraRTT = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    //cameraRTT = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
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
    var scene = new THREE.Scene();

    // create a texture-mapped cube
    var geometry = new THREE.BoxGeometry(1, 1, 1);

    // *** here is where we specify that we will sample from the render target's texture ***
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000});
    var cube = new THREE.Mesh(geometry, material);

    var floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshBasicMaterial({ color: 0xff0000}));
    floor.translateY(-3);

    var c1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshBasicMaterial({ color: 0x00ff00}));
    c1.translateX(-4); c1.translateZ(-4); c1.translateY(-2.8);

    var c2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshBasicMaterial({ color: 0x0000ff}));
    c2.translateX(4); c2.translateZ(4); c2.translateY(-2.8);

	var c3 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2 ,2), new THREE.MeshBasicMaterial({ color: 0xffc0cb }));
	c3.translateX(4); c3.translateZ(-4); c3.translateY(-2.8);

    scene.add(c1);
    scene.add(c2);
	scene.add(c3);
    scene.add(cube);   
    scene.add(floor);

    /* ---- render scene ---- */
    // setup FBO camera
	cameraTD = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
	cameraTD.position.y = 50;
	cameraTD.lookAt(new THREE.Vector3(0, 0, 0));

    camera = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
    
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 5;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
	camera.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xbfc0c0})));
	scene.add(camera);

    var geometry = new THREE.PlaneGeometry(5, 5);
    var material = new THREE.MeshBasicMaterial({ color: 0xffffaf, map: rtTexture1.texture, side: THREE.SingleSide   });
    portal1 = new THREE.Mesh(geometry, material);
    cameraPortal1 = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
    cameraPortal1.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00ff00})));
    portal1.add(cameraPortal1);
    portal1.translateZ(-6);
    cameraPortal1.position.set(0, 0, -5);
    cameraPortal1.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(portal1);


    var geometry = new THREE.PlaneGeometry(5, 5);
    var material = new THREE.MeshBasicMaterial({ color: 0xfaffff, map: rtTexture2.texture, side: THREE.SingleSide });
    portal2 = new THREE.Mesh(geometry, material);
    cameraPortal2 = new THREE.PerspectiveCamera(25, 1.0, 0.1, 1000);
    cameraPortal2.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x0000ff})));
    portal2.add(cameraPortal2);
    portal2.rotateY(90 * DEG2RAD);
    portal2.translateZ(-6);
    cameraPortal2.position.set(0, 0, -5);
    cameraPortal2.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(portal2);


    // animation parameters copied from RotatingSquare.js
    var angle = 0.0;
    var increment = 1.0;
    var camera_movespeed = 0.25;
    

    var animate = function () {
        renderer.setClearColor(0x00cccc);

        // update red square positions
        var tx = .75 * Math.cos(angle * Math.PI / 180.0);
        var ty = .75 * Math.sin(angle * Math.PI / 180.0);
        
        // camera movement
        var mz = (keystate[87] ? 1 : 0) - (keystate[83] ? 1 : 0);
        var mx = (keystate[68] ? 1 : 0) - (keystate[65] ? 1 : 0);
        var my = (keystate[32] ? 1 : 0) - (keystate[16] ? 1 : 0);
        var ry = (keystate[81] ? 1 : 0) - (keystate[69] ? 1 : 0);
        var rz = (keystate[37] ? 1 : 0) - (keystate[39] ? 1 : 0);
        var rx = (keystate[38] ? 1 : 0) - (keystate[40] ? 1 : 0);
        camera.translateZ(-mz*camera_movespeed);
        camera.translateX(mx*camera_movespeed);
        camera.translateY(my*0.5*camera_movespeed);
        camera.rotateY(ry*DEG2RAD);
        camera.rotateZ(rz*DEG2RAD);
        camera.rotateX(rx*DEG2RAD);
		

        // place portal2's camera to render portal1
        var camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        var CPSS = portal1.worldToLocal(camPos);
        //var CRSS = portal1.quaternion.clone().invert().multiply(camera.quaternion);
        var CPDS = portal2.localToWorld(CPSS);
        cameraPortal2.position.set(CPDS.z, CPDS.y, -CPDS.x);
        //var CRDS = portal2.quaternion.clone().multiply(CRSS);
        //cameraPortal2.quaternion.set(CRDS.x, CRDS.y, CRDS.z, CRDS.w);
        //cameraPortal2.rotateY(-3.14 + toRadians(-90));

		var positionArray = portal1.geometry.getAttribute('position')
		var vertex1 = new THREE.Vector3();
		vertex1.fromBufferAttribute(positionArray, 0);
		var topLeftCorner = portal1.localToWorld(vertex1);
		var vertex2 = new THREE.Vector3();
		vertex2.fromBufferAttribute(positionArray, 2);
		var bottomLeftCorner = portal1.localToWorld(vertex2);
		var vertex3 = new THREE.Vector3();
		vertex3.fromBufferAttribute(positionArray, 3);
		var bottomRightCorner = portal1.localToWorld(vertex3);

		frameCorners(cameraPortal2, bottomLeftCorner, bottomRightCorner, topLeftCorner, false);



        //// place portal1's camera to render portal2
        //var camPos = new THREE.Vector3();
        //camera.getWorldPosition(camPos);
        //var CPSS = portal2.worldToLocal(camPos);
        //var CRSS = portal2.quaternion.clone().invert().multiply(camera.quaternion);
        //var CPDS = portal1.localToWorld(CPSS);
        //cameraPortal1.position.set(-CPDS.x, CPDS.y, -CPDS.z);
        //var CRDS = portal1.quaternion.clone().multiply(CRSS);
        //cameraPortal1.quaternion.set(CRDS.x, CRDS.y, CRDS.z, CRDS.w);
        //cameraPortal1.rotateY(-3.14);
		

		if (keystate[66]) {
			console.log(bottomLeftCorner);
			console.log(bottomRightCorner);
			console.log(topLeftCorner);
		}

        rect1.position.set(tx, ty, 0.0);
        rect1.rotation.z = -angle * Math.PI / 180.0;
        rect2.position.set(tx, ty, 0.0);
        rect2.rotation.z = -angle * Math.PI / 180.0;
        angle += increment;
        if (angle >= 360) angle = 0;

        // update cube rotation by one degree
        //cube.rotateY(Math.PI / 180.0);

        // *** This renders the first scene with the FBO as its target ***
        renderer.setRenderTarget(rtTexture);
        renderer.render(sceneRTT, cameraRTT); //, rtTexture, true);

        // portal1 to portal2
        renderer.setRenderTarget(rtTexture2);
        renderer.setClearColor(0x444444);
        renderer.render(scene, cameraPortal1);

        // render to canvas
        renderer.setRenderTarget(rtTexture1);
        renderer.setClearColor(0x444444);
        renderer.render(scene, cameraPortal2);

        // render to canvas
        renderer.setRenderTarget(null);
        renderer.setClearColor(0x444444);
        renderer.render(scene, cameraTD);

        requestAnimationFrame(animate);

    };

    // draw!
    animate();

}
