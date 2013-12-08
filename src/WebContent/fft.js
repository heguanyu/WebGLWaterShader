var fftHorizontalProgram;
var fftVerticalProgram;

var spectrumFramebuffer;
var spectrumTextureA;
var spectrumTextureB;
var initialSpectrumTex;

var butterflyTextures;

var heightFieldTex;

var numFFTStages;

function initFFTHorizontalShader() {
    var vertexShader = getShader(gl, "vs_quad");
    var fragmentShader = getShader(gl, "fs_fftHorizontal");

    fftHorizontalProgram = gl.createProgram();
    gl.attachShader(fftHorizontalProgram, vertexShader);
    gl.attachShader(fftHorizontalProgram, fragmentShader);
    gl.linkProgram(fftHorizontalProgram);
    if (!gl.getProgramParameter(fftHorizontalProgram, gl.LINK_STATUS)) {
        alert("Could not initialise FFT Horizontal shader");
    }
 
    fftHorizontalProgram.vertexPositionAttribute = gl.getAttribLocation(fftHorizontalProgram, "position");

    fftHorizontalProgram.fftDataUniform = gl.getUniformLocation(fftHorizontalProgram, "u_fftData");
    fftHorizontalProgram.butterflyUniform = gl.getUniformLocation(fftHorizontalProgram, "u_butterflyData");

}

function initFFTVerticalShader() {
    var vertexShader = getShader(gl, "vs_quad");
    var fragmentShader = getShader(gl, "fs_fftVertical");

    fftVerticalProgram = gl.createProgram();
    gl.attachShader(fftVerticalProgram, vertexShader);
    gl.attachShader(fftVerticalProgram, fragmentShader);
    gl.linkProgram(fftVerticalProgram);
    if (!gl.getProgramParameter(fftVerticalProgram, gl.LINK_STATUS)) {
        alert("Could not initialise FFT Vertical shader");
    }
 
    fftVerticalProgram.vertexPositionAttribute = gl.getAttribLocation(fftVerticalProgram, "position");

    fftVerticalProgram.fftDataUniform = gl.getUniformLocation(fftVerticalProgram, "u_fftData");
    fftVerticalProgram.butterflyUniform = gl.getUniformLocation(fftVerticalProgram, "u_butterflyData");

}


function initFFTFramebuffer()
{
	spectrumFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);
    spectrumFramebuffer.width = meshSize;
    spectrumFramebuffer.height = meshSize;
    
    spectrumTextureA = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, spectrumTextureA);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, spectrumFramebuffer.width, spectrumFramebuffer.height, 0, gl.RGBA, gl.FLOAT, null);
    
    spectrumTextureB = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, spectrumTextureB);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, spectrumFramebuffer.width, spectrumFramebuffer.height, 0, gl.RGBA, gl.FLOAT, null);
    
   
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spectrumTextureA, 0);
    
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE");
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function initButterflyTextures()
{
	// initialize butterfly indices and weights for every stage
	numFFTStages = Math.log(meshSize)/Math.LN2;
	butterflyTextures = new Array(numFFTStages);
	
	for(var n = 0; n < butterflyTextures.length; ++n)
	{
		var butterflyArray = new Float32Array(meshSize*meshSize*4);
		var k = 0;
		for(var j = 0; j < meshSize; j++)
			for(var i = 0; i < meshSize; i++) 
			{
				/*
				 *   Source1 ------------------				- += Output1
				 * 			 					-		-	
				 * 			 						- 	
				 *  		    				-		-
				 *   Source2 * weight----------				- += Output2
				 *   
				 * 	 For Source1, weight is stored as it is
				 * 	 For Source2, weight is stored as -weight
				 * 
				 */
				butterflyArray[k++] = 0.0;   // index (stored as texture coordinates) of Source1
				butterflyArray[k++] = 0.0;   // index (stored as texture coordinates) of Source2
				butterflyArray[k++] = 0.0;   // real part of weight
				butterflyArray[k++] = 0.0;   // imaginary part of weight
			}
		butterflyTextures[n] = gl.createTexture();
	    gl.bindTexture(gl.TEXTURE_2D, butterflyTextures[n]);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, meshSize, meshSize, 0, gl.RGBA, gl.FLOAT, butterflyArray);
	}

}

function executeFFTStage(sourceData, butterflyData, framebuffer)
{
	

}