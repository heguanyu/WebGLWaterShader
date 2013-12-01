////////////////COPYRIGHT DECLARATION//////////////////////
//////
////// COPYRIGHT GUANYU HE AND HAO WU, 2013
////// ALL THE FOLLOWING CODE IS PROTECTED BY THE COPYRIGHT
//////
////// THE CODE IN THIS FILE CANNOT BE REUSED OUTSIDE CIS565 GPU PROGRAMMING COURSE
////// IN UNIVERSITY OF PENNSYLVANIA UNLESS SPECIAL AUTHORIZATION.
//////
////// CONTACT INFO: heguanyu9037@gmail.com
//////                  wuhao1117@gmail.com
//////
////////////////FILE INFO ///////////////////////////////
////// THIS IS THE MAIN FILE OF THE WATER RENDERING
////// INCLUDING THE SETUP OF THE 3 PASSES IN RENDERING
//////
//////
//////
//////
////////////////////////////////////////////////////////////

var gl;
var NUM_WIDTH_PTS = 512;
var NUM_HEIGHT_PTS = 512;

var canvas = document.getElementById("canvas");	

var startTime;
var currentTime = 0.0;
var totalFrames;

var canvasHeight;
var canvasWidth;

var quadPositionBuffer;
var quadIndicesBuffer;

var waterFacePositionBuffer;
var waterFaceIndicesBuffer;

var fftProgram;
var simProgram;
var shaderProgram;
var copyProgram;

var rttFramebuffer;
var rttTexture;

var copyFramebuffer;
var copyTexture;

var model;

/////////////////////////////////////////mouse control//////////////////////////////////
//Camera control
var mouseLeftDown = false;
var mouseRightDown = false;
var lastMouseX = null;
var lastMouseY = null;

var radius = 3.50;
var azimuth = 0.0;
var zenith = Math.PI / 3.0;

var center = [0.0, 0.0, 0.0];
var up = [0.0, 1.0, 0.0];

var persp;
var eye;
var view;

// mouse control callbacks
function handleMouseDown(event) {
    if (event.button == 2) {
        mouseLeftDown = false;
        mouseRightDown = true;
    }
    else {
        mouseLeftDown = true;
        mouseRightDown = false;
    }
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseLeftDown = false;
    mouseRightDown = false;
}

function handleMouseMove(event) {
    if (!(mouseLeftDown || mouseRightDown)) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;

    if (mouseLeftDown) {
        azimuth -= 0.01 * deltaX;
        zenith -= 0.01 * deltaY;
        zenith = Math.min(Math.max(zenith, 0.001), Math.PI - 0.001);
    }
    else {
        radius += 0.01 * deltaY;
        radius = Math.min(Math.max(radius, 2.0), 100.0);
    }
    eye = sphericalToCartesian(radius, azimuth, zenith);
    view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    lastMouseX = newX;
    lastMouseY = newY;
}

function sphericalToCartesian(r, azimuth, zenith) {
    var x = r * Math.sin(zenith) * Math.sin(azimuth);
    var y = r * Math.cos(zenith);
    var z = r * Math.sin(zenith) * Math.cos(azimuth);

    return [x, y, z];

}
////////////////////////////////////////skybox program/////////////////////////////////
var programSkybox;

var skyboxPositionLocation;

var u_skyboxViewLocation;
var u_skyboxPerspLocation;

var u_cubeTextureLocation;

function initSkyboxShader() {
    // create programGlobe for skybox shading
    var skyboxVS = getShader(gl, "skyboxVS");
    var skyboxFS = getShader(gl, "skyboxFS");

    programSkybox = gl.createProgram();
    gl.attachShader(programSkybox, skyboxVS);
    gl.attachShader(programSkybox, skyboxFS);
    gl.linkProgram(programSkybox);
    if (!gl.getProgramParameter(programSkybox, gl.LINK_STATUS)) {
        alert("Could not initialise Skybox shader");
    }
  
    skyboxPositionLocation = gl.getAttribLocation(programSkybox, "Position");

    u_skyboxViewLocation = gl.getUniformLocation(programSkybox, "u_View");
    u_skyboxPerspLocation = gl.getUniformLocation(programSkybox, "u_Persp");
    
    u_cubeTextureLocation = gl.getUniformLocation(programSkybox, "u_cubeTexture");

}


var skyboxTex;

function initSkyboxTex() {
        
    skyboxTex = gl.createTexture();        
    // javaScript arrays can be of mixed types
    var cubeImages = [[gl.TEXTURE_CUBE_MAP_POSITIVE_X, "desertsky_ft.png"],
                      [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, "desertsky_bk.png"],
                      [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, "desertsky_up.png"],
                      [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, "desertsky_dn.png"],
                      [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, "desertsky_rt.png"],
                      [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, "desertsky_lf.png"]];

    // While a texture is bound, GL operations on the target to which it is
    // bound affect the bound texture, and queries of the target to which it
    // is bound return state from the bound texture.
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    /*function initLoadedCubeMap(texture, face, image) {
        //alert(image.complete);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(face, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        //message.innerHTML += image.complete + "\n";
        
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}*/
    
    for (var i = 0; i < cubeImages.length; i++) {
        var face = cubeImages[i][0];
        var image = new Image();
        image.onload = function(texture, face, image) {
            return function() {
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            };
        } (skyboxTex, face, image);
        // image load functions that do not work
        /*image.onload = function() {
gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
};*/
        /* image.onload = function() {
        return initLoadedCubeMap(skyboxTex, face, image)
};*/
        image.src = cubeImages[i][1];
    }
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

}


var skyboxPosBuffer;
var skyboxIndices;
var numberOfSkyboxIndices;

function intializeSkybox() {
        var positions = new Float32Array([
         // neg z, back         
          -500.0, 500.0, -500.0, -500.0, -500.0, -500.0, 500.0, -500.0, -500.0,
          500.0, -500.0, -500.0, 500.0, 500.0, -500.0, -500.0, 500.0, -500.0,
          // neg x, left
          -500.0, -500.0, 500.0, -500.0, -500.0, -500.0, -500.0, 500.0, -500.0,
          -500.0, 500.0, -500.0, -500.0, 500.0, 500.0, -500.0, -500.0, 500.0,
          // pos x, right
          500.0, -500.0, -500.0, 500.0, -500.0, 500.0, 500.0, 500.0, 500.0,
          500.0, 500.0, 500.0, 500.0, 500.0, -500.0, 500.0, -500.0, -500.0,
          // pos z, front
          -500.0, -500.0, 500.0, -500.0, 500.0, 500.0, 500.0, 500.0, 500.0,
          500.0, 500.0, 500.0, 500.0, -500.0, 500.0, -500.0, -500.0, 500.0,
          // pos y, top
          -500.0, 500.0, -500.0, 500.0, 500.0, -500.0, 500.0, 500.0, 500.0,
          500.0, 500.0, 500.0, -500.0, 500.0, 500.0, -500.0, 500.0, -500.0,
          // neg y, bottom
          -500.0, -500.0, -500.0, -500.0, -500.0, 500.0, 500.0, -500.0, -500.0,
          500.0, -500.0, -500.0, -500.0, -500.0, 500.0, 500.0, -500.0, 500.0
          ]);

    var indices = new Uint16Array(6 * 2 * 3);
    for (var i = 0; i < indices.length; ++i) {
        indices[i] = i;
    }
    
    // Positions
    skyboxPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
   
    // Indices
    skyboxIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    numberOfSkyboxIndices = indices.length;

}


function drawSkybox(){
    gl.useProgram(programSkybox);

    // enable attributes for this program
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPosBuffer);
    gl.vertexAttribPointer(skyboxPositionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(skyboxPositionLocation);

    // calculate and pass uniforms
    gl.uniformMatrix4fv(u_skyboxViewLocation, false, view);
    gl.uniformMatrix4fv(u_skyboxPerspLocation, false, persp);

    // pass textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
    gl.uniform1i(u_cubeTextureLocation, 0);

    // bind element buffer and draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndices);
    gl.drawElements(gl.TRIANGLES, numberOfSkyboxIndices, gl.UNSIGNED_SHORT, 0);
    
    // unbind all vertex attribute array used
    gl.disableVertexAttribArray(skyboxPositionLocation);
}

////////////////////////////////////////skybox program end/////////////////////////////////

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");

        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initFFTShader() {
    var vertexShader = getShader(gl, "vs_quad");
    var fragmentShader = getShader(gl, "fs_fftHorizontal");

    fftProgram = gl.createProgram();
    gl.attachShader(fftProgram, vertexShader);
    gl.attachShader(fftProgram, fragmentShader);
    gl.linkProgram(fftProgram);
    if (!gl.getProgramParameter(fftProgram, gl.LINK_STATUS)) {
        alert("Could not initialise FFT shader");
    }
 
    fftProgram.vertexPositionAttribute = gl.getAttribLocation(fftProgram, "position");

    fftProgram.samplerUniform = gl.getUniformLocation(fftProgram, "u_fftData");

}

function initSimShader() {
    var vertexShader = getShader(gl, "vs_quad");
    var fragmentShader = getShader(gl, "fs_sim");

    simProgram = gl.createProgram();
    gl.attachShader(simProgram, vertexShader);
    gl.attachShader(simProgram, fragmentShader);
    gl.linkProgram(simProgram);
    if (!gl.getProgramParameter(simProgram, gl.LINK_STATUS)) {
        alert("Could not initialise Simulation shader");
    }
 
    simProgram.vertexPositionAttribute = gl.getAttribLocation(simProgram, "position");
   
    simProgram.u_simTimeLocation = gl.getUniformLocation(simProgram, "u_time");
    simProgram.samplerUniform = gl.getUniformLocation(simProgram, "u_simData");

}

function initCopyShader()
{
    var vertexShader = getShader(gl, "vs_quad");
    var fragmentShader = getShader(gl, "fs_copy");

    copyProgram = gl.createProgram();
    gl.attachShader(copyProgram, vertexShader);
    gl.attachShader(copyProgram, fragmentShader);
    gl.linkProgram(copyProgram);

    if (!gl.getProgramParameter(copyProgram, gl.LINK_STATUS)) {
        alert("Could not initialise copying shaders");
    }

    copyProgram.vertexPositionAttribute = gl.getAttribLocation(copyProgram, "position");

    copyProgram.u_copyTimeLocation = gl.getUniformLocation(copyProgram, "u_time");
    copyProgram.samplerUniform = gl.getUniformLocation(copyProgram, "u_simData");
}

function initRenderShader()
{
    var vertexShader = getShader(gl, "vs_render");
    var fragmentShader = getShader(gl, "fs_render");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise rendering shaders");
    }

    
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "position");
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "normal");
  
    shaderProgram.u_modelLocation = gl.getUniformLocation(shaderProgram, "u_model");
    shaderProgram.u_viewLocation = gl.getUniformLocation(shaderProgram, "u_view");
    shaderProgram.u_modelViewLocation = gl.getUniformLocation(shaderProgram, "u_modelView");
    shaderProgram.u_perspLocation = gl.getUniformLocation(shaderProgram, "u_persp");
    shaderProgram.u_modelViewInvLocation = gl.getUniformLocation(shaderProgram, "u_modelViewInverse");
    shaderProgram.u_invTransLocation = gl.getUniformLocation(shaderProgram,"u_normalMatrix");
    shaderProgram.u_modelViewPerspectiveLocation = gl.getUniformLocation(shaderProgram,"u_modelViewPerspective");

    shaderProgram.u_shaderTimeLocation= gl.getUniformLocation(shaderProgram, "u_time");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "u_simData");

}


function initTextureFramebuffer()
{
	rttFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    rttFramebuffer.width = NUM_HEIGHT_PTS;
    rttFramebuffer.height = NUM_HEIGHT_PTS;
    
    rttTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.FLOAT, null);
    
   
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);
    
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE");
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function initCopyTextureFramebuffer()
{
	var testArray = new Float32Array(NUM_WIDTH_PTS*NUM_HEIGHT_PTS*4);
	var k = 0;
	for(var j = 0; j < NUM_HEIGHT_PTS; j++)
		for(var i = 0; i < NUM_WIDTH_PTS; i++) 
		{
			var s_contrib = Math.sin(i/(NUM_WIDTH_PTS-1) * 2.0 * Math.PI);
	        var t_contrib = Math.cos(j/(NUM_HEIGHT_PTS-1)* 2.0 * Math.PI);
	        var height = s_contrib * t_contrib;
			testArray[k++] = height; 
			testArray[k++] = 0.0;
			testArray[k++] = 0.0;
			testArray[k++] = 0.0;
		}
	
	copyFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, copyFramebuffer);
    copyFramebuffer.width = NUM_HEIGHT_PTS;
    copyFramebuffer.height = NUM_HEIGHT_PTS;
	
    copyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, copyFramebuffer.width, copyFramebuffer.height, 0, gl.RGBA, gl.FLOAT, testArray);
    
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copyTexture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE");
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function translateGridCoord(i,j,w)
{
    return i+j*w;
}


function initGrid()
{
    var w = NUM_WIDTH_PTS;
    var h = NUM_HEIGHT_PTS;

    positions = new Float32Array(w*h*3);
    for(var j=0;j<h;j++) for(var i=0;i<w;i++)
    {
        var idx=translateGridCoord(i,j,w);
        positions[idx*3]= j/(h-1);
        positions[idx*3+1] = 0.0;
        positions[idx*3+2] = i/(w-1);
    }
    waterFacePositionBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,waterFacePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);

    var indices = new Uint32Array((w-1)*(h-1)*6);
    var currentQuad=0;
    for(var j=0;j<h-1;j++) for(var i=0;i<w-1;i++)  
    {
        indices[currentQuad*6]   = translateGridCoord(i,j,w);
        indices[currentQuad*6+1] = translateGridCoord(i+1,j,w);
        indices[currentQuad*6+2] = translateGridCoord(i,j+1,w);
        indices[currentQuad*6+3] = translateGridCoord(i+1,j,w);
        indices[currentQuad*6+4] = translateGridCoord(i+1,j+1,w);
        indices[currentQuad*6+5] = translateGridCoord(i,j+1,w);
        currentQuad++;
    }
    waterFaceIndicesBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,waterFaceIndicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    waterFaceIndicesBuffer.numitems=currentQuad*6;
}

function initQuad()
{
    ///////////////////////////////
    /// Initialize the quad, using Triangle_Strip to draw it!
    /// positions are -1,-1; -1,1; 1,1; 1,-1
    /// And indices are 0,1,2,0,2,3
    ///////////////////////////////
	var quadPos=[-1.0,-1.0,
	             -1.0,1.0,
	             1.0,1.0,
	             1.0,-1.0];
	
    quadPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadPos), gl.STATIC_DRAW );
    
    var quadIndices=[0,1,2,0,2,3];
    quadIndicesBuffer= gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);   
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadIndices), gl.STATIC_DRAW);
}


function simulation()
{
    //THIS IS THE FIRST PASS THAT USE GLSL TO COMPUTE THE HEIGHT FIELD TO THE rttTexture BUFFER
    gl.useProgram(simProgram);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    

    gl.viewport(0, 0, rttFramebuffer.width, rttFramebuffer.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.vertexAttribPointer(simProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(simProgram.vertexPositionAttribute);

    gl.uniform1f(simProgram.u_simTimeLocation, currentTime);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.uniform1i(simProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
    
    gl.disableVertexAttribArray(simProgram.vertexPositionAttribute);    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);

}

function copyHeightField()
{
    // This is the 2nd pass that copy the rendered result to the height-map, which can be used in the first step.
    gl.useProgram(copyProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER,copyFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, copyFramebuffer.width, copyFramebuffer.height);
    gl.uniform1f(copyProgram.u_copyTimeLocation, currentTime);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.vertexAttribPointer(copyProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(copyProgram.vertexPositionAttribute);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.uniform1i(copyProgram.samplerUniform, 1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

    gl.disableVertexAttribArray(copyProgram.vertexPositionAttribute);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);
}


function render()
{
    //This is the 3rd pass that use GLSL to render the image, using rttTexture to be the height field of the wave
    gl.useProgram(shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvasWidth,canvasHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 2);


    var mv = mat4.create();
    mat4.multiply(view, model, mv);
    
    var invMV = mat4.create();
    mat4.inverse(mv,invMV);
    
    var mvp = mat4.create();
    mat4.multiply(persp, mv, mvp);
    
    var invTrans=mat4.create();
    mat4.inverse(mv,invTrans);
    mat4.transpose(invTrans,invTrans);

    gl.uniform1f(shaderProgram.u_shaderTimeLocation, currentTime);
    gl.uniformMatrix4fv(shaderProgram.u_modelViewLocation, false, mv);
    gl.uniformMatrix4fv(shaderProgram.u_modelViewPerspectiveLocation, false, mvp);
    gl.uniformMatrix4fv(shaderProgram.u_invTransLocation, false, invTrans);
    gl.uniformMatrix4fv(shaderProgram.u_modelLocation, false, model);
    gl.uniformMatrix4fv(shaderProgram.u_viewLocation, false, view);
    gl.uniformMatrix4fv(shaderProgram.u_perspLocation, false, persp);
    gl.uniformMatrix4fv(shaderProgram.u_modelViewInvLocation, false, invMV);

    gl.bindBuffer(gl.ARRAY_BUFFER, waterFacePositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, waterFaceIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, waterFaceIndicesBuffer.numitems, gl.UNSIGNED_INT,0);
    
    gl.disableVertexAttribArray(shaderProgram.vertexPositionAttribute);     
}

function animate()
{
    simulation();
    copyHeightField();
    render();
    //drawSkybox();

    var nowtime=new Date().getTime();
    if(nowtime-1000>startTime)
    {
        document.title = "WebGL Water Shader ["+new Number(totalFrames*1000/(new Date().getTime()-startTime)).toPrecision(3)+"fps]";
        startTime=nowtime;
        totalFrames=0;
    }
}

function tick(){
    requestAnimFrame(tick);
    currentTime=currentTime + 0.01;
    totalFrames++;
    if(totalFrames%2==0)
        animate();
}


function webGLStart() {
    startTime=new Date().getTime();
    totalFrames = 0;
    var canvas = document.getElementById("canvas1");
    initGL(canvas);

    canvas.onmousedown = handleMouseDown;
    canvas.oncontextmenu = function (ev) { return false; };
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    persp = mat4.create();
    mat4.perspective(45.0, canvas.width / canvas.height, 0.1, 800.0, persp);
    
    eye = sphericalToCartesian(radius, azimuth, zenith);
    view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    model = mat4.create();
    mat4.identity(model);
    mat4.scale(model, [1.0, 0.2, 1.0]);
    mat4.translate(model, [-0.5, -0.0, -0.5]);

    // Query extension
    var OES_texture_float = gl.getExtension('OES_texture_float');
    if (!OES_texture_float) {
        throw new Error("No support for OES_texture_float");
    }
    
    /*var OES_texture_float_linear =  gl.getExtension('OES_texture_float_linear');
    if (!OES_texture_float_linear) {
        throw new Error("No support for OES_texture_float_linear");
    }*/
    
    var OES_element_index_uint = gl.getExtension('OES_element_index_uint');
    if (!OES_element_index_uint) {
        throw new Error("No support for OES_element_index_uint");
    }
    
    var MaxVertexTextureImageUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    if (MaxVertexTextureImageUnits <= 0) {
        throw new Error("No support for vertex texture fetch");
    }
    
    initSimShader();
    initCopyShader();
    initRenderShader();
    initSkyboxShader();
    
    initTextureFramebuffer();
    initCopyTextureFramebuffer();
    
    initQuad();
    initGrid();
    intializeSkybox();
    initSkyboxTex();

    tick();
}