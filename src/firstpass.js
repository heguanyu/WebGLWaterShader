/**
 * Created by Guanyu He on 13-12-9.
 */



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