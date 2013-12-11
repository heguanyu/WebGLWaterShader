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
var instancingEXT;

var canvas = document.getElementById("canvas");	

var stats;
var startTime;
var currentTime = 0.0;
var totalFrames;

var canvasHeight;
var canvasWidth;

var quadPositionBuffer;
var quadIndicesBuffer;

var oceanPatchPositionBuffer;
var oceanPatchTexCoordBuffer;
var oceanPatchOffsetBuffer;
var oceanPatchIndicesBuffer;

var simProgram;
var shaderProgram;

var model;

var sunPos = [0.0,-10.0,1800.0];
/////////////////////////////////////////mouse control//////////////////////////////////
//Camera control
var mouseLeftDown = false;
var mouseRightDown = false;
var lastMouseX = null;
var lastMouseY = null;

var radius = 10.5;
var azimuth = 0.0;
var zenith = Math.PI / 3.0;

var center = [0.0, 0.0, 0.0];
var up = [0.0, 1.0, 0.0];
var faceDir = [0.0, -1.0, 1.0];
var fov = 45.0;

var persp;
var eye;
var view;

// mouse control callbacks
function refreshViewMat()
{
    faceDir=sphericalToCartesian(1.0,azimuth,zenith);
    center=[eye[0]+faceDir[0],eye[1]+faceDir[1],eye[2]+faceDir[2]];
    view = mat4.create();
    mat4.lookAt(eye, center, up, view);
}
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
        azimuth -= 0.002 * deltaX;
        zenith += 0.002 * deltaY;
        zenith = Math.min(Math.max(zenith, 0.001), Math.PI - 0.001);
    }
    else {
        radius += 0.01 * deltaY;
        radius = Math.min(Math.max(radius, 2.0), 100.0);
    }
    //eye = sphericalToCartesian(radius, azimuth, zenith);
    refreshViewMat();
    lastMouseX = newX;
    lastMouseY = newY;
}
///////////////////
// Camera used vec3
///////////////////

function vecadd(a, b)
{
    return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
}
function vecsub(a, b)
{
    return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
}
function vecl(a)
{
    return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
}
function vecnorm(a)
{
    var l = vecl(a);
    if(l<0.00000001) return a;
    return [a[0]/l,a[1]/l,a[2]/l];
}

function initKeyboardHandle()
{
    document.addEventListener('keydown', function(event) {
        var movespeed = 0.1;
        var movdir = [faceDir[0]*movespeed,0.0,faceDir[2]*movespeed];

        movdir = vecnorm(movdir);
        movdir = [movdir[0]*movespeed,movdir[1]*movespeed,movdir[2]*movespeed];

        var leftdir = [-movdir[2],0.0,movdir[0]];

        if(event.keyCode == 87 || event.keyCode ==38) {
            eye=vecadd(eye,movdir);
        }
        else if(event.keyCode == 83 || event.keyCode == 40) {
            eye=vecsub(eye,movdir);
        }
        else if(event.keyCode == 65 || event.keyCode ==37) {
            eye=vecsub(eye,leftdir);
        }
        else if(event.keyCode == 68|| event.keyCode == 39) {
            eye=vecadd(eye,leftdir);
        }
        refreshViewMat();
    });
}

function inithandleMouseWheel()
{
    window.onmousewheel=function(event)
    {
        var movdir = [0.0,0.1,0.0];
        if(event.wheelDelta<0.0)
        {
            eye=vecsub(eye,movdir);
        }
        else
        {
            eye=vecadd(eye,movdir);
        }
        refreshViewMat();
    };
}

function sphericalToCartesian(r, azimuth, zenith) {
    var x = r * Math.sin(zenith) * Math.sin(azimuth);
    var y = r * Math.cos(zenith);
    var z = r * Math.sin(zenith) * Math.cos(azimuth);

    return [x, y, z];

}

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


function initSimShader() {
    var vertexShader = getShader(gl, "vs_quad");
    var fragmentShader = getShader(gl, "fs_simFFT");

    simProgram = gl.createProgram();
    gl.attachShader(simProgram, vertexShader);
    gl.attachShader(simProgram, fragmentShader);
    gl.linkProgram(simProgram);
    if (!gl.getProgramParameter(simProgram, gl.LINK_STATUS)) {
        alert("Could not initialise Simulation shader");
    }
 
    simProgram.vertexPositionAttribute = gl.getAttribLocation(simProgram, "position");
   
    simProgram.u_meshSizeLocation = gl.getUniformLocation(simProgram, "u_meshSize");
    simProgram.u_patchSizeLocation = gl.getUniformLocation(simProgram, "u_patchSize");
    simProgram.u_simTimeLocation = gl.getUniformLocation(simProgram, "u_time");
    simProgram.samplerUniform = gl.getUniformLocation(simProgram, "u_simData");

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
    shaderProgram.vertexTexCoordAttribute = gl.getAttribLocation(shaderProgram, "texCoord");
    shaderProgram.vertexOffsetAttribute = gl.getAttribLocation(shaderProgram, "offset");
  
    shaderProgram.u_modelLocation = gl.getUniformLocation(shaderProgram, "u_model");
    shaderProgram.u_viewLocation = gl.getUniformLocation(shaderProgram, "u_view");
    shaderProgram.u_modelViewLocation = gl.getUniformLocation(shaderProgram, "u_modelView");
    shaderProgram.u_perspLocation = gl.getUniformLocation(shaderProgram, "u_persp");
    shaderProgram.u_modelViewInvLocation = gl.getUniformLocation(shaderProgram, "u_modelViewInverse");
    shaderProgram.u_invTransLocation = gl.getUniformLocation(shaderProgram,"u_normalMatrix");
    shaderProgram.u_modelViewPerspectiveLocation = gl.getUniformLocation(shaderProgram,"u_modelViewPerspective");

    shaderProgram.u_meshSizeLocation= gl.getUniformLocation(shaderProgram, "u_meshSize");
    shaderProgram.u_shaderTimeLocation= gl.getUniformLocation(shaderProgram, "u_time");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "u_simData");

}



function initSpectrumTexture()
{
	var initSpectrumArray = new Float32Array(meshSize*meshSize*4);
	var k = 0;
	for(var j = 0; j < meshSize; j++)
		for(var i = 0; i < meshSize; i++) 
		{
	        var h0 = new generate_h0(i, j);
			initSpectrumArray[k++] = h0.re;
			initSpectrumArray[k++] = h0.im;
			initSpectrumArray[k++] = 0.0;
			initSpectrumArray[k++] = 0.0;
		}
	
    initialSpectrumTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, initialSpectrumTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, meshSize, meshSize, 0, gl.RGBA, gl.FLOAT, initSpectrumArray);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function translateGridCoord(i,j,w)
{
    return i+j*w;
}


function initGrid()
{
    var positions = new Float32Array(meshSize*meshSize*3);
    var texCoords = new Float32Array(meshSize*meshSize*2);
    var delta_half = 0.5 / meshSize;
    for(var j=0;j<meshSize;j++) 
    	for(var i=0;i<meshSize;i++)
	    {
	        var idx=translateGridCoord(i,j,meshSize);
	        positions[idx*3]= (j - meshSize/2) / meshSize * patchSize ;
	        positions[idx*3+1] = 0.0;
	        positions[idx*3+2] = (i - meshSize/2) / meshSize * patchSize ;
	        
	        texCoords[idx*2]= i / meshSize + delta_half;
	        texCoords[idx*2+1] = j / meshSize + delta_half;	
	    }
    
    oceanPatchPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,oceanPatchPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);
    
    oceanPatchTexCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,oceanPatchTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,texCoords,gl.STATIC_DRAW);

    var indices = new Uint32Array((meshSize-1)*(meshSize-1)*6);
    var currentQuad=0;
    for(var j=0;j<meshSize-1;j++) 
    	for(var i=0;i<meshSize-1;i++)  
	    {
	        indices[currentQuad*6]   = translateGridCoord(i,j,meshSize);
	        indices[currentQuad*6+1] = translateGridCoord(i+1,j,meshSize);
	        indices[currentQuad*6+2] = translateGridCoord(i,j+1,meshSize);
	        indices[currentQuad*6+3] = translateGridCoord(i+1,j,meshSize);
	        indices[currentQuad*6+4] = translateGridCoord(i+1,j+1,meshSize);
	        indices[currentQuad*6+5] = translateGridCoord(i,j+1,meshSize);
	        currentQuad++;
	    }
    oceanPatchIndicesBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,oceanPatchIndicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    oceanPatchIndicesBuffer.numitems=currentQuad*6;
    
    // initialize instancing
    var halfPatchCount = patchCount /2.0;

    var offsetData = new Float32Array(patchCount * patchCount * 3);
    
    var i = 0;
    for(var x = 0; x < patchCount; ++x) {
        for(var z = 0; z < patchCount; ++z) {
            offsetData[i]   = x * (meshSize-1)/meshSize*patchSize;
            offsetData[i+1] = 0;
            offsetData[i+2] = z * (meshSize-1)/meshSize*patchSize;
            i += 3;
        }
    }
    oceanPatchOffsetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, oceanPatchOffsetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, offsetData, gl.STATIC_DRAW);
    oceanPatchOffsetBuffer.instanceCount = patchCount * patchCount;

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
    //Develop the initial spectrum h_0 according to dispersion relation. Write result to spectrumTextureA bufferg
    gl.useProgram(simProgram);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureA, 0);
    
    gl.viewport(0, 0, meshSize, meshSize);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.vertexAttribPointer(simProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(simProgram.vertexPositionAttribute);

    gl.uniform1f(simProgram.u_simTimeLocation, currentTime);
    gl.uniform1f(simProgram.u_meshSizeLocation, meshSize);
    gl.uniform1f(simProgram.u_patchSizeLocation, patchSize);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, initialSpectrumTex);
    gl.uniform1i(simProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
    
    gl.disableVertexAttribArray(simProgram.vertexPositionAttribute);    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);

}

//Do two passes for 2D FFT
function FFT()
{
	gl.viewport(0, 0, meshSize, meshSize);
	gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
	gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);    
    // FFT horizontal pass
    gl.useProgram(fftHorizontalProgram);

    gl.vertexAttribPointer(fftHorizontalProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(fftHorizontalProgram.vertexPositionAttribute);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
    
    var isEvenStage = true;
    for(var i = 0; i < numFFTStages; ++i)
	{
    	if(isEvenStage)
		{   		
    		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureB, 0);
    		
    		gl.activeTexture(gl.TEXTURE0);
	    	gl.bindTexture(gl.TEXTURE_2D, spectrumTextureA);
	    	gl.uniform1i(fftHorizontalProgram.fftDataUniform, 0);
	    	
    		gl.activeTexture(gl.TEXTURE1);
	    	gl.bindTexture(gl.TEXTURE_2D, butterflyTextures[i]);
	    	gl.uniform1i(fftHorizontalProgram.butterflyUniform, 1);	  	
		}
    	else
		{
    		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureA, 0);
    		
    		gl.activeTexture(gl.TEXTURE0);
	    	gl.bindTexture(gl.TEXTURE_2D, spectrumTextureB);	
	    	gl.uniform1i(fftHorizontalProgram.fftDataUniform, 0);	
	    	
	    	gl.activeTexture(gl.TEXTURE1);
	    	gl.bindTexture(gl.TEXTURE_2D, butterflyTextures[i]);
	    	gl.uniform1i(fftHorizontalProgram.butterflyUniform, 1);	
		}
    	
    	
    	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);  	
    	isEvenStage = !isEvenStage;
	}
       
    gl.disableVertexAttribArray(fftHorizontalProgram.vertexPositionAttribute);    
    
    // FFT vertical pass, note we do not swap the real part and imaginary part back from the result because we still have an inverse FFT pass to do
    gl.useProgram(fftVerticalProgram);
        
    gl.vertexAttribPointer(fftVerticalProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(fftVerticalProgram.vertexPositionAttribute);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
    
    for(var i = 0; i < numFFTStages; ++i)
	{
    	if(isEvenStage)
		{
    		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureB, 0);
    		
    		gl.activeTexture(gl.TEXTURE0);
	    	gl.bindTexture(gl.TEXTURE_2D, spectrumTextureA);
	    	gl.uniform1i(fftVerticalProgram.fftDataUniform, 0);	
	    	
    		gl.activeTexture(gl.TEXTURE1);
	    	gl.bindTexture(gl.TEXTURE_2D, butterflyTextures[i]);
	    	gl.uniform1i(fftVerticalProgram.butterflyUniform, 1);	
     	
		}
    	else
		{
    		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureA, 0);
    		
    		gl.activeTexture(gl.TEXTURE0);
	    	gl.bindTexture(gl.TEXTURE_2D, spectrumTextureB);	
	    	gl.uniform1i(fftVerticalProgram.fftDataUniform, 0);		
	    	
	    	gl.activeTexture(gl.TEXTURE1);
	    	gl.bindTexture(gl.TEXTURE_2D, butterflyTextures[i]);
	    	gl.uniform1i(fftVerticalProgram.butterflyUniform, 1);
	    	
		}
    	   	
    	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);   	
    	isEvenStage = !isEvenStage;
	}
    
    heightFieldTex = isEvenStage ? spectrumTextureA : spectrumTextureB;
    
    gl.disableVertexAttribArray(fftVerticalProgram.vertexPositionAttribute);    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);

}

function render()
{
    //This is the 3rd pass that use GLSL to render the image, using spectrumTextureA to be the height field of the wave
    gl.useProgram(shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvasWidth,canvasHeight);   
    gl.enable(gl.DEPTH_TEST);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, heightFieldTex);
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

    gl.uniform1f(shaderProgram.u_meshSizeLocation, meshSize);
    
    gl.uniform1f(shaderProgram.u_shaderTimeLocation, currentTime);
    gl.uniformMatrix4fv(shaderProgram.u_modelViewLocation, false, mv);
    gl.uniformMatrix4fv(shaderProgram.u_modelViewPerspectiveLocation, false, mvp);
    gl.uniformMatrix4fv(shaderProgram.u_invTransLocation, false, invTrans);
    gl.uniformMatrix4fv(shaderProgram.u_modelLocation, false, model);
    gl.uniformMatrix4fv(shaderProgram.u_viewLocation, false, view);
    gl.uniformMatrix4fv(shaderProgram.u_perspLocation, false, persp);
    gl.uniformMatrix4fv(shaderProgram.u_modelViewInvLocation, false, invMV);
    
    gl.uniform3f(gl.getUniformLocation(shaderProgram, "eyePos"), eye[0],eye[1],eye[2]);
    gl.uniform3f(gl.getUniformLocation(shaderProgram, "u_sunPos"), sunPos[0],sunPos[1],sunPos[2]);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, oceanPatchIndicesBuffer);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, oceanPatchPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, oceanPatchTexCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexTexCoordAttribute);

    
    //gl.drawElements(gl.TRIANGLES, oceanPatchIndicesBuffer.numitems, gl.UNSIGNED_INT,0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, oceanPatchOffsetBuffer);
    gl.enableVertexAttribArray(shaderProgram.vertexOffsetAttribute);
    gl.vertexAttribPointer(shaderProgram.vertexOffsetAttribute, 3, gl.FLOAT, false, 0, 0);
    instancingEXT.vertexAttribDivisorANGLE(shaderProgram.vertexOffsetAttribute, 1);

    instancingEXT.drawElementsInstancedANGLE(gl.TRIANGLES, oceanPatchIndicesBuffer.numitems, gl.UNSIGNED_INT, 0, oceanPatchOffsetBuffer.instanceCount);

    instancingEXT.vertexAttribDivisorANGLE(shaderProgram.vertexOffsetAttribute, 0);    
    gl.disableVertexAttribArray(shaderProgram.vertexPositionAttribute);     
    gl.disableVertexAttribArray(shaderProgram.vertexTexCoordAttribute);     
}

function animate()
{
	gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    simulation();
    FFT();
    skyrender();
    render();
    

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
    stats.update();
    currentTime=currentTime + 0.01;
    totalFrames++;
    animate();
}


function webGLStart() {
	// FPS indicator
	stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms

    // Align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.body.appendChild( stats.domElement );

  
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
    persp = mat4.create();
    mat4.perspective(fov*2.0, canvas.width / canvas.height, 0.1, 200.0, persp);
    eye=[0.0,1.5,0.0];
    faceDir=sphericalToCartesian(1.0,azimuth,zenith);
    center=[eye[0]+faceDir[0],eye[1]+faceDir[1],eye[2]+faceDir[2]];
    view = mat4.create();
    mat4.lookAt(eye, center, up, view);
    model = mat4.create();

    mat4.identity(model);
    //mat4.scale(model, [0.01, 0.2, 0.01]);
    var scalar = 0.1;
    mat4.scale(model, [1.0*scalar, 20.0*scalar, 1.0*scalar]);

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
    
    instancingEXT = gl.getExtension('ANGLE_instanced_arrays');
    if (!instancingEXT) {
        throw new Error("No support for ANGLE_instanced_arrays");
    }
    
    
    initKeyboardHandle();
    inithandleMouseWheel();
    
    initSimShader();
    initFFTHorizontalShader();
    initFFTVerticalShader();
    initRenderShader();
    initSkyShader();
      
    initSpectrumTexture();
    initButterflyTextures();
    initFFTFramebuffer();
    
    initQuad();
    initGrid();
    
    tick();
    
}