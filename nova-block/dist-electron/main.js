import { BrowserWindow as e, app as t, ipcMain as n, net as r, protocol as i } from "electron";
import a from "node:path";
import o from "node:fs/promises";
import { fileURLToPath as s, pathToFileURL as c } from "node:url";
import { watch as l } from "node:fs";
//#region node_modules/js-yaml/dist/js-yaml.mjs
function u(e) {
	return e == null;
}
function d(e) {
	return typeof e == "object" && !!e;
}
function f(e) {
	return Array.isArray(e) ? e : u(e) ? [] : [e];
}
function p(e, t) {
	var n, r, i, a;
	if (t) for (a = Object.keys(t), n = 0, r = a.length; n < r; n += 1) i = a[n], e[i] = t[i];
	return e;
}
function m(e, t) {
	var n = "", r;
	for (r = 0; r < t; r += 1) n += e;
	return n;
}
function h(e) {
	return e === 0 && 1 / e == -Infinity;
}
var g = {
	isNothing: u,
	isObject: d,
	toArray: f,
	repeat: m,
	isNegativeZero: h,
	extend: p
};
function _(e, t) {
	var n = "", r = e.reason || "(unknown reason)";
	return e.mark ? (e.mark.name && (n += "in \"" + e.mark.name + "\" "), n += "(" + (e.mark.line + 1) + ":" + (e.mark.column + 1) + ")", !t && e.mark.snippet && (n += "\n\n" + e.mark.snippet), r + " " + n) : r;
}
function v(e, t) {
	Error.call(this), this.name = "YAMLException", this.reason = e, this.mark = t, this.message = _(this, !1), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = (/* @__PURE__ */ Error()).stack || "";
}
v.prototype = Object.create(Error.prototype), v.prototype.constructor = v, v.prototype.toString = function(e) {
	return this.name + ": " + _(this, e);
};
var y = v;
function b(e, t, n, r, i) {
	var a = "", o = "", s = Math.floor(i / 2) - 1;
	return r - t > s && (a = " ... ", t = r - s + a.length), n - r > s && (o = " ...", n = r + s - o.length), {
		str: a + e.slice(t, n).replace(/\t/g, "→") + o,
		pos: r - t + a.length
	};
}
function ee(e, t) {
	return g.repeat(" ", t - e.length) + e;
}
function te(e, t) {
	if (t = Object.create(t || null), !e.buffer) return null;
	t.maxLength ||= 79, typeof t.indent != "number" && (t.indent = 1), typeof t.linesBefore != "number" && (t.linesBefore = 3), typeof t.linesAfter != "number" && (t.linesAfter = 2);
	for (var n = /\r?\n|\r|\0/g, r = [0], i = [], a, o = -1; a = n.exec(e.buffer);) i.push(a.index), r.push(a.index + a[0].length), e.position <= a.index && o < 0 && (o = r.length - 2);
	o < 0 && (o = r.length - 1);
	var s = "", c, l, u = Math.min(e.line + t.linesAfter, i.length).toString().length, d = t.maxLength - (t.indent + u + 3);
	for (c = 1; c <= t.linesBefore && !(o - c < 0); c++) l = b(e.buffer, r[o - c], i[o - c], e.position - (r[o] - r[o - c]), d), s = g.repeat(" ", t.indent) + ee((e.line - c + 1).toString(), u) + " | " + l.str + "\n" + s;
	for (l = b(e.buffer, r[o], i[o], e.position, d), s += g.repeat(" ", t.indent) + ee((e.line + 1).toString(), u) + " | " + l.str + "\n", s += g.repeat("-", t.indent + u + 3 + l.pos) + "^\n", c = 1; c <= t.linesAfter && !(o + c >= i.length); c++) l = b(e.buffer, r[o + c], i[o + c], e.position - (r[o] - r[o + c]), d), s += g.repeat(" ", t.indent) + ee((e.line + c + 1).toString(), u) + " | " + l.str + "\n";
	return s.replace(/\n$/, "");
}
var ne = te, re = [
	"kind",
	"multi",
	"resolve",
	"construct",
	"instanceOf",
	"predicate",
	"represent",
	"representName",
	"defaultStyle",
	"styleAliases"
], ie = [
	"scalar",
	"sequence",
	"mapping"
];
function ae(e) {
	var t = {};
	return e !== null && Object.keys(e).forEach(function(n) {
		e[n].forEach(function(e) {
			t[String(e)] = n;
		});
	}), t;
}
function oe(e, t) {
	if (t ||= {}, Object.keys(t).forEach(function(t) {
		if (re.indexOf(t) === -1) throw new y("Unknown option \"" + t + "\" is met in definition of \"" + e + "\" YAML type.");
	}), this.options = t, this.tag = e, this.kind = t.kind || null, this.resolve = t.resolve || function() {
		return !0;
	}, this.construct = t.construct || function(e) {
		return e;
	}, this.instanceOf = t.instanceOf || null, this.predicate = t.predicate || null, this.represent = t.represent || null, this.representName = t.representName || null, this.defaultStyle = t.defaultStyle || null, this.multi = t.multi || !1, this.styleAliases = ae(t.styleAliases || null), ie.indexOf(this.kind) === -1) throw new y("Unknown kind \"" + this.kind + "\" is specified for \"" + e + "\" YAML type.");
}
var x = oe;
function se(e, t) {
	var n = [];
	return e[t].forEach(function(e) {
		var t = n.length;
		n.forEach(function(n, r) {
			n.tag === e.tag && n.kind === e.kind && n.multi === e.multi && (t = r);
		}), n[t] = e;
	}), n;
}
function ce() {
	var e = {
		scalar: {},
		sequence: {},
		mapping: {},
		fallback: {},
		multi: {
			scalar: [],
			sequence: [],
			mapping: [],
			fallback: []
		}
	}, t, n;
	function r(t) {
		t.multi ? (e.multi[t.kind].push(t), e.multi.fallback.push(t)) : e[t.kind][t.tag] = e.fallback[t.tag] = t;
	}
	for (t = 0, n = arguments.length; t < n; t += 1) arguments[t].forEach(r);
	return e;
}
function le(e) {
	return this.extend(e);
}
le.prototype.extend = function(e) {
	var t = [], n = [];
	if (e instanceof x) n.push(e);
	else if (Array.isArray(e)) n = n.concat(e);
	else if (e && (Array.isArray(e.implicit) || Array.isArray(e.explicit))) e.implicit && (t = t.concat(e.implicit)), e.explicit && (n = n.concat(e.explicit));
	else throw new y("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
	t.forEach(function(e) {
		if (!(e instanceof x)) throw new y("Specified list of YAML types (or a single Type object) contains a non-Type object.");
		if (e.loadKind && e.loadKind !== "scalar") throw new y("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
		if (e.multi) throw new y("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
	}), n.forEach(function(e) {
		if (!(e instanceof x)) throw new y("Specified list of YAML types (or a single Type object) contains a non-Type object.");
	});
	var r = Object.create(le.prototype);
	return r.implicit = (this.implicit || []).concat(t), r.explicit = (this.explicit || []).concat(n), r.compiledImplicit = se(r, "implicit"), r.compiledExplicit = se(r, "explicit"), r.compiledTypeMap = ce(r.compiledImplicit, r.compiledExplicit), r;
};
var ue = le, de = new x("tag:yaml.org,2002:str", {
	kind: "scalar",
	construct: function(e) {
		return e === null ? "" : e;
	}
}), fe = new x("tag:yaml.org,2002:seq", {
	kind: "sequence",
	construct: function(e) {
		return e === null ? [] : e;
	}
}), pe = new x("tag:yaml.org,2002:map", {
	kind: "mapping",
	construct: function(e) {
		return e === null ? {} : e;
	}
}), me = new ue({ explicit: [
	de,
	fe,
	pe
] });
function he(e) {
	if (e === null) return !0;
	var t = e.length;
	return t === 1 && e === "~" || t === 4 && (e === "null" || e === "Null" || e === "NULL");
}
function ge() {
	return null;
}
function _e(e) {
	return e === null;
}
var ve = new x("tag:yaml.org,2002:null", {
	kind: "scalar",
	resolve: he,
	construct: ge,
	predicate: _e,
	represent: {
		canonical: function() {
			return "~";
		},
		lowercase: function() {
			return "null";
		},
		uppercase: function() {
			return "NULL";
		},
		camelcase: function() {
			return "Null";
		},
		empty: function() {
			return "";
		}
	},
	defaultStyle: "lowercase"
});
function ye(e) {
	if (e === null) return !1;
	var t = e.length;
	return t === 4 && (e === "true" || e === "True" || e === "TRUE") || t === 5 && (e === "false" || e === "False" || e === "FALSE");
}
function be(e) {
	return e === "true" || e === "True" || e === "TRUE";
}
function xe(e) {
	return Object.prototype.toString.call(e) === "[object Boolean]";
}
var Se = new x("tag:yaml.org,2002:bool", {
	kind: "scalar",
	resolve: ye,
	construct: be,
	predicate: xe,
	represent: {
		lowercase: function(e) {
			return e ? "true" : "false";
		},
		uppercase: function(e) {
			return e ? "TRUE" : "FALSE";
		},
		camelcase: function(e) {
			return e ? "True" : "False";
		}
	},
	defaultStyle: "lowercase"
});
function Ce(e) {
	return 48 <= e && e <= 57 || 65 <= e && e <= 70 || 97 <= e && e <= 102;
}
function we(e) {
	return 48 <= e && e <= 55;
}
function Te(e) {
	return 48 <= e && e <= 57;
}
function Ee(e) {
	if (e === null) return !1;
	var t = e.length, n = 0, r = !1, i;
	if (!t) return !1;
	if (i = e[n], (i === "-" || i === "+") && (i = e[++n]), i === "0") {
		if (n + 1 === t) return !0;
		if (i = e[++n], i === "b") {
			for (n++; n < t; n++) if (i = e[n], i !== "_") {
				if (i !== "0" && i !== "1") return !1;
				r = !0;
			}
			return r && i !== "_";
		}
		if (i === "x") {
			for (n++; n < t; n++) if (i = e[n], i !== "_") {
				if (!Ce(e.charCodeAt(n))) return !1;
				r = !0;
			}
			return r && i !== "_";
		}
		if (i === "o") {
			for (n++; n < t; n++) if (i = e[n], i !== "_") {
				if (!we(e.charCodeAt(n))) return !1;
				r = !0;
			}
			return r && i !== "_";
		}
	}
	if (i === "_") return !1;
	for (; n < t; n++) if (i = e[n], i !== "_") {
		if (!Te(e.charCodeAt(n))) return !1;
		r = !0;
	}
	return !(!r || i === "_");
}
function De(e) {
	var t = e, n = 1, r;
	if (t.indexOf("_") !== -1 && (t = t.replace(/_/g, "")), r = t[0], (r === "-" || r === "+") && (r === "-" && (n = -1), t = t.slice(1), r = t[0]), t === "0") return 0;
	if (r === "0") {
		if (t[1] === "b") return n * parseInt(t.slice(2), 2);
		if (t[1] === "x") return n * parseInt(t.slice(2), 16);
		if (t[1] === "o") return n * parseInt(t.slice(2), 8);
	}
	return n * parseInt(t, 10);
}
function Oe(e) {
	return Object.prototype.toString.call(e) === "[object Number]" && e % 1 == 0 && !g.isNegativeZero(e);
}
var ke = new x("tag:yaml.org,2002:int", {
	kind: "scalar",
	resolve: Ee,
	construct: De,
	predicate: Oe,
	represent: {
		binary: function(e) {
			return e >= 0 ? "0b" + e.toString(2) : "-0b" + e.toString(2).slice(1);
		},
		octal: function(e) {
			return e >= 0 ? "0o" + e.toString(8) : "-0o" + e.toString(8).slice(1);
		},
		decimal: function(e) {
			return e.toString(10);
		},
		hexadecimal: function(e) {
			return e >= 0 ? "0x" + e.toString(16).toUpperCase() : "-0x" + e.toString(16).toUpperCase().slice(1);
		}
	},
	defaultStyle: "decimal",
	styleAliases: {
		binary: [2, "bin"],
		octal: [8, "oct"],
		decimal: [10, "dec"],
		hexadecimal: [16, "hex"]
	}
}), Ae = /* @__PURE__ */ RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function je(e) {
	return !(e === null || !Ae.test(e) || e[e.length - 1] === "_");
}
function Me(e) {
	var t = e.replace(/_/g, "").toLowerCase(), n = t[0] === "-" ? -1 : 1;
	return "+-".indexOf(t[0]) >= 0 && (t = t.slice(1)), t === ".inf" ? n === 1 ? Infinity : -Infinity : t === ".nan" ? NaN : n * parseFloat(t, 10);
}
var Ne = /^[-+]?[0-9]+e/;
function Pe(e, t) {
	var n;
	if (isNaN(e)) switch (t) {
		case "lowercase": return ".nan";
		case "uppercase": return ".NAN";
		case "camelcase": return ".NaN";
	}
	else if (e === Infinity) switch (t) {
		case "lowercase": return ".inf";
		case "uppercase": return ".INF";
		case "camelcase": return ".Inf";
	}
	else if (e === -Infinity) switch (t) {
		case "lowercase": return "-.inf";
		case "uppercase": return "-.INF";
		case "camelcase": return "-.Inf";
	}
	else if (g.isNegativeZero(e)) return "-0.0";
	return n = e.toString(10), Ne.test(n) ? n.replace("e", ".e") : n;
}
function Fe(e) {
	return Object.prototype.toString.call(e) === "[object Number]" && (e % 1 != 0 || g.isNegativeZero(e));
}
var Ie = new x("tag:yaml.org,2002:float", {
	kind: "scalar",
	resolve: je,
	construct: Me,
	predicate: Fe,
	represent: Pe,
	defaultStyle: "lowercase"
}), Le = me.extend({ implicit: [
	ve,
	Se,
	ke,
	Ie
] }), Re = Le, ze = /* @__PURE__ */ RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"), Be = /* @__PURE__ */ RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function Ve(e) {
	return e === null ? !1 : ze.exec(e) !== null || Be.exec(e) !== null;
}
function He(e) {
	var t, n, r, i, a, o, s, c = 0, l = null, u, d, f;
	if (t = ze.exec(e), t === null && (t = Be.exec(e)), t === null) throw Error("Date resolve error");
	if (n = +t[1], r = t[2] - 1, i = +t[3], !t[4]) return new Date(Date.UTC(n, r, i));
	if (a = +t[4], o = +t[5], s = +t[6], t[7]) {
		for (c = t[7].slice(0, 3); c.length < 3;) c += "0";
		c = +c;
	}
	return t[9] && (u = +t[10], d = +(t[11] || 0), l = (u * 60 + d) * 6e4, t[9] === "-" && (l = -l)), f = new Date(Date.UTC(n, r, i, a, o, s, c)), l && f.setTime(f.getTime() - l), f;
}
function Ue(e) {
	return e.toISOString();
}
var We = new x("tag:yaml.org,2002:timestamp", {
	kind: "scalar",
	resolve: Ve,
	construct: He,
	instanceOf: Date,
	represent: Ue
});
function Ge(e) {
	return e === "<<" || e === null;
}
var Ke = new x("tag:yaml.org,2002:merge", {
	kind: "scalar",
	resolve: Ge
}), qe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function Je(e) {
	if (e === null) return !1;
	var t, n, r = 0, i = e.length, a = qe;
	for (n = 0; n < i; n++) if (t = a.indexOf(e.charAt(n)), !(t > 64)) {
		if (t < 0) return !1;
		r += 6;
	}
	return r % 8 == 0;
}
function Ye(e) {
	var t, n, r = e.replace(/[\r\n=]/g, ""), i = r.length, a = qe, o = 0, s = [];
	for (t = 0; t < i; t++) t % 4 == 0 && t && (s.push(o >> 16 & 255), s.push(o >> 8 & 255), s.push(o & 255)), o = o << 6 | a.indexOf(r.charAt(t));
	return n = i % 4 * 6, n === 0 ? (s.push(o >> 16 & 255), s.push(o >> 8 & 255), s.push(o & 255)) : n === 18 ? (s.push(o >> 10 & 255), s.push(o >> 2 & 255)) : n === 12 && s.push(o >> 4 & 255), new Uint8Array(s);
}
function Xe(e) {
	var t = "", n = 0, r, i, a = e.length, o = qe;
	for (r = 0; r < a; r++) r % 3 == 0 && r && (t += o[n >> 18 & 63], t += o[n >> 12 & 63], t += o[n >> 6 & 63], t += o[n & 63]), n = (n << 8) + e[r];
	return i = a % 3, i === 0 ? (t += o[n >> 18 & 63], t += o[n >> 12 & 63], t += o[n >> 6 & 63], t += o[n & 63]) : i === 2 ? (t += o[n >> 10 & 63], t += o[n >> 4 & 63], t += o[n << 2 & 63], t += o[64]) : i === 1 && (t += o[n >> 2 & 63], t += o[n << 4 & 63], t += o[64], t += o[64]), t;
}
function Ze(e) {
	return Object.prototype.toString.call(e) === "[object Uint8Array]";
}
var Qe = new x("tag:yaml.org,2002:binary", {
	kind: "scalar",
	resolve: Je,
	construct: Ye,
	predicate: Ze,
	represent: Xe
}), $e = Object.prototype.hasOwnProperty, et = Object.prototype.toString;
function tt(e) {
	if (e === null) return !0;
	var t = [], n, r, i, a, o, s = e;
	for (n = 0, r = s.length; n < r; n += 1) {
		if (i = s[n], o = !1, et.call(i) !== "[object Object]") return !1;
		for (a in i) if ($e.call(i, a)) if (!o) o = !0;
		else return !1;
		if (!o) return !1;
		if (t.indexOf(a) === -1) t.push(a);
		else return !1;
	}
	return !0;
}
function nt(e) {
	return e === null ? [] : e;
}
var rt = new x("tag:yaml.org,2002:omap", {
	kind: "sequence",
	resolve: tt,
	construct: nt
}), it = Object.prototype.toString;
function at(e) {
	if (e === null) return !0;
	var t, n, r, i, a, o = e;
	for (a = Array(o.length), t = 0, n = o.length; t < n; t += 1) {
		if (r = o[t], it.call(r) !== "[object Object]" || (i = Object.keys(r), i.length !== 1)) return !1;
		a[t] = [i[0], r[i[0]]];
	}
	return !0;
}
function ot(e) {
	if (e === null) return [];
	var t, n, r, i, a, o = e;
	for (a = Array(o.length), t = 0, n = o.length; t < n; t += 1) r = o[t], i = Object.keys(r), a[t] = [i[0], r[i[0]]];
	return a;
}
var st = new x("tag:yaml.org,2002:pairs", {
	kind: "sequence",
	resolve: at,
	construct: ot
}), ct = Object.prototype.hasOwnProperty;
function lt(e) {
	if (e === null) return !0;
	var t, n = e;
	for (t in n) if (ct.call(n, t) && n[t] !== null) return !1;
	return !0;
}
function ut(e) {
	return e === null ? {} : e;
}
var dt = new x("tag:yaml.org,2002:set", {
	kind: "mapping",
	resolve: lt,
	construct: ut
}), ft = Re.extend({
	implicit: [We, Ke],
	explicit: [
		Qe,
		rt,
		st,
		dt
	]
}), S = Object.prototype.hasOwnProperty, C = 1, pt = 2, mt = 3, w = 4, ht = 1, gt = 2, _t = 3, vt = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, yt = /[\x85\u2028\u2029]/, bt = /[,\[\]\{\}]/, xt = /^(?:!|!!|![a-z\-]+!)$/i, St = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function Ct(e) {
	return Object.prototype.toString.call(e);
}
function T(e) {
	return e === 10 || e === 13;
}
function E(e) {
	return e === 9 || e === 32;
}
function D(e) {
	return e === 9 || e === 32 || e === 10 || e === 13;
}
function O(e) {
	return e === 44 || e === 91 || e === 93 || e === 123 || e === 125;
}
function wt(e) {
	var t;
	return 48 <= e && e <= 57 ? e - 48 : (t = e | 32, 97 <= t && t <= 102 ? t - 97 + 10 : -1);
}
function Tt(e) {
	return e === 120 ? 2 : e === 117 ? 4 : e === 85 ? 8 : 0;
}
function Et(e) {
	return 48 <= e && e <= 57 ? e - 48 : -1;
}
function Dt(e) {
	return e === 48 ? "\0" : e === 97 ? "\x07" : e === 98 ? "\b" : e === 116 || e === 9 ? "	" : e === 110 ? "\n" : e === 118 ? "\v" : e === 102 ? "\f" : e === 114 ? "\r" : e === 101 ? "\x1B" : e === 32 ? " " : e === 34 ? "\"" : e === 47 ? "/" : e === 92 ? "\\" : e === 78 ? "" : e === 95 ? "\xA0" : e === 76 ? "\u2028" : e === 80 ? "\u2029" : "";
}
function Ot(e) {
	return e <= 65535 ? String.fromCharCode(e) : String.fromCharCode((e - 65536 >> 10) + 55296, (e - 65536 & 1023) + 56320);
}
function kt(e, t, n) {
	t === "__proto__" ? Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !0,
		writable: !0,
		value: n
	}) : e[t] = n;
}
for (var At = Array(256), jt = Array(256), k = 0; k < 256; k++) At[k] = +!!Dt(k), jt[k] = Dt(k);
function Mt(e, t) {
	this.input = e, this.filename = t.filename || null, this.schema = t.schema || ft, this.onWarning = t.onWarning || null, this.legacy = t.legacy || !1, this.json = t.json || !1, this.listener = t.listener || null, this.implicitTypes = this.schema.compiledImplicit, this.typeMap = this.schema.compiledTypeMap, this.length = e.length, this.position = 0, this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.firstTabInLine = -1, this.documents = [];
}
function Nt(e, t) {
	var n = {
		name: e.filename,
		buffer: e.input.slice(0, -1),
		position: e.position,
		line: e.line,
		column: e.position - e.lineStart
	};
	return n.snippet = ne(n), new y(t, n);
}
function A(e, t) {
	throw Nt(e, t);
}
function j(e, t) {
	e.onWarning && e.onWarning.call(null, Nt(e, t));
}
var Pt = {
	YAML: function(e, t, n) {
		var r, i, a;
		e.version !== null && A(e, "duplication of %YAML directive"), n.length !== 1 && A(e, "YAML directive accepts exactly one argument"), r = /^([0-9]+)\.([0-9]+)$/.exec(n[0]), r === null && A(e, "ill-formed argument of the YAML directive"), i = parseInt(r[1], 10), a = parseInt(r[2], 10), i !== 1 && A(e, "unacceptable YAML version of the document"), e.version = n[0], e.checkLineBreaks = a < 2, a !== 1 && a !== 2 && j(e, "unsupported YAML version of the document");
	},
	TAG: function(e, t, n) {
		var r, i;
		n.length !== 2 && A(e, "TAG directive accepts exactly two arguments"), r = n[0], i = n[1], xt.test(r) || A(e, "ill-formed tag handle (first argument) of the TAG directive"), S.call(e.tagMap, r) && A(e, "there is a previously declared suffix for \"" + r + "\" tag handle"), St.test(i) || A(e, "ill-formed tag prefix (second argument) of the TAG directive");
		try {
			i = decodeURIComponent(i);
		} catch {
			A(e, "tag prefix is malformed: " + i);
		}
		e.tagMap[r] = i;
	}
};
function M(e, t, n, r) {
	var i, a, o, s;
	if (t < n) {
		if (s = e.input.slice(t, n), r) for (i = 0, a = s.length; i < a; i += 1) o = s.charCodeAt(i), o === 9 || 32 <= o && o <= 1114111 || A(e, "expected valid JSON character");
		else vt.test(s) && A(e, "the stream contains non-printable characters");
		e.result += s;
	}
}
function Ft(e, t, n, r) {
	var i, a, o, s;
	for (g.isObject(n) || A(e, "cannot merge mappings; the provided source object is unacceptable"), i = Object.keys(n), o = 0, s = i.length; o < s; o += 1) a = i[o], S.call(t, a) || (kt(t, a, n[a]), r[a] = !0);
}
function N(e, t, n, r, i, a, o, s, c) {
	var l, u;
	if (Array.isArray(i)) for (i = Array.prototype.slice.call(i), l = 0, u = i.length; l < u; l += 1) Array.isArray(i[l]) && A(e, "nested arrays are not supported inside keys"), typeof i == "object" && Ct(i[l]) === "[object Object]" && (i[l] = "[object Object]");
	if (typeof i == "object" && Ct(i) === "[object Object]" && (i = "[object Object]"), i = String(i), t === null && (t = {}), r === "tag:yaml.org,2002:merge") if (Array.isArray(a)) for (l = 0, u = a.length; l < u; l += 1) Ft(e, t, a[l], n);
	else Ft(e, t, a, n);
	else !e.json && !S.call(n, i) && S.call(t, i) && (e.line = o || e.line, e.lineStart = s || e.lineStart, e.position = c || e.position, A(e, "duplicated mapping key")), kt(t, i, a), delete n[i];
	return t;
}
function P(e) {
	var t = e.input.charCodeAt(e.position);
	t === 10 ? e.position++ : t === 13 ? (e.position++, e.input.charCodeAt(e.position) === 10 && e.position++) : A(e, "a line break is expected"), e.line += 1, e.lineStart = e.position, e.firstTabInLine = -1;
}
function F(e, t, n) {
	for (var r = 0, i = e.input.charCodeAt(e.position); i !== 0;) {
		for (; E(i);) i === 9 && e.firstTabInLine === -1 && (e.firstTabInLine = e.position), i = e.input.charCodeAt(++e.position);
		if (t && i === 35) do
			i = e.input.charCodeAt(++e.position);
		while (i !== 10 && i !== 13 && i !== 0);
		if (T(i)) for (P(e), i = e.input.charCodeAt(e.position), r++, e.lineIndent = 0; i === 32;) e.lineIndent++, i = e.input.charCodeAt(++e.position);
		else break;
	}
	return n !== -1 && r !== 0 && e.lineIndent < n && j(e, "deficient indentation"), r;
}
function I(e) {
	var t = e.position, n = e.input.charCodeAt(t);
	return !!((n === 45 || n === 46) && n === e.input.charCodeAt(t + 1) && n === e.input.charCodeAt(t + 2) && (t += 3, n = e.input.charCodeAt(t), n === 0 || D(n)));
}
function L(e, t) {
	t === 1 ? e.result += " " : t > 1 && (e.result += g.repeat("\n", t - 1));
}
function It(e, t, n) {
	var r, i, a, o, s, c, l, u, d = e.kind, f = e.result, p = e.input.charCodeAt(e.position);
	if (D(p) || O(p) || p === 35 || p === 38 || p === 42 || p === 33 || p === 124 || p === 62 || p === 39 || p === 34 || p === 37 || p === 64 || p === 96 || (p === 63 || p === 45) && (i = e.input.charCodeAt(e.position + 1), D(i) || n && O(i))) return !1;
	for (e.kind = "scalar", e.result = "", a = o = e.position, s = !1; p !== 0;) {
		if (p === 58) {
			if (i = e.input.charCodeAt(e.position + 1), D(i) || n && O(i)) break;
		} else if (p === 35) {
			if (r = e.input.charCodeAt(e.position - 1), D(r)) break;
		} else if (e.position === e.lineStart && I(e) || n && O(p)) break;
		else if (T(p)) if (c = e.line, l = e.lineStart, u = e.lineIndent, F(e, !1, -1), e.lineIndent >= t) {
			s = !0, p = e.input.charCodeAt(e.position);
			continue;
		} else {
			e.position = o, e.line = c, e.lineStart = l, e.lineIndent = u;
			break;
		}
		s &&= (M(e, a, o, !1), L(e, e.line - c), a = o = e.position, !1), E(p) || (o = e.position + 1), p = e.input.charCodeAt(++e.position);
	}
	return M(e, a, o, !1), e.result ? !0 : (e.kind = d, e.result = f, !1);
}
function Lt(e, t) {
	var n = e.input.charCodeAt(e.position), r, i;
	if (n !== 39) return !1;
	for (e.kind = "scalar", e.result = "", e.position++, r = i = e.position; (n = e.input.charCodeAt(e.position)) !== 0;) if (n === 39) if (M(e, r, e.position, !0), n = e.input.charCodeAt(++e.position), n === 39) r = e.position, e.position++, i = e.position;
	else return !0;
	else T(n) ? (M(e, r, i, !0), L(e, F(e, !1, t)), r = i = e.position) : e.position === e.lineStart && I(e) ? A(e, "unexpected end of the document within a single quoted scalar") : (e.position++, i = e.position);
	A(e, "unexpected end of the stream within a single quoted scalar");
}
function Rt(e, t) {
	var n, r, i, a, o, s = e.input.charCodeAt(e.position);
	if (s !== 34) return !1;
	for (e.kind = "scalar", e.result = "", e.position++, n = r = e.position; (s = e.input.charCodeAt(e.position)) !== 0;) if (s === 34) return M(e, n, e.position, !0), e.position++, !0;
	else if (s === 92) {
		if (M(e, n, e.position, !0), s = e.input.charCodeAt(++e.position), T(s)) F(e, !1, t);
		else if (s < 256 && At[s]) e.result += jt[s], e.position++;
		else if ((o = Tt(s)) > 0) {
			for (i = o, a = 0; i > 0; i--) s = e.input.charCodeAt(++e.position), (o = wt(s)) >= 0 ? a = (a << 4) + o : A(e, "expected hexadecimal character");
			e.result += Ot(a), e.position++;
		} else A(e, "unknown escape sequence");
		n = r = e.position;
	} else T(s) ? (M(e, n, r, !0), L(e, F(e, !1, t)), n = r = e.position) : e.position === e.lineStart && I(e) ? A(e, "unexpected end of the document within a double quoted scalar") : (e.position++, r = e.position);
	A(e, "unexpected end of the stream within a double quoted scalar");
}
function zt(e, t) {
	var n = !0, r, i, a, o = e.tag, s, c = e.anchor, l, u, d, f, p, m = Object.create(null), h, g, _, v = e.input.charCodeAt(e.position);
	if (v === 91) u = 93, p = !1, s = [];
	else if (v === 123) u = 125, p = !0, s = {};
	else return !1;
	for (e.anchor !== null && (e.anchorMap[e.anchor] = s), v = e.input.charCodeAt(++e.position); v !== 0;) {
		if (F(e, !0, t), v = e.input.charCodeAt(e.position), v === u) return e.position++, e.tag = o, e.anchor = c, e.kind = p ? "mapping" : "sequence", e.result = s, !0;
		n ? v === 44 && A(e, "expected the node content, but found ','") : A(e, "missed comma between flow collection entries"), g = h = _ = null, d = f = !1, v === 63 && (l = e.input.charCodeAt(e.position + 1), D(l) && (d = f = !0, e.position++, F(e, !0, t))), r = e.line, i = e.lineStart, a = e.position, R(e, t, C, !1, !0), g = e.tag, h = e.result, F(e, !0, t), v = e.input.charCodeAt(e.position), (f || e.line === r) && v === 58 && (d = !0, v = e.input.charCodeAt(++e.position), F(e, !0, t), R(e, t, C, !1, !0), _ = e.result), p ? N(e, s, m, g, h, _, r, i, a) : d ? s.push(N(e, null, m, g, h, _, r, i, a)) : s.push(h), F(e, !0, t), v = e.input.charCodeAt(e.position), v === 44 ? (n = !0, v = e.input.charCodeAt(++e.position)) : n = !1;
	}
	A(e, "unexpected end of the stream within a flow collection");
}
function Bt(e, t) {
	var n, r, i = ht, a = !1, o = !1, s = t, c = 0, l = !1, u, d = e.input.charCodeAt(e.position);
	if (d === 124) r = !1;
	else if (d === 62) r = !0;
	else return !1;
	for (e.kind = "scalar", e.result = ""; d !== 0;) if (d = e.input.charCodeAt(++e.position), d === 43 || d === 45) ht === i ? i = d === 43 ? _t : gt : A(e, "repeat of a chomping mode identifier");
	else if ((u = Et(d)) >= 0) u === 0 ? A(e, "bad explicit indentation width of a block scalar; it cannot be less than one") : o ? A(e, "repeat of an indentation width identifier") : (s = t + u - 1, o = !0);
	else break;
	if (E(d)) {
		do
			d = e.input.charCodeAt(++e.position);
		while (E(d));
		if (d === 35) do
			d = e.input.charCodeAt(++e.position);
		while (!T(d) && d !== 0);
	}
	for (; d !== 0;) {
		for (P(e), e.lineIndent = 0, d = e.input.charCodeAt(e.position); (!o || e.lineIndent < s) && d === 32;) e.lineIndent++, d = e.input.charCodeAt(++e.position);
		if (!o && e.lineIndent > s && (s = e.lineIndent), T(d)) {
			c++;
			continue;
		}
		if (e.lineIndent < s) {
			i === _t ? e.result += g.repeat("\n", a ? 1 + c : c) : i === ht && a && (e.result += "\n");
			break;
		}
		for (r ? E(d) ? (l = !0, e.result += g.repeat("\n", a ? 1 + c : c)) : l ? (l = !1, e.result += g.repeat("\n", c + 1)) : c === 0 ? a && (e.result += " ") : e.result += g.repeat("\n", c) : e.result += g.repeat("\n", a ? 1 + c : c), a = !0, o = !0, c = 0, n = e.position; !T(d) && d !== 0;) d = e.input.charCodeAt(++e.position);
		M(e, n, e.position, !1);
	}
	return !0;
}
function Vt(e, t) {
	var n, r = e.tag, i = e.anchor, a = [], o, s = !1, c;
	if (e.firstTabInLine !== -1) return !1;
	for (e.anchor !== null && (e.anchorMap[e.anchor] = a), c = e.input.charCodeAt(e.position); c !== 0 && (e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, A(e, "tab characters must not be used in indentation")), !(c !== 45 || (o = e.input.charCodeAt(e.position + 1), !D(o))));) {
		if (s = !0, e.position++, F(e, !0, -1) && e.lineIndent <= t) {
			a.push(null), c = e.input.charCodeAt(e.position);
			continue;
		}
		if (n = e.line, R(e, t, mt, !1, !0), a.push(e.result), F(e, !0, -1), c = e.input.charCodeAt(e.position), (e.line === n || e.lineIndent > t) && c !== 0) A(e, "bad indentation of a sequence entry");
		else if (e.lineIndent < t) break;
	}
	return s ? (e.tag = r, e.anchor = i, e.kind = "sequence", e.result = a, !0) : !1;
}
function Ht(e, t, n) {
	var r, i, a, o, s, c, l = e.tag, u = e.anchor, d = {}, f = Object.create(null), p = null, m = null, h = null, g = !1, _ = !1, v;
	if (e.firstTabInLine !== -1) return !1;
	for (e.anchor !== null && (e.anchorMap[e.anchor] = d), v = e.input.charCodeAt(e.position); v !== 0;) {
		if (!g && e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, A(e, "tab characters must not be used in indentation")), r = e.input.charCodeAt(e.position + 1), a = e.line, (v === 63 || v === 58) && D(r)) v === 63 ? (g && (N(e, d, f, p, m, null, o, s, c), p = m = h = null), _ = !0, g = !0, i = !0) : g ? (g = !1, i = !0) : A(e, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), e.position += 1, v = r;
		else {
			if (o = e.line, s = e.lineStart, c = e.position, !R(e, n, pt, !1, !0)) break;
			if (e.line === a) {
				for (v = e.input.charCodeAt(e.position); E(v);) v = e.input.charCodeAt(++e.position);
				if (v === 58) v = e.input.charCodeAt(++e.position), D(v) || A(e, "a whitespace character is expected after the key-value separator within a block mapping"), g && (N(e, d, f, p, m, null, o, s, c), p = m = h = null), _ = !0, g = !1, i = !1, p = e.tag, m = e.result;
				else if (_) A(e, "can not read an implicit mapping pair; a colon is missed");
				else return e.tag = l, e.anchor = u, !0;
			} else if (_) A(e, "can not read a block mapping entry; a multiline key may not be an implicit key");
			else return e.tag = l, e.anchor = u, !0;
		}
		if ((e.line === a || e.lineIndent > t) && (g && (o = e.line, s = e.lineStart, c = e.position), R(e, t, w, !0, i) && (g ? m = e.result : h = e.result), g || (N(e, d, f, p, m, h, o, s, c), p = m = h = null), F(e, !0, -1), v = e.input.charCodeAt(e.position)), (e.line === a || e.lineIndent > t) && v !== 0) A(e, "bad indentation of a mapping entry");
		else if (e.lineIndent < t) break;
	}
	return g && N(e, d, f, p, m, null, o, s, c), _ && (e.tag = l, e.anchor = u, e.kind = "mapping", e.result = d), _;
}
function Ut(e) {
	var t, n = !1, r = !1, i, a, o = e.input.charCodeAt(e.position);
	if (o !== 33) return !1;
	if (e.tag !== null && A(e, "duplication of a tag property"), o = e.input.charCodeAt(++e.position), o === 60 ? (n = !0, o = e.input.charCodeAt(++e.position)) : o === 33 ? (r = !0, i = "!!", o = e.input.charCodeAt(++e.position)) : i = "!", t = e.position, n) {
		do
			o = e.input.charCodeAt(++e.position);
		while (o !== 0 && o !== 62);
		e.position < e.length ? (a = e.input.slice(t, e.position), o = e.input.charCodeAt(++e.position)) : A(e, "unexpected end of the stream within a verbatim tag");
	} else {
		for (; o !== 0 && !D(o);) o === 33 && (r ? A(e, "tag suffix cannot contain exclamation marks") : (i = e.input.slice(t - 1, e.position + 1), xt.test(i) || A(e, "named tag handle cannot contain such characters"), r = !0, t = e.position + 1)), o = e.input.charCodeAt(++e.position);
		a = e.input.slice(t, e.position), bt.test(a) && A(e, "tag suffix cannot contain flow indicator characters");
	}
	a && !St.test(a) && A(e, "tag name cannot contain such characters: " + a);
	try {
		a = decodeURIComponent(a);
	} catch {
		A(e, "tag name is malformed: " + a);
	}
	return n ? e.tag = a : S.call(e.tagMap, i) ? e.tag = e.tagMap[i] + a : i === "!" ? e.tag = "!" + a : i === "!!" ? e.tag = "tag:yaml.org,2002:" + a : A(e, "undeclared tag handle \"" + i + "\""), !0;
}
function Wt(e) {
	var t, n = e.input.charCodeAt(e.position);
	if (n !== 38) return !1;
	for (e.anchor !== null && A(e, "duplication of an anchor property"), n = e.input.charCodeAt(++e.position), t = e.position; n !== 0 && !D(n) && !O(n);) n = e.input.charCodeAt(++e.position);
	return e.position === t && A(e, "name of an anchor node must contain at least one character"), e.anchor = e.input.slice(t, e.position), !0;
}
function Gt(e) {
	var t, n, r = e.input.charCodeAt(e.position);
	if (r !== 42) return !1;
	for (r = e.input.charCodeAt(++e.position), t = e.position; r !== 0 && !D(r) && !O(r);) r = e.input.charCodeAt(++e.position);
	return e.position === t && A(e, "name of an alias node must contain at least one character"), n = e.input.slice(t, e.position), S.call(e.anchorMap, n) || A(e, "unidentified alias \"" + n + "\""), e.result = e.anchorMap[n], F(e, !0, -1), !0;
}
function R(e, t, n, r, i) {
	var a, o, s, c = 1, l = !1, u = !1, d, f, p, m, h, g;
	if (e.listener !== null && e.listener("open", e), e.tag = null, e.anchor = null, e.kind = null, e.result = null, a = o = s = w === n || mt === n, r && F(e, !0, -1) && (l = !0, e.lineIndent > t ? c = 1 : e.lineIndent === t ? c = 0 : e.lineIndent < t && (c = -1)), c === 1) for (; Ut(e) || Wt(e);) F(e, !0, -1) ? (l = !0, s = a, e.lineIndent > t ? c = 1 : e.lineIndent === t ? c = 0 : e.lineIndent < t && (c = -1)) : s = !1;
	if (s &&= l || i, (c === 1 || w === n) && (h = C === n || pt === n ? t : t + 1, g = e.position - e.lineStart, c === 1 ? s && (Vt(e, g) || Ht(e, g, h)) || zt(e, h) ? u = !0 : (o && Bt(e, h) || Lt(e, h) || Rt(e, h) ? u = !0 : Gt(e) ? (u = !0, (e.tag !== null || e.anchor !== null) && A(e, "alias node should not have any properties")) : It(e, h, C === n) && (u = !0, e.tag === null && (e.tag = "?")), e.anchor !== null && (e.anchorMap[e.anchor] = e.result)) : c === 0 && (u = s && Vt(e, g))), e.tag === null) e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
	else if (e.tag === "?") {
		for (e.result !== null && e.kind !== "scalar" && A(e, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + e.kind + "\""), d = 0, f = e.implicitTypes.length; d < f; d += 1) if (m = e.implicitTypes[d], m.resolve(e.result)) {
			e.result = m.construct(e.result), e.tag = m.tag, e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
			break;
		}
	} else if (e.tag !== "!") {
		if (S.call(e.typeMap[e.kind || "fallback"], e.tag)) m = e.typeMap[e.kind || "fallback"][e.tag];
		else for (m = null, p = e.typeMap.multi[e.kind || "fallback"], d = 0, f = p.length; d < f; d += 1) if (e.tag.slice(0, p[d].tag.length) === p[d].tag) {
			m = p[d];
			break;
		}
		m || A(e, "unknown tag !<" + e.tag + ">"), e.result !== null && m.kind !== e.kind && A(e, "unacceptable node kind for !<" + e.tag + "> tag; it should be \"" + m.kind + "\", not \"" + e.kind + "\""), m.resolve(e.result, e.tag) ? (e.result = m.construct(e.result, e.tag), e.anchor !== null && (e.anchorMap[e.anchor] = e.result)) : A(e, "cannot resolve a node with !<" + e.tag + "> explicit tag");
	}
	return e.listener !== null && e.listener("close", e), e.tag !== null || e.anchor !== null || u;
}
function Kt(e) {
	var t = e.position, n, r, i, a = !1, o;
	for (e.version = null, e.checkLineBreaks = e.legacy, e.tagMap = Object.create(null), e.anchorMap = Object.create(null); (o = e.input.charCodeAt(e.position)) !== 0 && (F(e, !0, -1), o = e.input.charCodeAt(e.position), !(e.lineIndent > 0 || o !== 37));) {
		for (a = !0, o = e.input.charCodeAt(++e.position), n = e.position; o !== 0 && !D(o);) o = e.input.charCodeAt(++e.position);
		for (r = e.input.slice(n, e.position), i = [], r.length < 1 && A(e, "directive name must not be less than one character in length"); o !== 0;) {
			for (; E(o);) o = e.input.charCodeAt(++e.position);
			if (o === 35) {
				do
					o = e.input.charCodeAt(++e.position);
				while (o !== 0 && !T(o));
				break;
			}
			if (T(o)) break;
			for (n = e.position; o !== 0 && !D(o);) o = e.input.charCodeAt(++e.position);
			i.push(e.input.slice(n, e.position));
		}
		o !== 0 && P(e), S.call(Pt, r) ? Pt[r](e, r, i) : j(e, "unknown document directive \"" + r + "\"");
	}
	if (F(e, !0, -1), e.lineIndent === 0 && e.input.charCodeAt(e.position) === 45 && e.input.charCodeAt(e.position + 1) === 45 && e.input.charCodeAt(e.position + 2) === 45 ? (e.position += 3, F(e, !0, -1)) : a && A(e, "directives end mark is expected"), R(e, e.lineIndent - 1, w, !1, !0), F(e, !0, -1), e.checkLineBreaks && yt.test(e.input.slice(t, e.position)) && j(e, "non-ASCII line breaks are interpreted as content"), e.documents.push(e.result), e.position === e.lineStart && I(e)) {
		e.input.charCodeAt(e.position) === 46 && (e.position += 3, F(e, !0, -1));
		return;
	}
	if (e.position < e.length - 1) A(e, "end of the stream or a document separator is expected");
	else return;
}
function qt(e, t) {
	e = String(e), t ||= {}, e.length !== 0 && (e.charCodeAt(e.length - 1) !== 10 && e.charCodeAt(e.length - 1) !== 13 && (e += "\n"), e.charCodeAt(0) === 65279 && (e = e.slice(1)));
	var n = new Mt(e, t), r = e.indexOf("\0");
	for (r !== -1 && (n.position = r, A(n, "null byte is not allowed in input")), n.input += "\0"; n.input.charCodeAt(n.position) === 32;) n.lineIndent += 1, n.position += 1;
	for (; n.position < n.length - 1;) Kt(n);
	return n.documents;
}
function Jt(e, t, n) {
	typeof t == "object" && t && n === void 0 && (n = t, t = null);
	var r = qt(e, n);
	if (typeof t != "function") return r;
	for (var i = 0, a = r.length; i < a; i += 1) t(r[i]);
}
function Yt(e, t) {
	var n = qt(e, t);
	if (n.length !== 0) {
		if (n.length === 1) return n[0];
		throw new y("expected a single document in the stream, but found more");
	}
}
var Xt = {
	loadAll: Jt,
	load: Yt
}, Zt = Object.prototype.toString, Qt = Object.prototype.hasOwnProperty, z = 65279, $t = 9, B = 10, en = 13, tn = 32, nn = 33, rn = 34, V = 35, an = 37, on = 38, sn = 39, cn = 42, ln = 44, un = 45, H = 58, dn = 61, fn = 62, pn = 63, mn = 64, hn = 91, gn = 93, _n = 96, vn = 123, yn = 124, bn = 125, U = {};
U[0] = "\\0", U[7] = "\\a", U[8] = "\\b", U[9] = "\\t", U[10] = "\\n", U[11] = "\\v", U[12] = "\\f", U[13] = "\\r", U[27] = "\\e", U[34] = "\\\"", U[92] = "\\\\", U[133] = "\\N", U[160] = "\\_", U[8232] = "\\L", U[8233] = "\\P";
var xn = [
	"y",
	"Y",
	"yes",
	"Yes",
	"YES",
	"on",
	"On",
	"ON",
	"n",
	"N",
	"no",
	"No",
	"NO",
	"off",
	"Off",
	"OFF"
], Sn = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function Cn(e, t) {
	var n, r, i, a, o, s, c;
	if (t === null) return {};
	for (n = {}, r = Object.keys(t), i = 0, a = r.length; i < a; i += 1) o = r[i], s = String(t[o]), o.slice(0, 2) === "!!" && (o = "tag:yaml.org,2002:" + o.slice(2)), c = e.compiledTypeMap.fallback[o], c && Qt.call(c.styleAliases, s) && (s = c.styleAliases[s]), n[o] = s;
	return n;
}
function wn(e) {
	var t = e.toString(16).toUpperCase(), n, r;
	if (e <= 255) n = "x", r = 2;
	else if (e <= 65535) n = "u", r = 4;
	else if (e <= 4294967295) n = "U", r = 8;
	else throw new y("code point within a string may not be greater than 0xFFFFFFFF");
	return "\\" + n + g.repeat("0", r - t.length) + t;
}
var Tn = 1, W = 2;
function En(e) {
	this.schema = e.schema || ft, this.indent = Math.max(1, e.indent || 2), this.noArrayIndent = e.noArrayIndent || !1, this.skipInvalid = e.skipInvalid || !1, this.flowLevel = g.isNothing(e.flowLevel) ? -1 : e.flowLevel, this.styleMap = Cn(this.schema, e.styles || null), this.sortKeys = e.sortKeys || !1, this.lineWidth = e.lineWidth || 80, this.noRefs = e.noRefs || !1, this.noCompatMode = e.noCompatMode || !1, this.condenseFlow = e.condenseFlow || !1, this.quotingType = e.quotingType === "\"" ? W : Tn, this.forceQuotes = e.forceQuotes || !1, this.replacer = typeof e.replacer == "function" ? e.replacer : null, this.implicitTypes = this.schema.compiledImplicit, this.explicitTypes = this.schema.compiledExplicit, this.tag = null, this.result = "", this.duplicates = [], this.usedDuplicates = null;
}
function Dn(e, t) {
	for (var n = g.repeat(" ", t), r = 0, i = -1, a = "", o, s = e.length; r < s;) i = e.indexOf("\n", r), i === -1 ? (o = e.slice(r), r = s) : (o = e.slice(r, i + 1), r = i + 1), o.length && o !== "\n" && (a += n), a += o;
	return a;
}
function On(e, t) {
	return "\n" + g.repeat(" ", e.indent * t);
}
function kn(e, t) {
	var n, r, i;
	for (n = 0, r = e.implicitTypes.length; n < r; n += 1) if (i = e.implicitTypes[n], i.resolve(t)) return !0;
	return !1;
}
function G(e) {
	return e === tn || e === $t;
}
function K(e) {
	return 32 <= e && e <= 126 || 161 <= e && e <= 55295 && e !== 8232 && e !== 8233 || 57344 <= e && e <= 65533 && e !== z || 65536 <= e && e <= 1114111;
}
function An(e) {
	return K(e) && e !== z && e !== en && e !== B;
}
function jn(e, t, n) {
	var r = An(e), i = r && !G(e);
	return (n ? r : r && e !== ln && e !== hn && e !== gn && e !== vn && e !== bn) && e !== V && !(t === H && !i) || An(t) && !G(t) && e === V || t === H && i;
}
function Mn(e) {
	return K(e) && e !== z && !G(e) && e !== un && e !== pn && e !== H && e !== ln && e !== hn && e !== gn && e !== vn && e !== bn && e !== V && e !== on && e !== cn && e !== nn && e !== yn && e !== dn && e !== fn && e !== sn && e !== rn && e !== an && e !== mn && e !== _n;
}
function Nn(e) {
	return !G(e) && e !== H;
}
function q(e, t) {
	var n = e.charCodeAt(t), r;
	return n >= 55296 && n <= 56319 && t + 1 < e.length && (r = e.charCodeAt(t + 1), r >= 56320 && r <= 57343) ? (n - 55296) * 1024 + r - 56320 + 65536 : n;
}
function Pn(e) {
	return /^\n* /.test(e);
}
var Fn = 1, J = 2, In = 3, Ln = 4, Y = 5;
function Rn(e, t, n, r, i, a, o, s) {
	var c, l = 0, u = null, d = !1, f = !1, p = r !== -1, m = -1, h = Mn(q(e, 0)) && Nn(q(e, e.length - 1));
	if (t || o) for (c = 0; c < e.length; l >= 65536 ? c += 2 : c++) {
		if (l = q(e, c), !K(l)) return Y;
		h &&= jn(l, u, s), u = l;
	}
	else {
		for (c = 0; c < e.length; l >= 65536 ? c += 2 : c++) {
			if (l = q(e, c), l === B) d = !0, p && (f ||= c - m - 1 > r && e[m + 1] !== " ", m = c);
			else if (!K(l)) return Y;
			h &&= jn(l, u, s), u = l;
		}
		f ||= p && c - m - 1 > r && e[m + 1] !== " ";
	}
	return !d && !f ? h && !o && !i(e) ? Fn : a === W ? Y : J : n > 9 && Pn(e) ? Y : o ? a === W ? Y : J : f ? Ln : In;
}
function zn(e, t, n, r, i) {
	e.dump = function() {
		if (t.length === 0) return e.quotingType === W ? "\"\"" : "''";
		if (!e.noCompatMode && (xn.indexOf(t) !== -1 || Sn.test(t))) return e.quotingType === W ? "\"" + t + "\"" : "'" + t + "'";
		var a = e.indent * Math.max(1, n), o = e.lineWidth === -1 ? -1 : Math.max(Math.min(e.lineWidth, 40), e.lineWidth - a), s = r || e.flowLevel > -1 && n >= e.flowLevel;
		function c(t) {
			return kn(e, t);
		}
		switch (Rn(t, s, e.indent, o, c, e.quotingType, e.forceQuotes && !r, i)) {
			case Fn: return t;
			case J: return "'" + t.replace(/'/g, "''") + "'";
			case In: return "|" + Bn(t, e.indent) + Vn(Dn(t, a));
			case Ln: return ">" + Bn(t, e.indent) + Vn(Dn(Hn(t, o), a));
			case Y: return "\"" + Wn(t) + "\"";
			default: throw new y("impossible error: invalid scalar style");
		}
	}();
}
function Bn(e, t) {
	var n = Pn(e) ? String(t) : "", r = e[e.length - 1] === "\n";
	return n + (r && (e[e.length - 2] === "\n" || e === "\n") ? "+" : r ? "" : "-") + "\n";
}
function Vn(e) {
	return e[e.length - 1] === "\n" ? e.slice(0, -1) : e;
}
function Hn(e, t) {
	for (var n = /(\n+)([^\n]*)/g, r = function() {
		var r = e.indexOf("\n");
		return r = r === -1 ? e.length : r, n.lastIndex = r, Un(e.slice(0, r), t);
	}(), i = e[0] === "\n" || e[0] === " ", a, o; o = n.exec(e);) {
		var s = o[1], c = o[2];
		a = c[0] === " ", r += s + (!i && !a && c !== "" ? "\n" : "") + Un(c, t), i = a;
	}
	return r;
}
function Un(e, t) {
	if (e === "" || e[0] === " ") return e;
	for (var n = / [^ ]/g, r, i = 0, a, o = 0, s = 0, c = ""; r = n.exec(e);) s = r.index, s - i > t && (a = o > i ? o : s, c += "\n" + e.slice(i, a), i = a + 1), o = s;
	return c += "\n", e.length - i > t && o > i ? c += e.slice(i, o) + "\n" + e.slice(o + 1) : c += e.slice(i), c.slice(1);
}
function Wn(e) {
	for (var t = "", n = 0, r, i = 0; i < e.length; n >= 65536 ? i += 2 : i++) n = q(e, i), r = U[n], !r && K(n) ? (t += e[i], n >= 65536 && (t += e[i + 1])) : t += r || wn(n);
	return t;
}
function Gn(e, t, n) {
	var r = "", i = e.tag, a, o, s;
	for (a = 0, o = n.length; a < o; a += 1) s = n[a], e.replacer && (s = e.replacer.call(n, String(a), s)), (X(e, t, s, !1, !1) || s === void 0 && X(e, t, null, !1, !1)) && (r !== "" && (r += "," + (e.condenseFlow ? "" : " ")), r += e.dump);
	e.tag = i, e.dump = "[" + r + "]";
}
function Kn(e, t, n, r) {
	var i = "", a = e.tag, o, s, c;
	for (o = 0, s = n.length; o < s; o += 1) c = n[o], e.replacer && (c = e.replacer.call(n, String(o), c)), (X(e, t + 1, c, !0, !0, !1, !0) || c === void 0 && X(e, t + 1, null, !0, !0, !1, !0)) && ((!r || i !== "") && (i += On(e, t)), e.dump && B === e.dump.charCodeAt(0) ? i += "-" : i += "- ", i += e.dump);
	e.tag = a, e.dump = i || "[]";
}
function qn(e, t, n) {
	var r = "", i = e.tag, a = Object.keys(n), o, s, c, l, u;
	for (o = 0, s = a.length; o < s; o += 1) u = "", r !== "" && (u += ", "), e.condenseFlow && (u += "\""), c = a[o], l = n[c], e.replacer && (l = e.replacer.call(n, c, l)), X(e, t, c, !1, !1) && (e.dump.length > 1024 && (u += "? "), u += e.dump + (e.condenseFlow ? "\"" : "") + ":" + (e.condenseFlow ? "" : " "), X(e, t, l, !1, !1) && (u += e.dump, r += u));
	e.tag = i, e.dump = "{" + r + "}";
}
function Jn(e, t, n, r) {
	var i = "", a = e.tag, o = Object.keys(n), s, c, l, u, d, f;
	if (e.sortKeys === !0) o.sort();
	else if (typeof e.sortKeys == "function") o.sort(e.sortKeys);
	else if (e.sortKeys) throw new y("sortKeys must be a boolean or a function");
	for (s = 0, c = o.length; s < c; s += 1) f = "", (!r || i !== "") && (f += On(e, t)), l = o[s], u = n[l], e.replacer && (u = e.replacer.call(n, l, u)), X(e, t + 1, l, !0, !0, !0) && (d = e.tag !== null && e.tag !== "?" || e.dump && e.dump.length > 1024, d && (e.dump && B === e.dump.charCodeAt(0) ? f += "?" : f += "? "), f += e.dump, d && (f += On(e, t)), X(e, t + 1, u, !0, d) && (e.dump && B === e.dump.charCodeAt(0) ? f += ":" : f += ": ", f += e.dump, i += f));
	e.tag = a, e.dump = i || "{}";
}
function Yn(e, t, n) {
	var r, i = n ? e.explicitTypes : e.implicitTypes, a, o, s, c;
	for (a = 0, o = i.length; a < o; a += 1) if (s = i[a], (s.instanceOf || s.predicate) && (!s.instanceOf || typeof t == "object" && t instanceof s.instanceOf) && (!s.predicate || s.predicate(t))) {
		if (n ? s.multi && s.representName ? e.tag = s.representName(t) : e.tag = s.tag : e.tag = "?", s.represent) {
			if (c = e.styleMap[s.tag] || s.defaultStyle, Zt.call(s.represent) === "[object Function]") r = s.represent(t, c);
			else if (Qt.call(s.represent, c)) r = s.represent[c](t, c);
			else throw new y("!<" + s.tag + "> tag resolver accepts not \"" + c + "\" style");
			e.dump = r;
		}
		return !0;
	}
	return !1;
}
function X(e, t, n, r, i, a, o) {
	e.tag = null, e.dump = n, Yn(e, n, !1) || Yn(e, n, !0);
	var s = Zt.call(e.dump), c = r, l;
	r &&= e.flowLevel < 0 || e.flowLevel > t;
	var u = s === "[object Object]" || s === "[object Array]", d, f;
	if (u && (d = e.duplicates.indexOf(n), f = d !== -1), (e.tag !== null && e.tag !== "?" || f || e.indent !== 2 && t > 0) && (i = !1), f && e.usedDuplicates[d]) e.dump = "*ref_" + d;
	else {
		if (u && f && !e.usedDuplicates[d] && (e.usedDuplicates[d] = !0), s === "[object Object]") r && Object.keys(e.dump).length !== 0 ? (Jn(e, t, e.dump, i), f && (e.dump = "&ref_" + d + e.dump)) : (qn(e, t, e.dump), f && (e.dump = "&ref_" + d + " " + e.dump));
		else if (s === "[object Array]") r && e.dump.length !== 0 ? (e.noArrayIndent && !o && t > 0 ? Kn(e, t - 1, e.dump, i) : Kn(e, t, e.dump, i), f && (e.dump = "&ref_" + d + e.dump)) : (Gn(e, t, e.dump), f && (e.dump = "&ref_" + d + " " + e.dump));
		else if (s === "[object String]") e.tag !== "?" && zn(e, e.dump, t, a, c);
		else if (s === "[object Undefined]") return !1;
		else {
			if (e.skipInvalid) return !1;
			throw new y("unacceptable kind of an object to dump " + s);
		}
		e.tag !== null && e.tag !== "?" && (l = encodeURI(e.tag[0] === "!" ? e.tag.slice(1) : e.tag).replace(/!/g, "%21"), l = e.tag[0] === "!" ? "!" + l : l.slice(0, 18) === "tag:yaml.org,2002:" ? "!!" + l.slice(18) : "!<" + l + ">", e.dump = l + " " + e.dump);
	}
	return !0;
}
function Xn(e, t) {
	var n = [], r = [], i, a;
	for (Zn(e, n, r), i = 0, a = r.length; i < a; i += 1) t.duplicates.push(n[r[i]]);
	t.usedDuplicates = Array(a);
}
function Zn(e, t, n) {
	var r, i, a;
	if (typeof e == "object" && e) if (i = t.indexOf(e), i !== -1) n.indexOf(i) === -1 && n.push(i);
	else if (t.push(e), Array.isArray(e)) for (i = 0, a = e.length; i < a; i += 1) Zn(e[i], t, n);
	else for (r = Object.keys(e), i = 0, a = r.length; i < a; i += 1) Zn(e[r[i]], t, n);
}
function Qn(e, t) {
	t ||= {};
	var n = new En(t);
	n.noRefs || Xn(e, n);
	var r = e;
	return n.replacer && (r = n.replacer.call({ "": r }, "", r)), X(n, 0, r, !0, !0) ? n.dump + "\n" : "";
}
var $n = { dump: Qn };
function er(e, t) {
	return function() {
		throw Error("Function yaml." + e + " is removed in js-yaml 4. Use yaml." + t + " instead, which is now safe by default.");
	};
}
var tr = {
	Type: x,
	Schema: ue,
	FAILSAFE_SCHEMA: me,
	JSON_SCHEMA: Le,
	CORE_SCHEMA: Re,
	DEFAULT_SCHEMA: ft,
	load: Xt.load,
	loadAll: Xt.loadAll,
	dump: $n.dump,
	YAMLException: y,
	types: {
		binary: Qe,
		float: Ie,
		map: pe,
		null: ve,
		pairs: st,
		set: dt,
		timestamp: We,
		bool: Se,
		int: ke,
		merge: Ke,
		omap: rt,
		seq: fe,
		str: de
	},
	safeLoad: er("safeLoad", "load"),
	safeLoadAll: er("safeLoadAll", "loadAll"),
	safeDump: er("safeDump", "dump")
}, nr = class e {
	constructor() {
		this.notes = /* @__PURE__ */ new Map(), this.backlinks = /* @__PURE__ */ new Map(), this.tagsIndex = /* @__PURE__ */ new Map(), this.vaultPath = "", this.watcher = null;
	}
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	extractLinks(e) {
		let t = e.matchAll(/\[\[(.*?)\]\]/g), n = /* @__PURE__ */ new Set();
		for (let e of t) if (e[1]) {
			let t = e[1].split("|")[0].trim();
			n.add(t);
		}
		return Array.from(n);
	}
	extractTags(e) {
		let t = e.matchAll(/(?:^|\s)#([\w\u4e00-\u9fa5\/-]+)/g), n = /* @__PURE__ */ new Set();
		for (let e of t) e[1] && n.add(e[1]);
		return Array.from(n);
	}
	parseFrontmatter(e) {
		let t = e.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
		if (t) try {
			return {
				frontmatter: tr.load(t[1]) || {},
				body: e.slice(t[0].length)
			};
		} catch (e) {
			console.error("Failed to parse frontmatter", e);
		}
		return {
			frontmatter: {},
			body: e
		};
	}
	async updateFileCache(e, t) {
		let n = e.endsWith(".md") ? e.replace(/\.md$/, "") : e.endsWith(".canvas") ? e.replace(/\.canvas$/, "") : e, r = t;
		if (r === void 0 && this.vaultPath) try {
			let t = a.join(this.vaultPath, e);
			try {
				await o.access(t);
			} catch {
				this.removeFileCache(e);
				return;
			}
			r = await o.readFile(t, "utf-8");
		} catch (t) {
			console.error(`Failed to read file ${e} for cache update`, t), this.removeFileCache(e);
			return;
		}
		if (r === void 0) return;
		let i = e.endsWith(".canvas"), s = {}, c = r;
		if (i) try {
			s = JSON.parse(r).metadata || {}, s.type = "canvas", c = "";
		} catch (e) {
			console.warn("Failed to parse .canvas as JSON", e);
		}
		else {
			let e = this.parseFrontmatter(r);
			s = e.frontmatter, c = e.body;
		}
		let l = this.extractLinks(c), u = this.extractTags(c), d = Array.isArray(s.tags) ? s.tags.map(String) : [], f = Array.from(new Set([...u, ...d])), p = this.notes.get(n), m = p?.links || [], h = p?.tags || [];
		this.notes.set(n, {
			id: n,
			title: s.title || a.basename(n),
			type: s.type || (i ? "canvas" : "file"),
			created_at: s.created_at,
			updated_at: s.updated_at,
			parent_id: s.parent_id || null,
			is_folder: s.is_folder || !1,
			tags: f,
			links: l,
			frontmatter: s
		});
		for (let e of m) {
			let t = this.backlinks.get(e) || [];
			this.backlinks.set(e, t.filter((e) => e !== n));
		}
		for (let e of l) {
			let t = this.backlinks.get(e) || [];
			t.includes(n) || this.backlinks.set(e, [...t, n]);
		}
		for (let e of h) {
			let t = this.tagsIndex.get(e) || [];
			this.tagsIndex.set(e, t.filter((e) => e !== n));
		}
		for (let e of f) {
			let t = this.tagsIndex.get(e) || [];
			t.includes(n) || this.tagsIndex.set(e, [...t, n]);
		}
	}
	removeFileCache(e) {
		let t = e.endsWith(".md") ? e.replace(/\.md$/, "") : e, n = this.notes.get(t);
		if (n) {
			this.notes.delete(t);
			for (let e of n.links) {
				let n = this.backlinks.get(e) || [];
				this.backlinks.set(e, n.filter((e) => e !== t));
			}
			for (let e of n.tags) {
				let n = this.tagsIndex.get(e) || [];
				this.tagsIndex.set(e, n.filter((e) => e !== t));
			}
		}
	}
	getBacklinks(e) {
		let t = e.endsWith(".md") ? e.replace(/\.md$/, "") : e;
		return this.backlinks.get(t) || [];
	}
	getTags() {
		return Array.from(this.tagsIndex.keys());
	}
	getNotesByTag(e) {
		return this.tagsIndex.get(e) || [];
	}
	getNoteMetadata(e) {
		let t = e.endsWith(".md") ? e.replace(/\.md$/, "") : e;
		return this.notes.get(t);
	}
	async scanVault(e) {
		this.vaultPath = e, this.notes.clear(), this.backlinks.clear(), this.tagsIndex.clear();
		let t = async (e, n) => {
			let r = await o.readdir(e, { withFileTypes: !0 });
			for (let i of r) {
				let r = a.join(e, i.name), o = a.relative(n, r);
				i.isDirectory() ? await t(r, n) : i.isFile() && i.name.endsWith(".md") && await this.updateFileCache(o);
			}
		};
		try {
			await t(e, e), console.log(`[MetadataCache] Scanned ${this.notes.size} notes.`);
		} catch (e) {
			console.error("[MetadataCache] Failed to scan vault", e);
		}
	}
	watchVault(e) {
		this.vaultPath = e, this.watcher &&= (this.watcher.close(), null);
		try {
			this.watcher = l(e, { recursive: !0 }, async (t, n) => {
				if (!n || !n.endsWith(".md")) return;
				let r = n, i = a.join(e, r);
				if (t === "rename") try {
					await o.access(i), console.log(`[MetadataCache] File added/renamed: ${r}`), await this.updateFileCache(r);
				} catch {
					console.log(`[MetadataCache] File deleted: ${r}`), this.removeFileCache(r);
				}
				else t === "change" && (console.log(`[MetadataCache] File changed: ${r}`), await this.updateFileCache(r));
			}), this.watcher.on("error", (t) => {
				console.error("[MetadataCache] Watcher error:", t), setTimeout(() => this.watchVault(e), 5e3);
			}), console.log(`[MetadataCache] Watching ${e} (recursive)`);
		} catch (e) {
			console.error("[MetadataCache] Failed to start watcher:", e);
		}
	}
	clear() {
		this.watcher &&= (this.watcher.close(), null), this.notes.clear(), this.backlinks.clear(), this.tagsIndex.clear();
	}
}, rr = a.dirname(s(import.meta.url)), ir = process.env.NODE_ENV === "development", Z = a.join(t.getPath("userData"), "test_vault");
function Q(e) {
	let t = a.normalize(a.join(Z, e));
	if (!t.startsWith(a.normalize(Z))) throw Error(`Security Violation: Path traversal attempt detected: ${e}`);
	return t;
}
var $ = nr.getInstance();
i.registerSchemesAsPrivileged([{
	scheme: "local-resource",
	privileges: {
		bypassCSP: !0,
		stream: !0,
		secure: !0,
		supportFetchAPI: !0
	}
}]);
async function ar() {
	try {
		await o.access(Z);
	} catch {
		await o.mkdir(Z, { recursive: !0 }), await o.writeFile(a.join(Z, "Welcome.md"), "# Welcome to Nova\n\nThis is a note with a link to [[SecondNote]].", "utf-8"), await o.writeFile(a.join(Z, "SecondNote.md"), "# Second Note\n\nReference back to [[Welcome]].", "utf-8");
	}
}
function or() {
	let t = new e({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: a.join(rr, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1
		}
	});
	ir ? t.loadURL(process.env.VITE_DEV_SERVER_URL || "http://localhost:5173") : t.loadFile(a.join(rr, "../dist/index.html"));
}
async function sr(e, t) {
	let n = await o.readdir(e, { withFileTypes: !0 });
	return (await Promise.all(n.map(async (n) => {
		let r = a.join(e, n.name);
		return n.isDirectory() ? sr(r, t) : n.name.endsWith(".md") ? a.relative(t, r) : [];
	}))).flat();
}
t.whenReady().then(async () => {
	await ar(), i.handle("local-resource", (e) => {
		try {
			let t = Q(decodeURIComponent(e.url.slice(17)));
			return r.fetch(c(t).toString());
		} catch {
			return console.error(`[Protocol] Security blocked local-resource: ${e.url}`), new Response("Access Denied", { status: 403 });
		}
	}), await $.scanVault(Z), $.watchVault(Z), n.handle("readMarkdownFile", async (e, t) => {
		try {
			let e = Q(t);
			return await o.readFile(e, "utf-8");
		} catch (e) {
			throw console.error(`[IPC] readMarkdownFile failed: ${t}`, e), e;
		}
	}), n.handle("writeMarkdownFile", async (e, t, n) => {
		try {
			let e = Q(t);
			return await o.mkdir(a.dirname(e), { recursive: !0 }), await o.writeFile(e, n, "utf-8"), await $.updateFileCache(t, n), !0;
		} catch (e) {
			return console.error(`[IPC] writeMarkdownFile failed: ${t}`, e), !1;
		}
	}), n.handle("listMarkdownFiles", async () => {
		try {
			return await sr(Z, Z);
		} catch (e) {
			return console.error("[IPC] listMarkdownFiles failed", e), [];
		}
	}), n.handle("getVaultTree", async () => {
		try {
			async function e(t, n) {
				let r = await o.readdir(t, { withFileTypes: !0 });
				return (await Promise.all(r.map(async (r) => {
					let i = a.join(t, r.name), s = a.relative(n, i);
					if (r.isDirectory()) {
						let t = await e(i, n);
						return t.length === 0 && !r.name.startsWith(".") ? {
							id: s,
							name: r.name,
							type: "folder",
							children: []
						} : t.length > 0 ? {
							id: s,
							name: r.name,
							type: "folder",
							children: t
						} : null;
					} else if (r.name.endsWith(".md")) {
						let e = await o.stat(i);
						return {
							id: s,
							name: r.name.replace(/\.md$/, ""),
							type: "file",
							extension: ".md",
							updated_at: e.mtime.toISOString()
						};
					}
					return null;
				}))).filter(Boolean).sort((e, t) => e.type === t.type ? e.name.localeCompare(t.name) : e.type === "folder" ? -1 : 1);
			}
			return await e(Z, Z);
		} catch (e) {
			return console.error("[IPC] getVaultTree failed", e), [];
		}
	}), n.handle("getBacklinks", async (e, t) => $.getBacklinks(t)), n.handle("getTags", async () => $.getTags()), n.handle("getNotesByTag", async (e, t) => $.getNotesByTag(t)), n.handle("getNoteMetadata", async (e, t) => $.getNoteMetadata(t)), n.handle("setVaultPath", async (e, t) => {
		try {
			return Z = t, await ar(), await $.scanVault(Z), $.watchVault(Z), !0;
		} catch (e) {
			return console.error(`[IPC] setVaultPath failed: ${t}`, e), !1;
		}
	}), n.handle("getVaultPath", async () => Z), n.handle("renameItem", async (e, t, n) => {
		try {
			let e = Q(t), r = Q(n);
			return await o.rename(e, r), !0;
		} catch (e) {
			return console.error(`[IPC] renameItem failed: ${t} -> ${n}`, e), !1;
		}
	}), n.handle("deleteItem", async (e, t) => {
		try {
			let e = Q(t);
			return (await o.stat(e)).isDirectory() ? await o.rm(e, {
				recursive: !0,
				force: !0
			}) : await o.unlink(e), !0;
		} catch (e) {
			return console.error(`[IPC] deleteItem failed: ${t}`, e), !1;
		}
	}), n.handle("moveItem", async (e, t, n) => {
		try {
			let e = Q(t), r = Q(a.join(n, a.basename(t)));
			return await o.rename(e, r), !0;
		} catch (e) {
			return console.error(`[IPC] moveItem failed: ${t} -> ${n}`, e), !1;
		}
	}), n.handle("createFolder", async (e, t) => {
		try {
			let e = Q(t);
			return await o.mkdir(e, { recursive: !0 }), t;
		} catch (e) {
			return console.error(`[IPC] createFolder failed: ${t}`, e), "";
		}
	}), n.handle("createMarkdownFile", async (e, t, n) => {
		try {
			let e = n.endsWith(".md") ? n : `${n}.md`, r = Q(a.join(t, e));
			try {
				await o.access(r);
				let n = `${a.basename(e, ".md")}_${Date.now()}.md`, i = Q(a.join(t, n));
				return await o.writeFile(i, "", "utf-8"), a.relative(Z, i);
			} catch {
				return await o.writeFile(r, "", "utf-8"), a.relative(Z, r);
			}
		} catch (e) {
			return console.error(`[IPC] createMarkdownFile failed in ${t}`, e), "";
		}
	}), n.handle("saveMedia", async (e, t, n) => {
		try {
			let e = Q(a.join("assets", a.basename(t))), r = a.dirname(e);
			await o.mkdir(r, { recursive: !0 });
			let i = Buffer.from(n, "base64");
			return await o.writeFile(e, i), a.relative(Z, e);
		} catch (e) {
			return console.error(`[IPC] saveMedia failed: ${t}`, e), "";
		}
	}), n.handle("readDir", async (e, t) => {
		try {
			let e = Q(t);
			try {
				await o.access(e);
			} catch {
				return [];
			}
			return (await o.stat(e)).isDirectory() ? (await o.readdir(e, { withFileTypes: !0 })).map((e) => ({
				name: e.name,
				isDirectory: e.isDirectory(),
				size: 0,
				mtime: (/* @__PURE__ */ new Date()).toISOString()
			})) : [];
		} catch (e) {
			return console.error(`[IPC] readDir failed: ${t}`, e), [];
		}
	}), or(), t.on("activate", () => {
		e.getAllWindows().length === 0 && or();
	});
}), t.on("window-all-closed", () => {
	$.clear(), process.platform !== "darwin" && t.quit();
});
//#endregion
