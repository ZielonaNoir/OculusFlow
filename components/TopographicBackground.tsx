"use client";

import React, { useEffect, useRef } from "react";

const POINTER_IDLE_MS = 1400;
const POINTER_SMOOTHING = 0.12;

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform float u_interaction;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 mouse = u_mouse / u_resolution.xy;
    mouse.x *= u_resolution.x / u_resolution.y;
    float distToMouse = distance(uv, mouse);

    float influence = exp(-distToMouse * 5.2) * u_interaction;
    float ripple = sin(distToMouse * 42.0 - u_time * 4.4) * 0.05 * influence;
    float drift = (uv.y - mouse.y) * 0.22 * influence;
    float vortex = sin((uv.y - mouse.y) * 20.0 + u_time * 2.1) * 0.012 * influence;

    // Vertical contour field: lines run top-to-bottom, only slightly bent by Y.
    float bend =
      sin(uv.y * 7.5) * 0.05 +
      sin(uv.y * 16.0 + 1.2) * 0.015 +
      sin(uv.y * 28.0 + 0.6) * 0.007;

    float contourCoord = uv.x + bend + ripple + drift + vortex;

    float density = 44.0;
    float phase = contourCoord * density;
    float distToLine = min(fract(phase), 1.0 - fract(phase));

    float thickness = 0.016;
    float aa = 0.009;
    float line = smoothstep(thickness + aa, thickness, distToLine);

    vec3 bgColor = vec3(0.035, 0.035, 0.043);
    vec3 lineColor = vec3(0.15, 0.18, 0.26);
    vec3 glowColor = vec3(0.19, 0.33, 0.72);

    // Very subtle center emphasis to avoid a flat sheet.
    float center = 1.0 - smoothstep(0.0, 0.95, length(uv - vec2(0.95, 0.5)));
    float mixAmount = line * (0.20 + center * 0.08);
    float glow = smoothstep(0.34, 0.0, distToMouse) * 0.16 * u_interaction;

    vec3 finalColor = mix(bgColor, lineColor, mixAmount);
    finalColor += glowColor * glow;
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
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const interactionLocation = gl.getUniformLocation(program, "u_interaction");
    const dpr = window.devicePixelRatio || 1;

    const pointer = {
      currentX: window.innerWidth * 0.5,
      currentY: window.innerHeight * 0.5,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.5,
      interaction: 0,
      targetInteraction: 0,
      lastMoveAt: 0,
    };

    let animationFrameId = 0;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    };

    const render = (time: number) => {
      if (pointer.lastMoveAt > 0 && performance.now() - pointer.lastMoveAt > POINTER_IDLE_MS) {
        pointer.targetInteraction = 0;
      }

      pointer.currentX += (pointer.targetX - pointer.currentX) * POINTER_SMOOTHING;
      pointer.currentY += (pointer.targetY - pointer.currentY) * POINTER_SMOOTHING;
      pointer.interaction += (pointer.targetInteraction - pointer.interaction) * 0.08;

      gl.uniform2f(
        mouseLocation,
        pointer.currentX * dpr,
        (window.innerHeight - pointer.currentY) * dpr
      );
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform1f(interactionLocation, pointer.interaction);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = window.requestAnimationFrame(render);
    };

    const handleResize = () => {
      updateCanvasSize();
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.targetInteraction = 1;
      pointer.lastMoveAt = performance.now();
    };

    const handlePointerLeave = () => {
      pointer.targetInteraction = 0;
    };

    updateCanvasSize();
    animationFrameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
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
