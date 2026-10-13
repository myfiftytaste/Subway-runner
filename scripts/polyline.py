"""Encodage/décodage polyline Google (précision 1e-5), points en (lon, lat)."""
import math


def decode(s):
    i, lat, lon, out = 0, 0, 0, []
    while i < len(s):
        vals = []
        for _ in range(2):
            r = sh = 0
            while True:
                b = ord(s[i]) - 63
                i += 1
                r |= (b & 0x1F) << sh
                sh += 5
                if b < 0x20:
                    break
            vals.append(~(r >> 1) if r & 1 else r >> 1)
        lat += vals[0]
        lon += vals[1]
        out.append((lon / 1e5, lat / 1e5))
    return out


def encode(points):
    def enc(v):
        v = ~(v << 1) if v < 0 else v << 1
        o = ""
        while v >= 0x20:
            o += chr((0x20 | (v & 0x1F)) + 63)
            v >>= 5
        return o + chr(v + 63)

    s, pla, plo = "", 0, 0
    for lon, lat in points:
        la, lo = round(lat * 1e5), round(lon * 1e5)
        s += enc(la - pla) + enc(lo - plo)
        pla, plo = la, lo
    return s


def dist_km(a, b):
    """Distance haversine entre deux points (lon, lat)."""
    la1, la2 = math.radians(a[1]), math.radians(b[1])
    dla, dlo = la2 - la1, math.radians(b[0] - a[0])
    h = math.sin(dla / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlo / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


if __name__ == "__main__":
    pts = [(2.35, 48.86), (2.3512, 48.8611), (2.34, 48.85)]
    assert [tuple(round(c, 5) for c in p) for p in decode(encode(pts))] == pts
    assert decode("_p~iF~ps|U_ulLnnqC_mqNvxq`@") == [(-120.2, 38.5), (-120.95, 40.7), (-126.453, 43.252)]
    print("ok")
