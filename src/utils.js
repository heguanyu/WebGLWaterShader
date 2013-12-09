/**
 * Created by Guanyu He on 13-12-9.
 */


///// Some Utils for calculation

////////////////////
///my own Vec3 class
////////////////////
function Vec3(x,y,z)
{
    this.x=x;
    this.y=y;
    this.z=z;
}
function vecCross(a,b)
{
    return new Vec3(a.y* b.z- b.y* a.z, (b.x* a.z- a.x* b.z), a.x* b.y- b.x*a.y);
}
function vecAdd(a,b)
{
    return new Vec3(a.x+ b.x, a.y+ b.y, a.z+ b.z);
}
function vecMinus(a,b)
{
    //alert(a);
    return new Vec3(a.x- b.x, a.y- b.y, a.z- b.z);
}
function vecMultiply(a,b)
{
    return new Vec3(a.x*b, a.y*b, a.z*b);
}

function vecLength(a)
{
    return Math.sqrt(a.x* a.x+ a.y* a.y+ a.z* a.z);
}
function vecNormalize(a)
{
    var l=vecLength(a);
    if(l<0.0000001) return a;
    return new Vec3(a.x/l, a.y/l,a.z/l);
}

////////////////////
///Init GL
////////////////////
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

/////////////////////////
//// Math
///////////////////////
function sphericalToCartesian(r, azimuth, zenith) {
    var x = r * Math.sin(zenith) * Math.sin(azimuth);
    var y = r * Math.cos(zenith);
    var z = r * Math.sin(zenith) * Math.cos(azimuth);

    return [x, y, z];

}

function translateGridCoord(i,j,w)
{
    return i+j*w;
}


////////////////////////////
//// Load texture
//////////////////////////

function initTextures() {
    noiseTexture = gl.createTexture();
    noiseImage = new Image();
    noiseImage.onload = function() { handleTextureLoaded(noiseImage, noiseTexture); }
    noiseImage.src = "noiseBumpMap.png";
}

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}
