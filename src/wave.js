function gauss()
{
	var u1 = Math.random();
    var u2 = Math.random();

    if (u1 < 1e-6f)
    {
        u1 = 1e-6f;
    }

    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2*Math.PI * u2);
}

// Phillips spectrum
// (Kx, Ky) - normalized wave vector
// Vdir - wind angle in radians
// V - wind speed
// A - constant
function phillips(Kx, Ky, Vdir, V, A, dir_depend)
{
    var k_squared = Kx * Kx + Ky * Ky;

    if (k_squared == 0.0)
    {
        return 0.0;
    }

    // largest possible wave from constant wind of velocity v
    var L = V * V / g;

    var k_x = Kx / Math.sqrt(k_squared);
    var k_y = Ky / Math.sqrt(k_squared);
    var w_dot_k = k_x * Math.cos(Vdir) + k_y * Math.sin(Vdir);

    var phillips = A * Math.exp(-1.0 / (k_squared * L * L)) / (k_squared * k_squared) * w_dot_k * w_dot_k;

    // filter out waves moving opposite to wind
    if (w_dot_k < 0.0)
    {
        phillips *= dir_depend;
    }

    // damp out waves with very small length w << l
    var w = L / 10000;
    //phillips *= expf(-k_squared * w * w);

    return phillips;
}

// Generate base heightfield in frequency space
function generate_h0(float2 *h0)
{
    for (unsigned int y = 0; y<=meshSize; y++)
    {
        for (unsigned int x = 0; x<=meshSize; x++)
        {
            float kx = (-(int)meshSize / 2.0f + x) * (2.0f * CUDART_PI_F / patchSize);
            float ky = (-(int)meshSize / 2.0f + y) * (2.0f * CUDART_PI_F / patchSize);

            float P = sqrtf(phillips(kx, ky, windDir, windSpeed, A, dirDepend));

            if (kx == 0.0f && ky == 0.0f)
            {
                P = 0.0f;
            }

            //float Er = urand()*2.0f-1.0f;
            //float Ei = urand()*2.0f-1.0f;
            float Er = gauss();
            float Ei = gauss();

            float h0_re = Er * P * CUDART_SQRT_HALF_F;
            float h0_im = Ei * P * CUDART_SQRT_HALF_F;

            int i = y*spectrumW+x;
            h0[i].x = h0_re;
            h0[i].y = h0_im;
        }
    }
}