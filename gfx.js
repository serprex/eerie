"use strict";
exports.gl = null;
function makeShader(gl, type, src){
	var shader = gl.createShader(type);
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		console.log(gl.getShaderInfoLog(shader));
	}
	return shader;
}
function makeProgram(gl, verts, frags){
	var prog = gl.createProgram();
	gl.attachShader(prog, verts);
	gl.attachShader(prog, frags);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
		console.log(gl.getProgramInfoLog(prog));
	}
	return prog;
}
exports.load = function(canvas, postload){
	exports.load = undefined;
	var gl = exports.gl = canvas.getContext("webgl", {alpha: false});
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);
	exports.texCoordBuffer = gl.createBuffer();
	exports.vtxCoordBuffer = gl.createBuffer();
	var verts = makeShader(gl, gl.VERTEX_SHADER, "\
		attribute vec2 aVertexPosition;\
		attribute vec2 aTextureCoord;\
		uniform vec2 uResolution;\
		varying vec2 vTextureCoord;\
		void main(void){\
			gl_Position = vec4((((aVertexPosition / uResolution) * 4.0 - 1.0)*vec2(1.0,-1.0)),0.0,1.0);\
			vTextureCoord = aTextureCoord;\
		}");
	var frags = makeShader(gl, gl.FRAGMENT_SHADER, "\
		precision mediump float;\
		varying vec2 vTextureCoord;\
		uniform sampler2D uSampler;\
		void main(void){ gl_FragColor = texture2D(uSampler, vTextureCoord); }");
	var prog = makeProgram(gl, verts, frags);
	gl.useProgram(prog);
	prog.vertexPositionAttribute = gl.getAttribLocation(prog, "aVertexPosition");
	prog.textureCoordAttribute = gl.getAttribLocation(prog, "aTextureCoord");
	prog.uResolution = gl.getUniformLocation(prog, "uResolution");
	gl.uniform2f(prog.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.enableVertexAttribArray(prog.vertexPositionAttribute);
	gl.enableVertexAttribArray(prog.textureCoordAttribute);

	exports.prog = prog;
	var atlas = exports.atlas = gl.createTexture();
	function process(asset, texture, base){
		var id = asset.match(/\d+$/), tex = new Texture(texture, base[0]/img.width, base[1]/img.height, base[2]/img.width, base[3]/img.height);
		if (id){
			asset = asset.slice(0, -id[0].length);
			if (!(asset in exports)) exports[asset] = [];
			exports[asset][id[0]] = tex;
		}else if (asset.match(/^tiles_/)){
			exports[asset] = [];
			for(var i=0; i<3; i++){
				for(var j=0; j<3; j++){
					exports[asset][i*3+j] = new Texture(texture, base[0]/img.width+(base[2]*i/img.width/3), base[1]/img.height+(base[3]*i/img.height/3), base[2]/img.width/3, base[3]/img.height/3);
				}
			}
		}else exports[asset] = tex;
	}
	var img = new Image();
	img.addEventListener("load", function(){
		exports.atlasWidth = img.width;
		exports.atlasHeight = img.height;
		gl.bindTexture(gl.TEXTURE_2D, atlas);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		var atlasdata = require("./assets/atlas");
		for(var key in atlasdata){
			process(key, atlas, atlasdata[key]);
		}
		postload();
	});
	img.src = "assets/atlas.png";
}
function Text(text, fontsize, color, bgcolor){
	var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
	var font = ctx.font = fontsize + "px Dosis";
	canvas.width = ctx.measureText(text).width+1;
	canvas.height = fontsize*1.4;
	if (bgcolor !== undefined){
		ctx.fillStyle = bgcolor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	ctx.font = font;
	ctx.fillStyle = color || "black";
	ctx.fillText(text, 0, fontsize);
	return canvas;
}
function Texture(t, x, y, w, h){
	this.t = t;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
}
var ctx = {
	coords:[],
	verts:[],
	draw:function(g, x, y, hflip){
		var x1=g.x, y1=g.y, x2=g.x+g.w, y2=g.y+g.h;
		if (hflip){
			var x1t = x1;
			x1 = x2;
			x2 = x1t;
		}
		this.coords.push(x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2);
		x1 = x*24;
		x2 = x*24+g.w*exports.atlasWidth;
		y1 = y*24;
		y2 = y*24+g.h*exports.atlasHeight;
		this.verts.push(x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2);
	},
	render:function(){
		var gl = exports.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindBuffer(gl.ARRAY_BUFFER, exports.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.coords), gl.STREAM_DRAW);
		gl.vertexAttribPointer(exports.prog.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, exports.vtxCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.STREAM_DRAW);
		gl.vertexAttribPointer(exports.prog.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, this.coords.length/2);
	},
};
exports.begin = function(){
	ctx.coords.length = 0;
	ctx.verts.length = 0;
	return ctx;
}
exports.Text = Text;
exports.Texture = Texture;