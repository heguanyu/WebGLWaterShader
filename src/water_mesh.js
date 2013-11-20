    var gl;

    var NUM_WIDTH_PTS;
    var NUM_HEIGHT_PTS;

    var gridsize=1.0;

    var canvas = document.getElementById("canvas");


    var persp = mat4.create();
    mat4.perspective(45.0, 0.5, 0.1, 100.0, persp);

    var eye = [2.0, 1.0, 3.0];
    var center = [0.0, 0.0, 0.0];
    var up = [0.0, 0.0, 1.0];
    var view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    var positionLocation = 0;
    var heightLocation = 1;
    var u_modelViewPerspectiveLocation;


    function initGL(canvas) {
        try {
            gl = canvas.getContext("experimental-webgl");

            NUM_WIDTH_PTS=canvas.width;
            NUM_HEIGHT_PTS=canvas.height;

            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
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
    var simulateProgram;
    var shaderProgram;

    var rttFramebuffer;
    var rttTexture;
    function initSimShader() {
        var vertexShader = getShader(gl, "vs_sim");
        var fragmentShader = getShader(gl, "fs_sim");

        simulateProgram = gl.createProgram();
        gl.attachShader(simulateProgram, vertexShader);
        gl.attachShader(simulateProgram, fragmentShader);
        gl.linkProgram(simulateProgram);

        if (!gl.getProgramParameter(simulateProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(simulateProgram);

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

    }


    function initTextureFramebuffer()
    {
        rttFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
        rttFramebuffer.width = NUM_WIDTH_PTS;
        rttFramebuffer.height = NUM_HEIGHT_PTS;

        rttTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, rttFramebuffer.width, rttFramebuffer.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    var heights;
    var numberOfIndices;

    function initializeGrid()
    {
        function uploadMesh(positions, heights, indices) {
            // Positions
            var positionsName = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionsName);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionLocation);

            if (heights)
            {
                // Heights
                var heightsName = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, heightsName);
                gl.bufferData(gl.ARRAY_BUFFER, heights.length * heights.BYTES_PER_ELEMENT, gl.STREAM_DRAW);
                gl.vertexAttribPointer(heightLocation, 1, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(heightLocation);
            }

            // Indices
            var indicesName = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesName);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        }

        var WIDTH_DIVISIONS = NUM_WIDTH_PTS - 1;
        var HEIGHT_DIVISIONS = NUM_HEIGHT_PTS - 1;

        var numberOfPositions = NUM_WIDTH_PTS * NUM_HEIGHT_PTS;

        var positions = new Float32Array(2 * numberOfPositions);
        var indices = new Uint16Array(2 * ((NUM_HEIGHT_PTS * (NUM_WIDTH_PTS - 1)) + (NUM_WIDTH_PTS * (NUM_HEIGHT_PTS - 1))));

        var positionsIndex = 0;
        var indicesIndex = 0;
        var length;

        for (var j = 0; j < NUM_WIDTH_PTS; ++j)
        {
            positions[positionsIndex++] = gridsize*j /(NUM_WIDTH_PTS - 1);
            positions[positionsIndex++] = 0.0;

            if (j>=1)
            {
                length = positionsIndex / 2;
                indices[indicesIndex++] = length - 2;
                indices[indicesIndex++] = length - 1;
            }
        }

        for (var i = 0; i < HEIGHT_DIVISIONS; ++i)
        {
             var v = gridsize*(i + 1) / (NUM_HEIGHT_PTS - 1);
             positions[positionsIndex++] = 0.0;
             positions[positionsIndex++] = v;

             length = (positionsIndex / 2);
             indices[indicesIndex++] = length - 1;
             indices[indicesIndex++] = length - 1 - NUM_WIDTH_PTS;

             for (var k = 0; k < WIDTH_DIVISIONS; ++k)
             {
                 positions[positionsIndex++] =gridsize* (k + 1) / (NUM_WIDTH_PTS - 1);
                 positions[positionsIndex++] = v;

                 length = positionsIndex / 2;
                 var new_pt = length - 1;
                 indices[indicesIndex++] = new_pt - 1;  // Previous side
                 indices[indicesIndex++] = new_pt;

                 indices[indicesIndex++] = new_pt - NUM_WIDTH_PTS;  // Previous bottom
                 indices[indicesIndex++] = new_pt;
             }
        }

        uploadMesh(positions, heights, indices);
        numberOfIndices = indices.length;
    }

    function animate()
    {

        //THIS IS THE FIRST PATH THAT USE GLSL TO COMPUTE THE HEIGHT FIELD TO THE rttTexture BUFFER

        gl.useProgram(simulateProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer); //DRAW TO THE FRAME BUFFER

        gl.drawElements(gl.LINES, numberOfIndices, gl.UNSIGNED_SHORT,0);

        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);

        //BELOW IS THE SECOND PATH THAT USE GLSL TO SHADE THE HEIGHT FIELD

        gl.useProgram(shaderProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);       //DRAW TO THE SCREEN

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);      //bind it to the texture2D

        var model = mat4.create();


        mat4.identity(model);
        mat4.translate(model, [-0.5, -0.5, 0.0]);
       var mv = mat4.create();
       mat4.multiply(view, model, mv);
        var mvp = mat4.create();
        mat4.multiply(persp, mv, mvp);

        gl.uniformMatrix4fv(u_modelViewPerspectiveLocation, false, mvp);

        gl.drawElements(gl.LINES, numberOfIndices, gl.UNSIGNED_SHORT,0);

    }

    function tick(){
        requestAnimFrame(tick);

        gl.useProgram(simulateProgram);
        animate();
    }


    function webGLStart() {

        var canvas = document.getElementById("canvas");
        initGL(canvas);
        initTextureFramebuffer();
        initSimShader();
        initRenderShader();
        initializeGrid();
        //initBuffers();
       // initTextures();
       // loadLaptop();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        tick();
    }
