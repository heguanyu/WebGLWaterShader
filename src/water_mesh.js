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
////// INCLUDING SIMULATING THE HEIGHT FIELD
////// AND THE RENDERING PIPELINE CONTROL
//////
//////
//////
////////////////////////////////////////////////////////////


// mouse and keyboard control
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

function initKeyboardHandle()
{


    document.addEventListener('keydown', function(event) {
        var movespeed = 0.1;
        var movdir = [faceDir[0]*movespeed,0.0,faceDir[2]*movespeed];

        movdir = vecnorm(movdir);

        var leftdir = [-movdir[2],0.0,movdir[0]];

        if(event.keyCode == 87 || event.keyCode ==38) {
            debugarea.innerHTML="Forward";
            eye=vecadd(eye,movdir);
        }
        else if(event.keyCode == 83 || event.keyCode == 40) {
            debugarea.innerHTML="Backward";
            eye=vecsub(eye,movdir);
        }
        else if(event.keyCode == 65 || event.keyCode ==37) {
            debugarea.innerHTML="Left";
            eye=vecsub(eye,leftdir);
        }
        else if(event.keyCode == 68|| event.keyCode == 39) {
            debugarea.innerHTML="Right";
            eye=vecadd(eye,leftdir);
        }
        refreshViewMat();
    });
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

function initSpectrumTexture()
{
    var initSpectrumArray = new Float32Array(meshSize*meshSize*4);
    var k = 0;
    for(var j = 0; j < meshSize; j++)
        for(var i = 0; i < meshSize; i++)
        {
            var h0 = new generate_h0(i, j);
            // Swap the real part and imaginary part of input data to use FFT to compute inverse FFT
            initSpectrumArray[k++] = h0.im;//h0.re;
            initSpectrumArray[k++] = h0.re;//h0.im;
            initSpectrumArray[k++] = 0.0;
            initSpectrumArray[k++] = 0.0;
        }
    /*
     copyFramebuffer = gl.createFramebuffer();
     gl.bindFramebuffer(gl.FRAMEBUFFER, copyFramebuffer);
     copyFramebuffer.width = meshSize;
     copyFramebuffer.height = meshSize;*/

    initialSpectrumTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, initialSpectrumTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, meshSize, meshSize, 0, gl.RGBA, gl.FLOAT, initSpectrumArray);

    /*
     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, initialSpectrumTex, 0);
     if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
     throw new Error("gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE");
     }*/

    gl.bindTexture(gl.TEXTURE_2D, null);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function initGrid()
{
    var positions = new Float32Array(meshSize*meshSize*3);
    var texCoords = new Float32Array(meshSize*meshSize*2);
    for(var j=0;j<meshSize;j++)
        for(var i=0;i<meshSize;i++)
        {
            var idx=translateGridCoord(i,j,meshSize);
            positions[idx*3]= (j - meshSize/2) * patchSize / meshSize;
            positions[idx*3+1] = 0.0;
            positions[idx*3+2] = (i - meshSize/2) * patchSize / meshSize;

            texCoords[idx*2]= i/(meshSize-1);
            texCoords[idx*2+1] = j/(meshSize-1);
        }

    waterFacePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,waterFacePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);

    waterFaceTexCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,waterFaceTexCoordBuffer);
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
            heightfield[i][j]=0.0;
            velfield[i][j]=0.0;
        }
    }

    for(var stepsize=w;stepsize>=2.0;stepsize/=8.0)
    {

        for(var i=0;i<w;i+=stepsize)
        {
            for(var j=0;j<h;j+=stepsize)
            {
                var temp=Math.random()*Math.pow(stepsize/w,1.0)/1.0;
                var phase1 = Math.random()*1.0;
                var phase2 = Math.random()*1.0;

                    for(var x=i;x<i+stepsize;x++)for(var y=j;y<j+stepsize;y++)
                {
                    var c1=Math.cos(phase1*(Math.PI)+(x-i-stepsize*0.5)/stepsize*(Math.PI));
                    var c2=Math.cos(phase2*(Math.PI)+(y-j-stepsize*0.5)/stepsize*(Math.PI));
                    heightfield[x][y]+=c1*c2*temp;
                }
            }
        }
    }
}


function updateNormal(index, newnormal)
{
    normals[index*3]=newnormal.x;
    normals[index*3+1]=newnormal.y;
    normals[index*3+2]=newnormal.z;
}

function updateNormalMap(w,h)
{
    for(var i=0;i<w;i++) for(var j=0;j<h;j++)
    {
        var useleft=true;
        var useright=true;
        var useup=true;
        var usedown=true;
        var left = i-1; if(left<0) useleft=false;
        var right = i+1; if(right>=w) useright=false;
        var up = j-1; if(up<0) useup=false;
        var down = j+1; if(down>=h) usedown=false;

        var count=0;
        var leftcoord;
        var leftPos=new Vec3(0,0,0);
        var rightcoord,rightPos=new Vec3(0,0,0),upcoord,upPos=new Vec3(0,0,0),downcoord,downPos=new Vec3(0,0,0);
        if(useleft)
        {
            leftcoord=translateGridCoord(left,j,w);
            leftPos=new Vec3(positions_World[leftcoord*3],positions_World[leftcoord*3+1],positions_World[leftcoord*3+2]);
        }
        if(useright)
        {
            rightcoord=translateGridCoord(right,j,w);
            rightPos=new Vec3(positions_World[rightcoord*3],positions_World[rightcoord*3+1],positions_World[rightcoord*3+2]);
        }
        if(useup)
        {
            upcoord=translateGridCoord(i,up,w);
            upPos=new Vec3(positions_World[upcoord*3],positions_World[upcoord*3+1],positions_World[upcoord*3+2]);
        }
        if(usedown)
        {
            downcoord=translateGridCoord(i,down,w);
            downPos=new Vec3(positions_World[downcoord*3],positions_World[downcoord*3+1],positions_World[downcoord*3+2]);
        }

        var mycoord = translateGridCoord(i,j,w);
        var myPos=new Vec3(positions_World[mycoord*3],positions_World[mycoord*3+1],positions_World[mycoord*3+2]);
        var totalNormal=new Vec3(0,0,0);

        if(useleft&&useup)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,leftPos),vecMinus(upPos,myPos))));
        }
        if(useright&&useup)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,upPos),vecMinus(rightPos,myPos))));
        }
        if(usedown&&useright)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,rightPos),vecMinus(downPos,myPos))));
        }
        if(usedown&&useleft)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,downPos),vecMinus(leftPos,myPos))));
        }
        totalNormal=vecNormalize(totalNormal);
        updateNormal(mycoord,totalNormal);
    }
}

function FFT()
{
    gl.viewport(0, 0, meshSize, meshSize);
    // FFT horizontal pass
    gl.useProgram(fftHorizontalProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.vertexAttribPointer(fftHorizontalProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(fftHorizontalProgram.vertexPositionAttribute);


    var isEvenStage = true;
    for(var i = 0; i < numFFTStages; ++i)
    {
        if(isEvenStage)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);
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
            gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureA, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, spectrumTextureB);
            gl.uniform1i(fftHorizontalProgram.fftDataUniform, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, butterflyTextures[i]);
            gl.uniform1i(fftHorizontalProgram.butterflyUniform, 1);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

        isEvenStage = !isEvenStage;
    }


    gl.disableVertexAttribArray(fftHorizontalProgram.vertexPositionAttribute);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);

    // FFT vertical pass, note we do not swap the real part and imaginary part back from the result because we still have an inverse FFT pass to do
    gl.useProgram(fftVerticalProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.vertexAttribPointer(fftVerticalProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(fftVerticalProgram.vertexPositionAttribute);

    for(var i = 0; i < numFFTStages; ++i)
    {
        if(isEvenStage)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);
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
            gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureA, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, spectrumTextureB);
            gl.uniform1i(fftVerticalProgram.fftDataUniform, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, butterflyTextures[i]);
            gl.uniform1i(fftVerticalProgram.butterflyUniform, 1);

        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

        isEvenStage = !isEvenStage;
    }

    heightFieldTex = isEvenStage ? spectrumTextureA : spectrumTextureB;

    // TODO: in updateNormal or render program, swap the real and imaginary part of the result back
    gl.disableVertexAttribArray(fftVerticalProgram.vertexPositionAttribute);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);

}

function finalrender()
{
    //return;
    //This is the 3rd path that use GLSL to render the image, using rttTexture to be the height field of the wave

    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvaswidth,canvasheight);

    //debugarea.innerHTML=canvaswidth+" "+canvasheight;
   // gl.clear(gl.COLOR_BUFFER_BIT);

/*
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 2);
*/

    var mv = mat4.create();
    mat4.multiply(view, model, mv);
    var mvp = mat4.create();
    mat4.multiply(persp, mv, mvp);
    var mvpit=mat4.create();
    mvpit=mat4.inverse(mvp,mvpit);
    mvpit=mat4.transpose(mvpit,mvpit);



    gl.uniform3f(gl.getUniformLocation(shaderProgram, "eyePos"), eye[0],eye[1],eye[2]);
    gl.uniform3f(gl.getUniformLocation(shaderProgram, "u_sunPos"), sunPos[0],sunPos[1],sunPos[2]);

    gl.uniform1f(shaderProgram.u_shaderTimeLocation, currentTime);
    gl.uniformMatrix4fv(shaderProgram.u_modelViewPerspectiveLocation, false, mvp);
    gl.uniformMatrix4fv(u_modelViewPerspectiveLocation_Inverse_Transpose, false, mvpit);
    gl.uniformMatrix4fv(u_modelLocation, false, model);



    gl.bindBuffer(gl.ARRAY_BUFFER, waterfacepositionbuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, waterfacenormalbuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, waterfaceindicesbuffer);
    gl.drawElements(gl.TRIANGLES, waterfaceindicesbuffer.numitems, gl.UNSIGNED_SHORT,0);

    gl.disableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    gl.disableVertexAttribArray(shaderProgram.vertexNormalAttribute);
}


function render()
{
    //This is the 3rd pass that use GLSL to render the image, using spectrumTextureA to be the height field of the wave

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvaswidth,canvasheight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

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

    gl.bindBuffer(gl.ARRAY_BUFFER, waterFaceTexCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexTexCoordAttribute);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, waterFaceIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, waterFaceIndicesBuffer.numitems, gl.UNSIGNED_INT,0);

    gl.disableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    gl.disableVertexAttribArray(shaderProgram.vertexTexCoordAttribute);
}


function animate()
{
    simulation();
    FFT();
    //simulateHeightField(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);
    skyrender();
    //finalrender();
    render();
    var nowtime=new Date().getTime();
    if(nowtime-1000>starttime)
    {
        document.title = "WebGL Water Shader ["+new Number(totalframes*1000/(new Date().getTime()-starttime)).toPrecision(3)+"fps]";
        starttime=nowtime;
        totalframes=0;
    }
}

function tick(){
    requestAnimFrame(tick);
    currentTime=currentTime+0.01;
    totalframes++;
    if(totalframes%2==0)
        animate();
}

function updateWorldPositions(w , h)
{
    for(var i=0;i<w;i++)
    {
        for(var j=0;j<h;j++)
        {
            var mycoord = translateGridCoord(i,j,w);
            var worldPos=vec4.create();
            mat4.multiplyVec4(model,[positions[mycoord*3],positions[mycoord*3+1],positions[mycoord*3+2],1.0],worldPos);
            positions_World[mycoord*3]=worldPos[0];
            positions_World[mycoord*3+1]=worldPos[1];
            positions_World[mycoord*3+2]=worldPos[2];
        }
    }
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

            ///Y is up
            positions[idx*3+1]=heightfield[i][j];
            //positions[idx*3+2]=0.0;
        }
    }


    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacepositionbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);


    mat4.identity(model);
    mat4.scale(model, [120.0, 15.0, 120.0]);
    mat4.translate(model, [-0.5, -0.0, -0.5]);


    updateWorldPositions(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);
    updateNormalMap(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);
    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacenormalbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,normals,gl.STATIC_DRAW);
}

function webGLStart() {
    initKeyboardHandle();
    starttime=new Date().getTime();
    totalframes = 0;
    var canvas = document.getElementById("canvas1");
    debugarea = document.getElementById("debug_text");
    initGL(canvas);

    canvas.onmousedown = handleMouseDown;
    canvas.oncontextmenu = function (ev) { return false; };
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);


    persp = mat4.create();
    mat4.perspective(fov*2.0, canvas.width / canvas.height, 0.1, 200.0, persp);
    
    //eye = sphericalToCartesian(radius, azimuth, zenith);
    eye=[0.0,7.5,0.0];
    faceDir=sphericalToCartesian(1.0,azimuth,zenith);
    center=[eye[0]+faceDir[0],eye[1]+faceDir[1],eye[2]+faceDir[2]];

    view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    model = mat4.create();

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
    //initCopyShader();

    initFFTHorizontalShader();
    initFFTVerticalShader();

    //initHeightField(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);

    initCopyShader();
    initRenderShader();
    initTextureFramebuffer();
    initCopyTextureFramebuffer();

    initSpectrumTexture();
    initButterflyTextures();
    initFFTFramebuffer();

    initQuad();
    initGrid();
    initSky();
    initSkyShader();


    //initTextures();
    //initSkyboxShader();
    //intializeSkybox();
    //initSkyboxTex();

    gl.viewport(0,0,canvaswidth,canvasheight);

    gl.clearColor(0.0,0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    tick();
}