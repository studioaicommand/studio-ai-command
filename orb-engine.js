/* Studio receptionist orb: the Studio AI glass core, tinted with each business's brand colour.
   ES5 so it runs on any client website. Usage: SFO.add(el, "#hex", {big:true}) ; SFO.state("speaking") */
(function(){if(window.SFO)return;
var N=400,P=null,orbs=[],st="idle",t=0,ry=0,last=0,run=false,calm=false;
try{calm=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
function hex(h){h=String(h||"#2f6feb").replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[0,2,4].map(function(i){return parseInt(h.slice(i,i+2),16)/255})}
function toHsl(c){var r=c[0],g=c[1],b=c[2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,h=0,s=0;if(mx!==mn){var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}return[h,s,l]}
function fromHsl(x){var h=x[0],s=x[1],l=x[2];function f(n){var k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1))}return[f(0),f(8),f(4)]}
/* keep the brand hue, guarantee enough colour + glow to read as a living orb */
function pal(a){var A=toHsl(hex(a));var s=A[1]<.08?.18:Math.max(A[1],.55);return[fromHsl([A[0],s,Math.min(Math.max(A[2],.34),.46)]),fromHsl([(A[0]+.02)%1,Math.max(s*.85,.45),.74])]}
var VS="attribute vec2 a;varying vec2 p;uniform float S;void main(){p=a*S;gl_Position=vec4(a,0.,1.);}";
var NOISE="vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}";
var FS="precision highp float;varying vec2 p;uniform float T,L,E,Q;uniform vec3 C1,C2;uniform mat3 Rm;"+NOISE+"float ridge(vec3 q){return pow(1.-abs(snoise(q)),5.);}void main(){float r=length(p);float rr=1.+L*.05;vec3 col=vec3(0.);float a=0.;if(r<rr){vec2 u=p/rr;float z=sqrt(max(0.,1.-dot(u,u)));vec3 n=vec3(u,z);vec3 em=vec3(0.);float fl=T*(.10+E*.10);for(int k=0;k<3;k++){float d=float(k)/2.;vec3 q=Rm*vec3(u,z*(1.-d*1.6));float f=ridge(q*(2.3+d*.9)+vec3(0.,fl,fl*.6));f+=.5*ridge(q*(4.8+d)+vec3(fl*1.3,0.,-fl));f*=(.55+.75*Q);em+=mix(C1,C2,clamp(f*.9+d*.3,0.,1.))*f*(1.-d*.42);}em*=(.6+L*.55+E*.2);float fres=pow(1.-z,2.4);vec3 base=mix(C1*.10,C1*.30+vec3(.01,.02,.04),z*.6);vec3 Ld=normalize(vec3(-.45,.55,.7));float rd=max(dot(reflect(-Ld,n),vec3(0.,0.,1.)),0.);float spec=pow(rd,48.)*.9+pow(rd,8.)*.12;float core=exp(-dot(u,u)*3.2)*(.14+L*.22);col=base+em*(.35+.65*z)+C2*fres*(.9+L*.45)+vec3(1.)*spec+mix(C2,vec3(1.),.5)*core;col=1.-exp(-col*1.25);float edge=smoothstep(rr,rr-.012,r);a=edge;col*=edge;}float h=exp(-max(r-rr,0.)*5.5)*(.30+L*.28+Q*.08)*smoothstep(rr-.02,rr+.01,r)*smoothstep(1.4,1.12,r);col+=C2*h*.9;a=max(a,h*.7);gl_FragColor=vec4(col,clamp(a,0.,1.));}";
var PVS="attribute vec3 a;attribute float s;uniform mat3 Rm;uniform float T,Px,L;varying float al;void main(){vec3 q=Rm*a;q*=1.+.04*sin(T*1.7+s*40.);float depth=q.z*.5+.5;float hide=(length(q.xy)<1.04&&q.z<0.)?0.:1.;al=hide*(.25+.75*depth)*(.35+L*.8);gl_Position=vec4(q.xy/1.4,0.,1.);gl_PointSize=Px*(.6+s*1.6)*(.7+depth*.6);}";
var PFS="precision mediump float;varying float al;uniform vec3 C2;void main(){vec2 d=gl_PointCoord-.5;float f=smoothstep(.5,0.,length(d));gl_FragColor=vec4(C2*f*al,f*al);}";
var AC=null,AN=[],amp=null;
function meter(stream,kind){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.resume)AC.resume();var src=AC.createMediaStreamSource(stream),a=AC.createAnalyser();a.fftSize=512;src.connect(a);AN.push({a:a,k:kind,d:new Uint8Array(a.fftSize)});kick()}catch(e){}}
function levels(){var o={"in":0,out:0};for(var j=0;j<AN.length;j++){var x=AN[j];x.a.getByteTimeDomainData(x.d);var q=0;for(var i=0;i<x.d.length;i++){var v=(x.d[i]-128)/128;q+=v*v}var r=Math.sqrt(q/x.d.length);if(r>o[x.k])o[x.k]=r}return o}
function pts(){if(P)return P;P=new Float32Array(N*4);for(var i=0;i<N;i++){var u=Math.random()*2-1,th=Math.random()*6.2832,rad=1.12+Math.pow(Math.random(),2.2)*.26,k=Math.sqrt(1-u*u);P[i*4]=Math.cos(th)*k*rad;P[i*4+1]=u*rad*.82;P[i*4+2]=Math.sin(th)*k*rad;P[i*4+3]=Math.random()}return P}
function rot(ax,ay){var cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay);return new Float32Array([cy,0,-sy,sx*sy,cx,sx*cy,cx*sy,-sx,cx*cy])}
function fallback(el,c){var a=c[0],b=c[1];function css(x){return"rgb("+x.map(function(v){return Math.round(v*255)}).join(",")+")"}el.style.borderRadius="50%";el.style.background="radial-gradient(circle at 36% 30%,#fff 0,"+css(b)+" 18%,"+css(a)+" 58%,#050a14 100%)";el.style.boxShadow="0 0 28px "+css(b)}
function add(el,col,o){o=o||{};var c=pal(col),cv=document.createElement("canvas");cv.setAttribute("aria-hidden","true");cv.style.cssText="position:absolute;left:-14%;top:-14%;width:128%;height:128%;pointer-events:none";
var gl=null;try{gl=cv.getContext("webgl",{premultipliedAlpha:true,alpha:true,antialias:true})}catch(e){}
if(!gl){fallback(el,c);return null}
function sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x}
function pr(v,f){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null}
var A=pr(VS,FS),B=pr(PVS,PFS);if(!A||!B){fallback(el,c);return null}
if(getComputedStyle(el).position==="static")el.style.position="relative";el.appendChild(cv);
var q=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,q);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
var pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,pts(),gl.STATIC_DRAW);
function U(p,n){return gl.getUniformLocation(p,n)}
var R={el:el,cv:cv,gl:gl,A:A,B:B,q:q,pb:pb,c:c,big:!!o.big,vis:true,L:0,E:0,Q:0,
u:{S:U(A,"S"),T:U(A,"T"),L:U(A,"L"),E:U(A,"E"),Q:U(A,"Q"),C1:U(A,"C1"),C2:U(A,"C2"),Rm:U(A,"Rm")},
pu:{Rm:U(B,"Rm"),T:U(B,"T"),Px:U(B,"Px"),L:U(B,"L"),C2:U(B,"C2")},aQ:gl.getAttribLocation(A,"a"),aP:gl.getAttribLocation(B,"a"),aS:gl.getAttribLocation(B,"s")};
if("IntersectionObserver" in window){new IntersectionObserver(function(es){R.vis=es[0].isIntersecting;kick()}).observe(el)}
orbs.push(R);kick();return R}
function draw(R,dt){var gl=R.gl,el=R.el,box=el.clientWidth*1.28,dpr=Math.min(window.devicePixelRatio||1,2),px=Math.round(box*dpr);if(!box||!el.isConnected)return;
if(R.cv.width!==px){R.cv.width=R.cv.height=px}
var k=1-Math.pow(.02,dt),talk=st==="speaking"?.45+.3*Math.abs(Math.sin(t*3.1)*Math.sin(t*1.7)):st==="listening"?.3+.06*Math.sin(t*2.2):st==="thinking"?.3+.1*Math.sin(t*8):(R.big?.16:.26)+.07*Math.sin(t*1.2);
if(amp!==null)talk=amp;R.L+=(talk-R.L)*Math.min(1,dt*(amp!==null?14:6));R.E+=((st==="thinking"?1:st==="speaking"?.6:R.big?.2:.35)-R.E)*k;R.Q+=((st==="idle"?(R.big?.4:.75):1)-R.Q)*k;
gl.viewport(0,0,px,px);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
gl.useProgram(R.A);gl.bindBuffer(gl.ARRAY_BUFFER,R.q);gl.enableVertexAttribArray(R.aQ);gl.vertexAttribPointer(R.aQ,2,gl.FLOAT,false,0,0);
gl.uniform1f(R.u.S,1.4);gl.uniform1f(R.u.T,t);gl.uniform1f(R.u.L,R.L);gl.uniform1f(R.u.E,R.E);gl.uniform1f(R.u.Q,R.Q);gl.uniform3fv(R.u.C1,R.c[0]);gl.uniform3fv(R.u.C2,R.c[1]);gl.uniformMatrix3fv(R.u.Rm,false,rot(.32,ry));
gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.disableVertexAttribArray(R.aQ);
gl.useProgram(R.B);gl.blendFunc(gl.ONE,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,R.pb);gl.enableVertexAttribArray(R.aP);gl.vertexAttribPointer(R.aP,3,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(R.aS);gl.vertexAttribPointer(R.aS,1,gl.FLOAT,false,16,12);
gl.uniformMatrix3fv(R.pu.Rm,false,rot(.32,-ry*.6));gl.uniform1f(R.pu.T,t);gl.uniform1f(R.pu.Px,Math.max(1.4,box/150)*dpr);gl.uniform1f(R.pu.L,Math.max(R.L,R.Q*.3));gl.uniform3fv(R.pu.C2,R.c[1]);
gl.drawArrays(gl.POINTS,0,N);gl.disableVertexAttribArray(R.aP);gl.disableVertexAttribArray(R.aS)}
function frame(now){var on=orbs.filter(function(R){return R.vis&&R.el.isConnected&&R.el.getClientRects().length>0});if(!on.length||document.hidden){run=false;return}
requestAnimationFrame(frame);var dt=Math.min((now-last)/1000,.05)*(calm?.6:1);last=now;t+=dt;ry+=dt*(.22+(st==="thinking"?.25:st==="speaking"?.15:0));
amp=null;if(AN.length){var lv=levels();if(lv.out>.015){st="speaking";amp=Math.min(1,.4+lv.out*4)}else if(lv["in"]>.02){st="listening";amp=Math.min(.9,.3+lv["in"]*3.2)}else if(st==="speaking"||st==="listening"){amp=.26}}
document.documentElement.style.setProperty("--sfo-spin",(ry*57.3%360).toFixed(1)+"deg");for(var i=0;i<on.length;i++)draw(on[i],dt)}
function kick(){if(!run&&!document.hidden){run=true;last=performance.now();requestAnimationFrame(frame)}}
document.addEventListener("visibilitychange",kick);
window.SFO={add:add,state:function(s){st=s||"idle";kick()},kick:kick,now:function(){return{st:st,amp:amp}},meter:meter,unmeter:function(){AN=[];amp=null;st="idle"}};})();
