// Studio AI core: one WebGL glass orb, moved into whichever .orb-slot is on screen.
// Renders only while visible and the tab is active. Falls back to a CSS orb without WebGL.
(() => {
  const S = (window.SFOrb = { st: "idle", lv: 0, pz: matchMedia("(prefers-reduced-motion:reduce)").matches, mx: 0, my: 0, attach() {}, ok: false });
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  let gl = null;
  try { gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, powerPreference: "high-performance" }); } catch {}
  if (!gl) return;

  const NOISE = `vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
  const VS = `attribute vec2 a;varying vec2 p;uniform float S;void main(){p=a*S;gl_Position=vec4(a,0.,1.);}`;
  const FS = `precision highp float;varying vec2 p;uniform float T,L,E,Q;uniform vec3 C1,C2;uniform mat3 Rm;${NOISE}
float ridge(vec3 q){return pow(1.-abs(snoise(q)),5.);}
void main(){
  float r=length(p);float rr=1.+L*.05;vec3 col=vec3(0.);float a=0.;
  if(r<rr){
    vec2 u=p/rr;float z=sqrt(max(0.,1.-dot(u,u)));vec3 n=vec3(u,z);
    vec3 em=vec3(0.);float fl=T*(.10+E*.10);
    for(int k=0;k<3;k++){float d=float(k)/2.;vec3 q=Rm*vec3(u,z*(1.-d*1.6));
      float f=ridge(q*(2.3+d*.9)+vec3(0.,fl,fl*.6));f+=.5*ridge(q*(4.8+d)+vec3(fl*1.3,0.,-fl));f*=(.55+.75*Q);
      em+=mix(C1,C2,clamp(f*.9+d*.3,0.,1.))*f*(1.-d*.42);}
    em*=(.6+L*.55+E*.2);
    float fres=pow(1.-z,2.4);vec3 base=mix(vec3(.010,.035,.090),vec3(.02,.10,.22),z*.6);
    vec3 Ld=normalize(vec3(-.45,.55,.7));float rd=max(dot(reflect(-Ld,n),vec3(0.,0.,1.)),0.);
    float spec=pow(rd,48.)*.9+pow(rd,8.)*.12;float core=exp(-dot(u,u)*3.2)*(.14+L*.22);
    col=base+em*(.35+.65*z)+C2*fres*(.9+L*.45)+vec3(1.)*spec+mix(C2,vec3(1.),.5)*core;
    col=1.-exp(-col*1.25);float edge=smoothstep(rr,rr-.012,r);a=edge;col*=edge;
  }
  float h=exp(-max(r-rr,0.)*5.5)*(.30+L*.28+Q*.08)*smoothstep(rr-.02,rr+.01,r)*smoothstep(1.4,1.12,r);
  col+=C2*h*.9;a=max(a,h*.7);gl_FragColor=vec4(col,clamp(a,0.,1.));
}`;
  const PVS = `attribute vec3 a;attribute float s;uniform mat3 Rm;uniform float T,Px,L;varying float al;
void main(){vec3 q=Rm*a;q*=1.+.04*sin(T*1.7+s*40.);float depth=q.z*.5+.5;float hide=(length(q.xy)<1.04&&q.z<0.)?0.:1.;
al=hide*(.25+.75*depth)*(.35+L*.8);gl_Position=vec4(q.xy/1.4,0.,1.);gl_PointSize=Px*(.6+s*1.6)*(.7+depth*.6);}`;
  const PFS = `precision mediump float;varying float al;uniform vec3 C2;void main(){vec2 d=gl_PointCoord-.5;float f=smoothstep(.5,0.,length(d));gl_FragColor=vec4(C2*f*al,f*al);}`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  let P, PP;
  try { P = prog(VS, FS); PP = prog(PVS, PFS); } catch (e) { console.warn("orb:", e.message); return; }
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const N = 480, pts = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, rad = 1.12 + Math.pow(Math.random(), 2.2) * .26, k = Math.sqrt(1 - u * u); pts.set([Math.cos(th) * k * rad, u * rad * .82, Math.sin(th) * k * rad, Math.random()], i * 4); }
  const pbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pbuf); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
  const U = (p, n) => gl.getUniformLocation(p, n);
  const u = { S: U(P, "S"), T: U(P, "T"), L: U(P, "L"), E: U(P, "E"), Q: U(P, "Q"), C1: U(P, "C1"), C2: U(P, "C2"), Rm: U(P, "Rm") };
  const pu = { Rm: U(PP, "Rm"), T: U(PP, "T"), Px: U(PP, "Px"), L: U(PP, "L"), C2: U(PP, "C2") };
  const aQ = gl.getAttribLocation(P, "a"), aP = gl.getAttribLocation(PP, "a"), aS = gl.getAttribLocation(PP, "s");
  const PAL = { idle: [[.10, .34, .95], [.36, .80, 1.0]], listening: [[.05, .45, .80], [.40, 1.0, .86]], thinking: [[.32, .22, .95], [.62, .66, 1.0]], speaking: [[.12, .45, 1.0], [.70, .93, 1.0]] };
  const cur = { c1: [...PAL.idle[0]], c2: [...PAL.idle[1]], L: 0, E: 0, Q: 0 };
  const lerp = (a, b, k) => a + (b - a) * k;
  const rot = (ax, ay) => { const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay); return new Float32Array([cy, 0, -sy, sx * sy, cx, sx * cy, cx * sy, -sx, cx * cy]); };
  const SCALE = 1.4;
  let dprCap = matchMedia("(max-width:759px)").matches ? 1.5 : 2, slow = 0, t = 0, last = performance.now(), ry = 0, slot = null, visible = false, running = false, side = 0;
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); kick(); }) : null;
  addEventListener("pointermove", (e) => { S.mx = e.clientX / innerWidth - .5; S.my = e.clientY / innerHeight - .5; }, { passive: true });
  document.addEventListener("visibilitychange", kick);
  cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); S.ok = false; slot && slot.classList.remove("has-gl"); cv.remove(); });

  function kick() { if (!running && slot && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  S.attach = (el) => {
    if (!el || el === slot) return;
    if (slot) { slot.classList.remove("has-gl"); io && io.unobserve(slot); }
    slot = el; el.append(cv); el.classList.add("has-gl"); side = 0;
    if (io) io.observe(el); else visible = true;
    kick();
  };
  S.ok = true;
  let smx = 0, smy = 0;
  function frame(now) {
    if (!slot || !slot.isConnected || !visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    t += dt * (S.pz ? .12 : 1);
    if (dt > .028) { if (++slow > 45 && dprCap > 1) { dprCap = 1; slow = 0; side = 0; } } else slow = Math.max(0, slow - 1);
    const dpr = Math.min(devicePixelRatio || 1, dprCap), box = slot.clientWidth, px = Math.round(box * dpr);
    if (!box) return;
    if (px !== side) { side = px; cv.width = cv.height = px; }
    const st = S.st, lv = typeof S.lv === "function" ? S.lv() : S.lv, pal = PAL[st] || PAL.idle, k = 1 - Math.pow(.02, dt);
    for (let i = 0; i < 3; i++) { cur.c1[i] = lerp(cur.c1[i], pal[0][i], k); cur.c2[i] = lerp(cur.c2[i], pal[1][i], k); }
    const idle = .06 + .03 * Math.sin(t * 1.2);
    cur.L = lerp(cur.L, Math.min(1, Math.max(lv || 0, st === "idle" ? idle : st === "thinking" ? .25 + .1 * Math.sin(t * 8) : 0)), 1 - Math.pow(.0005, dt));
    cur.E = lerp(cur.E, st === "thinking" ? 1 : st === "speaking" ? .6 : 0, k);
    cur.Q = lerp(cur.Q, st === "idle" ? 0 : 1, k);
    smx = lerp(smx, S.mx, Math.min(1, dt * 3)); smy = lerp(smy, S.my, Math.min(1, dt * 3));
    ry += dt * (S.pz ? .02 : .16 + cur.E * .25);
    gl.viewport(0, 0, side, side); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(aQ); gl.vertexAttribPointer(aQ, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u.S, SCALE); gl.uniform1f(u.T, t); gl.uniform1f(u.L, cur.L); gl.uniform1f(u.E, cur.E); gl.uniform1f(u.Q, cur.Q);
    gl.uniform3fv(u.C1, cur.c1); gl.uniform3fv(u.C2, cur.c2); gl.uniformMatrix3fv(u.Rm, false, rot(.32 + smy * .35, ry + smx * .5));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(aQ);
    gl.useProgram(PP); gl.blendFunc(gl.ONE, gl.ONE); gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
    gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aS); gl.vertexAttribPointer(aS, 1, gl.FLOAT, false, 16, 12);
    gl.uniformMatrix3fv(pu.Rm, false, rot(.32 + smy * .35, -ry * .6 + smx * .5)); gl.uniform1f(pu.T, t); gl.uniform1f(pu.Px, Math.max(1.6, box / 140) * dpr); gl.uniform1f(pu.L, Math.max(cur.L, cur.Q * .35)); gl.uniform3fv(pu.C2, cur.c2);
    gl.drawArrays(gl.POINTS, 0, N); gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aS);
  }
})();
