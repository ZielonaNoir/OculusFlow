"use client";

import React, { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;

  // Description : Array and textureless GLSL 2D/3D/4D simplex noise functions.
  //      Author : Ian McEwan, Ashima Arts.
  //  Maintainer : stegu
  //     Lastmod : 20110822 (ijm)
  //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
  //               Distributed under the MIT License. See LICENSE file.
  //               https://github.com/ashima/webgl-noise
  
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // Normalize pixel coordinates (from 0 to 1) and adjust aspect ratio
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv.x *= u_resolution.x / u_resolution.y;

    // Mouse interaction parameters
    vec2 mouse = u_mouse.xy / u_resolution.xy;
    mouse.x *= u_resolution.x / u_resolution.y;

    // Calculate distance to mouse
    float distToMouse = distance(uv, mouse);
    
    // Repulsion force from mouse
    float repulsionRadius = 0.5;
    float repulsionStrength = 0.5;
    float repulsionEffect = smoothstep(repulsionRadius, 0.0, distToMouse) * repulsionStrength;
    
    // Distort UV based on mouse
    vec2 dirFromMouse = normalize(uv - mouse);
    // If exact center, avoid NaN
    if (distToMouse == 0.0) dirFromMouse = vec2(1.0, 0.0);
    
    vec2 distortedUV = uv + dirFromMouse * repulsionEffect;

    // Scale the UV to get more/fewer topographical lines
    float scale = 1.5; // Wider features like a mountain map
    vec2 scaledUV = distortedUV * scale;

    // Generate FBM (Fractal Brownian Motion) for realistic terrain elevation
    float elevation = 0.0;
    float amplitude = 0.5;
    
    // Slow timeline
    float t = u_time * 0.05;
    vec3 p = vec3(scaledUV, t);
    
    // Octave 1
    elevation += amplitude * snoise(p);
    
    // Octave 2
    p.xy *= 2.0; p.z *= 1.5; amplitude *= 0.5;
    elevation += amplitude * snoise(p);
    
    // Octave 3
    p.xy *= 2.0; p.z *= 1.5; amplitude *= 0.5;
    elevation += amplitude * snoise(p);
    
    // Octave 4
    p.xy *= 2.0; p.z *= 1.5; amplitude *= 0.5;
    elevation += amplitude * snoise(p);

    // Normalize roughly to 0..1 range
    elevation = elevation * 0.5 + 0.5;

    // Topographical line extraction
    float linesCount = 15.0; // Wider spacing for cleaner look
    float lineVal = elevation * linesCount;
    
    // Calculate distance to nearest integer for clean sharp lines
    float distToLine = min(fract(lineVal), 1.0 - fract(lineVal));

    // Create the sharp line
    float lineThickness = 0.015; // Very thin lines
    float edgeWidth = 0.02; // Anti-aliasing
    
    float line = smoothstep(lineThickness + edgeWidth, lineThickness, distToLine);
                 
    // Limit to 1.0 max
    line = clamp(line, 0.0, 1.0);

    // Base color matches the dark zinc-950 theme: #09090b
    // rgb(9, 9, 11) is about (0.035, 0.035, 0.043)
    vec3 bgColor = vec3(0.035, 0.035, 0.043); 
    // Line color is slightly lighter/glowy blue/zinc
    vec3 lineColor = vec3(0.15, 0.18, 0.25); // Very subtle blueish tint
    
    // If mouse is near, maybe make the lines glow slightly more
    float glow = smoothstep(0.8, 0.0, distToMouse) * 0.5;
    vec3 activeLineColor = lineColor + vec3(0.1, 0.2, 0.4) * glow;

    // Use absolute alpha to define opacity instead of blending with bgColor natively since the canvas is behind elements
    // We render solid background so we don't need transparency 
    vec3 finalColor = mix(bgColor, activeLineColor, line * 0.35); // 0.35 controls line prominence

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function TopographicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Define a full-screen triangle strip (quad)
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");

    let animationFrameId: number;
    const startTime = performance.now();

    // Target mouse position (for lerping)
    let targetMouseX = window.innerWidth / 2;
    let targetMouseY = window.innerHeight / 2;
    // Current smoothed mouse position
    let currentMouseX = targetMouseX;
    let currentMouseY = targetMouseY;

    const resize = () => {
      // Handle high-DPI displays for sharper rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dpr = window.devicePixelRatio || 1;
      targetMouseX = e.clientX * dpr;
      targetMouseY = (window.innerHeight - e.clientY) * dpr; // WebGL Y is bottom-to-top
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    resize();

    const render = (time: number) => {
      // Lerp mouse for that smooth trailing effect
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      gl.uniform1f(timeLocation, (time - startTime) * 0.001);
      gl.uniform2f(mouseLocation, currentMouseX, currentMouseY);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-50 w-full h-full"
    />
  );
}
