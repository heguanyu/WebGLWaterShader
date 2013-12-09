/**
 * Created by Guanyu He on 13-12-9.
 */


///////////////////
// Global Variables
///////////////////

var gl;
var debugarea;
var NUM_WIDTH_PTS=128;
var NUM_HEIGHT_PTS=NUM_WIDTH_PTS;
var starttime;
var canvas = document.getElementById("canvas");

var meshSize = 512;         // grid resolution in both direction
var patchSize = 100;        // grid size in meters

var heightfield;
var velfield;

var u_modelViewPerspectiveLocation_Inverse_Transpose;
var u_modelLocation;

var currentTime=0.0;
var totalframes;

var canvasheight;
var canvaswidth;

var waterfacepositionbuffer;
var waterfaceindicesbuffer;
var waterfacenormalbuffer;

var quadPositionBuffer;
var quadIndicesBuffer;


var shaderProgram;
var copyProgram;
var skyProgram;

var rttFramebuffer;
var rttTexture;

var copyFramebuffer;
var copyTexture;

var normals;
var positions;
var positions_World;
var model;


var mouseLeftDown = false;
var mouseRightDown = false;
var lastMouseX = null;
var lastMouseY = null;

var radius = 65.0;
var azimuth = Math.PI / 2.0+Math.PI / 2.0;
var zenith = Math.PI / 2.2;

var center = [0.0, 5.0, 0.0];
var up = [0.0, 1.0, 0.0];
var faceDir = [0.0, 0.0,1.0];

var persp;
var fov = 45.0;
var eye;
var view;
var sunPos = [0.0,-10.0,1800.0];

var programSkybox;

var skyboxPositionLocation;

var u_skyboxViewLocation;
var u_skyboxPerspLocation;

var u_cubeTextureLocation;
var noiseTexture;
var noiseImage;
