/**
 * Created by Guanyu He on 13-12-9.
 */

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
function copyHeightField()
{
    // This is the 2nd pass that copy the rendered result to the height-map, which can be used in the first step.
    gl.useProgram(copyProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER,copyFramebuffer);

    gl.viewport(0, 0, copyFramebuffer.width, copyFramebuffer.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
    gl.vertexAttribPointer(copyProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(copyProgram.vertexPositionAttribute);

    gl.uniform1f(copyProgram.u_copyTimeLocation, currentTime);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, spectrumTextureA);
    gl.uniform1i(copyProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

    gl.disableVertexAttribArray(copyProgram.vertexPositionAttribute);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);
}