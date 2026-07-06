const Adhan = (() => {
    const D = Math.PI / 180;
    const R = 180 / Math.PI;

    function sin(x) { return Math.sin(x * D); }
    function cos(x) { return Math.cos(x * D); }
    function tan(x) { return Math.tan(x * D); }
    function asin(x) { return Math.asin(x) * R; }
    function acos(x) { return Math.acos(x) * R; }
    function atan(x) { return Math.atan(x) * R; }

    function jd(y, m, d) {
        if (m <= 2) { y--; m += 12; }
        const A = Math.floor(y / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
    }

    function sunPos(jd) {
        const T = (jd - 2451545) / 36525;
        const L = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
        const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360;
        const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
                + (0.019993 - 0.000101 * T) * sin(2 * M)
                + 0.000289 * sin(3 * M);
        const O = L + C;
        const e = 23.439291 - 0.0130042 * T - 0.00000016 * T * T;
        const a = Math.atan2(cos(e) * sin(O), cos(O)) * R;
        const d = asin(sin(e) * sin(O));
        let eot = (L - a) / 15;
        if (eot > 1) eot -= 24;
        if (eot < -1) eot += 24;
        return { dec: d, eot: eot };
    }

    function ha(dec, lat, alt) {
        const c = (sin(alt) - sin(lat) * sin(dec)) / (cos(lat) * cos(dec));
        if (c > 1 || c < -1) return null;
        return acos(c) / 15;
    }

    const Methods = {
        MWL: { fajr: 18, isha: 17, label: 'Muslim World League' },
        ISNA: { fajr: 15, isha: 15, label: 'ISNA' },
        Egypt: { fajr: 19.5, isha: 17.5, label: 'Egypt' },
        Karachi: { fajr: 18, isha: 18, label: 'Karachi' },
        Russia: { fajr: 16, isha: 15, label: 'Russia' },
    };

    function calculate(date, lat, lng, tz, method) {
        const p = Methods[method] || Methods.Russia;
        const J = jd(date.getFullYear(), date.getMonth() + 1, date.getDate());
        const sun = sunPos(J);
        const noon = 12 + tz - lng / 15 - sun.eot;

        const sha = ha(sun.dec, lat, -0.833);
        const sunrise = sha !== null ? noon - sha : null;
        const sunset = sha !== null ? noon + sha : null;

        // High-latitude fallback: 1/7th of night rule
        function highLatFallback(base, isFajr) {
            if (sunset === null || sunrise === null) return null;
            var nightLen = (sunrise - sunset + 24) % 24;
            var seventh = nightLen / 7;
            return isFajr ? (sunrise - seventh + 24) % 24 : (sunset + seventh) % 24;
        }

        const fha = ha(sun.dec, lat, -p.fajr);
        const fajr = fha !== null ? noon - fha : highLatFallback(null, true);

        const r = Math.abs(lat - sun.dec);
        const aAlt = atan(1 / (1 + tan(r)));
        const aha = ha(sun.dec, lat, aAlt);
        const asr = aha !== null ? noon + aha : null;

        let isha;
        if (p.isha >= 90) {
            isha = sunset !== null ? sunset + 90 / 60 : null;
        } else {
            const iha = ha(sun.dec, lat, -p.isha);
            isha = iha !== null ? noon + iha : highLatFallback(null, false);
        }

        const maghrib = sunset;

        function n(h) {
            return h !== null ? ((h % 24 + 24) % 24) : null;
        }

        function fmt(h) {
            if (h === null) return '--:--';
            h = n(h);
            const mm = Math.floor((h - Math.floor(h)) * 60 + 0.5);
            if (mm >= 60) return `${String(Math.floor(h) + 1).padStart(2, '0')}:00`;
            return `${String(Math.floor(h)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }

        const dhuhr = noon + 0.0333;

        return {
            fajr: fmt(fajr),
            sunrise: fmt(sunrise),
            dhuhr: fmt(dhuhr),
            asr: fmt(asr),
            maghrib: fmt(maghrib),
            isha: fmt(isha),
            raw: {
                fajr: n(fajr),
                sunrise: n(sunrise),
                dhuhr: n(dhuhr),
                asr: n(asr),
                maghrib: n(maghrib),
                isha: n(isha)
            }
        };
    }

    return { calculate, Methods };
})();
