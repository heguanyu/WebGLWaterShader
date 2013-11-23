////////////////COPYRIGHT DECLARATION//////////////////////
//////
//////   COPYRIGHT  GUANYU HE AND HAO WU, 2013
//////   ALL THE FOLLOWING CODE IS PROTECTED BY THE COPYRIGHT
//////
//////   THE CODE IN THIS FILE CANNOT BE REUSED OUTSIDE CIS565 GPU PROGRAMMING COURSE
//////   IN UNIVERSITY OF PENNSYLVANIA UNLESS SPECIAL AUTHORIZATION.
//////
//////   CONTACT INFO: heguanyu9037@gmail.com
//////
////////////////FILE INFO ///////////////////////////////
//////   THIS IS THE MAIN FILE OF THE WATER RENDERING
//////   INCLUDING THE SETUP OF THE 3 PASSES IN RENDERING
//////
//////
//////
//////
////////////////////////////////////////////////////////////

var gl;
var debugarea;

var NUM_WIDTH_PTS=256;
var NUM_HEIGHT_PTS=256;

var starttime;

var canvas = document.getElementById("canvas");


var persp = mat4.create();
mat4.perspective(45.0, 0.5, 0.1, 100.0, persp);

var eye = [2.0, 1.0, 3.0];
var center = [0.0, 0.0, 0.0];
var up = [0.0, 0.0, 1.0];
var view = mat4.create();
mat4.lookAt(eye, center, up, view);

var heightfield;
var velfield;

var u_modelViewPerspectiveLocation;

var curtime=0.0;
var totalframes;

var canvasheight;
var canvaswidth;

var simpositionbuffer;
var simindicesbuffer;

var waterfacepositionbuffer;
var waterfaceindicesbuffer;

var sim_utimeloc;
var shader_utimeloc;
var copy_utimeloc;

var simulateProgram;
var shaderProgram;
var copyProgram;

var rttFramebuffer;
var rttTexture;

var copyFramebuffer;
var copyTexture;

var positions;

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");

        canvaswidth = canvas.width;
        canvasheight = canvas.height;
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
    var vertexShader = getShader(gl, "vs_sim");
    var fragmentShader = getShader(gl, "fs_sim");

    simulateProgram = gl.createProgram();
    gl.attachShader(simulateProgram, vertexShader);
    gl.attachShader(simulateProgram, fragmentShader);
    gl.linkProgram(simulateProgram);
    if (!gl.getProgramParameter(simulateProgram, gl.LINK_STATUS)) {
        alert("Could not initialise Simulation shader");
    }
    gl.useProgram(simulateProgram);

    simulateProgram.vertexPositionAttribute = gl.getAttribLocation(simulateProgram, "position");
    gl.enableVertexAttribArray(simulateProgram.vertexPositionAttribute);
    sim_utimeloc = gl.getUniformLocation(simulateProgram, "u_time");
    simulateProgram.samplerUniform = gl.getUniformLocation(simulateProgram, "uSampler");
}
function initCopyShader()
{
    var vertexShader = getShader(gl, "vs_copy");
    var fragmentShader = getShader(gl, "fs_copy");

    copyProgram = gl.createProgram();
    gl.attachShader(copyProgram, vertexShader);
    gl.attachShader(copyProgram, fragmentShader);
    gl.linkProgram(copyProgram);

    if (!gl.getProgramParameter(copyProgram, gl.LINK_STATUS)) {
        alert("Could not initialise copying shaders");
    }

    gl.useProgram(copyProgram);

    copyProgram.vertexPositionAttribute = gl.getAttribLocation(copyProgram, "position");
    gl.enableVertexAttribArray(copyProgram.vertexPositionAttribute);

    copy_utimeloc = gl.getUniformLocation(copyProgram, "u_time");
    copyProgram.samplerUniform = gl.getUniformLocation(copyProgram, "uSampler");

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

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "position");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);


    u_modelViewPerspectiveLocation = gl.getUniformLocation(shaderProgram,"u_modelViewPerspective");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shader_utimeloc= gl.getUniformLocation(shaderProgram, "u_time");

}


function initTextureFramebuffer()
{
    rttFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    rttFramebuffer.width = NUM_HEIGHT_PTS;
    rttFramebuffer.height = NUM_HEIGHT_PTS;

    rttTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);



    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function initCopyTextureFramebuffer()
{
    copyFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, copyFramebuffer);
    copyFramebuffer.width = NUM_HEIGHT_PTS;
    copyFramebuffer.height = NUM_HEIGHT_PTS;

    copyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, copyFramebuffer.width, copyFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);




    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copyTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function translateGridCoord(i,j,w)
{
    return i+j*w;
}

function initGrid()
{
    var w=NUM_WIDTH_PTS;
    var h=NUM_HEIGHT_PTS;

    positions = new Float32Array(w*h*3);
    for(var i=0;i<w;i++)for(var j=0;j<h;j++)
    {
        var idx=translateGridCoord(i,j,w);
        positions[idx*3]=i/(w-1);
        positions[idx*3+1] = j/(h-1);
        positions[idx*3+2]=0.0;
    }
    waterfacepositionbuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacepositionbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);


    var indices = new Uint16Array((w-1)*(h-1)*6);
    var cursquare=0;
    for(var i=0;i<w-1;i++) for(var j=0;j<h-1;j++)
    {
        indices[cursquare*6]=translateGridCoord(i,j,w);
        indices[cursquare*6+1]=translateGridCoord(i,j+1,w);
        indices[cursquare*6+2]=translateGridCoord(i+1,j+1,w);
        indices[cursquare*6+3]=translateGridCoord(i+1,j+1,w);
        indices[cursquare*6+4]=translateGridCoord(i+1,j,w);
        indices[cursquare*6+5]=translateGridCoord(i,j,w);
        cursquare++;
    }

    waterfaceindicesbuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,waterfaceindicesbuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW)
    waterfaceindicesbuffer.numitems=cursquare*6;
}

function initQuad()
{
    ///////////////////////////////
    /// Initialize the quad, using Triangle_Strip to draw it!
    /// positions are -1,-1; -1,1; 1,1; 1,-1
    /// And indices are 0,1,2,0,2,3
    ///////////////////////////////
    simpositionbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, simpositionbuffer);
    var quadpos=[-1.0,-1.0,
        -1.0,1.0,
        1.0,1.0,
        1.0,-1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadpos), gl.STATIC_DRAW );
    simindicesbuffer= gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simindicesbuffer);
    var quadidx=[0,1,2,0,2,3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadidx), gl.STATIC_DRAW);
}

var cubeTexture;
var cubeImage;
function initTextures() {
    cubeTexture = gl.createTexture();
    cubeImage = new Image();
    cubeImage.onload = function() { handleTextureLoaded(cubeImage, cubeTexture); }
    cubeImage.src = "earthmap50.png";
}

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function firstpass()
{
    //THIS IS THE FIRST PATH THAT USE GLSL TO COMPUTE THE HEIGHT FIELD TO THE rttTexture BUFFER
    gl.useProgram(simulateProgram);
    gl.uniform1f(sim_utimeloc, curtime);
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, rttFramebuffer.width, rttFramebuffer.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, simpositionbuffer);
    gl.vertexAttribPointer(simulateProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.uniform1i(simulateProgram.samplerUniform, 0);





    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simindicesbuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

}

function secondpass()
{

    // This is the 2nd path that copy the rendered result to the height-map, which can be used in the first step.

    gl.useProgram(copyProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER,copyFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, copyFramebuffer.width, copyFramebuffer.height);
    gl.uniform1f(copy_utimeloc, curtime);
    gl.bindBuffer(gl.ARRAY_BUFFER, simpositionbuffer);
    gl.vertexAttribPointer(copyProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.uniform1i(copyProgram.samplerUniform, 1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simindicesbuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function finalrender()
{
    //This is the 3rd path that use GLSL to render the image, using rttTexture to be the height field of the wave
    gl.useProgram(shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvaswidth,canvasheight);
    //gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 2);

    var model = mat4.create();
    mat4.identity(model);
    mat4.translate(model, [-0.5, -0.5, 0.0]);
    mat4.scale(model, [1.0, 1.0, 1.0]);
    var mv = mat4.create();
    mat4.multiply(view, model, mv);
    var mvp = mat4.create();
    mat4.multiply(persp, mv, mvp);

    gl.uniform1f(shader_utimeloc, curtime);
    gl.uniformMatrix4fv(u_modelViewPerspectiveLocation, false, mvp);

    gl.bindBuffer(gl.ARRAY_BUFFER, waterfacepositionbuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, waterfaceindicesbuffer);
    gl.drawElements(gl.TRIANGLES, waterfaceindicesbuffer.numitems, gl.UNSIGNED_SHORT,0);
}
function animate()
{
 //   firstpass();
 //   secondpass();

    simulateHeightField(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);

    finalrender();

    var nowtime=new Date().getTime();
    if(nowtime-1000>starttime)
    {
        document.title = "WebGL Water Shader _ fps["+new Number(totalframes*1000/(new Date().getTime()-starttime)).toPrecision(3)+"]";
        starttime=nowtime;
        totalframes=0;
    }

}

function tick(){
    requestAnimFrame(tick);
    curtime=curtime+0.01;
    totalframes++;
    animate();
}

function simulateHeightField(w,h)
{
    for(var i=0;i<w;i++)
    {
        for(var j=0;j<h;j++)
        {
            var left = i-1; if(left<0) left+=1;
            var right = i+1; if(right>=w) right-=1;
            var up = j-1; if(up<0) up+=1;
            var down = j+1; if(down>=h) down-=1;

            velfield[i][j]+=(heightfield[left][j]+
                heightfield[right][j]+
                heightfield[i][up]+
                heightfield[i][down])*0.25-heightfield[i][j];

            velfield[i][j]*=0.9999;
        }
    }
    for(var i=0;i<w;i++)
    {
        for(var j=0;j<h;j++)
        {
            heightfield[i][j]+=velfield[i][j];
            var idx=translateGridCoord(i,j,w);
            positions[idx*3+2]=heightfield[i][j];
            //positions[idx*3+2]=0.0;
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacepositionbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);

}

function initHeightField(w,h)
{
    heightfield=new Array(w);
    velfield=new Array(w);

    for(var i=0;i<w;i++)
    {
        heightfield[i]=new Array(h);
        velfield[i]=new Array(h);
        for(var j=0;j<h;j++)
        {
            heightfield[i][j]=Math.sqrt((i-w*0.5)*(i-w*0.5)/w/w+(j-h*0.5)*(j-h*0.5)/h/h);
            velfield[i][j]=0.0;
        }
    }
}
function webGLStart() {


    starttime=new Date().getTime();
    totalframes = 0;
    var canvas = document.getElementById("canvas1");
    debugarea  = document.getElementById("debug_text");
    initGL(canvas);

    gl.getExtension('OES_texture_float');

    initHeightField(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);

    initSimShader();
    initCopyShader();
    initRenderShader();
    initTextureFramebuffer();
    initCopyTextureFramebuffer();
    initQuad();
    initGrid();
    //initTextures();

    gl.viewport(0,0,canvaswidth,canvasheight);

    gl.clearColor(0.0,0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    tick();
}
