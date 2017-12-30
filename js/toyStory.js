/*
 MIT License
 Copyright (c) 2017 Riccardo Reali
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

//VARIABLES

var container, gui;

//Variables required to init()
var  scene, camera, renderer, controls, stats;

//Variables to manage Pointer Lock Control and Collision Detection
var raycaster, collidableObjects;

//Variable to simulate DoF
var DoF;

container = document.getElementById( 'WebGL' );
gui = document.getElementById('gui');
DoF = {enabled:true, focusPlane: 0.25, aperture: 0.25};

// Checking if Browser supports Pointer Lock Control API
var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
if ( havePointerLock ) {
    var element = document.body;
    var pointerlockchange = function ( event ) {
        if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

            controlsEnabled = true;
            controls.enabled = true;
            container.style.display = 'none';
        } else {
            controls.enabled = false;
            container.style.display = 'block';
            Menu.style.display = '';
        }
    };
    var pointerlockerror = function ( event ) {
        Menu.style.display = '';
    };
    // Hook pointer lock state change events
    document.addEventListener( 'pointerlockchange', pointerlockchange, false );
    document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
    document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
    document.addEventListener( 'pointerlockerror', pointerlockerror, false );
    document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
    document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
    Menu.addEventListener( 'click', function ( event ) {
        Menu.style.display = 'none';
        // Ask the browser to lock the pointer
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
        element.requestPointerLock();
    }, false );
} else {
    instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
}

//SCENE INITIALIZATION METHOD

init();

//RENDERING METHOD

animate();


function init(){

    //SCENE
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x92d7f7 );

    // CAMERA
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 75, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 1, FAR = 5000;
    camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.set(0,0,0);
    scene.add(camera);

    //RENDERER
    renderer = new THREE.WebGLRenderer( {antialias:true} );
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );

    //CONTROLS
    addControls();

    //COMPUTATION STATS
    addStats();

    //TOY STORY SCENE
    createWorld();

    //POST PROCESSING EFFECTS
    DepthOfField();

    //AUDIO
    addAudio();

    //GUI
    createGUI();
}
function addControls(){
    controls = new THREE.PointerLockControls( camera );
    scene.add( controls.getObject() );
    raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
};
function addStats(){
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    stats.domElement.style.zIndex = 100;
    document.body.appendChild( stats.domElement );

};
function addAudio(){
    var listener = new THREE.AudioListener();
    var sound = new THREE.Audio( listener );
    var audioLoader = new THREE.AudioLoader();
    //Load a sound and set it as the Audio object's buffer
    audioLoader.load( 'audio/Hai un amico in me - Riccardo Cocciante.mp3', function( buffer ) {
        sound.setBuffer( buffer );
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
    });
};
function createGUI(){

    var gui = new dat.GUI({ autoPlace: false });
    var guiControls = new function() {
        this.enable = DoF.enabled;
        this.focusPlane = 250.0;
        this.aperture = 2.5;
    };

    gui.add(guiControls, 'enable').onFinishChange(function(newValue){
        if (DoF.enabled == true){
            this.enabled = false;
            DoF.enabled = false;
        }else {
            this.enabled = true;
            DoF.enabled = true;
        }
    }).name('Enable DoF');

    var menu = gui.addFolder('Parameters');

    menu.add(guiControls, 'focusPlane', 0.0, 750.0).onChange(function(newValue){
        DoF.focusPlane = newValue/1000.0;
        DoF.uniforms["planeInFocus"].value = DoF.focusPlane;
        console.log(DoF.uniforms["planeInFocus"].value);

    });

    menu.add(guiControls, 'aperture', 0.0, 5.0).onChange(function(newValue){
        DoF.aperture = newValue/10.0;
        DoF.uniforms["aperture"].value = DoF.aperture;
        console.log(DoF.uniforms["aperture"].value);
    });

    var customContainer = document.getElementById('gui');
    customContainer.appendChild(gui.domElement);

};
function createWorld() {
    var Loader = new THREE.TextureLoader();

    //LIGHTS
    var pointLight = new THREE.PointLight( 0xffffff, 1 , 200);
    pointLight.castShadow = true;

    var chandelierGeometry = new THREE.SphereBufferGeometry(10, 10, 10);
    var chandelierMaterial = new THREE.MeshPhongMaterial({color: 0xfffffff});
    var chandelier = new THREE.Mesh(chandelierGeometry, chandelierMaterial);
    chandelier.position.y = 197.5;
    chandelier.position.x = 0;
    chandelier.position.z = 0;
    pointLight.add(chandelier);
    scene.add(pointLight);

    var ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    //ROOM

    //Loading textures
    var floorTexture = Loader.load( 'img/room/floor.jpg' );
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);

    var wallTexture = Loader.load('img/room/wall.jpg');
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(5, 5);

    var ceilingTexture = Loader.load('img/room/ceiling.jpg');
    ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(1, 1);


    //floor
    var floorMaterial = new THREE.MeshPhongMaterial({color: 0xffffff, map: floorTexture, side: THREE.DoubleSide});
    var floorGeometry = new THREE.PlaneGeometry( 300, 300, 10, 10 );

    var theFloor = new THREE.Mesh(floorGeometry , floorMaterial );
    theFloor.position.y = -5;
    theFloor.rotation.x = - Math.PI / 2;
    theFloor.receiveShadow = true;
    scene.add( theFloor );

    //walls
    var wallMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, map: wallTexture, side: THREE.DoubleSide})
    var wallGeometry = new THREE.PlaneGeometry( 300, 300, 5, 5 )

    //left side
    var leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.side = THREE.DoubleSide;
    leftWall.position.y =  145;
    leftWall.position.x = -150;
    leftWall.rotation.y = 90*(Math.PI/180);
    leftWall.receiveShadow = true;
    scene.add( leftWall );

    //right side
    var rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.side = THREE.DoubleSide;
    rightWall.position.y =  145;
    rightWall.position.x =  150;
    rightWall.rotation.y =  - Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add( rightWall );

    //far side
    var farWall = new THREE.Mesh(wallGeometry, wallMaterial);
    farWall.side = THREE.DoubleSide;
    farWall.position.y =   145;
    farWall.position.x =   0;
    farWall.position.z =  -150;
    farWall.rotation.x = 0;
    farWall.receiveShadow = true;
    scene.add( farWall );

    //near side
    var nearWall = new THREE.Mesh(wallGeometry, wallMaterial);
    nearWall.side = THREE.DoubleSide;
    nearWall.position.y =   145;
    nearWall.position.x =   0;
    nearWall.position.z =   150;
    nearWall.rotation.x = 0;
    nearWall.receiveShadow = true;
    scene.add( nearWall );

    //ceiling
    var ceilingMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, map: ceilingTexture, side: THREE.DoubleSide});
    var ceilingGeometry = new THREE.PlaneGeometry( 300, 300, 1, 1);

    var ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.side = THREE.DoubleSide;
    ceiling.position.y =   195;
    ceiling.rotation.x = - Math.PI / 2;
    scene.add(ceiling);

    //DICES

    var diceMaterials = [
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: Loader.load('img/dice/dice1.jpg')
        }),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: Loader.load('img/dice/dice2.jpg')
        }),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: Loader.load('img/dice/dice3.jpg')
        }),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: Loader.load('img/dice/dice4.jpg')
        }),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: Loader.load('img/dice/dice5.jpg')
        }),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: Loader.load('img/dice/dice6.jpg')
        })
    ];

    var diceGeometry = new THREE.BoxGeometry(10, 10, 10, 1, 1, 1);
    var dice1 = new THREE.Mesh(diceGeometry, diceMaterials);
    dice1.position.y = 0;
    dice1.position.z = 0;
    dice1.position.x = -10;
    dice1.rotation.y = 45*(Math.PI/180);
    dice1.castShadow = true;
    dice1.receiveShadow = true;
    scene.add(dice1);

    var dice2 = new THREE.Mesh(diceGeometry, diceMaterials);
    dice2.position.y = 0;
    dice2.position.z = 15;
    dice2.position.x = -15;
    dice2.rotation.z = 90*(Math.PI/180);
    dice2.castShadow = true;
    dice2.receiveShadow = true;
    scene.add(dice2);

    //BALL

    var ballMaterial = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load('img/ball.png')});
    var ballGeometry = new THREE.SphereGeometry(8, 32, 32);
    var ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.y = 3;
    ball.position.z = 20;
    ball.position.x = 10;
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);


    //BUZZ LIGHTYEAR
    var manager = new THREE.LoadingManager();
    var mtlLoader = new THREE.MTLLoader(manager);
    mtlLoader.setPath( 'obj/buzzLightyear/' );
    mtlLoader.load( 'buzz.mtl', function( materials ) {
        materials.preload();
        var objLoader = new THREE.OBJLoader(manager);
        objLoader.setMaterials( materials );
        objLoader.setPath( 'obj/buzzLightyear/' );
        objLoader.load( 'buzz.obj', function ( object ) {
            object.position.y = -5;
            object.position.x = -25;
            object.position.z = -37;
            object.scale.x = 100;
            object.scale.y = 100;
            object.scale.z = 100;
            object.rotation.y = 30*(Math.PI/180);
            object.castShadow = true;
            scene.add( object );
        }, function(){}, function(){} );
    });

    //WOODY
    var manager = new THREE.LoadingManager();
    var mtlLoader = new THREE.MTLLoader(manager);
    mtlLoader.setPath( 'obj/woody/' );
    mtlLoader.load( 'woody.mtl', function( materials ) {
        materials.preload();
        var objLoader = new THREE.OBJLoader(manager);
        objLoader.setMaterials( materials );
        objLoader.setPath( 'obj/woody/' );
        objLoader.load( 'woody.obj', function ( object ) {
            object.position.y = -3.5;
            object.position.x = 14;
            object.position.z = -34;
            object.scale.x = 40;
            object.scale.y = 40;
            object.scale.z = 40;
            object.rotation.x = - Math.PI/2;
            object.rotation.z = -60*(Math.PI/180);
            object.castShadow = true;
            scene.add( object );
        }, function(){}, function(){} );
    });


    //BED
    var manager = new THREE.LoadingManager();
    var mtlLoader = new THREE.MTLLoader(manager);
    mtlLoader.setPath( 'obj/' );
    mtlLoader.load( 'bed.mtl', function( materials ) {
        materials.preload();
        var objLoader = new THREE.OBJLoader(manager);
        objLoader.setMaterials( materials );
        objLoader.setPath( 'obj/' );
        objLoader.load( 'bed.obj', function ( object ) {
            object.position.y = -8.5;
            object.position.x = 125;
            object.position.z = -100;
            //object.rotation.z = 0.5*(Math.PI/180);
            object.scale.x = 5;
            object.scale.y = 5;
            object.scale.z = 5;
            scene.add( object );
        }, function(){}, function(){} );
    });

    //Invisible walls to detect collision nex to the bed

    var invisibleMaterial = new THREE.MeshStandardMaterial({visible: false});
    var invisibleWall1 = new THREE.PlaneGeometry( 100, 300);
    var invisibleWall2 =  new THREE.PlaneGeometry( 50, 300);

    var IWall1 = new THREE.Mesh(invisibleWall1, invisibleMaterial);
    IWall1.side = THREE.DoubleSide;
    IWall1.position.y =  145;
    IWall1.position.x =  95;
    IWall1.position.z = -100;
    IWall1.rotation.y =  - Math.PI / 2;
    IWall1.receiveShadow = true;
    scene.add(IWall1);

    //far side
    var IWall2 = new THREE.Mesh(invisibleWall2, invisibleMaterial);
    IWall2.side = THREE.DoubleSide;
    IWall2.position.y =   145;
    IWall2.position.x =   125;
    IWall2.position.z =  -50;
    IWall2.rotation.x = 0;
    IWall2.receiveShadow = true;
    scene.add(IWall2);


    //Defining objects subjected to collisions
    collidableObjects = [leftWall, rightWall, nearWall, farWall, IWall1, IWall2];
};
function DepthOfField(){
    if(DoF.enabled)
    {
        //Creating scene to render to texture and post-processing
        DoF.scene = new THREE.Scene();
        var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
        var VIEW_ANGLE = 75, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 1.0, FAR = 5000.0;

        DoF.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
        DoF.camera.position.set(0,0,130);
        DoF.scene.add(DoF.camera);

        //Creating target to render to texture
        myTarget = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT);
        myTarget.texture.format = THREE.RGBFormat;
        myTarget.texture.minFilter = THREE.LinearFilter;
        myTarget.texture.magFilter = THREE.LinearFilter;
        myTarget.texture.generateMipmaps = false;
        myTarget.stencilBuffer = false;
        myTarget.depthBuffer = true;
        myTarget.depthTexture = new THREE.DepthTexture();

        //Uniforms variables for fragment shader
        DoF.uniforms = {
            "tColor":       {value: myTarget.texture},
            "tDepth":       {value: myTarget.depthTexture},
            "screenWidth":  {value: SCREEN_WIDTH},
            "screenHeight": {value: SCREEN_HEIGHT},
            "zNear":          {value: 1.0},
            "zFar":          {value: 100.0},
            "planeInFocus": {value: DoF.focusPlane},
            "aperture": {value: DoF.aperture}
        };

        DoF.VertexShader = document.getElementById('DOFVertexShader').textContent;
        DoF.FragmentShader = document.getElementById('DOFFragmentShader').textContent;

        DoF.material = new THREE.ShaderMaterial({
            uniforms: DoF.uniforms,
            vertexShader: DoF.VertexShader,
            fragmentShader:  DoF.FragmentShader,
        } );

        DoF.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( SCREEN_WIDTH, SCREEN_HEIGHT ), DoF.material );
        DoF.quad.position.z = - 347.5;
        DoF.scene.add(DoF.quad);

    }
};

function animate() {
    requestAnimationFrame(animate);
    controls.isOnObject(false);
    collisionDetection(controls, collidableObjects);
    controls.update();

    if ( DoF.enabled )
    {
        // Render to texture
        renderer.render( scene, camera, myTarget, true );
        // Render composition of scenes.
        renderer.render(DoF.scene, DoF.camera);
    }
    else{
        renderer.render(scene, camera);
    }
    stats.update();
}
function collisionDetection(controls, object){
    function bounceBack(position, ray) {
        position.x -= ray.bounceDistance.x;
        position.y -= ray.bounceDistance.y;
        position.z -= ray.bounceDistance.z;
    }
    var rays = [
        new THREE.Vector3(0, 0, 1),  //  0 degrees
        new THREE.Vector3(1, 0, 1),  // 45 degrees
        new THREE.Vector3(1, 0, 0),  // 90 degrees
        new THREE.Vector3(1, 0, -1), //135 degrees
        new THREE.Vector3(0, 0, -1), //180 degrees
        new THREE.Vector3(-1, 0, -1),//225 degrees
        new THREE.Vector3(-1, 0, 0), //270 degrees
        new THREE.Vector3(-1, 0, 1)  //315 degrees
    ];
    position = controls.getObject().position;
    for (var index = 0; index < rays.length; index += 1) {

        var bounceSize = 0.01;
        rays[index].bounceDistance = {
            x: rays[index].x * bounceSize,
            y: rays[index].y * bounceSize,
            z: rays[index].z * bounceSize
        };

        raycaster.set(position, rays[index]);

        var intersections = raycaster.intersectObjects(object);
        if (intersections.length > 0 && intersections[0].distance <= 3) {
            controls.isOnObject(true);
            bounceBack(position, rays[index]);
        }
    }
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
};
