import { BrowserWindow as e, app as t, ipcMain as n } from "electron";
import r from "node:path";
import i from "node:fs/promises";
import { fileURLToPath as a } from "node:url";
import { watch as o } from "node:fs";
//#region node_modules/js-yaml/dist/js-yaml.mjs
function s(e) {
	return e == null;
}
function c(e) {
	return typeof e == "object" && !!e;
}
function l(e) {
	return Array.isArray(e) ? e : s(e) ? [] : [e];
}
function u(e, t) {
	var n, r, i, a;
	if (t) for (a = Object.keys(t), n = 0, r = a.length; n < r; n += 1) i = a[n], e[i] = t[i];
	return e;
}
function d(e, t) {
	var n = "", r;
	for (r = 0; r < t; r += 1) n += e;
	return n;
}
function f(e) {
	return e === 0 && 1 / e == -Infinity;
}
var p = {
	isNothing: s,
	isObject: c,
	toArray: l,
	repeat: d,
	isNegativeZero: f,
	extend: u
};
function m(e, t) {
	var n = "", r = e.reason || "(unknown reason)";
	return e.mark ? (e.mark.name && (n += "in \"" + e.mark.name + "\" "), n += "(" + (e.mark.line + 1) + ":" + (e.mark.column + 1) + ")", !t && e.mark.snippet && (n += "\n\n" + e.mark.snippet), r + " " + n) : r;
}
function h(e, t) {
	Error.call(this), this.name = "YAMLException", this.reason = e, this.mark = t, this.message = m(this, !1), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = (/* @__PURE__ */ Error()).stack || "";
}
h.prototype = Object.create(Error.prototype), h.prototype.constructor = h, h.prototype.toString = function(e) {
	return this.name + ": " + m(this, e);
};
var g = h;
function _(e, t, n, r, i) {
	var a = "", o = "", s = Math.floor(i / 2) - 1;
	return r - t > s && (a = " ... ", t = r - s + a.length), n - r > s && (o = " ...", n = r + s - o.length), {
		str: a + e.slice(t, n).replace(/\t/g, "→") + o,
		pos: r - t + a.length
	};
}
function v(e, t) {
	return p.repeat(" ", t - e.length) + e;
}
function ee(e, t) {
	if (t = Object.create(t || null), !e.buffer) return null;
	t.maxLength ||= 79, typeof t.indent != "number" && (t.indent = 1), typeof t.linesBefore != "number" && (t.linesBefore = 3), typeof t.linesAfter != "number" && (t.linesAfter = 2);
	for (var n = /\r?\n|\r|\0/g, r = [0], i = [], a, o = -1; a = n.exec(e.buffer);) i.push(a.index), r.push(a.index + a[0].length), e.position <= a.index && o < 0 && (o = r.length - 2);
	o < 0 && (o = r.length - 1);
	var s = "", c, l, u = Math.min(e.line + t.linesAfter, i.length).toString().length, d = t.maxLength - (t.indent + u + 3);
	for (c = 1; c <= t.linesBefore && !(o - c < 0); c++) l = _(e.buffer, r[o - c], i[o - c], e.position - (r[o] - r[o - c]), d), s = p.repeat(" ", t.indent) + v((e.line - c + 1).toString(), u) + " | " + l.str + "\n" + s;
	for (l = _(e.buffer, r[o], i[o], e.position, d), s += p.repeat(" ", t.indent) + v((e.line + 1).toString(), u) + " | " + l.str + "\n", s += p.repeat("-", t.indent + u + 3 + l.pos) + "^\n", c = 1; c <= t.linesAfter && !(o + c >= i.length); c++) l = _(e.buffer, r[o + c], i[o + c], e.position - (r[o] - r[o + c]), d), s += p.repeat(" ", t.indent) + v((e.line + c + 1).toString(), u) + " | " + l.str + "\n";
	return s.replace(/\n$/, "");
}
var te = ee, ne = [
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
], re = [
	"scalar",
	"sequence",
	"mapping"
];
function ie(e) {
	var t = {};
	return e !== null && Object.keys(e).forEach(function(n) {
		e[n].forEach(function(e) {
			t[String(e)] = n;
		});
	}), t;
}
function ae(e, t) {
	if (t ||= {}, Object.keys(t).forEach(function(t) {
		if (ne.indexOf(t) === -1) throw new g("Unknown option \"" + t + "\" is met in definition of \"" + e + "\" YAML type.");
	}), this.options = t, this.tag = e, this.kind = t.kind || null, this.resolve = t.resolve || function() {
		return !0;
	}, this.construct = t.construct || function(e) {
		return e;
	}, this.instanceOf = t.instanceOf || null, this.predicate = t.predicate || null, this.represent = t.represent || null, this.representName = t.representName || null, this.defaultStyle = t.defaultStyle || null, this.multi = t.multi || !1, this.styleAliases = ie(t.styleAliases || null), re.indexOf(this.kind) === -1) throw new g("Unknown kind \"" + this.kind + "\" is specified for \"" + e + "\" YAML type.");
}
var y = ae;
function oe(e, t) {
	var n = [];
	return e[t].forEach(function(e) {
		var t = n.length;
		n.forEach(function(n, r) {
			n.tag === e.tag && n.kind === e.kind && n.multi === e.multi && (t = r);
		}), n[t] = e;
	}), n;
}
function se() {
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
function b(e) {
	return this.extend(e);
}
b.prototype.extend = function(e) {
	var t = [], n = [];
	if (e instanceof y) n.push(e);
	else if (Array.isArray(e)) n = n.concat(e);
	else if (e && (Array.isArray(e.implicit) || Array.isArray(e.explicit))) e.implicit && (t = t.concat(e.implicit)), e.explicit && (n = n.concat(e.explicit));
	else throw new g("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
	t.forEach(function(e) {
		if (!(e instanceof y)) throw new g("Specified list of YAML types (or a single Type object) contains a non-Type object.");
		if (e.loadKind && e.loadKind !== "scalar") throw new g("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
		if (e.multi) throw new g("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
	}), n.forEach(function(e) {
		if (!(e instanceof y)) throw new g("Specified list of YAML types (or a single Type object) contains a non-Type object.");
	});
	var r = Object.create(b.prototype);
	return r.implicit = (this.implicit || []).concat(t), r.explicit = (this.explicit || []).concat(n), r.compiledImplicit = oe(r, "implicit"), r.compiledExplicit = oe(r, "explicit"), r.compiledTypeMap = se(r.compiledImplicit, r.compiledExplicit), r;
};
var ce = b, le = new y("tag:yaml.org,2002:str", {
	kind: "scalar",
	construct: function(e) {
		return e === null ? "" : e;
	}
}), ue = new y("tag:yaml.org,2002:seq", {
	kind: "sequence",
	construct: function(e) {
		return e === null ? [] : e;
	}
}), de = new y("tag:yaml.org,2002:map", {
	kind: "mapping",
	construct: function(e) {
		return e === null ? {} : e;
	}
}), fe = new ce({ explicit: [
	le,
	ue,
	de
] });
function pe(e) {
	if (e === null) return !0;
	var t = e.length;
	return t === 1 && e === "~" || t === 4 && (e === "null" || e === "Null" || e === "NULL");
}
function me() {
	return null;
}
function he(e) {
	return e === null;
}
var ge = new y("tag:yaml.org,2002:null", {
	kind: "scalar",
	resolve: pe,
	construct: me,
	predicate: he,
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
function _e(e) {
	if (e === null) return !1;
	var t = e.length;
	return t === 4 && (e === "true" || e === "True" || e === "TRUE") || t === 5 && (e === "false" || e === "False" || e === "FALSE");
}
function ve(e) {
	return e === "true" || e === "True" || e === "TRUE";
}
function ye(e) {
	return Object.prototype.toString.call(e) === "[object Boolean]";
}
var be = new y("tag:yaml.org,2002:bool", {
	kind: "scalar",
	resolve: _e,
	construct: ve,
	predicate: ye,
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
function xe(e) {
	return 48 <= e && e <= 57 || 65 <= e && e <= 70 || 97 <= e && e <= 102;
}
function Se(e) {
	return 48 <= e && e <= 55;
}
function Ce(e) {
	return 48 <= e && e <= 57;
}
function we(e) {
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
				if (!xe(e.charCodeAt(n))) return !1;
				r = !0;
			}
			return r && i !== "_";
		}
		if (i === "o") {
			for (n++; n < t; n++) if (i = e[n], i !== "_") {
				if (!Se(e.charCodeAt(n))) return !1;
				r = !0;
			}
			return r && i !== "_";
		}
	}
	if (i === "_") return !1;
	for (; n < t; n++) if (i = e[n], i !== "_") {
		if (!Ce(e.charCodeAt(n))) return !1;
		r = !0;
	}
	return !(!r || i === "_");
}
function Te(e) {
	var t = e, n = 1, r;
	if (t.indexOf("_") !== -1 && (t = t.replace(/_/g, "")), r = t[0], (r === "-" || r === "+") && (r === "-" && (n = -1), t = t.slice(1), r = t[0]), t === "0") return 0;
	if (r === "0") {
		if (t[1] === "b") return n * parseInt(t.slice(2), 2);
		if (t[1] === "x") return n * parseInt(t.slice(2), 16);
		if (t[1] === "o") return n * parseInt(t.slice(2), 8);
	}
	return n * parseInt(t, 10);
}
function Ee(e) {
	return Object.prototype.toString.call(e) === "[object Number]" && e % 1 == 0 && !p.isNegativeZero(e);
}
var De = new y("tag:yaml.org,2002:int", {
	kind: "scalar",
	resolve: we,
	construct: Te,
	predicate: Ee,
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
}), Oe = /* @__PURE__ */ RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function ke(e) {
	return !(e === null || !Oe.test(e) || e[e.length - 1] === "_");
}
function Ae(e) {
	var t = e.replace(/_/g, "").toLowerCase(), n = t[0] === "-" ? -1 : 1;
	return "+-".indexOf(t[0]) >= 0 && (t = t.slice(1)), t === ".inf" ? n === 1 ? Infinity : -Infinity : t === ".nan" ? NaN : n * parseFloat(t, 10);
}
var je = /^[-+]?[0-9]+e/;
function Me(e, t) {
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
	else if (p.isNegativeZero(e)) return "-0.0";
	return n = e.toString(10), je.test(n) ? n.replace("e", ".e") : n;
}
function Ne(e) {
	return Object.prototype.toString.call(e) === "[object Number]" && (e % 1 != 0 || p.isNegativeZero(e));
}
var Pe = new y("tag:yaml.org,2002:float", {
	kind: "scalar",
	resolve: ke,
	construct: Ae,
	predicate: Ne,
	represent: Me,
	defaultStyle: "lowercase"
}), Fe = fe.extend({ implicit: [
	ge,
	be,
	De,
	Pe
] }), Ie = Fe, Le = /* @__PURE__ */ RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"), Re = /* @__PURE__ */ RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function ze(e) {
	return e === null ? !1 : Le.exec(e) !== null || Re.exec(e) !== null;
}
function Be(e) {
	var t, n, r, i, a, o, s, c = 0, l = null, u, d, f;
	if (t = Le.exec(e), t === null && (t = Re.exec(e)), t === null) throw Error("Date resolve error");
	if (n = +t[1], r = t[2] - 1, i = +t[3], !t[4]) return new Date(Date.UTC(n, r, i));
	if (a = +t[4], o = +t[5], s = +t[6], t[7]) {
		for (c = t[7].slice(0, 3); c.length < 3;) c += "0";
		c = +c;
	}
	return t[9] && (u = +t[10], d = +(t[11] || 0), l = (u * 60 + d) * 6e4, t[9] === "-" && (l = -l)), f = new Date(Date.UTC(n, r, i, a, o, s, c)), l && f.setTime(f.getTime() - l), f;
}
function Ve(e) {
	return e.toISOString();
}
var He = new y("tag:yaml.org,2002:timestamp", {
	kind: "scalar",
	resolve: ze,
	construct: Be,
	instanceOf: Date,
	represent: Ve
});
function Ue(e) {
	return e === "<<" || e === null;
}
var We = new y("tag:yaml.org,2002:merge", {
	kind: "scalar",
	resolve: Ue
}), Ge = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function Ke(e) {
	if (e === null) return !1;
	var t, n, r = 0, i = e.length, a = Ge;
	for (n = 0; n < i; n++) if (t = a.indexOf(e.charAt(n)), !(t > 64)) {
		if (t < 0) return !1;
		r += 6;
	}
	return r % 8 == 0;
}
function qe(e) {
	var t, n, r = e.replace(/[\r\n=]/g, ""), i = r.length, a = Ge, o = 0, s = [];
	for (t = 0; t < i; t++) t % 4 == 0 && t && (s.push(o >> 16 & 255), s.push(o >> 8 & 255), s.push(o & 255)), o = o << 6 | a.indexOf(r.charAt(t));
	return n = i % 4 * 6, n === 0 ? (s.push(o >> 16 & 255), s.push(o >> 8 & 255), s.push(o & 255)) : n === 18 ? (s.push(o >> 10 & 255), s.push(o >> 2 & 255)) : n === 12 && s.push(o >> 4 & 255), new Uint8Array(s);
}
function Je(e) {
	var t = "", n = 0, r, i, a = e.length, o = Ge;
	for (r = 0; r < a; r++) r % 3 == 0 && r && (t += o[n >> 18 & 63], t += o[n >> 12 & 63], t += o[n >> 6 & 63], t += o[n & 63]), n = (n << 8) + e[r];
	return i = a % 3, i === 0 ? (t += o[n >> 18 & 63], t += o[n >> 12 & 63], t += o[n >> 6 & 63], t += o[n & 63]) : i === 2 ? (t += o[n >> 10 & 63], t += o[n >> 4 & 63], t += o[n << 2 & 63], t += o[64]) : i === 1 && (t += o[n >> 2 & 63], t += o[n << 4 & 63], t += o[64], t += o[64]), t;
}
function Ye(e) {
	return Object.prototype.toString.call(e) === "[object Uint8Array]";
}
var Xe = new y("tag:yaml.org,2002:binary", {
	kind: "scalar",
	resolve: Ke,
	construct: qe,
	predicate: Ye,
	represent: Je
}), Ze = Object.prototype.hasOwnProperty, Qe = Object.prototype.toString;
function $e(e) {
	if (e === null) return !0;
	var t = [], n, r, i, a, o, s = e;
	for (n = 0, r = s.length; n < r; n += 1) {
		if (i = s[n], o = !1, Qe.call(i) !== "[object Object]") return !1;
		for (a in i) if (Ze.call(i, a)) if (!o) o = !0;
		else return !1;
		if (!o) return !1;
		if (t.indexOf(a) === -1) t.push(a);
		else return !1;
	}
	return !0;
}
function et(e) {
	return e === null ? [] : e;
}
var tt = new y("tag:yaml.org,2002:omap", {
	kind: "sequence",
	resolve: $e,
	construct: et
}), nt = Object.prototype.toString;
function rt(e) {
	if (e === null) return !0;
	var t, n, r, i, a, o = e;
	for (a = Array(o.length), t = 0, n = o.length; t < n; t += 1) {
		if (r = o[t], nt.call(r) !== "[object Object]" || (i = Object.keys(r), i.length !== 1)) return !1;
		a[t] = [i[0], r[i[0]]];
	}
	return !0;
}
function it(e) {
	if (e === null) return [];
	var t, n, r, i, a, o = e;
	for (a = Array(o.length), t = 0, n = o.length; t < n; t += 1) r = o[t], i = Object.keys(r), a[t] = [i[0], r[i[0]]];
	return a;
}
var at = new y("tag:yaml.org,2002:pairs", {
	kind: "sequence",
	resolve: rt,
	construct: it
}), ot = Object.prototype.hasOwnProperty;
function st(e) {
	if (e === null) return !0;
	var t, n = e;
	for (t in n) if (ot.call(n, t) && n[t] !== null) return !1;
	return !0;
}
function ct(e) {
	return e === null ? {} : e;
}
var lt = new y("tag:yaml.org,2002:set", {
	kind: "mapping",
	resolve: st,
	construct: ct
}), x = Ie.extend({
	implicit: [He, We],
	explicit: [
		Xe,
		tt,
		at,
		lt
	]
}), S = Object.prototype.hasOwnProperty, C = 1, ut = 2, dt = 3, w = 4, T = 1, ft = 2, pt = 3, mt = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, ht = /[\x85\u2028\u2029]/, gt = /[,\[\]\{\}]/, _t = /^(?:!|!!|![a-z\-]+!)$/i, vt = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function yt(e) {
	return Object.prototype.toString.call(e);
}
function E(e) {
	return e === 10 || e === 13;
}
function D(e) {
	return e === 9 || e === 32;
}
function O(e) {
	return e === 9 || e === 32 || e === 10 || e === 13;
}
function k(e) {
	return e === 44 || e === 91 || e === 93 || e === 123 || e === 125;
}
function bt(e) {
	var t;
	return 48 <= e && e <= 57 ? e - 48 : (t = e | 32, 97 <= t && t <= 102 ? t - 97 + 10 : -1);
}
function xt(e) {
	return e === 120 ? 2 : e === 117 ? 4 : e === 85 ? 8 : 0;
}
function St(e) {
	return 48 <= e && e <= 57 ? e - 48 : -1;
}
function Ct(e) {
	return e === 48 ? "\0" : e === 97 ? "\x07" : e === 98 ? "\b" : e === 116 || e === 9 ? "	" : e === 110 ? "\n" : e === 118 ? "\v" : e === 102 ? "\f" : e === 114 ? "\r" : e === 101 ? "\x1B" : e === 32 ? " " : e === 34 ? "\"" : e === 47 ? "/" : e === 92 ? "\\" : e === 78 ? "" : e === 95 ? "\xA0" : e === 76 ? "\u2028" : e === 80 ? "\u2029" : "";
}
function wt(e) {
	return e <= 65535 ? String.fromCharCode(e) : String.fromCharCode((e - 65536 >> 10) + 55296, (e - 65536 & 1023) + 56320);
}
function Tt(e, t, n) {
	t === "__proto__" ? Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !0,
		writable: !0,
		value: n
	}) : e[t] = n;
}
for (var Et = Array(256), Dt = Array(256), A = 0; A < 256; A++) Et[A] = +!!Ct(A), Dt[A] = Ct(A);
function Ot(e, t) {
	this.input = e, this.filename = t.filename || null, this.schema = t.schema || x, this.onWarning = t.onWarning || null, this.legacy = t.legacy || !1, this.json = t.json || !1, this.listener = t.listener || null, this.implicitTypes = this.schema.compiledImplicit, this.typeMap = this.schema.compiledTypeMap, this.length = e.length, this.position = 0, this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.firstTabInLine = -1, this.documents = [];
}
function kt(e, t) {
	var n = {
		name: e.filename,
		buffer: e.input.slice(0, -1),
		position: e.position,
		line: e.line,
		column: e.position - e.lineStart
	};
	return n.snippet = te(n), new g(t, n);
}
function j(e, t) {
	throw kt(e, t);
}
function M(e, t) {
	e.onWarning && e.onWarning.call(null, kt(e, t));
}
var At = {
	YAML: function(e, t, n) {
		var r, i, a;
		e.version !== null && j(e, "duplication of %YAML directive"), n.length !== 1 && j(e, "YAML directive accepts exactly one argument"), r = /^([0-9]+)\.([0-9]+)$/.exec(n[0]), r === null && j(e, "ill-formed argument of the YAML directive"), i = parseInt(r[1], 10), a = parseInt(r[2], 10), i !== 1 && j(e, "unacceptable YAML version of the document"), e.version = n[0], e.checkLineBreaks = a < 2, a !== 1 && a !== 2 && M(e, "unsupported YAML version of the document");
	},
	TAG: function(e, t, n) {
		var r, i;
		n.length !== 2 && j(e, "TAG directive accepts exactly two arguments"), r = n[0], i = n[1], _t.test(r) || j(e, "ill-formed tag handle (first argument) of the TAG directive"), S.call(e.tagMap, r) && j(e, "there is a previously declared suffix for \"" + r + "\" tag handle"), vt.test(i) || j(e, "ill-formed tag prefix (second argument) of the TAG directive");
		try {
			i = decodeURIComponent(i);
		} catch {
			j(e, "tag prefix is malformed: " + i);
		}
		e.tagMap[r] = i;
	}
};
function N(e, t, n, r) {
	var i, a, o, s;
	if (t < n) {
		if (s = e.input.slice(t, n), r) for (i = 0, a = s.length; i < a; i += 1) o = s.charCodeAt(i), o === 9 || 32 <= o && o <= 1114111 || j(e, "expected valid JSON character");
		else mt.test(s) && j(e, "the stream contains non-printable characters");
		e.result += s;
	}
}
function jt(e, t, n, r) {
	var i, a, o, s;
	for (p.isObject(n) || j(e, "cannot merge mappings; the provided source object is unacceptable"), i = Object.keys(n), o = 0, s = i.length; o < s; o += 1) a = i[o], S.call(t, a) || (Tt(t, a, n[a]), r[a] = !0);
}
function P(e, t, n, r, i, a, o, s, c) {
	var l, u;
	if (Array.isArray(i)) for (i = Array.prototype.slice.call(i), l = 0, u = i.length; l < u; l += 1) Array.isArray(i[l]) && j(e, "nested arrays are not supported inside keys"), typeof i == "object" && yt(i[l]) === "[object Object]" && (i[l] = "[object Object]");
	if (typeof i == "object" && yt(i) === "[object Object]" && (i = "[object Object]"), i = String(i), t === null && (t = {}), r === "tag:yaml.org,2002:merge") if (Array.isArray(a)) for (l = 0, u = a.length; l < u; l += 1) jt(e, t, a[l], n);
	else jt(e, t, a, n);
	else !e.json && !S.call(n, i) && S.call(t, i) && (e.line = o || e.line, e.lineStart = s || e.lineStart, e.position = c || e.position, j(e, "duplicated mapping key")), Tt(t, i, a), delete n[i];
	return t;
}
function F(e) {
	var t = e.input.charCodeAt(e.position);
	t === 10 ? e.position++ : t === 13 ? (e.position++, e.input.charCodeAt(e.position) === 10 && e.position++) : j(e, "a line break is expected"), e.line += 1, e.lineStart = e.position, e.firstTabInLine = -1;
}
function I(e, t, n) {
	for (var r = 0, i = e.input.charCodeAt(e.position); i !== 0;) {
		for (; D(i);) i === 9 && e.firstTabInLine === -1 && (e.firstTabInLine = e.position), i = e.input.charCodeAt(++e.position);
		if (t && i === 35) do
			i = e.input.charCodeAt(++e.position);
		while (i !== 10 && i !== 13 && i !== 0);
		if (E(i)) for (F(e), i = e.input.charCodeAt(e.position), r++, e.lineIndent = 0; i === 32;) e.lineIndent++, i = e.input.charCodeAt(++e.position);
		else break;
	}
	return n !== -1 && r !== 0 && e.lineIndent < n && M(e, "deficient indentation"), r;
}
function L(e) {
	var t = e.position, n = e.input.charCodeAt(t);
	return !!((n === 45 || n === 46) && n === e.input.charCodeAt(t + 1) && n === e.input.charCodeAt(t + 2) && (t += 3, n = e.input.charCodeAt(t), n === 0 || O(n)));
}
function R(e, t) {
	t === 1 ? e.result += " " : t > 1 && (e.result += p.repeat("\n", t - 1));
}
function Mt(e, t, n) {
	var r, i, a, o, s, c, l, u, d = e.kind, f = e.result, p = e.input.charCodeAt(e.position);
	if (O(p) || k(p) || p === 35 || p === 38 || p === 42 || p === 33 || p === 124 || p === 62 || p === 39 || p === 34 || p === 37 || p === 64 || p === 96 || (p === 63 || p === 45) && (i = e.input.charCodeAt(e.position + 1), O(i) || n && k(i))) return !1;
	for (e.kind = "scalar", e.result = "", a = o = e.position, s = !1; p !== 0;) {
		if (p === 58) {
			if (i = e.input.charCodeAt(e.position + 1), O(i) || n && k(i)) break;
		} else if (p === 35) {
			if (r = e.input.charCodeAt(e.position - 1), O(r)) break;
		} else if (e.position === e.lineStart && L(e) || n && k(p)) break;
		else if (E(p)) if (c = e.line, l = e.lineStart, u = e.lineIndent, I(e, !1, -1), e.lineIndent >= t) {
			s = !0, p = e.input.charCodeAt(e.position);
			continue;
		} else {
			e.position = o, e.line = c, e.lineStart = l, e.lineIndent = u;
			break;
		}
		s &&= (N(e, a, o, !1), R(e, e.line - c), a = o = e.position, !1), D(p) || (o = e.position + 1), p = e.input.charCodeAt(++e.position);
	}
	return N(e, a, o, !1), e.result ? !0 : (e.kind = d, e.result = f, !1);
}
function Nt(e, t) {
	var n = e.input.charCodeAt(e.position), r, i;
	if (n !== 39) return !1;
	for (e.kind = "scalar", e.result = "", e.position++, r = i = e.position; (n = e.input.charCodeAt(e.position)) !== 0;) if (n === 39) if (N(e, r, e.position, !0), n = e.input.charCodeAt(++e.position), n === 39) r = e.position, e.position++, i = e.position;
	else return !0;
	else E(n) ? (N(e, r, i, !0), R(e, I(e, !1, t)), r = i = e.position) : e.position === e.lineStart && L(e) ? j(e, "unexpected end of the document within a single quoted scalar") : (e.position++, i = e.position);
	j(e, "unexpected end of the stream within a single quoted scalar");
}
function Pt(e, t) {
	var n, r, i, a, o, s = e.input.charCodeAt(e.position);
	if (s !== 34) return !1;
	for (e.kind = "scalar", e.result = "", e.position++, n = r = e.position; (s = e.input.charCodeAt(e.position)) !== 0;) if (s === 34) return N(e, n, e.position, !0), e.position++, !0;
	else if (s === 92) {
		if (N(e, n, e.position, !0), s = e.input.charCodeAt(++e.position), E(s)) I(e, !1, t);
		else if (s < 256 && Et[s]) e.result += Dt[s], e.position++;
		else if ((o = xt(s)) > 0) {
			for (i = o, a = 0; i > 0; i--) s = e.input.charCodeAt(++e.position), (o = bt(s)) >= 0 ? a = (a << 4) + o : j(e, "expected hexadecimal character");
			e.result += wt(a), e.position++;
		} else j(e, "unknown escape sequence");
		n = r = e.position;
	} else E(s) ? (N(e, n, r, !0), R(e, I(e, !1, t)), n = r = e.position) : e.position === e.lineStart && L(e) ? j(e, "unexpected end of the document within a double quoted scalar") : (e.position++, r = e.position);
	j(e, "unexpected end of the stream within a double quoted scalar");
}
function Ft(e, t) {
	var n = !0, r, i, a, o = e.tag, s, c = e.anchor, l, u, d, f, p, m = Object.create(null), h, g, _, v = e.input.charCodeAt(e.position);
	if (v === 91) u = 93, p = !1, s = [];
	else if (v === 123) u = 125, p = !0, s = {};
	else return !1;
	for (e.anchor !== null && (e.anchorMap[e.anchor] = s), v = e.input.charCodeAt(++e.position); v !== 0;) {
		if (I(e, !0, t), v = e.input.charCodeAt(e.position), v === u) return e.position++, e.tag = o, e.anchor = c, e.kind = p ? "mapping" : "sequence", e.result = s, !0;
		n ? v === 44 && j(e, "expected the node content, but found ','") : j(e, "missed comma between flow collection entries"), g = h = _ = null, d = f = !1, v === 63 && (l = e.input.charCodeAt(e.position + 1), O(l) && (d = f = !0, e.position++, I(e, !0, t))), r = e.line, i = e.lineStart, a = e.position, z(e, t, C, !1, !0), g = e.tag, h = e.result, I(e, !0, t), v = e.input.charCodeAt(e.position), (f || e.line === r) && v === 58 && (d = !0, v = e.input.charCodeAt(++e.position), I(e, !0, t), z(e, t, C, !1, !0), _ = e.result), p ? P(e, s, m, g, h, _, r, i, a) : d ? s.push(P(e, null, m, g, h, _, r, i, a)) : s.push(h), I(e, !0, t), v = e.input.charCodeAt(e.position), v === 44 ? (n = !0, v = e.input.charCodeAt(++e.position)) : n = !1;
	}
	j(e, "unexpected end of the stream within a flow collection");
}
function It(e, t) {
	var n, r, i = T, a = !1, o = !1, s = t, c = 0, l = !1, u, d = e.input.charCodeAt(e.position);
	if (d === 124) r = !1;
	else if (d === 62) r = !0;
	else return !1;
	for (e.kind = "scalar", e.result = ""; d !== 0;) if (d = e.input.charCodeAt(++e.position), d === 43 || d === 45) T === i ? i = d === 43 ? pt : ft : j(e, "repeat of a chomping mode identifier");
	else if ((u = St(d)) >= 0) u === 0 ? j(e, "bad explicit indentation width of a block scalar; it cannot be less than one") : o ? j(e, "repeat of an indentation width identifier") : (s = t + u - 1, o = !0);
	else break;
	if (D(d)) {
		do
			d = e.input.charCodeAt(++e.position);
		while (D(d));
		if (d === 35) do
			d = e.input.charCodeAt(++e.position);
		while (!E(d) && d !== 0);
	}
	for (; d !== 0;) {
		for (F(e), e.lineIndent = 0, d = e.input.charCodeAt(e.position); (!o || e.lineIndent < s) && d === 32;) e.lineIndent++, d = e.input.charCodeAt(++e.position);
		if (!o && e.lineIndent > s && (s = e.lineIndent), E(d)) {
			c++;
			continue;
		}
		if (e.lineIndent < s) {
			i === pt ? e.result += p.repeat("\n", a ? 1 + c : c) : i === T && a && (e.result += "\n");
			break;
		}
		for (r ? D(d) ? (l = !0, e.result += p.repeat("\n", a ? 1 + c : c)) : l ? (l = !1, e.result += p.repeat("\n", c + 1)) : c === 0 ? a && (e.result += " ") : e.result += p.repeat("\n", c) : e.result += p.repeat("\n", a ? 1 + c : c), a = !0, o = !0, c = 0, n = e.position; !E(d) && d !== 0;) d = e.input.charCodeAt(++e.position);
		N(e, n, e.position, !1);
	}
	return !0;
}
function Lt(e, t) {
	var n, r = e.tag, i = e.anchor, a = [], o, s = !1, c;
	if (e.firstTabInLine !== -1) return !1;
	for (e.anchor !== null && (e.anchorMap[e.anchor] = a), c = e.input.charCodeAt(e.position); c !== 0 && (e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, j(e, "tab characters must not be used in indentation")), !(c !== 45 || (o = e.input.charCodeAt(e.position + 1), !O(o))));) {
		if (s = !0, e.position++, I(e, !0, -1) && e.lineIndent <= t) {
			a.push(null), c = e.input.charCodeAt(e.position);
			continue;
		}
		if (n = e.line, z(e, t, dt, !1, !0), a.push(e.result), I(e, !0, -1), c = e.input.charCodeAt(e.position), (e.line === n || e.lineIndent > t) && c !== 0) j(e, "bad indentation of a sequence entry");
		else if (e.lineIndent < t) break;
	}
	return s ? (e.tag = r, e.anchor = i, e.kind = "sequence", e.result = a, !0) : !1;
}
function Rt(e, t, n) {
	var r, i, a, o, s, c, l = e.tag, u = e.anchor, d = {}, f = Object.create(null), p = null, m = null, h = null, g = !1, _ = !1, v;
	if (e.firstTabInLine !== -1) return !1;
	for (e.anchor !== null && (e.anchorMap[e.anchor] = d), v = e.input.charCodeAt(e.position); v !== 0;) {
		if (!g && e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, j(e, "tab characters must not be used in indentation")), r = e.input.charCodeAt(e.position + 1), a = e.line, (v === 63 || v === 58) && O(r)) v === 63 ? (g && (P(e, d, f, p, m, null, o, s, c), p = m = h = null), _ = !0, g = !0, i = !0) : g ? (g = !1, i = !0) : j(e, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), e.position += 1, v = r;
		else {
			if (o = e.line, s = e.lineStart, c = e.position, !z(e, n, ut, !1, !0)) break;
			if (e.line === a) {
				for (v = e.input.charCodeAt(e.position); D(v);) v = e.input.charCodeAt(++e.position);
				if (v === 58) v = e.input.charCodeAt(++e.position), O(v) || j(e, "a whitespace character is expected after the key-value separator within a block mapping"), g && (P(e, d, f, p, m, null, o, s, c), p = m = h = null), _ = !0, g = !1, i = !1, p = e.tag, m = e.result;
				else if (_) j(e, "can not read an implicit mapping pair; a colon is missed");
				else return e.tag = l, e.anchor = u, !0;
			} else if (_) j(e, "can not read a block mapping entry; a multiline key may not be an implicit key");
			else return e.tag = l, e.anchor = u, !0;
		}
		if ((e.line === a || e.lineIndent > t) && (g && (o = e.line, s = e.lineStart, c = e.position), z(e, t, w, !0, i) && (g ? m = e.result : h = e.result), g || (P(e, d, f, p, m, h, o, s, c), p = m = h = null), I(e, !0, -1), v = e.input.charCodeAt(e.position)), (e.line === a || e.lineIndent > t) && v !== 0) j(e, "bad indentation of a mapping entry");
		else if (e.lineIndent < t) break;
	}
	return g && P(e, d, f, p, m, null, o, s, c), _ && (e.tag = l, e.anchor = u, e.kind = "mapping", e.result = d), _;
}
function zt(e) {
	var t, n = !1, r = !1, i, a, o = e.input.charCodeAt(e.position);
	if (o !== 33) return !1;
	if (e.tag !== null && j(e, "duplication of a tag property"), o = e.input.charCodeAt(++e.position), o === 60 ? (n = !0, o = e.input.charCodeAt(++e.position)) : o === 33 ? (r = !0, i = "!!", o = e.input.charCodeAt(++e.position)) : i = "!", t = e.position, n) {
		do
			o = e.input.charCodeAt(++e.position);
		while (o !== 0 && o !== 62);
		e.position < e.length ? (a = e.input.slice(t, e.position), o = e.input.charCodeAt(++e.position)) : j(e, "unexpected end of the stream within a verbatim tag");
	} else {
		for (; o !== 0 && !O(o);) o === 33 && (r ? j(e, "tag suffix cannot contain exclamation marks") : (i = e.input.slice(t - 1, e.position + 1), _t.test(i) || j(e, "named tag handle cannot contain such characters"), r = !0, t = e.position + 1)), o = e.input.charCodeAt(++e.position);
		a = e.input.slice(t, e.position), gt.test(a) && j(e, "tag suffix cannot contain flow indicator characters");
	}
	a && !vt.test(a) && j(e, "tag name cannot contain such characters: " + a);
	try {
		a = decodeURIComponent(a);
	} catch {
		j(e, "tag name is malformed: " + a);
	}
	return n ? e.tag = a : S.call(e.tagMap, i) ? e.tag = e.tagMap[i] + a : i === "!" ? e.tag = "!" + a : i === "!!" ? e.tag = "tag:yaml.org,2002:" + a : j(e, "undeclared tag handle \"" + i + "\""), !0;
}
function Bt(e) {
	var t, n = e.input.charCodeAt(e.position);
	if (n !== 38) return !1;
	for (e.anchor !== null && j(e, "duplication of an anchor property"), n = e.input.charCodeAt(++e.position), t = e.position; n !== 0 && !O(n) && !k(n);) n = e.input.charCodeAt(++e.position);
	return e.position === t && j(e, "name of an anchor node must contain at least one character"), e.anchor = e.input.slice(t, e.position), !0;
}
function Vt(e) {
	var t, n, r = e.input.charCodeAt(e.position);
	if (r !== 42) return !1;
	for (r = e.input.charCodeAt(++e.position), t = e.position; r !== 0 && !O(r) && !k(r);) r = e.input.charCodeAt(++e.position);
	return e.position === t && j(e, "name of an alias node must contain at least one character"), n = e.input.slice(t, e.position), S.call(e.anchorMap, n) || j(e, "unidentified alias \"" + n + "\""), e.result = e.anchorMap[n], I(e, !0, -1), !0;
}
function z(e, t, n, r, i) {
	var a, o, s, c = 1, l = !1, u = !1, d, f, p, m, h, g;
	if (e.listener !== null && e.listener("open", e), e.tag = null, e.anchor = null, e.kind = null, e.result = null, a = o = s = w === n || dt === n, r && I(e, !0, -1) && (l = !0, e.lineIndent > t ? c = 1 : e.lineIndent === t ? c = 0 : e.lineIndent < t && (c = -1)), c === 1) for (; zt(e) || Bt(e);) I(e, !0, -1) ? (l = !0, s = a, e.lineIndent > t ? c = 1 : e.lineIndent === t ? c = 0 : e.lineIndent < t && (c = -1)) : s = !1;
	if (s &&= l || i, (c === 1 || w === n) && (h = C === n || ut === n ? t : t + 1, g = e.position - e.lineStart, c === 1 ? s && (Lt(e, g) || Rt(e, g, h)) || Ft(e, h) ? u = !0 : (o && It(e, h) || Nt(e, h) || Pt(e, h) ? u = !0 : Vt(e) ? (u = !0, (e.tag !== null || e.anchor !== null) && j(e, "alias node should not have any properties")) : Mt(e, h, C === n) && (u = !0, e.tag === null && (e.tag = "?")), e.anchor !== null && (e.anchorMap[e.anchor] = e.result)) : c === 0 && (u = s && Lt(e, g))), e.tag === null) e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
	else if (e.tag === "?") {
		for (e.result !== null && e.kind !== "scalar" && j(e, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + e.kind + "\""), d = 0, f = e.implicitTypes.length; d < f; d += 1) if (m = e.implicitTypes[d], m.resolve(e.result)) {
			e.result = m.construct(e.result), e.tag = m.tag, e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
			break;
		}
	} else if (e.tag !== "!") {
		if (S.call(e.typeMap[e.kind || "fallback"], e.tag)) m = e.typeMap[e.kind || "fallback"][e.tag];
		else for (m = null, p = e.typeMap.multi[e.kind || "fallback"], d = 0, f = p.length; d < f; d += 1) if (e.tag.slice(0, p[d].tag.length) === p[d].tag) {
			m = p[d];
			break;
		}
		m || j(e, "unknown tag !<" + e.tag + ">"), e.result !== null && m.kind !== e.kind && j(e, "unacceptable node kind for !<" + e.tag + "> tag; it should be \"" + m.kind + "\", not \"" + e.kind + "\""), m.resolve(e.result, e.tag) ? (e.result = m.construct(e.result, e.tag), e.anchor !== null && (e.anchorMap[e.anchor] = e.result)) : j(e, "cannot resolve a node with !<" + e.tag + "> explicit tag");
	}
	return e.listener !== null && e.listener("close", e), e.tag !== null || e.anchor !== null || u;
}
function Ht(e) {
	var t = e.position, n, r, i, a = !1, o;
	for (e.version = null, e.checkLineBreaks = e.legacy, e.tagMap = Object.create(null), e.anchorMap = Object.create(null); (o = e.input.charCodeAt(e.position)) !== 0 && (I(e, !0, -1), o = e.input.charCodeAt(e.position), !(e.lineIndent > 0 || o !== 37));) {
		for (a = !0, o = e.input.charCodeAt(++e.position), n = e.position; o !== 0 && !O(o);) o = e.input.charCodeAt(++e.position);
		for (r = e.input.slice(n, e.position), i = [], r.length < 1 && j(e, "directive name must not be less than one character in length"); o !== 0;) {
			for (; D(o);) o = e.input.charCodeAt(++e.position);
			if (o === 35) {
				do
					o = e.input.charCodeAt(++e.position);
				while (o !== 0 && !E(o));
				break;
			}
			if (E(o)) break;
			for (n = e.position; o !== 0 && !O(o);) o = e.input.charCodeAt(++e.position);
			i.push(e.input.slice(n, e.position));
		}
		o !== 0 && F(e), S.call(At, r) ? At[r](e, r, i) : M(e, "unknown document directive \"" + r + "\"");
	}
	if (I(e, !0, -1), e.lineIndent === 0 && e.input.charCodeAt(e.position) === 45 && e.input.charCodeAt(e.position + 1) === 45 && e.input.charCodeAt(e.position + 2) === 45 ? (e.position += 3, I(e, !0, -1)) : a && j(e, "directives end mark is expected"), z(e, e.lineIndent - 1, w, !1, !0), I(e, !0, -1), e.checkLineBreaks && ht.test(e.input.slice(t, e.position)) && M(e, "non-ASCII line breaks are interpreted as content"), e.documents.push(e.result), e.position === e.lineStart && L(e)) {
		e.input.charCodeAt(e.position) === 46 && (e.position += 3, I(e, !0, -1));
		return;
	}
	if (e.position < e.length - 1) j(e, "end of the stream or a document separator is expected");
	else return;
}
function Ut(e, t) {
	e = String(e), t ||= {}, e.length !== 0 && (e.charCodeAt(e.length - 1) !== 10 && e.charCodeAt(e.length - 1) !== 13 && (e += "\n"), e.charCodeAt(0) === 65279 && (e = e.slice(1)));
	var n = new Ot(e, t), r = e.indexOf("\0");
	for (r !== -1 && (n.position = r, j(n, "null byte is not allowed in input")), n.input += "\0"; n.input.charCodeAt(n.position) === 32;) n.lineIndent += 1, n.position += 1;
	for (; n.position < n.length - 1;) Ht(n);
	return n.documents;
}
function Wt(e, t, n) {
	typeof t == "object" && t && n === void 0 && (n = t, t = null);
	var r = Ut(e, n);
	if (typeof t != "function") return r;
	for (var i = 0, a = r.length; i < a; i += 1) t(r[i]);
}
function Gt(e, t) {
	var n = Ut(e, t);
	if (n.length !== 0) {
		if (n.length === 1) return n[0];
		throw new g("expected a single document in the stream, but found more");
	}
}
var Kt = {
	loadAll: Wt,
	load: Gt
}, qt = Object.prototype.toString, Jt = Object.prototype.hasOwnProperty, B = 65279, Yt = 9, V = 10, Xt = 13, Zt = 32, Qt = 33, $t = 34, H = 35, en = 37, tn = 38, nn = 39, rn = 42, an = 44, on = 45, U = 58, sn = 61, cn = 62, ln = 63, un = 64, dn = 91, fn = 93, pn = 96, mn = 123, hn = 124, gn = 125, W = {};
W[0] = "\\0", W[7] = "\\a", W[8] = "\\b", W[9] = "\\t", W[10] = "\\n", W[11] = "\\v", W[12] = "\\f", W[13] = "\\r", W[27] = "\\e", W[34] = "\\\"", W[92] = "\\\\", W[133] = "\\N", W[160] = "\\_", W[8232] = "\\L", W[8233] = "\\P";
var _n = [
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
], vn = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function yn(e, t) {
	var n, r, i, a, o, s, c;
	if (t === null) return {};
	for (n = {}, r = Object.keys(t), i = 0, a = r.length; i < a; i += 1) o = r[i], s = String(t[o]), o.slice(0, 2) === "!!" && (o = "tag:yaml.org,2002:" + o.slice(2)), c = e.compiledTypeMap.fallback[o], c && Jt.call(c.styleAliases, s) && (s = c.styleAliases[s]), n[o] = s;
	return n;
}
function bn(e) {
	var t = e.toString(16).toUpperCase(), n, r;
	if (e <= 255) n = "x", r = 2;
	else if (e <= 65535) n = "u", r = 4;
	else if (e <= 4294967295) n = "U", r = 8;
	else throw new g("code point within a string may not be greater than 0xFFFFFFFF");
	return "\\" + n + p.repeat("0", r - t.length) + t;
}
var xn = 1, G = 2;
function Sn(e) {
	this.schema = e.schema || x, this.indent = Math.max(1, e.indent || 2), this.noArrayIndent = e.noArrayIndent || !1, this.skipInvalid = e.skipInvalid || !1, this.flowLevel = p.isNothing(e.flowLevel) ? -1 : e.flowLevel, this.styleMap = yn(this.schema, e.styles || null), this.sortKeys = e.sortKeys || !1, this.lineWidth = e.lineWidth || 80, this.noRefs = e.noRefs || !1, this.noCompatMode = e.noCompatMode || !1, this.condenseFlow = e.condenseFlow || !1, this.quotingType = e.quotingType === "\"" ? G : xn, this.forceQuotes = e.forceQuotes || !1, this.replacer = typeof e.replacer == "function" ? e.replacer : null, this.implicitTypes = this.schema.compiledImplicit, this.explicitTypes = this.schema.compiledExplicit, this.tag = null, this.result = "", this.duplicates = [], this.usedDuplicates = null;
}
function Cn(e, t) {
	for (var n = p.repeat(" ", t), r = 0, i = -1, a = "", o, s = e.length; r < s;) i = e.indexOf("\n", r), i === -1 ? (o = e.slice(r), r = s) : (o = e.slice(r, i + 1), r = i + 1), o.length && o !== "\n" && (a += n), a += o;
	return a;
}
function wn(e, t) {
	return "\n" + p.repeat(" ", e.indent * t);
}
function Tn(e, t) {
	var n, r, i;
	for (n = 0, r = e.implicitTypes.length; n < r; n += 1) if (i = e.implicitTypes[n], i.resolve(t)) return !0;
	return !1;
}
function K(e) {
	return e === Zt || e === Yt;
}
function q(e) {
	return 32 <= e && e <= 126 || 161 <= e && e <= 55295 && e !== 8232 && e !== 8233 || 57344 <= e && e <= 65533 && e !== B || 65536 <= e && e <= 1114111;
}
function En(e) {
	return q(e) && e !== B && e !== Xt && e !== V;
}
function Dn(e, t, n) {
	var r = En(e), i = r && !K(e);
	return (n ? r : r && e !== an && e !== dn && e !== fn && e !== mn && e !== gn) && e !== H && !(t === U && !i) || En(t) && !K(t) && e === H || t === U && i;
}
function On(e) {
	return q(e) && e !== B && !K(e) && e !== on && e !== ln && e !== U && e !== an && e !== dn && e !== fn && e !== mn && e !== gn && e !== H && e !== tn && e !== rn && e !== Qt && e !== hn && e !== sn && e !== cn && e !== nn && e !== $t && e !== en && e !== un && e !== pn;
}
function kn(e) {
	return !K(e) && e !== U;
}
function J(e, t) {
	var n = e.charCodeAt(t), r;
	return n >= 55296 && n <= 56319 && t + 1 < e.length && (r = e.charCodeAt(t + 1), r >= 56320 && r <= 57343) ? (n - 55296) * 1024 + r - 56320 + 65536 : n;
}
function An(e) {
	return /^\n* /.test(e);
}
var jn = 1, Mn = 2, Nn = 3, Pn = 4, Y = 5;
function Fn(e, t, n, r, i, a, o, s) {
	var c, l = 0, u = null, d = !1, f = !1, p = r !== -1, m = -1, h = On(J(e, 0)) && kn(J(e, e.length - 1));
	if (t || o) for (c = 0; c < e.length; l >= 65536 ? c += 2 : c++) {
		if (l = J(e, c), !q(l)) return Y;
		h &&= Dn(l, u, s), u = l;
	}
	else {
		for (c = 0; c < e.length; l >= 65536 ? c += 2 : c++) {
			if (l = J(e, c), l === V) d = !0, p && (f ||= c - m - 1 > r && e[m + 1] !== " ", m = c);
			else if (!q(l)) return Y;
			h &&= Dn(l, u, s), u = l;
		}
		f ||= p && c - m - 1 > r && e[m + 1] !== " ";
	}
	return !d && !f ? h && !o && !i(e) ? jn : a === G ? Y : Mn : n > 9 && An(e) ? Y : o ? a === G ? Y : Mn : f ? Pn : Nn;
}
function In(e, t, n, r, i) {
	e.dump = function() {
		if (t.length === 0) return e.quotingType === G ? "\"\"" : "''";
		if (!e.noCompatMode && (_n.indexOf(t) !== -1 || vn.test(t))) return e.quotingType === G ? "\"" + t + "\"" : "'" + t + "'";
		var a = e.indent * Math.max(1, n), o = e.lineWidth === -1 ? -1 : Math.max(Math.min(e.lineWidth, 40), e.lineWidth - a), s = r || e.flowLevel > -1 && n >= e.flowLevel;
		function c(t) {
			return Tn(e, t);
		}
		switch (Fn(t, s, e.indent, o, c, e.quotingType, e.forceQuotes && !r, i)) {
			case jn: return t;
			case Mn: return "'" + t.replace(/'/g, "''") + "'";
			case Nn: return "|" + Ln(t, e.indent) + Rn(Cn(t, a));
			case Pn: return ">" + Ln(t, e.indent) + Rn(Cn(zn(t, o), a));
			case Y: return "\"" + Vn(t) + "\"";
			default: throw new g("impossible error: invalid scalar style");
		}
	}();
}
function Ln(e, t) {
	var n = An(e) ? String(t) : "", r = e[e.length - 1] === "\n";
	return n + (r && (e[e.length - 2] === "\n" || e === "\n") ? "+" : r ? "" : "-") + "\n";
}
function Rn(e) {
	return e[e.length - 1] === "\n" ? e.slice(0, -1) : e;
}
function zn(e, t) {
	for (var n = /(\n+)([^\n]*)/g, r = function() {
		var r = e.indexOf("\n");
		return r = r === -1 ? e.length : r, n.lastIndex = r, Bn(e.slice(0, r), t);
	}(), i = e[0] === "\n" || e[0] === " ", a, o; o = n.exec(e);) {
		var s = o[1], c = o[2];
		a = c[0] === " ", r += s + (!i && !a && c !== "" ? "\n" : "") + Bn(c, t), i = a;
	}
	return r;
}
function Bn(e, t) {
	if (e === "" || e[0] === " ") return e;
	for (var n = / [^ ]/g, r, i = 0, a, o = 0, s = 0, c = ""; r = n.exec(e);) s = r.index, s - i > t && (a = o > i ? o : s, c += "\n" + e.slice(i, a), i = a + 1), o = s;
	return c += "\n", e.length - i > t && o > i ? c += e.slice(i, o) + "\n" + e.slice(o + 1) : c += e.slice(i), c.slice(1);
}
function Vn(e) {
	for (var t = "", n = 0, r, i = 0; i < e.length; n >= 65536 ? i += 2 : i++) n = J(e, i), r = W[n], !r && q(n) ? (t += e[i], n >= 65536 && (t += e[i + 1])) : t += r || bn(n);
	return t;
}
function Hn(e, t, n) {
	var r = "", i = e.tag, a, o, s;
	for (a = 0, o = n.length; a < o; a += 1) s = n[a], e.replacer && (s = e.replacer.call(n, String(a), s)), (X(e, t, s, !1, !1) || s === void 0 && X(e, t, null, !1, !1)) && (r !== "" && (r += "," + (e.condenseFlow ? "" : " ")), r += e.dump);
	e.tag = i, e.dump = "[" + r + "]";
}
function Un(e, t, n, r) {
	var i = "", a = e.tag, o, s, c;
	for (o = 0, s = n.length; o < s; o += 1) c = n[o], e.replacer && (c = e.replacer.call(n, String(o), c)), (X(e, t + 1, c, !0, !0, !1, !0) || c === void 0 && X(e, t + 1, null, !0, !0, !1, !0)) && ((!r || i !== "") && (i += wn(e, t)), e.dump && V === e.dump.charCodeAt(0) ? i += "-" : i += "- ", i += e.dump);
	e.tag = a, e.dump = i || "[]";
}
function Wn(e, t, n) {
	var r = "", i = e.tag, a = Object.keys(n), o, s, c, l, u;
	for (o = 0, s = a.length; o < s; o += 1) u = "", r !== "" && (u += ", "), e.condenseFlow && (u += "\""), c = a[o], l = n[c], e.replacer && (l = e.replacer.call(n, c, l)), X(e, t, c, !1, !1) && (e.dump.length > 1024 && (u += "? "), u += e.dump + (e.condenseFlow ? "\"" : "") + ":" + (e.condenseFlow ? "" : " "), X(e, t, l, !1, !1) && (u += e.dump, r += u));
	e.tag = i, e.dump = "{" + r + "}";
}
function Gn(e, t, n, r) {
	var i = "", a = e.tag, o = Object.keys(n), s, c, l, u, d, f;
	if (e.sortKeys === !0) o.sort();
	else if (typeof e.sortKeys == "function") o.sort(e.sortKeys);
	else if (e.sortKeys) throw new g("sortKeys must be a boolean or a function");
	for (s = 0, c = o.length; s < c; s += 1) f = "", (!r || i !== "") && (f += wn(e, t)), l = o[s], u = n[l], e.replacer && (u = e.replacer.call(n, l, u)), X(e, t + 1, l, !0, !0, !0) && (d = e.tag !== null && e.tag !== "?" || e.dump && e.dump.length > 1024, d && (e.dump && V === e.dump.charCodeAt(0) ? f += "?" : f += "? "), f += e.dump, d && (f += wn(e, t)), X(e, t + 1, u, !0, d) && (e.dump && V === e.dump.charCodeAt(0) ? f += ":" : f += ": ", f += e.dump, i += f));
	e.tag = a, e.dump = i || "{}";
}
function Kn(e, t, n) {
	var r, i = n ? e.explicitTypes : e.implicitTypes, a, o, s, c;
	for (a = 0, o = i.length; a < o; a += 1) if (s = i[a], (s.instanceOf || s.predicate) && (!s.instanceOf || typeof t == "object" && t instanceof s.instanceOf) && (!s.predicate || s.predicate(t))) {
		if (n ? s.multi && s.representName ? e.tag = s.representName(t) : e.tag = s.tag : e.tag = "?", s.represent) {
			if (c = e.styleMap[s.tag] || s.defaultStyle, qt.call(s.represent) === "[object Function]") r = s.represent(t, c);
			else if (Jt.call(s.represent, c)) r = s.represent[c](t, c);
			else throw new g("!<" + s.tag + "> tag resolver accepts not \"" + c + "\" style");
			e.dump = r;
		}
		return !0;
	}
	return !1;
}
function X(e, t, n, r, i, a, o) {
	e.tag = null, e.dump = n, Kn(e, n, !1) || Kn(e, n, !0);
	var s = qt.call(e.dump), c = r, l;
	r &&= e.flowLevel < 0 || e.flowLevel > t;
	var u = s === "[object Object]" || s === "[object Array]", d, f;
	if (u && (d = e.duplicates.indexOf(n), f = d !== -1), (e.tag !== null && e.tag !== "?" || f || e.indent !== 2 && t > 0) && (i = !1), f && e.usedDuplicates[d]) e.dump = "*ref_" + d;
	else {
		if (u && f && !e.usedDuplicates[d] && (e.usedDuplicates[d] = !0), s === "[object Object]") r && Object.keys(e.dump).length !== 0 ? (Gn(e, t, e.dump, i), f && (e.dump = "&ref_" + d + e.dump)) : (Wn(e, t, e.dump), f && (e.dump = "&ref_" + d + " " + e.dump));
		else if (s === "[object Array]") r && e.dump.length !== 0 ? (e.noArrayIndent && !o && t > 0 ? Un(e, t - 1, e.dump, i) : Un(e, t, e.dump, i), f && (e.dump = "&ref_" + d + e.dump)) : (Hn(e, t, e.dump), f && (e.dump = "&ref_" + d + " " + e.dump));
		else if (s === "[object String]") e.tag !== "?" && In(e, e.dump, t, a, c);
		else if (s === "[object Undefined]") return !1;
		else {
			if (e.skipInvalid) return !1;
			throw new g("unacceptable kind of an object to dump " + s);
		}
		e.tag !== null && e.tag !== "?" && (l = encodeURI(e.tag[0] === "!" ? e.tag.slice(1) : e.tag).replace(/!/g, "%21"), l = e.tag[0] === "!" ? "!" + l : l.slice(0, 18) === "tag:yaml.org,2002:" ? "!!" + l.slice(18) : "!<" + l + ">", e.dump = l + " " + e.dump);
	}
	return !0;
}
function qn(e, t) {
	var n = [], r = [], i, a;
	for (Jn(e, n, r), i = 0, a = r.length; i < a; i += 1) t.duplicates.push(n[r[i]]);
	t.usedDuplicates = Array(a);
}
function Jn(e, t, n) {
	var r, i, a;
	if (typeof e == "object" && e) if (i = t.indexOf(e), i !== -1) n.indexOf(i) === -1 && n.push(i);
	else if (t.push(e), Array.isArray(e)) for (i = 0, a = e.length; i < a; i += 1) Jn(e[i], t, n);
	else for (r = Object.keys(e), i = 0, a = r.length; i < a; i += 1) Jn(e[r[i]], t, n);
}
function Yn(e, t) {
	t ||= {};
	var n = new Sn(t);
	n.noRefs || qn(e, n);
	var r = e;
	return n.replacer && (r = n.replacer.call({ "": r }, "", r)), X(n, 0, r, !0, !0) ? n.dump + "\n" : "";
}
var Xn = { dump: Yn };
function Z(e, t) {
	return function() {
		throw Error("Function yaml." + e + " is removed in js-yaml 4. Use yaml." + t + " instead, which is now safe by default.");
	};
}
var Zn = {
	Type: y,
	Schema: ce,
	FAILSAFE_SCHEMA: fe,
	JSON_SCHEMA: Fe,
	CORE_SCHEMA: Ie,
	DEFAULT_SCHEMA: x,
	load: Kt.load,
	loadAll: Kt.loadAll,
	dump: Xn.dump,
	YAMLException: g,
	types: {
		binary: Xe,
		float: Pe,
		map: de,
		null: ge,
		pairs: at,
		set: lt,
		timestamp: He,
		bool: be,
		int: De,
		merge: We,
		omap: tt,
		seq: ue,
		str: le
	},
	safeLoad: Z("safeLoad", "load"),
	safeLoadAll: Z("safeLoadAll", "loadAll"),
	safeDump: Z("safeDump", "dump")
}, Qn = class e {
	constructor() {
		this.notes = /* @__PURE__ */ new Map(), this.backlinks = /* @__PURE__ */ new Map(), this.tagsIndex = /* @__PURE__ */ new Map(), this.vaultPath = "";
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
				frontmatter: Zn.load(t[1]) || {},
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
		let n = e.endsWith(".md") ? e.replace(/\.md$/, "") : e, a = t;
		if (a === void 0 && this.vaultPath) try {
			a = await i.readFile(r.join(this.vaultPath, e), "utf-8");
		} catch (t) {
			console.error(`Failed to read file ${e} for cache update`, t);
			return;
		}
		if (a === void 0) return;
		let { frontmatter: o, body: s } = this.parseFrontmatter(a), c = this.extractLinks(s), l = this.extractTags(s), u = Array.isArray(o.tags) ? o.tags.map(String) : [], d = Array.from(new Set([...l, ...u])), f = this.notes.get(n), p = f?.links || [], m = f?.tags || [];
		this.notes.set(n, {
			id: n,
			title: o.title || r.basename(n),
			created_at: o.created_at,
			updated_at: o.updated_at,
			tags: d,
			links: c,
			frontmatter: o
		});
		for (let e of p) {
			let t = this.backlinks.get(e) || [];
			this.backlinks.set(e, t.filter((e) => e !== n));
		}
		for (let e of c) {
			let t = this.backlinks.get(e) || [];
			t.includes(n) || this.backlinks.set(e, [...t, n]);
		}
		for (let e of m) {
			let t = this.tagsIndex.get(e) || [];
			this.tagsIndex.set(e, t.filter((e) => e !== n));
		}
		for (let e of d) {
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
			let a = await i.readdir(e, { withFileTypes: !0 });
			for (let i of a) {
				let a = r.join(e, i.name), o = r.relative(n, a);
				i.isDirectory() ? await t(a, n) : i.isFile() && i.name.endsWith(".md") && await this.updateFileCache(o);
			}
		};
		try {
			await t(e, e), console.log(`[MetadataCache] Scanned ${this.notes.size} notes.`);
		} catch (e) {
			console.error("[MetadataCache] Failed to scan vault", e);
		}
	}
	watchVault(e) {
		this.vaultPath = e, o(e, { recursive: !0 }, async (t, n) => {
			if (!n || !n.endsWith(".md")) return;
			let a = n, o = r.join(e, a);
			if (t === "rename") try {
				await i.access(o), console.log(`[MetadataCache] File added/renamed: ${a}`), await this.updateFileCache(a);
			} catch {
				console.log(`[MetadataCache] File deleted: ${a}`), this.removeFileCache(a);
			}
			else t === "change" && (console.log(`[MetadataCache] File changed: ${a}`), await this.updateFileCache(a));
		}), console.log(`[MetadataCache] Watching ${e} (recursive)`);
	}
	clear() {
		this.links.clear(), this.backlinks.clear();
	}
}, $n = r.dirname(a(import.meta.url)), er = process.env.NODE_ENV === "development", Q = r.join(t.getPath("userData"), "test_vault"), $ = Qn.getInstance();
async function tr() {
	try {
		await i.access(Q);
	} catch {
		await i.mkdir(Q, { recursive: !0 }), await i.writeFile(r.join(Q, "Welcome.md"), "# Welcome to Nova\n\nThis is a note with a link to [[SecondNote]].", "utf-8"), await i.writeFile(r.join(Q, "SecondNote.md"), "# Second Note\n\nReference back to [[Welcome]].", "utf-8");
	}
}
function nr() {
	let t = new e({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: r.join($n, "preload.mjs"),
			contextIsolation: !0,
			nodeIntegration: !1
		}
	});
	er ? t.loadURL(process.env.VITE_DEV_SERVER_URL || "http://localhost:5173") : t.loadFile(r.join($n, "../dist/index.html"));
}
async function rr(e, t) {
	let n = await i.readdir(e, { withFileTypes: !0 });
	return (await Promise.all(n.map(async (n) => {
		let i = r.join(e, n.name);
		return n.isDirectory() ? rr(i, t) : n.name.endsWith(".md") ? r.relative(t, i) : [];
	}))).flat();
}
t.whenReady().then(async () => {
	await tr(), await $.scanVault(Q), $.watchVault(Q), n.handle("readMarkdownFile", async (e, t) => {
		try {
			let e = r.join(Q, t);
			return await i.readFile(e, "utf-8");
		} catch (e) {
			throw console.error(`[IPC] readMarkdownFile failed: ${t}`, e), e;
		}
	}), n.handle("writeMarkdownFile", async (e, t, n) => {
		try {
			let e = r.join(Q, t);
			return await i.mkdir(r.dirname(e), { recursive: !0 }), await i.writeFile(e, n, "utf-8"), await $.updateFileCache(t, n), !0;
		} catch (e) {
			return console.error(`[IPC] writeMarkdownFile failed: ${t}`, e), !1;
		}
	}), n.handle("listMarkdownFiles", async () => {
		try {
			return await rr(Q, Q);
		} catch (e) {
			return console.error("[IPC] listMarkdownFiles failed", e), [];
		}
	}), n.handle("getVaultTree", async () => {
		try {
			async function e(t, n) {
				let a = await i.readdir(t, { withFileTypes: !0 });
				return (await Promise.all(a.map(async (a) => {
					let o = r.join(t, a.name), s = r.relative(n, o);
					if (a.isDirectory()) {
						let t = await e(o, n);
						return t.length === 0 && !a.name.startsWith(".") ? {
							id: s,
							name: a.name,
							type: "folder",
							children: []
						} : t.length > 0 ? {
							id: s,
							name: a.name,
							type: "folder",
							children: t
						} : null;
					} else if (a.name.endsWith(".md")) {
						let e = await i.stat(o);
						return {
							id: s,
							name: a.name.replace(/\.md$/, ""),
							type: "file",
							extension: ".md",
							updated_at: e.mtime.toISOString()
						};
					}
					return null;
				}))).filter(Boolean).sort((e, t) => e.type === t.type ? e.name.localeCompare(t.name) : e.type === "folder" ? -1 : 1);
			}
			return await e(Q, Q);
		} catch (e) {
			return console.error("[IPC] getVaultTree failed", e), [];
		}
	}), n.handle("getBacklinks", async (e, t) => $.getBacklinks(t)), n.handle("getTags", async () => $.getTags()), n.handle("getNotesByTag", async (e, t) => $.getNotesByTag(t)), n.handle("getNoteMetadata", async (e, t) => $.getNoteMetadata(t)), n.handle("setVaultPath", async (e, t) => {
		try {
			return Q = t, await tr(), await $.scanVault(Q), $.watchVault(Q), !0;
		} catch (e) {
			return console.error(`[IPC] setVaultPath failed: ${t}`, e), !1;
		}
	}), n.handle("getVaultPath", async () => Q), n.handle("renameItem", async (e, t, n) => {
		try {
			let e = r.join(Q, t), a = r.join(Q, n);
			return await i.rename(e, a), !0;
		} catch (e) {
			return console.error(`[IPC] renameItem failed: ${t} -> ${n}`, e), !1;
		}
	}), n.handle("deleteItem", async (e, t) => {
		try {
			let e = r.join(Q, t);
			return (await i.stat(e)).isDirectory() ? await i.rm(e, {
				recursive: !0,
				force: !0
			}) : await i.unlink(e), !0;
		} catch (e) {
			return console.error(`[IPC] deleteItem failed: ${t}`, e), !1;
		}
	}), n.handle("moveItem", async (e, t, n) => {
		try {
			let e = r.join(Q, t), a = r.join(Q, n, r.basename(t));
			return await i.rename(e, a), !0;
		} catch (e) {
			return console.error(`[IPC] moveItem failed: ${t} -> ${n}`, e), !1;
		}
	}), n.handle("createFolder", async (e, t) => {
		try {
			let e = r.join(Q, t);
			return await i.mkdir(e, { recursive: !0 }), !0;
		} catch (e) {
			return console.error(`[IPC] createFolder failed: ${t}`, e), !1;
		}
	}), n.handle("createMarkdownFile", async (e, t, n) => {
		try {
			let e = n.endsWith(".md") ? n : `${n}.md`, a = r.join(Q, t, e);
			return await i.writeFile(a, "", "utf-8"), r.relative(Q, a);
		} catch (e) {
			return console.error(`[IPC] createMarkdownFile failed in ${t}`, e), "";
		}
	}), nr(), t.on("activate", () => {
		e.getAllWindows().length === 0 && nr();
	});
}), t.on("window-all-closed", () => {
	process.platform !== "darwin" && t.quit();
});
//#endregion
