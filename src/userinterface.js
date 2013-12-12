/**
 * Created by Guanyu He on 13-12-10.
 */


function updateSunpos()
{
    sunPos=sphericalToCartesian(1000.0,sun_azimuth,sun_zenith);
}
function updateSkyParams()
{
    initSky();
}
$(function(){

    $( "#sunpos_azimuth" ).slider(
        {
        min: 0,
        max: 1000,
        value:0,
        slide: function(event, ui){
            sun_azimuth=ui.value*2*0.001*Math.PI;
            updateSunpos();
        }
     });
    $( "#sunpos_zenith" ).slider({
        min:0,
        max:500,
        value:400,
        slide: function(event, ui){
            sun_zenith=ui.value*0.001*Math.PI;
            updateSunpos();
        }
    });
    $( "#sky_density" ).slider({
        min:-1500,
        max:1000,
        value:0,
        slide: function(event, ui){
            sky_props.density=Math.exp(ui.value*0.002);
            updateSkyParams();
        }
    });
    $( "#sky_clarity" ).slider({
        min:-1500,
        max:1000,
        value:-700,
        slide: function(event, ui){
            sky_props.clarity=Math.exp(ui.value*0.002);
            updateSkyParams();
        }
    });
    $( "#sky_pollution" ).slider({
        min:-1500,
        max:1000,
        value:-1500,
        slide: function(event, ui){
            sky_props.pollution=Math.exp(ui.value*0.002);
            updateSkyParams();
        }
    });
    $( "#water_r" ).slider({
        min:0,
        max:255,
        value:30,
        slide: function(event, ui){
            oceanColor[0]=ui.value/255.0;

        }
    });
    $( "#water_g" ).slider({
        min:0,
        max:255,
        value:91,
        slide: function(event, ui){
            oceanColor[1]=ui.value/255.0;

        }
    });
    $( "#water_b" ).slider({
        min:0,
        max:255,
        value:122,
        slide: function(event, ui){
            oceanColor[2]=ui.value/255.0;
            //$("#testfield").text(oceanColor.toString());
        }
    });

    $( "#wind_dir" ).slider({
        min:0,
        max:2000,
        value:333,
        slide: function(event, ui){
            windDir=ui.value/1000.0*Math.PI;
            initSpectrumTexture();

        }
    });
    $( "#wind_speed" ).slider({
        min:0,
        max:2000,
        value:1000,
        slide: function(event, ui){
            windSpeed=ui.value*0.1;
            initSpectrumTexture();
            //$("#testfield").text(oceanColor.toString());
        }
    });
});