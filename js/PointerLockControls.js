/**
 * @author mrdoob / http://mrdoob.com/
 */

/**
 *
 * Modified by Riccardo Reali
 *
 */

THREE.PointerLockControls = function ( camera ) {

    var scope = this;

    camera.rotation.set( 0, 0, 0 );

    var pitchObject = new THREE.Object3D();
    pitchObject.add( camera );

    var yawObject = new THREE.Object3D();
    yawObject.position.y = 10;
    yawObject.add( pitchObject );

    var moveForward = false;
    var moveBackward = false;
    var moveLeft = false;
    var moveRight = false;

    var isOnObject = false;

    var prevTime = performance.now();

    var velocity = new THREE.Vector3();

    var PI_2 = Math.PI / 2;

    var onMouseMove = function ( event ) {

        if ( scope.enabled === false ) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

    };

    var onKeyDown = function ( event ) {
        switch ( event.keyCode ) {
            case 38: // up
                moveForward = true;
                break;
            case 37: // left
                moveLeft = true; break;
            case 40: // downs
                moveBackward = true;
                break;
            case 39: // right
                moveRight = true;
                break;
        }
    };
    var onKeyUp = function ( event ) {
        switch( event.keyCode ) {
            case 38: // up
                moveForward = false;
                break;
            case 37: // left
                moveLeft = false;
                break;
            case 40: // down
                moveBackward = false;
                break;
            case 39: // right
                moveRight = false;
                break;
        }
    };


    document.addEventListener( 'mousemove', onMouseMove, false );
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );



    this.dispose = function() {

        document.removeEventListener( 'mousemove', onMouseMove, false );

    };


    this.enabled = false;

    this.getObject = function () {

        return yawObject;

    };

    this.isOnObject = function (boolean) {
        isOnObject = boolean;
    };

    this.getDirection = function() {

        // assumes the camera itself is not rotated

        var direction = new THREE.Vector3( 0, 0, - 1 );
        var rotation = new THREE.Euler( 0, 0, 0, "YXZ" );

        return function( v ) {

            rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );

            v.copy( direction ).applyEuler( rotation );

            return v;

        };

    }();

    this.update = function () {

        if (scope.enabled === false) return;

        var time = performance.now();
        var delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        if (moveForward) velocity.z -= 400.0 * delta;
        if (moveBackward) velocity.z += 400.0 * delta;

        if (moveLeft) velocity.x -= 400.0 * delta;
        if (moveRight) velocity.x += 400.0 * delta;

        // Cambiato il codice in modo da fare arrestre i movimenti
        if (isOnObject === true) {

            velocity.y = Math.max(0, velocity.y);
            velocity.x = 0;
            velocity.z = 0;

        }

        yawObject.translateX(velocity.x * delta);
        yawObject.translateY(velocity.y * delta);
        yawObject.translateZ(velocity.z * delta);

        if (yawObject.position.y < 10) {

            velocity.y = 0;
            yawObject.position.y = 10;


        }

        prevTime = time;

    };
};
