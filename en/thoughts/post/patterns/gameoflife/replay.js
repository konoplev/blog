var baseresolution = 1;
var realresolution = baseresolution;
var resolution = realresolution;
var SCALE = 5;

var SCREEN = 800
var SCREENY = 800;

var delta_x = -74;
var delta_y = -78;

var unflat_cache = [[0], [0], [0], [0], [0],
 		    [0], [0], [0], [0], [0]];
function unflattentrees(trees, changeanything) {
    //console.log(trees);
    var cache = unflat_cache;
    function unflattentree(lines) {
	lines = lines.split("\n");
	if (changeanything) {
	    for (var i in lines) {
		if (i == lines.length-1) {
		    break;
		}
		if (lines[i] == "") { continue; }
		var line = lines[i].split(",");
		if (line[0] == "1") {
		    cache[1].push(line.slice(1))
		} else {
		    var level = parseInt(line[0]);
		    var c = cache[level-1];
		    cache[level].push(line.slice(1).map(function(x) {
			return c[parseInt(x)]
		    }));
		}
	    }
	}
	var idx = parseInt(lines[lines.length-1]);
	//console.log(idx, lines.length, cache[9][idx] == undefined);
	return [idx, cache[9][idx]];
    }
    return trees.map(unflattentree);
}

function unquad(res, tree, offx, offy, level) {
    if (tree === 0 || tree === "0") { return []; }
    if (level == 0) { res.push([offx, offy]); return res;}
    var dst = 1<<(level-1);//Math.pow(2,level-1);
    var ne = unquad(res, tree[0], offx, offy, level-1);
    var nw = unquad(res, tree[1], offx+dst, offy, level-1);
    var se = unquad(res, tree[2], offx, offy+dst, level-1);
    var sw = unquad(res, tree[3], offx+dst, offy+dst, level-1);
    return res;
}

var unquad_cache = {};
function decompressblocks(blocks, changeanything) {
    var out = unflattentrees(blocks, changeanything);
    
    return out.map(function(x) {
	if (!(x[0] in unquad_cache)) {
	    unquad_cache[x[0]] = unquad([], x[1], 0, 0, 9);
	}
	return unquad_cache[x[0]];
    });
}


function rot90(xys) {
    if (xys.length == 0) { return []; }
    var out = xys.map(function(xy) {
	return [270-xy[1],xy[0],xy[2]];
    });
    return out;
}

function rot90v2(xys) {
    if (xys.length == 0) { return []; }
    var out = xys.map(function(xy) {
	return [269-xy[1],xy[0],xy[2]];
    });
    return out;
}

function grid_undifference(prev, lastdelta, delta) {
    var transform = delta[0].split(",");
    var max_y = parseInt(delta[1]);
    var newsquares = (delta[2]);
    var mapper = (delta[3]);
    var result = [];
    var len = prev.length;
    for (var i = 0; i < len; i++) {
	var old = prev[i];
	var diff = transform[i];
	if (diff == "S") {
	    result.push(old)
	} else if (diff == "D") {
	} else {
	    var rest = mapper[old[2]+":"+old[3]][parseInt(diff)].split(":");
	    result.push(old.slice(0,2).concat([parseInt(rest[0]),parseInt(rest[1])]))
	}
    }
    
    var cumidx = 0;
    var cumpos = 0;

    len = newsquares.length;
    for (var i = 0; i < len; i++) {
	cumidx += parseInt(newsquares[i][0]);
	cumpos += parseInt(newsquares[i][1]);
	var elt = [0|(cumpos/max_y), cumpos%max_y,
		   newsquares[i][2],newsquares[i][3]];
	result.splice(cumidx-1,0,elt);
    }

    //console.log(result);
    return result;
}

var grid = [];
var lastdelta = "";
var blocks = undefined;

function decompress(comp, changeanything, dodraw) {
    var compblocks = comp[0];
    var compgrid = comp[1];
    var start = now();
    blocks = decompressblocks(compblocks, changeanything);
    if (changeanything) {
	grid = grid_undifference(grid, lastdelta, compgrid);
	lastdelta = compgrid[0];
    }
    //log("Uncompressed frame in " + (now()-start) + "ms.");
    if (dodraw)
	draw();
}


function drawagain(basex, basey, d, canvasdata, rot) {
    var size = Math.max(SCALE/270*resolution,.02);
    var ks =Object.keys(d);
    var dat = canvasdata.data;
    for (var k = 0; k < ks.length; k++) {
	var kk = d[ks[k]];
	var x = kk[1];
	var y = kk[2];
	var thickness = kk[0];
	var xx = 0|(x+basex);
	var yy = 0|(y+basey);
	if (xx >= 0 && xx < SCREEN && yy >= 0 && yy < SCREENY) {
	    var xypoint = yy*SCREEN+xx;
	    if (size < 1) {
		dat[xypoint*4+3] = thickness;
	    } else {
		for (var dx = 0; dx < size; dx++) {
		    for (var dy = 0; dy < size; dy++) {
			dat[(xypoint+dy*SCREEN+dx)*4+3] = thickness;
		    }
		}
	    }
	}
    }
}

function doDrawFrame(ctx, blocks, grid) {
    var canvasdata = ctx.createImageData(SCREEN,SCREENY);
    var output = canvasdata.data;

    /*
    for (let i = 0; i < output.length; i += 4) {
        output[i+3] = 17;
    }
    */

    ctx.fillStyle = "#000000";
    var skipped = 0;
    var did = 0;

    var my_x = delta_x + SCREEN/SCALE/2;
    var my_y = delta_y + SCREEN/SCALE/2;
    
    for (var i = 0; i < grid.length; i++) {
	var basex = (my_x+grid[i][0])*SCALE;
	var basey = (my_y+grid[i][1])*SCALE;
	if (Math.min(basex,basey) < -SCALE || basex > SCREEN || basey > SCREENY) {
	    continue;
	}

	var key = grid[i][2];
	var rot = grid[i][3];
	var cur = blocks[key+":"+rot];
        if (cur instanceof Function) {
            cur();
            cur = blocks[key+":"+rot];
        }
	
	drawagain(basex, basey, cur, canvasdata);
    }

    ctx.putImageData(canvasdata,0,0);
}

function rewriteBlock(cur) {
    var SKIP = (0|(100 / SCALE)) + 1;
    var this_scale = SCALE/270;
    var size = Math.max(this_scale*resolution,.01)*256 * SKIP;
    var curdrew = {};
    var remember = {};

    for (var i = 0; i < cur.length; i += SKIP) {
	var xy = cur[i];
	var x = xy[0];
	var y = xy[1];
	var proj_x = (0|(this_scale*x*4))/4;
	var proj_y = (0|(this_scale*y*4))/4;
	
	var where = proj_y*1000000+proj_x;
	var last = remember[where]||0;
        if (last >= 255) continue;
	var what = last+size;
	remember[where] = what;
	curdrew[where] = [what, proj_x, proj_y];
    }
    //console.log(Object.keys(curdrew).length);
    var out = Object.keys(curdrew).sort().map(function(x){return [curdrew[x][0], curdrew[x][1], curdrew[x][2]]});

    return out;
}

function smallrot90(out) {
    //console.log("IN:",out);
    var res = [];
    for (var e in out) {
	var t = out[e];
	res.push([t[0], SCALE-1-t[2], t[1]]);
    }
    //console.log("OUT:",res);
    return res;
}

function rewriteBlocks(blocks) {
    var res = {};
    for (var block = 0; block < blocks.length; block++) {
        var compute = (function(b,q) {
            return function() {
	        var out = rewriteBlock(b);
	        res[q+":0"] = out;
	        out = smallrot90(out);
	        res[q+":3"] = out;
	        out = smallrot90(out);
	        res[q+":2"] = out;
	        out = smallrot90(out);
	        res[q+":1"] = out;
            }
        })(blocks[block],block);
	res[block+":0"] = compute;
	res[block+":3"] = compute;
	res[block+":2"] = compute;
	res[block+":1"] = compute;
    }
    //console.log(res);
    return res;
}


function rewriteGrid(grid) {
    return grid;
}

var count;
var last_grid = {};

var canvas, ctx;

function draw() {
    var start = now();
    count = 0;

    var rewrittenBlocks = rewriteBlocks(blocks);
    var rewrittenGrid = (grid);


    doDrawFrame(ctx, rewrittenBlocks, rewrittenGrid);

    //log("Drew frame in " + (now()-start)+"ms.");
    //console.log("count",count);
    
}

var generation = 0;
var generation_frames = undefined;
var paused = 0;

var GAP = 8*8*8+1;

var looping = 0;

var intr = undefined;

/*
function dostep() {
    intr = undefined;
    if (window["dat"+generation]) {
	//console.log("look for", generation);
	for (var i = 0; i < SPEED; i++) {
	    if (!window["dat"+generation]) {
		break;
	    }
	    generation_frames = window["dat"+(0+generation)];
	    decompress(generation_frames, true, false);
	    generation = GAP+generation;
	}
	draw()

	if (!looping) return;
	if (window["dat"+generation]) {
	    intr = setTimeout(dostep, 10);
	    return;
	}
    }
    if (generation < 18219600) {
	start_dostep = now();
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "/data/data.replay."+generation+".js");
	xhr.onreadystatechange = function(x) {
	    if (xhr.readyState == 4 && xhr.status == 200) {
		log("Received frame in " + (now()-start_dostep) + "ms");
		window['dat'+generation] = JSON.parse(xhr.responseText.split(" = ")[1]);
		dostep();
	    }
	}
	xhr.send();
    }
}
*/

function dostep() {
    intr = undefined;

    console.log(requestedGeneration, generation)
    while (requestedGeneration <= GAP*SPEED+generation) {
        requestNext();
    }

    do_work = function() {
        console.log("got here");
        if (window["dat"+(generation)] && window["dat"+(generation+GAP*SPEED)]) {
            for (var i = 0; i < SPEED; i++) {
	        generation_frames = window["dat"+(0+generation)];
	        decompress(generation_frames, true, false);
	        generation = GAP+generation;
            }
            console.log("do draw");
            draw()
            do_work = function() {};
        }
    };
}

function canSee(el) {
    var rect = el.getBoundingClientRect();
    var elemTop = rect.top;
    var elemBottom = rect.bottom;

    return isVisible = elemTop < window.innerHeight && elemBottom >= 0;
}

window.onscroll = function() {
    var cnv = document.getElementById("canvas")
    if (cnv && canSee(cnv)) {
        if (anim_frame == null) {
            console.log("CALL CONT")
            cont();
        }
    } else {
        if (anim_frame != null) {
            cancelAnimationFrame(anim_frame);
            anim_frame = null;
        }
    }
}

var anim_frame = null;

function cont() {
    if (!looping) return;
    
    while (requestedGeneration <= 20*GAP*SPEED+generation) {
        //console.log("Request", requestedGeneration)
        requestNext();
    }
    
    //console.log("Try to draw", generation);
    if (window["dat"+(generation+GAP*SPEED)]) {
        for (var i = 0; i < SPEED; i++) {
	    generation_frames = window["dat"+(0+generation)];
	    decompress(generation_frames, true, false);
	    generation = GAP+generation;
        }
        //console.log("do draw");
        draw()
        do_work = function() {};
    } else {
        //console.log("Stalled on network")
        generation = 0;
        unflat_cache = [[0], [0], [0], [0], [0],
 		        [0], [0], [0], [0], [0]]
        grid = [];
        lastdelta = ""
        blocks = undefined;
    }

    if (SCALE > 400 && DOWN == 1) {
        DOWN = 0;
        wait = 2; // TODO 5
    }
    if (SCALE < 5 && DOWN == 0) {
        DOWN = 1;
        wait = DWAIT; // TODO 8
    }

    if (wait > 0) {
        wait -= .01;
    } else if (DOWN) {
        SCALE *= ZSPEED
    } else {
        SCALE /= ZSPEED
    }
    
    anim_frame = requestAnimationFrame(cont);
}

var DWAIT = 8;
var wait = 6; // TODO 6 // was 1
var DOWN = 1;
var ZSPEED = 1.005;
var PATH = "/writing/2020/gameoflife/data.js"

var GENSIZE = [1e8];

var do_work = function() {};
var requestedGeneration = 0;

function requestNext() {
    console.log("Request next", requestedGeneration)
    //if (requestedGeneration < 239571) {
    if (requestedGeneration < 239571) {
        console.log("Requesting frame", requestedGeneration)
	var start_dostep = now();
	var xhr = new XMLHttpRequest();
	//xhr.open("GET", "/writing/2020/gameoflife/data/data.replay."+requestedGeneration+".js");
        xhr.open("GET", PATH);
	xhr.onreadystatechange = function(x) {
	    if (xhr.readyState == 4 && xhr.status == 200) {
		log("Received frame " + xhr.responseText.substr(0,100).split("=")[0] + " in " + (now()-start_dostep) + "ms");
                var lines = xhr.responseText.split("\n");
                console.log("Content", lines.length)

                console.log(lines);
                console.log("LINES LEN", lines.length);
                if (lines.length > 100) {
                    document.getElementById("loading").style.display = "none";
                }

                
                for (var i = 0; i < lines.length-1; i++) {
                    var split = lines[i].split(" = ");
		    window['dat'+split[0].split("dat")[1]] = JSON.parse(split[1]);
                }
                do_work();
	    }
	}
	xhr.send();
        requestedGeneration = GENSIZE.shift();;
        PATH = "/writing/2020/gameoflife/data2.js"
    }
}

var SPEED = 1;

function speedup() {
    if (SPEED < 16)
	SPEED *= 2;
}

function speeddown() {
    if (SPEED > 1)
	SPEED /= 2;
}

function run() {
    looping = 1;
    cont();
}

function pause() {
    looping = 0;
}

function zoomin() {
    SCALE *= 2;
    draw();
}    
function zoomout() {
    SCALE /= 2;
    draw();
}
function resetzoom() {
    SCALE=6;
    realresolution = baseresolution;
    resolution = baseresolution;
    log("Reset zoom.");
    draw();
}

function xstep() {
    looping = 0;
    dostep();
}

function now() {
    return +(new Date());
}

var logs = [];
function log(msg) {
    logs.push(msg);
    //var elts = document.getElementById("status_id").innerHTML.split("<br>");
    //document.getElementById("status_id").innerHTML = elts.splice(-10).join("<br>")+"<br>"+ "("+(Math.floor(now()/1000))+") " +msg;
    console.log(msg);
}

function drawAt(canv, tree, kind, scale, grey, FILTER, DX, DY) {
    DX *= 270;
    DY *= 270;
    var ctx = canv.getContext("2d");
    ctx.clearRect(0, 0, canv.width, canv.height);
                 

    if (grey) {
        ctx.fillStyle = "#eee";
        ctx.fillRect(0, 0, canv.width, canv.height);
        ctx.fillStyle = "#333333";
    } else {
        ctx.fillStyle = "#000000";
    }

    var W = canv.width;
    var H = canv.height;

    var dr = 0;
    
    function dosub(t, dx, dy) {
        if (t === undefined || t.empty) return;
        if (scale*2*(dx-DX+t.dst*2) < 0) return;
        if (scale*2*(dx-269-DX) > W) return;
        if (scale*2*(dy-DY+t.dst*2) < 0) return;
        if (scale*2*(dy-269-DY) > H) return;
                 
                 
        if (t.level == 0 && t.ison) {
            dr++;
	    ctx.fillRect(Math.floor(scale*2*(dx-269-DX)),
                         Math.floor(scale*2*(dy-269-DY)),
                         Math.ceil(scale*(2 + FILTER)),
                         Math.ceil(scale*(2 + FILTER)));
        } else {
            var dst = t.dst;
	    dosub(t.nw, dx, dy)
	    dosub(t.ne, dx+dst, dy)
	    dosub(t.sw, dx, dy+dst)
	    dosub(t.se, dx+dst, dy+dst)
        }
    }
    dosub(tree, 0, 0)
    //console.log('draw count', dr);
    
    /*
    var flat = tree.flatten();

    function q(x) { if (x._done !== undefined) { return 0;} var o = 1 + (0|(x.nw && q(x.nw))) + (0|(x.sw && q(x.sw))) + (0|(x.nw && q(x.se))) + (0|(x.nw && q(x.ne))); x._done = o; return o }
    console.log(flat.length, q(tree))

    for (var x = 0; x < flat.length; x++) {
	if (FILTER || (flat[x][0] >= 270 && flat[x][1] >= 270 && flat[x][0] < 270*2/scale && flat[x][1] < 270*2/scale)) {
	    ctx.fillRect(Math.floor(scale*2*(flat[x][0]-269)),
                         Math.floor(scale*2*(flat[x][1]-269)),
                         Math.ceil(scale*(2 + FILTER)),
                         Math.ceil(scale*(2 + FILTER)));
	}
    }
    */
    cc=ctx;

    ctx.strokeStyle = "#0000ff";
    if (kind == 'not') {
	cc.strokeText("(1)",30,70);
	cc.strokeText("(2)",175,262);
	cc.strokeText("(3)",197,47);
	cc.strokeText("(4)",146,431);
    } else if (kind == 'and') {
	cc.strokeText("(1)",30,70);
	cc.strokeText("(2)",70,510);
	cc.strokeText("(3)",163,36);
	cc.strokeText("(4)",32,211);
	cc.strokeText("(5)",270,471);
	cc.strokeText("(6)",65,294);
	cc.strokeText("(7)",345,188);
	cc.strokeText("(8)",495,278);
	cc.strokeText("(9)",308,362);
    } else if (kind == 'or') {
	cc.strokeText("(1)",30,70);
	cc.strokeText("(2)",70,510);
	cc.strokeText("(3)",225,95);
	cc.strokeText("(4)",163,255);
	cc.strokeText("(5)",32,280);
	cc.strokeText("(6)",205,481);
	cc.strokeText("(7)",494,143);
	cc.strokeText("(8)",433,300);
	cc.strokeText("(9)",238,270);
	cc.strokeText("(10)",398,495);
    } else if (kind == 'cross') {
	cc.strokeText("(1)",30,70);
	cc.strokeText("(2)",30,470);
	cc.strokeText("(3)",40,264);
	cc.strokeText("(4)",200,490);
	cc.strokeText("(5)",485,310);
	cc.strokeText("(6)",361,211);
    } else if (kind == 'rot') {
	cc.strokeText("(1)",30,70);
	cc.strokeText("(2)",261,73);
	cc.strokeText("(3)",48,247);
	cc.strokeText("(4)",111,467);
	cc.strokeText("(5)",330,278);
    } else if (kind == 'dup') {
	cc.strokeText("(1)",30,70);
	cc.strokeText("(2)",270,75);
	cc.strokeText("(3)",57,254);
	cc.strokeText("(4)",111,467);
	cc.strokeText("(5)",256,205);
	cc.strokeText("(6)",349,316);
	cc.strokeText("(7)",471,325);
    }

}

function make(it) {
    var v = [];
    for (var a in it) {
	var s = it[a];
	for (var x = 0; x < s.length; x++) {
	    if (s.charAt(x) == 'o') {
		v.push([x,parseInt(a)]);
	    }
	}
    }
    return v;
}

function fix(it) {
    var v = [];
    for (k in it) {
	var n = parseInt(k);
	v.push([n%200,Math.floor(n/200)]);
    }
    return v;
}

var pieces = {
    'blinker': make(["...",
    "ooo",
    "..."]), 
    'glider': make([".o.",
		    "..o",
		    "ooo"]),
    'eater': make(["oo.",
		   "o.o",
		   "..o",
		   "..oo"]),
    'gun': make(["........................o...........",
		 "......................o.o...........",
		 "............oo......oo............oo",
		 "...........o...o....oo............oo",
		 "oo........o.....o...oo..............",
		 "oo........o...o.oo....o.o...........",
		 "..........o.....o.......o...........",
		 "...........o...o....................",
		 "............oo......................"]),
    'halfgun': fix({46:1, 47:1, 246:1, 247:1, 1445:1, 1446:1, 1447:1, 1644:1, 1645:1, 1647:1, 1648:1, 1844:1, 1845:1, 1847:1, 1848:1, 2044:1, 2045:1, 2046:1, 2047:1, 2048:1, 2243:1, 2244:1, 2248:1, 2249:1, 2846:1, 2847:1, 3044:1, 3045:1, 3046:1, 3047:1, 3048:1, 3248:1, 3427:1, 3429:1, 3444:1, 3445:1, 3446:1, 3626:1, 3629:1, 3644:1, 3816:1, 3825:1, 3826:1, 3837:1, 3838:1, 3845:1, 3846:1, 4015:1, 4017:1, 4023:1, 4024:1, 4028:1, 4037:1, 4038:1, 4045:1, 4046:1, 4203:1, 4204:1, 4215:1, 4216:1, 4218:1, 4225:1, 4226:1, 4232:1, 4233:1, 4403:1, 4404:1, 4415:1, 4416:1, 4418:1, 4419:1, 4426:1, 4429:1, 4434:1, 4615:1, 4616:1, 4618:1, 4627:1, 4629:1, 4645:1, 4646:1, 4650:1, 4651:1, 4815:1, 4817:1, 4845:1, 4847:1, 4849:1, 4851:1, 5016:1, 5026:1, 5038:1, 5040:1, 5046:1, 5047:1, 5048:1, 5049:1, 5050:1, 5227:1, 5238:1, 5239:1, 5247:1, 5248:1, 5249:1, 5425:1, 5426:1, 5427:1, 5439:1, 5448:1, 5633:1, 5831:1, 5832:1, 5833:1, 6029:1, 6034:1, 6229:1, 6231:1, 6429:1, 6632:1, 6633:1, 6634:1, 6833:1, 6848:1, 6849:1, 7048:1, 7049:1, 8041:1, 8242:1, 8440:1, 8441:1, 8442:1}),
};

function doplace(board,toplace,x,y,b) {
    var what = pieces[toplace];
    for (var p in what) {
	board = board.dot(x+what[p][0],y+what[p][1],true)
    }
    return board;
}

function makeCircuit(circ, kind, dx, dy, nw, sw) {
    var rate = 1;
    var timer = undefined;
    var one = [];
    // UGLY HACK: only do the extra steps on the first tutorial
    var x = putnot[0].flatten().length != 619
    if (nw != null) {
	one = put1[0].boomNW().boom().boom().tick(1024*x).tick(32*x).boom().tick(16*x).boom().tick(8*x).flatten();
    }
    if (sw != null) {
	one = one.concat(FromPoints(rot90v2(rot90v2(rot90v2(put1[0].flatten()))),9).boomNW().move(0,270*2).boom().boom().tick(1024*x).tick(32*x).boom().tick(16*x).boom().tick(8*x+(3*!x)).flatten());
    }

    function multicirc(arr) {
        return function() {
            //var empty = []
            var use = FromPoints([], 20);
            
            for (var i in arr) {
                var [name, xoff, yoff, rot] = arr[i]
                //empty.push(...window[name][rot].flatten().map(x=> [x[0]+270*xoff, x[1]+270*yoff]));
                use = use.merge(window[name][rot].boomNW().boomNW().boomNW().boomNW().boomNW().boomNW().boomNW().move(270*xoff, 270*yoff))
            }
            //return FromPoints(empty, 20);
            return use;
        }
    }

    var map = {not: function() { return  putnot_r[0]},
	       and: function() { return  putand[0]},
	       or: function() { return  putor[0]},
	       cross: function() { return  putx[0]},
	       nop: function() { return  FromPoints([],10)},
	       rot: function() { return  putrot90[0]},
	       dup: function() { return  putdup[0]},
               blinker: function() { return  FromPoints(pieces['blinker'], 10)},
               glider: function() { return  FromPoints(pieces['glider'], 10)},
               gun: function() { return  FromPoints(pieces['gun'], 10)},
               eater: function() { return  FromPoints(FromPoints(pieces['gun'], 10).boom().tick(128).flatten().concat(FromPoints(pieces['eater'], 10).move(54,40).flatten()),10)},
               collide1: function() { return  FromPoints(FromPoints(pieces['gun'], 10).boom().tick(180).flatten().concat(FromPoints(rot90v2(rot90v2(rot90v2(pieces['gun']))), 10).move(0,-150).boom().tick(128).flatten()),10)},
               collide2: function() { return  FromPoints(FromPoints(pieces['gun'], 10).boom().tick(180).flatten().concat(FromPoints(rot90v2(rot90v2(rot90v2(pieces['gun']))), 10).move(16,-141).boom().tick(179).flatten()),10)},
               collide3: function() { return  FromPoints(FromPoints(pieces['gun'], 10).boom().tick(180).flatten().concat(FromPoints(rot90v2(rot90v2(rot90v2(pieces['halfgun']))), 10).move(4,-141).boom().tick(0).flatten()),10)},
               collide4: function() { return  FromPoints(FromPoints(pieces['halfgun'], 10).boom().tick(45).flatten().concat(FromPoints(rot90v2(rot90v2(rot90v2(pieces['gun']))), 10).move(37,-140).boom().tick(400).flatten()),10)},
               _latch: multicirc([
['putor', 47, 37, 0] ,
['putand', 46, 36, 0] ,
['putnot_r', 44, 38, 0] ,
['putand', 52, 42, 0] ,
['putnot_r', 29, 25, 0] ,
['putnot_r', 22, 26, 0] ,
['putand', 32, 30, 0] ,
['putand', 37, 31, 0] ,
['putnot_r', 25, 37, 0] ,
['putnot_r', 30, 38, 0] ,
['putx', 35, 33, 0] ,
['putrot90', 43, 41, 0] ,
['putrot90', 26, 22, 3] ,
['putdup', 25, 21, 2] ,
['putrot90', 4, 0, 2] ,
['putrot90', 0, 4, 1] ,
['putrot90', 24, 22, 1] ,
['putx', 25, 23, 0] ,
['putdup', 27, 25, 0] ,
['putrot270', 28, 24, 3] ,
['putdup_r', 30, 28, 0] ,
['putrot90', 23, 35, 1] ,
['putrot270', 31, 23, 3] ,
['putrot270', 33, 25, 0] ,
['putrot90', 32, 26, 1] ,
['putdup_r', 35, 29, 0] ,
['putx', 33, 31, 1] ,
['putrot90', 28, 36, 1] ,
['putdup', 48, 38, 0] ,
['putrot90', 50, 36, 3] ,
['putrot90', 46, 32, 2] ,
['putrot90', 44, 34, 1] ,
               ]),
               _rising: multicirc([
['putand', 9, 7, 0] ,
['putnot_r', 8, 8, 0] ,
['putnot_r', 2, 6, 0] ,
['putand', 14+2, 12+2, 0] ,
['putrot90', 6, 2, 3] ,
['putrot90', 4, 0, 2] ,
['putdup', 3, 1, 1] ,
['putx', 5, 3, 0] ,
['putrot90', 0, 4, 1] ,
['putdup_r', 8, 6, 0] ,
['putrot90', 7, 7, 1] ,
               ]),
               _dffq: multicirc([]),
               _dff: multicirc([
['putnot_r', 34, 26, 0] ,
['putand', 41, 27, 0] ,
['putand', 38, 26, 0] ,
['putor', 42, 28, 0] ,
['putand', 34, 32, 0] ,
['putnot_r', 39, 29, 0] ,
['putand', 37, 31, 0] ,
['putnot_r', 30, 36, 0] ,
['putnot_r', 12, 30, 0] ,
['putnot_r', 21, 19, 0] ,
['putdup_r', 23, 17, 3] ,
['putdup', 32, 26, 0] ,
['putrot270', 33, 25, 3] ,
['putrot90', 24, 16, 3] ,
['putrot90', 8, 0, 2] ,
['putrot90', 5, 3, 1] ,
['putdup_r', 17, 25, 3] ,
['putrot90', 18, 26, 0] ,
['putrot270', 23, 21, 3] ,
['putdup_r', 32, 30, 0] ,
['putrot270', 31, 31, 1] ,
['putrot90', 30, 30, 2] ,
['putrot90', 29, 31, 1] ,
['putrot270', 31, 33, 0] ,
['putrot270', 30, 34, 1] ,
['putrot90', 28, 32, 2] ,
['putrot90', 27, 33, 1] ,
['putrot90', 18, 24, 3] ,
['putrot90', 6, 12, 2] ,
['putrot90', 4, 14, 1] ,
['putrot270', 15, 25, 0] ,
['putrot270', 14, 26, 1] ,
['putrot90', 3, 15, 2] ,
['putrot90', 0, 18, 1] ,
['putrot90', 38, 32, 0] ,
['putdup', 35, 33, 0] ,
['putrot90', 37, 35, 0] ,
['putrot90', 40, 32, 3] ,
['putx', 39, 31, 3] ,
['putrot270', 36, 28, 2] ,
['putdup', 43, 29, 0] ,
['putrot270', 45, 31, 0] ,
['putrot90', 40, 36, 1] ,
['putrot90', 44, 28, 3] ,
['putrot90', 40, 24, 2] ,
['putrot90', 39, 25, 1] ,
['putrot270', 39, 27, 0] ,
['putrot90', 38, 28, 1] ,
['putrot270', 36, 24, 3] ,
]),
               _clock: multicirc([
                   ['putnot_r', 0, 1, 1] ,
                   ['putdup', 1, 2, 0] ,
                   ['putrot90', 2, 1, 3] ,
                   ['putrot90', 1, 0, 2] ,
                   //['putrot90', 4, 2, 3] ,
                   //['putrot90', 2, 0, 2] ,
                   //['putdup', 1, 1, 1] ,
                   //['putx', 3, 3, 0] ,
                   //['putrot90', 0, 2, 1] ,
               ])
	      };
    var SZ = 12;
    if (kind[0] == "_") {
        SZ = 20;
    }
    //var board = FromPoints(map[kind]().boomNW().move(270,270).flatten().concat(one),SZ);
    var board = map[kind]().boomNW().move(270,270);
    if (one.length) {
        //board = FromPoints(board.flatten().concat(one),SZ);
        board = FromPoints(one,board.level).merge(board);
    }
    var FILTER = false && (kind[0] == "_");

    TREE = board;

    var this_scale = 1
    if (pieces[kind]) {
        // make it bigger
        this_scale = kind == 'glider' ? 8 : 4;
    } else if (kind.substr(0,7) == 'collide') {
        this_scale = 2;
        rate = 4;
    } else if (kind[0] == "_") {

        var max = board.max(0,0);
        this_scale = 270/(board.max(0,0) - Math.max(dx,dy)*270);
        rate = 4<<(0|Math.log(max));
    }
    
    var b1 = document.createElement("input");
    b1.type = "button";
    b1.value = "tick";
    b1.onclick = function() {
	board = board.boom().tick(rate);
	drawAt(canv, board, kind, this_scale, false, FILTER, dx, dy);
    }
    circ.appendChild(b1);
    
    /*
    var b2 = document.createElement("input");
    b2.type = "button";
    b2.value = "run";
    b2.onclick = function() {
	if (b2.value == "run") {
	    function run() {
		board = board.boom().tick(rate);
		drawAt(canv, board, kind);
		timer = setTimeout(run, 0);
	    }
	    b2.value = "pause"
	    run();
	} else {
	    b2.value = "run"
	    clearTimeout(timer);
	}
    }
    circ.appendChild(b2);
    */

    var b5 = document.createElement("input");
    b5.type = "button";
    b5.value = "reset";
    b5.onclick = function() {
	board = FromPoints(map[kind]().boomNW().move(270,270).flatten().concat(one),10);
	clearTimeout(timer);
	drawAt(canv, board, kind, this_scale, true, FILTER, dx, dy);
	//b2.value = "run"
    }
    circ.appendChild(b5);
    var b3 = document.createElement("input");
    b3.type = "button";
    b3.value = "speed++";
    b3.onclick = function() {
	if (rate < 128 || kind[0] == "_")
	    rate *= 2
    }
    circ.appendChild(b3);
    var b4 = document.createElement("input");
    b4.type = "button";
    b4.value = "speed--";
    b4.onclick = function() {
	rate /= 2
    }
    circ.appendChild(b4);
    var canv = document.createElement("canvas");
    canv.width = "540";
    canv.height = "540";
    circ.appendChild(canv);

    var el = document.createElement("div");
    el.style = "position: absolute; left: 0px; top: 30px; font-size: 80px; width: 310px; height: 290px; cursor: pointer; padding-left: 230px; padding-top: 250px; opacity: 0.8;"
    el.innerHTML = "&#9658;";

    prev_timer = performance.now()
    
    var is_run = true;
    el.onclick = function() {
        window.cancelAnimationFrame(anim_frame)
        anim_frame = null;
        var this_counter = CLICK_COUNTER++;

	if (is_run) {
            el.innerHTML = "";
	    function run() {

                if (please_stop.indexOf(""+timer) != -1) {
                    please_stop = please_stop.splice(please_stop.indexOf(""+timer),1)
                    el.innerHTML = "&#9658;";
	            drawAt(canv, board, kind, this_scale, true, FILTER, dx, dy);
                    delete all_timers[timer]
	            clearTimeout(timer);
                    timer = null;
                    is_run = true;
                    return;
                }
                
                var delay = this_scale == 1 ? 1 : 200;
                var thisrate = rate;
                if (delay > 0) {
                    if (rate < 8) {
                        delay /= rate;
                        thisrate = 1;
                    } else {
                        thisrate /= 8;
                        delay /= 8;
                    }
                }
                //console.log(board);
		board = board.boom().tick(thisrate);
		drawAt(canv, board, kind, this_scale, false, FILTER, dx, dy);

                //console.log(performance.now()-prev_timer);
                prev_timer = performance.now()
                
                delete all_timers[timer]
		timer = setTimeout(run, delay);
                all_timers[timer] = this_counter;
	    }
	    run();
	} else {
            el.innerHTML = "&#9658;";
	    drawAt(canv, board, kind, this_scale, true, FILTER, dx, dy);
            delete all_timers[timer]
	    clearTimeout(timer);
	}
	is_run = !is_run;
        while (1) {
            var timers = Object.keys(all_timers);
            if (timers.length < 3) break;

            var min = 1e10;
            Object.values(all_timers).map(function(t) {
                if (t < min) min = t;
            });

            timers.map(function(t) {
                if (all_timers[t] == min) {
                    please_stop.push(t);
                    delete all_timers[t];
                }
            });
            break
        }
        
    }
    circ.appendChild(el)
    

    drawAt(canv, board, kind, this_scale, true, FILTER, dx, dy);

}

function go() {
    if (window['setup']) {
        setup();
    }
    //remake();
    canvas = document.getElementById("canvas");
    if (canvas) {
        ctx = canvas.getContext("2d");
        dostep();
    }
    
    var circs = document.getElementsByClassName("circuit");
    var i = 0;
    function proc() {
	makeCircuit(circs[i], circs[i].getAttribute('kind'),
                    circs[i].getAttribute('dx')|0, circs[i].getAttribute('dy')|0,
                    circs[i].getAttribute('nw'), circs[i].getAttribute('sw'));
	i += 1;
	if (i < circs.length) {
	    setTimeout(proc, 50);
	}
    }
    setTimeout(proc, 100);

    if (canvas) {
        run()
    }
}

var all_timers = {}
var CLICK_COUNTER = 0;
var please_stop = [];
    
window.onload = go;

function remake() {
    var o = [];
    ["putrot90", "putrot270", "putx", "putdup", "putdup_r", "putand", "putor", "putnot_r", "putnot", "put1"].map(name => {
        var p = window[name]
        for (var x in p) {
            var tree = p[x];
            window[name][x] = tree.boomNW().boom().tick(270*16).oneside([0, 0], [270, 270], true).boomNW().boomNW();
            o.push(name+".push(FromPoints("+JSON.stringify(window[name][x].flatten())+",9))");
        }
    })
    console.log(o.join("\n"));
}
