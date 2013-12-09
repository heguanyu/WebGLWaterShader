/**
 * Created by Guanyu He on 13-12-9.
 */

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
