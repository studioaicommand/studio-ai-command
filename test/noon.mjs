const RD = Date; const shift = Date.UTC(2026, 10, 12, 2, 0, 0) - RD.now();
globalThis.Date = class extends RD { constructor(...a) { super(...(a.length ? a : [RD.now() + shift])); } static now() { return RD.now() + shift; } };
