var b_map = {}; //map for boards
var h_map = {}; //map for higher boards
var g_map = {}; //
var COUNTER = 0;
var h_map_len = 0;
var g_map_len = 0;

var cs = [0,0,0,0];
var cs2 = {}

var everything=[]

function TreeType(nw, ne, sw, se) {
    everything.push(this);
    this.level = undefined;
    this.dst = undefined;
    this.ison = undefined;
    this.guid = COUNTER++;
    this.nw=nw;
    this.ne=ne;
    this.sw=sw;
    this.se=se;
    this.flatcache0 = undefined;
    this.flatcache1 = undefined;
    this.nextptr = {};
    this.amiokay = true;
    return this;
}

TreeType.prototype.flatten = function(full) {
    //console.log('flatten',this.level,this.higher);
    if (this.level == 0) {
	//console.log(guid,"RETURNING",ison);
	if (this.higher) {
	    if (!full) {
		return this.lower.flatten();
	    } else {
		//console.log(this.lower.guid);
		if (this.lower.guid == offtrees[this.lower.level].guid) {
		    return [];
		} else {
		    return [[0,0]];
		}
	    }
	} else {
	    if (this.ison) return [[0, 0]];
	}
	return [];
    } else {
	var flatcache = full ? this.flatcache0 : this.flatcache1;
	if (flatcache) return flatcache;
	var dst = this.dst;
	var nwp = this.nw.flatten(full).map(function(x) {return [x[0],x[1]];});
	var nep = this.ne.flatten(full).map(function(x) {return [x[0]+dst,x[1]];});
	var swp = this.sw.flatten(full).map(function(x) {return [x[0],x[1]+dst];});
	var sep = this.se.flatten(full).map(function(x) {return [x[0]+dst,x[1]+dst];});
	var rs = nwp.concat(nep).concat(swp).concat(sep);
	if (full)
	    this.flatcache0 = rs;
	else
	    this.flatcache1 = rs;
	return rs;
    }
}

TreeType.prototype.max = function(dx,dy) {
    //console.log('flatten',this.level,this.higher);
    if (this.empty) return 0;
    if (this.level == 0) {
	//console.log(guid,"RETURNING",ison);
        if (this.ison) {
	    return Math.max(dx,dy)
        } else {
            return null;
        }
    } else {
        var out = 0;
        var dst = this.dst;
	out = Math.max(out, this.nw.max(dx,dy));//.map(function(x) {return [x[0],x[1]];});
	out = Math.max(out, this.ne.max(dx+dst,dy));//.map(function(x) {return [x[0]+dst,x[1]];});
	out = Math.max(out, this.sw.max(dx,dy+dst));//.map(function(x) {return [x[0],x[1]+dst];});
	out = Math.max(out, this.se.max(dx+dst,dy+dst));//.map(function(x) {return [x[0]+dst,x[1]+dst];});
        return out;
    }
}

TreeType.prototype.print = function() {
    var ff = this.flatten().map(function(x){return x[0]+":"+x[1]});
    //console.log(ff);
    var s = ""
    for (var y = 0; y < this.dst*2; y++) {
	for (var x = 0; x < this.dst*2; x++) {
	    s += ff.indexOf(x+":"+y) != -1 ? "o" : "."
	}
	s += "\n"
    }
    //console.log(s);
    return s;
}
TreeType.prototype.dot = function(x,y,kind) {
    //console.log('me',this.higher,'level',this.level);
    //console.log(x,y);
    if (this.level == 0) {
	if (this.higher) {
	    if (x > 270 || y > 270) {
		console.log("VERY BAD! CAN NOT ASSIGN LEVEL 0 AT >270 OFFSET");
	    }
	    if (typeof kind == "object") {
		return kind;
	    } else {
		var ll = this.lower.dot(x,y,kind);
		var r = HigherTree(ll);
		return r;
	    }
	} else {
	    if (x != 0 || y != 0) {
		console.log("VERY BAD! CAN NOT ASSIGN LEVEL 0 AT NON-ZERO OFFSET");
	    }
	    return kind ? ONTREE : OFFTREE;
	}
    } else {
	if (y < this.dst) {
	    if (x < this.dst) {
		return Tree(this.nw.dot(x,y,kind), this.ne, this.sw, this.se);
	    }  else {
		return Tree(this.nw, this.ne.dot(x-this.dst,y,kind), this.sw, this.se);
	    }
	} else {
	    if (x < this.dst) {
		return Tree(this.nw, this.ne, this.sw.dot(x,y-this.dst,kind), this.se);
	    }  else {
		return Tree(this.nw, this.ne, this.sw, this.se.dot(x-this.dst,y-this.dst,kind));
	    }
	}		
    }
}

function itison(x) {return x.guid == ONTREE.guid}
function tohigher(b, x, y) {
    //console.log("FULL",JSON.stringify(b.flatten()),x,y);
    var r = b.oneside([x, y], [x+270, y+270], true);
    //console.log("RR",JSON.stringify(r.flatten()),x,y);
    var pp = r.flatten().map(function(e){return [e[0]-x,e[1]-y]});
    //console.log("PP",JSON.stringify(pp),x,y);
    
    var p = FromPoints(pp,9);
    return HigherTree(p);
}

function make_lut() {

    function bitset(x, i) {
        return x & (1<<i);
    }

    var out = []
    
    for (var i = 0; i < 1<<16; i++) {
	var tnw = 0;
	var tne = 0;
	var tsw = 0;
	var tse = 0;
        
        if (bitset(i, 15)) { tnw++; }
        if (bitset(i, 14)) { tnw++; tne++ }
        if (bitset(i, 13)) { tnw++; tne++ }
        if (bitset(i, 12)) { tne++ }
        if (bitset(i, 11)) { tnw++; tsw++ }
        if (bitset(i, 10)) { tne++; tsw++; tse++ }
        if (bitset(i, 9)) { tnw++; tsw++; tse++ }
        if (bitset(i, 8)) { tne++; tse++ }
        if (bitset(i, 7)) { tnw++; tsw++ }
        if (bitset(i, 6)) { tne++; tnw++; tse++ }
        if (bitset(i, 5)) { tnw++; tsw++; tne++ }
        if (bitset(i, 4)) { tne++; tse++ }
        if (bitset(i, 3)) { tsw++; }
        if (bitset(i, 2)) { tsw++; tse++ }
        if (bitset(i, 1)) { tsw++; tse++ }
        if (bitset(i, 0)) { tse++ }
        
        var t_nw = (bitset(i, 10) && tnw == 2 || tnw == 3);
        var t_ne = (bitset(i, 9) && tne == 2 || tne == 3);
        var t_sw = (bitset(i, 6) && tsw == 2 || tsw == 3);
        var t_se = (bitset(i, 5) && tse == 2 || tse == 3);
        out.push((t_nw<<3) + (t_ne<<2) + (t_sw<<1) + t_se);
    }
    return out;
}
var LUT = make_lut();

TreeType.prototype.tick = function (count) {
    cs[this.higher?1:0] += 1;
    var doublethis = count >= (this.higher ? this.dst/270/2 : this.dst/2);
    //if (this.higher) console.log(count,doublethis);

    if ((this.level > 2 && count in this.nextptr)) return this.nextptr[count];
    if ((this.level == 2 && this.nextptr.amiokay)) return this.nextptr;

    cs[this.higher?3:2] += 1;
    if (!(this.level in cs2)) cs2[this.level] = 0;
    cs2[this.level] += 1
    if ((cs[0]+cs[1]+cs[2]+cs[3])%10000 == 0 && false) {
	/*console.log(cs[0]/cs[2]);
	console.log(JSON.stringify(cs));
	console.log(JSON.stringify(cs2))*/
	var c = 0;
	for (var x in everything) {
	    c += (everything[x].higher?1:0)
	}
	//console.log("ev",everything.length,c);
    }

    //console.log(this.level,"tick",JSON.stringify(this.flatten()),this.higher);
    //var start = performance.now();
    //if (this.higher) console.log("start level", this.level, JSON.stringify(this.flatten()));
    if (this.level == 2) {
	if (this.higher === true) {
	    //console.log("this",this.guid);
	    //var a = performance.now();
	    //console.log("")
	    //console.log("start now",this.guid,this.flatten(1));
	    var lowerfull = FromHigher(this);
	    //console.log("lower",lowerfull.guid);
	    var points = lowerfull.flatten();
	    //console.log("pts",points.length,performance.now()-a)
	    //console.log("dst",lowerfull.dst);
	    //console.log("points",JSON.stringify(points))
	    var tmp = lowerfull.tick(128);
	    //console.log("ticked",performance.now()-a)
	    var nw = tohigher(tmp,1778-1024,1778-1024);
	    var ne = tohigher(tmp,2048-1024,1778-1024);
	    var sw = tohigher(tmp,1778-1024,2048-1024);
	    var se = tohigher(tmp,2048-1024,2048-1024);
	    /*
	      console.log("nw ne sw se",JSON.stringify(nw.flatten()),
			JSON.stringify(ne.flatten()),
		       JSON.stringify(sw.flatten()),
		       JSON.stringify(se.flatten()))
		       */
	    
	    var res = Tree(nw,ne,sw,se,true);
	    //console.log("lower tick done ", performance.now()-a,':',h_map_len,':',g_map_len);
	    //console.log(res.guid,nw.guid,ne.guid,sw.guid,se.guid);
	    this.nextptr = res;
	    return res;
	} else {

	    var res = LUT[((0|this.nw.nw.ison)<<0) + 
	                  ((0|this.nw.ne.ison)<<1) + 
	                  ((0|this.ne.nw.ison)<<2) + 
	                  ((0|this.ne.ne.ison)<<3) + 
	                  ((0|this.nw.sw.ison)<<4) + 
	                  ((0|this.nw.se.ison)<<5) + 
	                  ((0|this.ne.sw.ison)<<6) + 
	                  ((0|this.ne.se.ison)<<7) + 
	                  ((0|this.sw.nw.ison)<<8) + 
	                  ((0|this.sw.ne.ison)<<9) + 
	                  ((0|this.se.nw.ison)<<10) + 
	                  ((0|this.se.ne.ison)<<11) + 
	                  ((0|this.sw.sw.ison)<<12) + 
	                  ((0|this.sw.se.ison)<<13) + 
	                  ((0|this.se.sw.ison)<<14) + 
	                  ((0|this.se.se.ison)<<15)];

	    this.nextptr = Tree(res&1 ? ONTREE : OFFTREE,
                                res&2 ? ONTREE : OFFTREE,
                                res&4 ? ONTREE : OFFTREE,
                                res&8 ? ONTREE : OFFTREE);
            
            
            /*
	    var tnw = 0;
	    var tne = 0;
	    var tsw = 0;
	    var tse = 0;
	    if (itison(this.nw.nw)) { tnw++; }
	    if (itison(this.nw.ne)) { tnw++; tne++ }
	    if (itison(this.ne.nw)) { tnw++; tne++ }
	    if (itison(this.ne.ne)) { tne++ }

	    if (itison(this.nw.sw)) { tnw++; tsw++ }
	    if (itison(this.nw.se)) { tne++; tsw++; tse++ }
	    if (itison(this.ne.sw)) { tnw++; tsw++; tse++ }
	    if (itison(this.ne.se)) { tne++; tse++ }

	    if (itison(this.sw.nw)) { tnw++; tsw++ }
	    if (itison(this.sw.ne)) { tne++; tnw++; tse++ }
	    if (itison(this.se.nw)) { tnw++; tsw++; tne++ }
	    if (itison(this.se.ne)) { tne++; tse++ }

	    if (itison(this.sw.sw)) { tsw++; }
	    if (itison(this.sw.se)) { tsw++; tse++ }
	    if (itison(this.se.sw)) { tsw++; tse++ }
	    if (itison(this.se.se)) { tse++ }
	    if (itison(this.nw.se) && tnw == 2 || tnw == 3) { 
		tnw = ONTREE; 
	    } else {
		tnw = OFFTREE;
	    }

	    if (itison(this.ne.sw) && tne == 2 || tne == 3) { 
		tne = ONTREE; 
	    } else {
		tne = OFFTREE;
	    }

	    if (itison(this.sw.ne) && tsw == 2 || tsw == 3) { 
		tsw = ONTREE; 
	    } else {
		tsw = OFFTREE;
	    }

	    if (itison(this.se.nw) && tse == 2 || tse == 3) { 
		tse = ONTREE; 
	    } else {
		tse = OFFTREE;
	    }
	    
	    this.nextptr = Tree(tnw, tne, tsw, tse);
            */
	    //time2 += performance.now()-start;
	    return this.nextptr;
	}
    }
    
    function vertical(l, r) {
	return Tree(l.ne.se, r.nw.sw,
		    l.se.ne, r.sw.nw);
    }

    function horiz(u, d) {
	return Tree(u.sw.se, u.se.sw,
		    d.nw.ne, d.ne.nw);
    }


    function verticaltick(l, r) {
	return Tree(l.ne, r.nw,
		    l.se, r.sw).tick(count);
    }

    function horiztick(u, d) {
	return Tree(u.sw, u.se,
		    d.nw, d.ne).tick(count);
    }

    //console.log("STUFF", nw, ne, sw, se);


    var x00, x01, x02, x10, x11, x12, x20, x21, x22;
    

    if (doublethis) {
        x00 = this.nw.tick(count);
	x01 = verticaltick(this.nw,this.ne);
	x02 = this.ne.tick(count);

	x10 = horiztick(this.nw, this.sw);
	x11 = Tree(this.nw.se, this.ne.sw,
		   this.sw.ne, this.se.nw).tick(count);
	x12 = horiztick(this.ne, this.se);

	x20 = this.sw.tick(count);
	x21 = verticaltick(this.sw,this.se);
	x22 = this.se.tick(count);
    } else {
	x00 = this.nw.middle();
	x01 = vertical(this.nw,this.ne);
	x02 = this.ne.middle();
	
	x10 = horiz(this.nw, this.sw);
	x11 = Tree(this.nw.se.se, this.ne.sw.sw,
		   this.sw.ne.ne, this.se.nw.nw);
	x12 = horiz(this.ne, this.se);
	
	x20 = this.sw.middle();
	x21 = vertical(this.sw,this.se);
	x22 = this.se.middle();
    }

    var res = Tree(Tree(x00, x01, x10, x11).tick(count),
		   Tree(x01, x02, x11, x12).tick(count),
		   Tree(x10, x11, x20, x21).tick(count),
		   Tree(x11, x12, x21, x22).tick(count));
    //time1 += performance.now()-start;
    this.nextptr[count] = res;
    return res;
}
var time2 = 0, time1 = 0;
TreeType.prototype.middle = function() {
    return Tree(this.nw.se, this.ne.sw,
		this.sw.ne, this.se.nw);
}
TreeType.prototype.boom = function() {
    var off = (this.higher ? higherofftrees : offtrees)[this.level-1];
    return Tree(Tree(off, off, off, this.nw),
		Tree(off, off, this.ne, off),
		Tree(off, this.sw, off, off),
		Tree(this.se, off, off, off))
}
TreeType.prototype.boomNW = function() {
    var off = (this.higher ? higherofftrees : offtrees)[this.level];
    return Tree(this, off, off, off);
}
TreeType.prototype.expand = function(size) {
    if (this.level >= size) return this;
    var off = (this.higher ? higherofftrees : offtrees)[this.level];
    return expand(Tree(this, off, off, off), size);
}
TreeType.prototype.oneside = function(bb1, bb2,isin) {
    var l = bb1[0];
    var u = bb1[1];
    var r = bb2[0];
    var d = bb2[1];
    var il = Math.max(l,0);
    var iu = Math.max(u,0);
    var ir = Math.min(r,this.dst*2);
    var id = Math.min(d,this.dst*2);
    if (il == 0 && iu == 0 && ir == this.dst*2 && id == this.dst*2) {
	return isin ? this : offtrees[this.level];
    } else if (ir <= il || id <= iu) {
	return (!isin) ? this : offtrees[this.level];
    } else {
	return Tree(this.nw.oneside([l,u], [r,d],isin), 
		    this.ne.oneside([l-this.dst,u], [r-this.dst,d],isin),
		    this.sw.oneside([l,u-this.dst], [r,d-this.dst],isin), 
		    this.se.oneside([l-this.dst,u-this.dst], [r-this.dst,d-this.dst],isin));
    }
}
TreeType.prototype.partition = function(bb1, bb2) {
    return [this.oneside(bb1,bb2,true),this.oneside(bb1,bb2,false)];
}
TreeType.prototype.merge = function(other) {
    if (this.guid == offtrees[this.level].guid || (this.higher && this.guid == higherofftrees[this.level].guid)) {
	return other;
    } else if (other.guid == offtrees[this.level].guid || (this.higher && other.guid == higherofftrees[this.level].guid)) {
	return this;
    } else if (this.guid == ontrees[this.level].guid) {
	return this;
    } else if (other.guid == ontrees[this.level].guid) {
	return other;
    } else {
	return Tree(this.nw.merge(other.nw),
		    this.ne.merge(other.ne),
		    this.sw.merge(other.sw),
		    this.se.merge(other.se));
    }
}
TreeType.prototype.move = function(dx,dy) {
    var aa = this.flatten();
    aa = aa.map(function(x) {return [x[0]+dx,x[1]+dy];});
    return FromPoints(aa,this.level);
}
TreeType.prototype.tickn = function(b,n) {
    var now = performance.now()
    var b = this;
    while (n > 0) {
	//console.log("Tick with",n);
	b = b.boom().tick(n);
	var x = 1;
	while (x <= n && x <= b.dst) x *= 2;
	n -= x/2;
    }
    //console.log(performance.now()-now);
    return b;
}


var ONTREE = new TreeType();
ONTREE.level = 0;
ONTREE.dst = 0;
ONTREE.ison = true;
var OFFTREE = new TreeType();
OFFTREE.level = 0;
OFFTREE.dst = 0;
OFFTREE.ison = false;
var offtrees = [OFFTREE];
var ontrees = [ONTREE];

function Tree(nw,ne,sw,se,higher) {
    if (nw.level == ne.level && sw.level == se.level && sw.level == nw.level) {
	// ok
    } else {
	console.log("TREES OF DIFFERENT LEVELS",nw.level,ne.level,sw.level,se.level);
	throw "VERY BAD";
    }
    higher = nw.higher;
    var htid = nw.guid+":"+ne.guid+":"+sw.guid+":"+se.guid;
    //console.log("create tree from",htid);
    if (higher) {
	if (htid in h_map) {
	    return h_map[htid];
	}
	var t = new TreeType(nw, ne, sw, se);
	t.level=(nw.level+1);
	t.higher = true;
	t.dst=Math.pow(2,nw.level)*270;
	h_map_len++;
	
	h_map[htid] = t;
    } else {
	if (htid in b_map) {
	    return b_map[htid];
	}
	var t = new TreeType(nw, ne, sw, se);
	t.level=(nw.level+1);
	t.dst=Math.pow(2,nw.level);
	
	b_map[htid] = t;
    }
    return t;
}

function HigherTree(lower) {
    //console.log("make",lower.flatten());
    if (lower.guid in g_map) return g_map[lower.guid];
    var res = new TreeType();
    res.level = 0;
    res.dst=270/2;
    res.lower = lower;
    res.higher = true;
    
    g_map_len++;
    g_map[lower.guid] = res;
    return res;
}

function FromHigher(higher) {
    
    var C = 1508;
    var r = FromPoints(higher.flatten().map(function(x){return [x[0]+C,x[1]+C]}), 
		      higher.level+10);
    
    return r;
}

function EmptyTree(depth) {
    depth += 1;
    var p = OFFTREE;
    for (var x = 1; x < depth; x++) {
	p = Tree(p, p, p, p);
        p.empty = true;
	offtrees[x] = p;
    }
    return p;
}

function FullTree(depth) {
    depth += 1;
    var p = ONTREE;
    for (var x = 1; x < depth; x++) {
	p = Tree(p, p, p, p);
	ontrees[x] = p;
    }
    return p;
}


EmptyTree(30);
FullTree(30);


var HIGHERONTREE = new TreeType();
HIGHERONTREE.level = 0;
HIGHERONTREE.dst = 270/2;
HIGHERONTREE.lower = ontrees[9]
HIGHERONTREE.higher = true;
var HIGHEROFFTREE = new TreeType();
HIGHEROFFTREE.level = 0;
HIGHEROFFTREE.dst = 270/2;
HIGHEROFFTREE.lower = offtrees[9];
HIGHEROFFTREE.higher = true;
var higherofftrees = [HIGHEROFFTREE];
var higherontrees = [HIGHERONTREE];


function HigherEmptyTree(depth) {
    depth += 1;
    var p = HIGHEROFFTREE;
    for (var x = 1; x < depth; x++) {
	p = Tree(p, p, p, p, true);
	higherofftrees[x] = p;
    }
    return p;
}

function HigherFullTree(depth) {
    depth += 1;
    var p = HIGHERONTREE;
    for (var x = 1; x < depth; x++) {
	p = Tree(p, p, p, p, true);
	higherontrees[x] = p;
    }
    return p;
}


HigherEmptyTree(8);
HigherFullTree(8);

/*
function FlatBoard() {
    this.grid = {};
    return this;
}

FlatBoard.prototype.dot = function(x,y,kind) {
    var k = x+":"+y;
    if (k in this.grid) {
	delete this.grid[k];
    } else {
	this.grid[k] = kind;
    }
}

FlatBoard.prototype.copy = function() {
    var r = new FlatBoard();
    for (var x in this.grid) {
	r[x] = true;
    }
    return r;
}

FlatBoard.prototype.tree = function() {
    var max = 0;
    for (var k in this.grid) {
	var x = k.split();
	if (parseInt(x[0]) > max) x = parseInt(x[0]);
	if (parseInt(x[1]) > max) x = parseInt(x[1]);
    }
    console.log("max is
}
*/

function FromPoints(points, size) {
    if (points.length == 0) {
	return offtrees[size];
    }
    if (size == 0) {
	if (points.length > 1)
            throw "SIZE GREATER THAN ONE";
	if (points[0][0] != 0) throw "X NOT 0";
	if (points[0][1] != 0) throw "Y NOT 0";
	return ONTREE;
    } else {
	var d = Math.pow(2,size-1);
	//console.log("Split",size);
	var nw = [], ne = [], sw = [], se = [];
	for (var p in points) {
	    var x = points[p][0];
	    var y = points[p][1];
	    if (y < d) {
		if (x < d) {
		    nw.push([x,y]);
		} else {
		    ne.push([x-d,y]);
		}
	    } else {
		if (x < d) {
		    sw.push([x,y-d]);
		} else {
		    se.push([x-d,y-d]);
		}
	    }
	}
	return Tree(FromPoints(nw, size-1), FromPoints(ne, size-1),
		    FromPoints(sw, size-1), FromPoints(se, size-1));
    }
}
