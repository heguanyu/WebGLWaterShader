/**
 * Created by Guanyu He on 13-12-9.
 */

////////////////////////////////////////skybox program/////////////////////////////////

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

var skyboxTex;
var skyboxPosBuffer;
var skyboxIndices;
var numberOfSkyboxIndices;

function intializeSkybox() {
    var boxsize = 100.0;
    var positions = new Float32Array([
        // neg z, back
        -boxsize, boxsize, -boxsize, -boxsize, -boxsize, -boxsize, boxsize, -boxsize, -boxsize,
        boxsize, -boxsize, -boxsize, boxsize, boxsize, -boxsize, -boxsize, boxsize, -boxsize,
        // neg x, left
        -boxsize, -boxsize, boxsize, -boxsize, -boxsize, -boxsize, -boxsize, boxsize, -boxsize,
        -boxsize, boxsize, -boxsize, -boxsize, boxsize, boxsize, -boxsize, -boxsize, boxsize,
        // pos x, right
        boxsize, -boxsize, -boxsize, boxsize, -boxsize, boxsize, boxsize, boxsize, boxsize,
        boxsize, boxsize, boxsize, boxsize, boxsize, -boxsize, boxsize, -boxsize, -boxsize,
        // pos z, front
        -boxsize, -boxsize, boxsize, -boxsize, boxsize, boxsize, boxsize, boxsize, boxsize,
        boxsize, boxsize, boxsize, boxsize, -boxsize, boxsize, -boxsize, -boxsize, boxsize,
        // pos y, top
        -boxsize, boxsize, -boxsize, boxsize, boxsize, -boxsize, boxsize, boxsize, boxsize,
        boxsize, boxsize, boxsize, -boxsize, boxsize, boxsize, -boxsize, boxsize, -boxsize,
        // neg y, bottom
        -boxsize, -boxsize, -boxsize, -boxsize, -boxsize, boxsize, boxsize, -boxsize, -boxsize,
        boxsize, -boxsize, -boxsize, -boxsize, -boxsize, boxsize, boxsize, -boxsize, boxsize
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

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndices);
    gl.drawElements(gl.TRIANGLES, numberOfSkyboxIndices, gl.UNSIGNED_SHORT, 0);

    gl.disableVertexAttribArray(skyboxPositionLocation);
}
