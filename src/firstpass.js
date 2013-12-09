/**
 * Created by Guanyu He on 13-12-9.
 */



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

    simProgram.u_simTimeLocation = gl.getUniformLocation(simProgram, "u_time");
    simProgram.samplerUniform = gl.getUniformLocation(simProgram, "u_simData");

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
function simulation()
{
    //THIS IS THE FIRST PASS THAT USE GLSL TO COMPUTE THE HEIGHT FIELD TO THE spectrumTextureA BUFFER


    gl.useProgram(simProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureA, 0);

    gl.viewport(0, 0, meshSize, meshSize);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.vertexAttribPointer(simProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(simProgram.vertexPositionAttribute);

    gl.uniform1f(simProgram.u_simTimeLocation, currentTime);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, initialSpectrumTex);
    gl.uniform1i(simProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

    gl.disableVertexAttribArray(simProgram.vertexPositionAttribute);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);

}